import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { courseCategoryLabel } from "@/src/lib/course-lookup";

export async function GET() {
  try {
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Your account could not be found. Please sign in again." }, { status: 404 });
    const [enrollments, certificateRecords, activeAssessments, courses, enrollmentCounts, passedSessions, payments, certificateStatuses] = await Promise.all([
      prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseSlug: true } }),
      prisma.certificate.findMany({ where: { userId: user.id, status: "APPROVED" }, orderBy: { issuedAt: "desc" }, include: { user: { select: { fullName: true, name: true } }, course: { select: { title: true } } } }),
      prisma.examSession.count({ where: { userId: user.id, status: "IN_PROGRESS" } }),
      prisma.course.findMany({ where: { isPublished: true }, orderBy: [{ isTrending: "desc" }, { ranking: "asc" }, { title: "asc" }], select: { id: true, slug: true, title: true, description: true, category: true, isTrending: true, ranking: true } }),
      prisma.enrollment.groupBy({ by: ["courseSlug"], _count: { _all: true } }),
      prisma.examSession.findMany({ where: { userId: user.id, status: "PASSED", completedAt: { not: null } }, orderBy: { completedAt: "desc" }, select: { exam: { select: { courseId: true, course: { select: { slug: true } } } } } }),
      prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { courseId: true, status: true } }),
      prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" }, select: { courseId: true, status: true, verificationHash: true, certificateNo: true } }),
    ]);
    const demand = new Map(enrollmentCounts.map((entry) => [entry.courseSlug, entry._count._all]));
    const completedCourseSlugs = new Set(passedSessions.map(({ exam }) => exam.course.slug));
    const latestPayments = new Map<number, (typeof payments)[number]>();
    for (const payment of payments) if (!latestPayments.has(payment.courseId)) latestPayments.set(payment.courseId, payment);
    const latestCertificates = new Map<number, (typeof certificateStatuses)[number]>();
    for (const certificate of certificateStatuses) if (!latestCertificates.has(certificate.courseId)) latestCertificates.set(certificate.courseId, certificate);
    const courseViews = courses.map((course) => {
      const payment = latestPayments.get(course.id);
      const certificate = latestCertificates.get(course.id);
      return {
        id: course.slug,
        title: course.title,
        description: course.description || "Professional learning pathway.",
        category: courseCategoryLabel(course.category),
        isTrending: course.isTrending,
        ranking: course.ranking,
        enrollmentCount: demand.get(course.slug) || 0,
        isCompleted: completedCourseSlugs.has(course.slug),
        paymentStatus: payment?.status ?? null,
        certificateStatus: certificate?.status ?? null,
        verificationHash: certificate?.verificationHash ?? null,
        certificateNo: certificate?.certificateNo ?? null,
      };
    });
    return NextResponse.json({ session, enrollments: enrollments.map(({ courseSlug }) => courseSlug), completedCourseSlugs: [...completedCourseSlugs], counters: { enrolled: enrollments.length, certificates: certificateRecords.length, activeAssessments }, certificates: certificateRecords.map((certificate) => ({ certificateNo: certificate.certificateNo, verificationHash: certificate.verificationHash, issuedTo: certificate.user.fullName || certificate.user.name || session.email, course: certificate.course.title, issuedAt: certificate.issuedAt })), courses: courseViews, completedCourses: courseViews.filter((course) => course.isCompleted) });
  } catch (error) {
    console.error("Dashboard data load failed", error);
    return NextResponse.json({ error: "We could not load your dashboard right now. Please try again." }, { status: 503 });
  }
}