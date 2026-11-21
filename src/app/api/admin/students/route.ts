import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const [progressRows, examRows, certificateRows] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { isCompleted: true },
      select: {
        userId: true,
        courseId: true,
        isCompleted: true,
        updatedAt: true,
        user: { select: { name: true, fullName: true, email: true } },
        course: { select: { title: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.examSession.findMany({
      where: { status: "PASSED", completedAt: { not: null } },
      select: {
        id: true,
        userId: true,
        examId: true,
        score: true,
        completedAt: true,
        status: true,
        exam: { select: { id: true, title: true, courseId: true, course: { select: { title: true, slug: true } } } },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.certificate.findMany({
      where: { status: "APPROVED" },
      select: {
        userId: true,
        courseId: true,
        examId: true,
        certificateNo: true,
        verificationHash: true,
        issuedAt: true,
        user: { select: { name: true, fullName: true, email: true } },
        course: { select: { title: true, slug: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const passingSessionsByCourse = new Map<string, (typeof examRows)[number]>();
  for (const session of examRows) {
    const key = `${session.userId}:${session.exam.courseId}`;
    const current = passingSessionsByCourse.get(key);
    if (!current || (session.completedAt && (!current.completedAt || session.completedAt > current.completedAt))) {
      passingSessionsByCourse.set(key, session);
    }
  }

  const certificatesByCourse = new Map<string, (typeof certificateRows)[number]>();
  for (const certificate of certificateRows) {
    const key = `${certificate.userId}:${certificate.courseId}`;
    const current = certificatesByCourse.get(key);
    if (!current || (certificate.issuedAt && (!current.issuedAt || certificate.issuedAt > current.issuedAt))) {
      certificatesByCourse.set(key, certificate);
    }
  }

  const students = progressRows
    .map((progress) => {
      const key = `${progress.userId}:${progress.courseId}`;
      const matchingSession = passingSessionsByCourse.get(key);
      const matchingCertificate = certificatesByCourse.get(key);
      if (!matchingSession || !matchingCertificate) return null;

      const completedAt = new Date(
        Math.max(
          new Date(progress.updatedAt).getTime(),
          matchingSession.completedAt ? new Date(matchingSession.completedAt).getTime() : 0,
          matchingCertificate.issuedAt ? new Date(matchingCertificate.issuedAt).getTime() : 0,
        ),
      );

      return {
        userName: matchingCertificate.user.fullName || matchingCertificate.user.name || matchingCertificate.user.email,
        email: matchingCertificate.user.email,
        courseTitle: matchingCertificate.course.title || matchingSession.exam.course.title,
        score: Math.max(0, Number(matchingSession.score ?? 0)),
        completedAt: completedAt.toISOString(),
        certificateNo: matchingCertificate.certificateNo,
        verificationHash: matchingCertificate.verificationHash,
        verificationUrl: `/verify/${matchingCertificate.verificationHash}`,
        progressPercent: 100,
        status: "CERTIFIED" as const,
      };
    })
    .filter((student): student is NonNullable<typeof student> => Boolean(student))
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());

  return NextResponse.json({ students });
}
