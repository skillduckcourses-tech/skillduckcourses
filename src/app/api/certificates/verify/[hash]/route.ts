import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  try {
    const { hash } = await params;
    const certificate = await prisma.certificate.findUnique({ where: { verificationHash: hash }, include: { user: { select: { fullName: true, name: true } }, course: { select: { title: true } }, exam: { select: { title: true, course: { select: { title: true } } } } } });
    if (!certificate) return NextResponse.json({ valid: false, error: "Certificate not found." }, { status: 404 });
    const expired = Boolean(certificate.expiresAt && certificate.expiresAt <= new Date());
    const courseTitle = certificate.course?.title || certificate.exam.course?.title || certificate.exam.title;
    if (!courseTitle) return NextResponse.json({ valid: false, error: "Certificate course details are unavailable." }, { status: 503 });
    if (certificate.status !== "APPROVED") {
      return NextResponse.json({ valid: false, status: certificate.status, error: "This certificate is pending admin approval or has been rejected.", certificateNo: certificate.certificateNo, issuedTo: certificate.user?.fullName || certificate.user?.name || "Certificate holder", course: courseTitle, issuedAt: certificate.issuedAt, verificationHash: certificate.verificationHash, verificationUrl: `/verify/${certificate.verificationHash}` });
    }
    return NextResponse.json({ valid: !expired, status: expired ? "expired" : "valid", certificateNo: certificate.certificateNo, issuedTo: certificate.user?.fullName || certificate.user?.name || "Certificate holder", course: courseTitle, issuedAt: certificate.issuedAt, verificationHash: certificate.verificationHash, verificationUrl: `/verify/${certificate.verificationHash}` });
  } catch (error) {
    console.error("Public certificate verification failed", error);
    return NextResponse.json({ valid: false, error: "Verification service unavailable." }, { status: 503 });
  }
}