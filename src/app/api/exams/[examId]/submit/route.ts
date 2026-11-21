import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyExamAccess, verifySession } from "@/src/lib/auth";
import { CERTIFICATE_PASS_SCORE, issueCertificate } from "@/src/lib/certificates";
import { cleanOptionText } from "@/src/lib/exam-content";
import { prisma } from "@/src/lib/prisma";

const EXAM_QUESTION_COUNT = 10;

type Submission = { answers?: Record<string, string>; timedOut?: boolean; warnings?: number };

export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const access = await verifyExamAccess((await cookies()).get("skillduck_exam_access")?.value);
  const { examId } = await params;
  if (!session || !access || String(access.examId) !== examId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true, email: true, fullName: true, name: true, role: true } });
  const examRecord = await prisma.exam.findUnique({ where: { id: access.examId }, include: { questions: true, course: { select: { id: true, slug: true, title: true } } } });
  const examSession = await prisma.examSession.findUnique({ where: { id: access.sessionId } });
  if (!user || !examRecord || !examSession || examSession.userId !== user.id) return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
  if (examSession.completedAt || examSession.locked) return NextResponse.json({ error: "This exam session is already closed." }, { status: 409 });

  const existingCompletedSession = await prisma.examSession.findFirst({
    where: { userId: user.id, examId: examRecord.id, status: "PASSED" },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true },
  });
  const existingCertificate = await prisma.certificate.findFirst({
    where: { userId: user.id, courseId: examRecord.course.id, status: { in: ["PENDING_APPROVAL", "APPROVED"] } },
    orderBy: { issuedAt: "desc" },
    select: { id: true, status: true },
  });
  if (existingCompletedSession || existingCertificate) return NextResponse.json({ error: "This course has already been completed and cannot be re-submitted." }, { status: 409 });
  const completedPayment = user.role === "ADMIN" ? null : await prisma.payment.findFirst({
    where: { userId: user.id, courseId: examRecord.course.id, status: "COMPLETED" },
    select: { id: true },
  });

  const body = (await request.json()) as Submission;
  const answers = body.answers || {};
  const warningCount = body.warnings || examSession.warnings;
  const questionOrder = Array.isArray(examSession.questionOrder) ? examSession.questionOrder.map(Number) : [];
  if (questionOrder.length !== EXAM_QUESTION_COUNT || new Set(questionOrder).size !== EXAM_QUESTION_COUNT) return NextResponse.json({ error: "This exam session has an invalid question pool." }, { status: 409 });
  const sessionQuestions = questionOrder.map((id) => examRecord.questions.find((question) => question.id === id));
  if (sessionQuestions.some((question) => !question)) return NextResponse.json({ error: "This exam session has an incomplete question pool." }, { status: 409 });
  const correct = sessionQuestions.filter((question) => question && cleanOptionText(answers[String(question.id)] || "") === cleanOptionText(question.correctAnswer)).length;
  const score = Math.round((correct / EXAM_QUESTION_COUNT) * 100);
  const timedOut = Boolean(body.timedOut) || Boolean(examSession.deadlineAt && examSession.deadlineAt <= new Date());
  const passed = score >= CERTIFICATE_PASS_SCORE;
  if (!examRecord.course?.id) return NextResponse.json({ error: "The exam is missing its course relation." }, { status: 503 });
  const updated = await prisma.$transaction(async (transaction) => {
    const completed = await transaction.examSession.update({ where: { id: examSession.id }, data: { answers, score, completedAt: new Date(), status: passed ? "PASSED" : "FAILED", warnings: warningCount, locked: warningCount >= 3 } });
    let certificate = null;
    if (passed) {
      await transaction.enrollment.upsert({ where: { userId_courseSlug: { userId: user.id, courseSlug: examRecord.course.slug } }, create: { userId: user.id, courseSlug: examRecord.course.slug }, update: {} });
      await transaction.courseProgress.upsert({
        where: { userId_courseId: { userId: user.id, courseId: examRecord.course.id } },
        create: { userId: user.id, courseId: examRecord.course.id, watchedSeconds: 0, readingSeconds: 0, points: 0, isCompleted: true },
        update: { isCompleted: true, points: { increment: 0 } },
      });

      if (user.role === "ADMIN") {
        certificate = await issueCertificate(transaction, { userId: user.id, examId: examRecord.id, courseId: examRecord.course.id, sessionId: completed.id });
      } else if (completedPayment) {
        certificate = await issueCertificate(transaction, { userId: user.id, examId: examRecord.id, courseId: examRecord.course.id, sessionId: completed.id });
      }
    }
    return { completed, certificate };
  });
  return NextResponse.json({
    score,
    passed,
    timedOut,
    warnings: warningCount,
    certificateEligible: passed,
    paymentRequired: passed && user.role !== "ADMIN" && !completedPayment,
    certificate: updated.certificate ? {
      verificationHash: updated.certificate.verificationHash,
      certificateNo: updated.certificate.certificateNo,
      issuedTo: user.fullName || user.name || user.email,
    } : null,
    courseSlug: examRecord.course.slug,
    sessionId: updated.completed.id,
  });
}