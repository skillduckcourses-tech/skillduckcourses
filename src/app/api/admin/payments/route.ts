import { NextResponse } from "next/server";
import { isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const payments = await prisma.payment.findMany({ include: { user: { select: { name: true, email: true } }, course: { select: { title: true, slug: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      const latestPassedSession = await prisma.examSession.findFirst({
        where: { userId: payment.userId, exam: { courseId: payment.courseId }, status: "PASSED", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        include: { exam: { select: { title: true } } },
      });
      const latestCertificate = await prisma.certificate.findFirst({
        where: { userId: payment.userId, courseId: payment.courseId },
        orderBy: { issuedAt: "desc" },
        select: { status: true, certificateNo: true, verificationHash: true },
      });
      return {
        ...payment,
        examScore: latestPassedSession?.score ?? null,
        examTitle: latestPassedSession?.exam.title ?? null,
        certificateStatus: latestCertificate?.status ?? "PENDING_APPROVAL",
        certificateNo: latestCertificate?.certificateNo ?? null,
        verificationHash: latestCertificate?.verificationHash ?? null,
      };
    }));
    return NextResponse.json({
      payments: enrichedPayments,
      pendingCount: payments.filter((payment) => payment.status === "PENDING").length,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Failed to load payment submissions.", diagnostics);
    const unavailable = isPrismaConnectionFailure(error) || diagnostics.errorName === "DatabaseConfigurationError";
    return NextResponse.json({
      error: unavailable ? "The payment queue is temporarily unavailable. Please try again shortly." : "Unable to load payment submissions.",
      code: unavailable ? "PAYMENT_DATABASE_UNAVAILABLE" : "PAYMENT_QUEUE_ERROR",
    }, {
      status: unavailable ? 503 : 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}