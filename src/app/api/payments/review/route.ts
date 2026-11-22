import { NextResponse } from "next/server";
import { isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";
import { issueCertificate } from "@/src/lib/certificates";

export async function POST(request: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = await request.json().catch(() => null) as { paymentId?: unknown; status?: unknown; reviewNote?: unknown } | null;
    if (typeof body?.paymentId !== "number" || !Number.isSafeInteger(body.paymentId) || body.paymentId < 1) {
      return NextResponse.json({ error: "Payment and status are required." }, { status: 400 });
    }
    if (body.status !== "APPROVED" && body.status !== "REJECTED") {
      return NextResponse.json({ error: "Choose approve or reject for a certificate payment request." }, { status: 400 });
    }
    const status = body.status;
    const paymentId = body.paymentId;
    const paymentRecord = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, userId: true, courseId: true, status: true } });
    if (!paymentRecord) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    if (paymentRecord.status !== "PENDING") return NextResponse.json({ error: "This payment has already been reviewed." }, { status: 409 });
    const passedSession = await prisma.examSession.findFirst({
      where: { userId: paymentRecord.userId, exam: { courseId: paymentRecord.courseId }, status: "PASSED", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { id: true, examId: true },
    });
    const certificate = passedSession
      ? await prisma.certificate.findUnique({ where: { sessionId: passedSession.id }, select: { id: true } })
      : null;
    const normalizedStatus = status === "APPROVED" ? "COMPLETED" : "FAILED";
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 500) : null;
    const payment = await prisma.$transaction(async (transaction) => {
      const updatedCount = await transaction.payment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: { status: normalizedStatus, reviewNote },
      });
      if (updatedCount.count !== 1) return null;
      const updatedPayment = await transaction.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { course: { select: { slug: true, id: true } } },
      });
      if (status === "APPROVED" && passedSession) {
        await issueCertificate(transaction, {
          userId: paymentRecord.userId,
          examId: passedSession.examId,
          courseId: paymentRecord.courseId,
          sessionId: passedSession.id,
        });
      } else if (status === "REJECTED" && certificate) {
        await transaction.certificate.update({ where: { id: certificate.id }, data: { status: "REJECTED" } });
      }
      if (status === "APPROVED") {
        await transaction.enrollment.upsert({ where: { userId_courseSlug: { userId: updatedPayment.userId, courseSlug: updatedPayment.course.slug } }, create: { userId: updatedPayment.userId, courseSlug: updatedPayment.course.slug }, update: {} });
      }
      return updatedPayment;
    });
    if (!payment) return NextResponse.json({ error: "This payment has already been reviewed." }, { status: 409 });
    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      paymentStatus: payment.status,
      certificateStatus: status === "REJECTED" ? "REJECTED" : passedSession ? "APPROVED" : null,
      certificateIssued: Boolean(status === "APPROVED" && passedSession),
      unlocked: status === "APPROVED",
    });
  } catch (error) {
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Payment approval failed.", diagnostics);
    const unavailable = isPrismaConnectionFailure(error) || diagnostics.errorName === "DatabaseConfigurationError";
    return NextResponse.json({
      error: unavailable ? "The payment review service is temporarily unavailable. Please try again shortly." : "Unable to update this payment.",
      code: unavailable ? "PAYMENT_DATABASE_UNAVAILABLE" : "PAYMENT_REVIEW_ERROR",
    }, { status: unavailable ? 503 : 500 });
  }
}