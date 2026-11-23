import { NextResponse } from "next/server";
import { isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const payments = await prisma.payment.findMany({ include: { user: { select: { name: true, email: true } }, course: { select: { title: true, slug: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    const userIds = [...new Set(payments.map((payment) => payment.userId))];
    const courseIds = [...new Set(payments.map((payment) => payment.courseId))];
    const [passedSessions, certificates] = await Promise.all([
      prisma.examSession.findMany({
        where: { userId: { in: userIds }, exam: { courseId: { in: courseIds } }, status: "PASSED", completedAt: { not: null } },
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        select: { userId: true, score: true, exam: { select: { courseId: true, title: true } } },
      }),
      prisma.certificate.findMany({
        where: { userId: { in: userIds }, courseId: { in: courseIds } },
        orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
        select: { userId: true, courseId: true, status: true, certificateNo: true, verificationHash: true },
      }),
    ]);
    const keyFor = (userId: number, courseId: number) => `${userId}:${courseId}`;
    const latestPassedByCourse = new Map<string, (typeof passedSessions)[number]>();
    for (const session of passedSessions) {
      const key = keyFor(session.userId, session.exam.courseId);
      if (!latestPassedByCourse.has(key)) latestPassedByCourse.set(key, session);
    }
    const latestCertificateByCourse = new Map<string, (typeof certificates)[number]>();
    for (const certificate of certificates) {
      const key = keyFor(certificate.userId, certificate.courseId);
      if (!latestCertificateByCourse.has(key)) latestCertificateByCourse.set(key, certificate);
    }
    const enrichedPayments = payments.map((payment) => {
      const key = keyFor(payment.userId, payment.courseId);
      const latestPassedSession = latestPassedByCourse.get(key);
      const latestCertificate = latestCertificateByCourse.get(key);
      return {
        ...payment,
        examScore: latestPassedSession?.score ?? null,
        examTitle: latestPassedSession?.exam.title ?? null,
        certificateStatus: latestCertificate?.status ?? "PENDING_APPROVAL",
        certificateNo: latestCertificate?.certificateNo ?? null,
        verificationHash: latestCertificate?.verificationHash ?? null,
      };
    });
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