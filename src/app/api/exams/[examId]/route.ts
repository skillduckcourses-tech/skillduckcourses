import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyExamAccess, verifySession } from "@/src/lib/auth";
import { cleanOptionText, cleanQuestionText } from "@/src/lib/exam-content";
import { prisma } from "@/src/lib/prisma";

const EXAM_QUESTION_COUNT = 10;

export async function GET(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const access = await verifyExamAccess((await cookies()).get("skillduck_exam_access")?.value);
  const { examId } = await params;
  if (!session || !access || String(access.examId) !== examId) return NextResponse.json({ error: "Exam access is locked until the course watch gate is complete." }, { status: 403 });
  const exam = await prisma.exam.findUnique({ where: { id: access.examId }, include: { questions: true, course: { select: { title: true } } } });
  const examSession = await prisma.examSession.findUnique({ where: { id: access.sessionId } });
  if (!exam || !examSession || examSession.userId !== (await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } }))?.id) return NextResponse.json({ error: "Exam session not found." }, { status: 404 });
  const order = Array.isArray(examSession.questionOrder) ? examSession.questionOrder.map(Number) : [];
  if (order.length !== EXAM_QUESTION_COUNT || new Set(order).size !== EXAM_QUESTION_COUNT) return NextResponse.json({ error: "This exam session has an invalid question pool." }, { status: 409 });
  const questions = order.map((id) => exam.questions.find((question) => question.id === id)).filter((question): question is (typeof exam.questions)[number] => Boolean(question));
  if (questions.length !== EXAM_QUESTION_COUNT || new Set(questions.map((question) => question.id)).size !== EXAM_QUESTION_COUNT) return NextResponse.json({ error: "This exam session has an incomplete question pool." }, { status: 409 });
  const randomizedQuestions = questions.map(({ id, text, options }) => ({ id, text: cleanQuestionText(text), options: shuffleOptions(options).map(cleanOptionText) }));
  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    durationSeconds: Math.max(0, Math.floor(((examSession.deadlineAt?.getTime() || 0) - Date.now()) / 1000)),
    passingScore: exam.passingScore,
    questions: randomizedQuestions,
  });
}

function shuffleOptions(options: unknown) {
  if (!Array.isArray(options) || options.some((option) => typeof option !== "string")) return [];
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}