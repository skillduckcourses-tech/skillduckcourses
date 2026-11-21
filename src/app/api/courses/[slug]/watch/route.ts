import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createExamAccess, SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { findCourse } from "@/src/lib/course-lookup";

const EXAM_QUESTION_COUNT = 10;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  const baseCourse = await findCourse(slug);
  const course = baseCourse && await prisma.course.findUnique({
    where: { id: baseCourse.id },
    include: {
      videos: { where: { isPublished: true }, orderBy: { position: "asc" }, take: 1 },
      resources: { where: { contentType: { in: ["YOUTUBE", "PDF"] } }, orderBy: { createdAt: "desc" }, take: 1 },
      lessons: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          estimatedReadTime: true,
          progress: { where: { userId: user?.id ?? -1 }, select: { viewedSeconds: true } },
        },
      },
      exams: { where: { isPublished: true }, include: { questions: { select: { id: true, text: true, options: true } } }, take: 1 },
    },
  });
  const exam = course?.exams[0];
  if (!user || !exam || exam.questions.length < EXAM_QUESTION_COUNT) return NextResponse.json({ error: `This course is not ready for a ${EXAM_QUESTION_COUNT}-question examination.` }, { status: 409 });
  const certificate = await prisma.certificate.findFirst({ where: { userId: user.id, courseId: course.id, status: { in: ["PENDING_APPROVAL", "APPROVED"] } }, orderBy: { issuedAt: "desc" }, select: { verificationHash: true, status: true } });
  const passedExam = await prisma.examSession.findFirst({ where: { userId: user.id, examId: exam.id, status: "PASSED" }, orderBy: { completedAt: "desc" }, select: { id: true } });
  if (certificate || passedExam) {
    return NextResponse.json({ ok: true, completed: true, certificateHash: certificate?.verificationHash || null, examId: exam.id, certificateStatus: certificate?.status || (passedExam ? "PASSED" : null) });
  }
  if (!course?.lessons.length) return NextResponse.json({ error: "This course has no published lesson materials yet." }, { status: 409 });
  const incompleteLessons = course.lessons.filter((lesson) => {
    const requiredSeconds = Math.ceil(Math.max(1, lesson.estimatedReadTime) * 0.8);
    return (lesson.progress[0]?.viewedSeconds || 0) < requiredSeconds;
  });
  if (incompleteLessons.length) {
    return NextResponse.json({
      error: "Review at least 80% of every course lesson before starting the final assessment.",
      incompleteLessons: incompleteLessons.map(({ id, title, estimatedReadTime, progress }) => ({
        lessonId: id,
        title,
        requiredSeconds: Math.ceil(Math.max(1, estimatedReadTime) * 0.8),
        viewedSeconds: progress[0]?.viewedSeconds || 0,
      })),
    }, { status: 403 });
  }
  const attemptCount = await prisma.examSession.count({ where: { userId: user.id, examId: exam.id } });
  if (attemptCount >= 3) return NextResponse.json({ error: "You have used all three official attempts for this course." }, { status: 409 });
  const previousSessions = await prisma.examSession.findMany({
    where: { userId: user.id, examId: exam.id },
    select: { questionOrder: true },
  });
  const previouslyUsedQuestionIds = new Set(
    previousSessions.flatMap(({ questionOrder }) =>
      Array.isArray(questionOrder) ? questionOrder.map(Number) : [],
    ),
  );
  const availableQuestions = exam.questions.filter(({ id }) => !previouslyUsedQuestionIds.has(id));
  const candidateQuestions = availableQuestions.length >= EXAM_QUESTION_COUNT ? availableQuestions : exam.questions;
  const questionOrder = shuffle(candidateQuestions.map(({ id }) => id)).slice(0, EXAM_QUESTION_COUNT);
  if (questionOrder.length < EXAM_QUESTION_COUNT) {
    return NextResponse.json({ error: `This course has no ${EXAM_QUESTION_COUNT}-question pool remaining for this user.` }, { status: 409 });
  }
  const selectedQuestions = questionOrder.map((id) => exam.questions.find((question) => question.id === id)).filter((question): question is (typeof exam.questions)[number] => Boolean(question));
  const questionTexts = selectedQuestions.map((question) => question.text);
  const optionSets = selectedQuestions.map((question) => canonicalOptionSet(question.options));
  if (selectedQuestions.length !== EXAM_QUESTION_COUNT || new Set(questionTexts).size !== EXAM_QUESTION_COUNT || new Set(optionSets).size !== EXAM_QUESTION_COUNT) {
    throw new Error(`Duplicate question content detected while creating exam session for exam ${exam.id}`);
  }
  const deadlineAt = new Date(Date.now() + 23 * 60 * 1000);
  const examSession = await prisma.examSession.create({ data: { userId: user.id, examId: exam.id, questionOrder, deadlineAt, attemptNumber: attemptCount + 1 } });
  const access = await createExamAccess(examSession.id, exam.id, deadlineAt);
  const response = NextResponse.json({ ok: true, examId: exam.id, sessionId: examSession.id, deadlineAt });
  response.cookies.set("skillduck_exam_access", access, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 23 * 60 });
  return response;
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function canonicalOptionSet(options: unknown) {
  if (!Array.isArray(options) || options.some((option) => typeof option !== "string")) return "invalid";
  return JSON.stringify([...options].sort());
}