import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { findCourse } from "@/src/lib/course-lookup";

async function getUserId() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  return user?.id ?? null;
}

async function getCourse(slug: string) {
  const baseCourse = await findCourse(slug);
  if (!baseCourse) return null;
  return prisma.course.findUnique({
    where: { id: baseCourse.id },
    select: {
      id: true,
      videos: { where: { isPublished: true }, orderBy: { position: "asc" }, take: 1, select: { durationSeconds: true } },
      resources: { where: { contentType: { in: ["YOUTUBE", "PDF"] } }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
      exams: { where: { isPublished: true }, take: 1, select: { id: true } },
      lessons: { orderBy: { createdAt: "asc" }, select: { id: true, estimatedReadTime: true } },
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const course = await getCourse((await params).slug);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  const durationSeconds = course.lessons.reduce((total, lesson) => total + Math.max(1, lesson.estimatedReadTime), 0);
  const [progress, lessonProgress] = await Promise.all([
    prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } }),
    course.lessons.length ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: course.lessons.map(({ id }) => id) } }, select: { lessonId: true, viewedSeconds: true } }) : Promise.resolve([]),
  ]);
  const certificate = await prisma.certificate.findFirst({ where: { userId, courseId: course.id, status: { in: ["PENDING_APPROVAL", "APPROVED"] } }, orderBy: { issuedAt: "desc" }, select: { status: true } });
  const watchedSeconds = Math.min(progress?.watchedSeconds ?? 0, durationSeconds);
  const readingSeconds = Math.min(progress?.readingSeconds ?? 0, durationSeconds);
  const viewedByLesson = new Map(lessonProgress.map((entry) => [entry.lessonId, entry.viewedSeconds]));
  const completedLessons = course.lessons.filter((lesson) => (viewedByLesson.get(lesson.id) || 0) >= Math.ceil(Math.max(1, lesson.estimatedReadTime) * 0.8)).length;
  const viewedSeconds = course.lessons.reduce((total, lesson) => total + Math.min(viewedByLesson.get(lesson.id) || 0, lesson.estimatedReadTime), 0);
  const passed = await prisma.examSession.findFirst({ where: { userId, exam: { courseId: course.id }, status: "PASSED" }, select: { id: true } });
  return NextResponse.json({ watchedSeconds, readingSeconds, points: progress?.points ?? 0, durationSeconds, isCompleted: Boolean(passed || certificate), completedLessons, totalLessons: course.lessons.length, progressPercent: durationSeconds ? Math.min(100, Math.round((viewedSeconds / durationSeconds) * 100)) : 0, canStartExam: course.lessons.length > 0 && completedLessons === course.lessons.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const course = await getCourse((await params).slug);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  const durationSeconds = course.lessons.reduce((total, lesson) => total + Math.max(1, lesson.estimatedReadTime), 0);
  if (!durationSeconds) return NextResponse.json({ error: "This course has no assigned learning module." }, { status: 409 });
  const body = (await request.json().catch(() => ({}))) as { watchedSeconds?: unknown; readingSeconds?: unknown };
  const watchedSeconds = typeof body.watchedSeconds === "number" && Number.isFinite(body.watchedSeconds) && body.watchedSeconds >= 0 ? Math.min(Math.floor(body.watchedSeconds), durationSeconds) : 0;
  const readingSeconds = typeof body.readingSeconds === "number" && Number.isFinite(body.readingSeconds) && body.readingSeconds >= 0 ? Math.min(Math.floor(body.readingSeconds), durationSeconds) : 0;
  if (!watchedSeconds && !readingSeconds) return NextResponse.json({ error: "A valid watchedSeconds or readingSeconds value is required." }, { status: 400 });
  const activeSeconds = Math.max(watchedSeconds, readingSeconds);
  const existing = await prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, select: { isCompleted: true } });
  const progress = await prisma.$transaction(async (transaction) => {
    const updatedProgress = await transaction.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: { userId, courseId: course.id, watchedSeconds, readingSeconds, points: Math.floor(activeSeconds / 60), isCompleted: false },
      update: { watchedSeconds: existing?.isCompleted ? undefined : watchedSeconds, readingSeconds: existing?.isCompleted ? undefined : readingSeconds, points: Math.floor(activeSeconds / 60), isCompleted: existing?.isCompleted || false },
    });
    return updatedProgress;
  });
  return NextResponse.json({ watchedSeconds: progress.watchedSeconds, readingSeconds: progress.readingSeconds, points: progress.points, durationSeconds, isCompleted: progress.isCompleted, progressPercent: Math.min(100, Math.round((Math.max(progress.watchedSeconds, progress.readingSeconds) / durationSeconds) * 100)), certificate: null });
}
