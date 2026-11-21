import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { CERTIFICATE_PASS_SCORE, issueCertificate } from "@/src/lib/certificates";
import { prisma } from "@/src/lib/prisma";

export async function POST() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true, role: true, fullName: true, name: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const examSession = await prisma.examSession.findFirst({
    where: { userId: user.id, score: { gte: CERTIFICATE_PASS_SCORE }, completedAt: { not: null }, status: "PASSED" },
    orderBy: { completedAt: "desc" },
    include: { exam: { select: { id: true, courseId: true, course: { select: { slug: true, title: true } } } } },
  });

  if (!examSession) return NextResponse.json({ error: "A completed passing exam is required before requesting a certificate." }, { status: 400 });
  const existingPayment = await prisma.payment.findFirst({ where: { userId: user.id, courseId: examSession.exam.courseId, status: "COMPLETED" } });
  if (existingPayment || user.role === "ADMIN") {
    const existingCertificate = await prisma.certificate.findFirst({ where: { userId: user.id, courseId: examSession.exam.courseId, sessionId: examSession.id }, orderBy: { issuedAt: "desc" } });
    if (existingCertificate) {
      return NextResponse.json({ issued: existingCertificate.status === "APPROVED", certificateNo: existingCertificate.certificateNo, verificationHash: existingCertificate.verificationHash, issuedTo: user.fullName || user.name || session.email, verificationUrl: `/verify/${existingCertificate.verificationHash}`, status: existingCertificate.status });
    }
    const certificate = await prisma.$transaction((transaction) => issueCertificate(transaction, { userId: user.id, examId: examSession.exam.id, courseId: examSession.exam.courseId, sessionId: examSession.id }));
    return NextResponse.json({ issued: certificate.status === "APPROVED", certificateNo: certificate.certificateNo, verificationHash: certificate.verificationHash, issuedTo: user.fullName || user.name || session.email, verificationUrl: `/verify/${certificate.verificationHash}`, status: certificate.status });
  }

  return NextResponse.json({ error: "Certificate issuance is payment-gated and requires admin approval." }, { status: 402 });
}

export async function DELETE(request: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Only an administrator can clear certificates." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { verificationHash?: string };
  if (!body.verificationHash) return NextResponse.json({ error: "A verification hash is required." }, { status: 400 });
  try {
    await prisma.certificate.delete({ where: { verificationHash: body.verificationHash } });
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientKnownRequestError") return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    throw error;
  }
  return NextResponse.json({ ok: true, cleared: true });
}