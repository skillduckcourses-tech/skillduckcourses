import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { findCourse } from "@/src/lib/course-lookup";
import { youtubeVideoId } from "@/src/lib/youtube";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await verifySession((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const baseCourse = await findCourse(slug);
  const course = baseCourse && await prisma.course.findUnique({ where: { id: baseCourse.id }, include: { videos: { where: { isPublished: true }, orderBy: { position: "asc" }, take: 1 }, resources: { orderBy: { createdAt: "desc" } }, exams: { where: { isPublished: true }, select: { id: true, title: true, durationMin: true } } } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = session && await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  const progress = user && await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { watchedSeconds: true, readingSeconds: true, points: true, isCompleted: true } });
  const certificate = user && await prisma.certificate.findFirst({ where: { userId: user.id, courseId: course.id, status: { in: ["PENDING_APPROVAL", "APPROVED"] } }, orderBy: { issuedAt: "desc" }, select: { verificationHash: true, certificateNo: true, status: true } });
  const passedExam = user && await prisma.examSession.findFirst({ where: { userId: user.id, exam: { courseId: course.id }, status: "PASSED" }, orderBy: { completedAt: "desc" }, select: { id: true } });
  const enrollment = user && await prisma.enrollment.findUnique({ where: { userId_courseSlug: { userId: user.id, courseSlug: course.slug } }, select: { id: true } });
  const paidPayment = user && await prisma.payment.findFirst({ where: { userId: user.id, courseId: course.id, status: "COMPLETED" }, select: { id: true } });
  const requestedLessonId = Number(new URL(_request.url).searchParams.get("lessonId"));
  const lesson = await prisma.lesson.findFirst({
    where: {
      courseId: course.id,
      ...(Number.isSafeInteger(requestedLessonId) && requestedLessonId > 0 ? { id: requestedLessonId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, description: true, hasVideo: true, slideUrls: true, documentUrl: true, isPdfDocument: true, pdfPageCount: true, estimatedReadTime: true },
  });
  if (new URL(_request.url).searchParams.has("lessonId") && !lesson) return NextResponse.json({ error: "Lesson not found for this course." }, { status: 404 });
  const resourceVideo = course.resources.find((resource) => resource.contentType === "YOUTUBE");
  const video = course.videos[0]
    ? { kind: "youtube" as const, sourceUrl: `https://www.youtube.com/embed/${course.videos[0].videoId}`, videoId: course.videos[0].videoId, title: course.videos[0].title, durationSeconds: course.videos[0].durationSeconds }
    : resourceVideo
      ? { kind: youtubeVideoId(resourceVideo.sourceUrl) ? "youtube" as const : "file" as const, sourceUrl: youtubeVideoId(resourceVideo.sourceUrl) ? `https://www.youtube.com/embed/${youtubeVideoId(resourceVideo.sourceUrl)}` : resourceVideo.sourceUrl, videoId: youtubeVideoId(resourceVideo.sourceUrl) || "", title: resourceVideo.title, durationSeconds: 600 }
      : null;
  return NextResponse.json({ course: { slug: course.slug, title: course.title, description: course.description, category: course.category, price: COURSE_PRICE_PKR }, lesson: lesson ? { ...lesson, slideUrls: lesson.slideUrls ?? [] } : null, video, resources: course.resources, readingOnly: !video && (Boolean(lesson?.isPdfDocument) || course.resources.some((resource) => resource.contentType === "PDF")), exam: course.exams[0] || null, isPaid: Boolean(enrollment || paidPayment), progress: { ...(progress || { watchedSeconds: 0, readingSeconds: 0, points: 0, isCompleted: false }), isCompleted: Boolean(passedExam || certificate) }, certificate: certificate || null });
}