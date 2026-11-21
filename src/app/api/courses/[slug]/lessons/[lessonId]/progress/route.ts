import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type RouteContext = { params: Promise<{ slug: string; lessonId: string }> };

async function getContext(params: RouteContext["params"]) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  if (!user) return { response: NextResponse.json({ error: "User not found." }, { status: 404 }) } as const;
  const { slug, lessonId: rawLessonId } = await params;
  const lessonId = Number(rawLessonId);
  const lesson = Number.isSafeInteger(lessonId) && lessonId > 0
    ? await prisma.lesson.findFirst({
      where: { id: lessonId, course: { slug, isPublished: true } },
      select: { id: true, estimatedReadTime: true, courseId: true },
    })
    : null;
  if (!lesson) return { response: NextResponse.json({ error: "Lesson not found." }, { status: 404 }) } as const;
  return { user, lesson } as const;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const context = await getContext(params);
    if ("response" in context) return context.response;
    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: context.user.id, lessonId: context.lesson.id } },
      create: { userId: context.user.id, lessonId: context.lesson.id },
      update: {},
      select: { viewedSeconds: true },
    });
    const targetSeconds = Math.max(1, context.lesson.estimatedReadTime);
    const requiredSeconds = Math.ceil(targetSeconds * 0.8);
    return NextResponse.json({
      lessonId: context.lesson.id,
      viewedSeconds: progress.viewedSeconds,
      targetSeconds,
      requiredSeconds,
      progressPercent: Math.min(100, Math.floor((progress.viewedSeconds / targetSeconds) * 100)),
      completed: progress.viewedSeconds >= requiredSeconds,
    });
  } catch (error) {
    console.error("Lesson progress load failed", error);
    return NextResponse.json({ error: "Unable to load lesson progress." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const context = await getContext(params);
    if ("response" in context) return context.response;
    const body = await request.json().catch(() => ({})) as { deltaSeconds?: unknown };
    const requestedSeconds = typeof body.deltaSeconds === "number" && Number.isFinite(body.deltaSeconds)
      ? Math.max(0, Math.min(15, Math.floor(body.deltaSeconds)))
      : 0;
    const where = { userId_lessonId: { userId: context.user.id, lessonId: context.lesson.id } };
    const current = await prisma.lessonProgress.upsert({
      where,
      create: { userId: context.user.id, lessonId: context.lesson.id },
      update: {},
    });
    const now = new Date();
    const elapsedAllowance = Math.max(0, Math.floor((now.getTime() - current.lastActivityAt.getTime()) / 1000));
    const acceptedSeconds = Math.min(requestedSeconds, elapsedAllowance, 15);
    const targetSeconds = Math.max(1, context.lesson.estimatedReadTime);
    const updated = await prisma.lessonProgress.update({
      where: { id: current.id },
      data: {
        viewedSeconds: Math.min(targetSeconds, current.viewedSeconds + acceptedSeconds),
        lastActivityAt: now,
      },
      select: { viewedSeconds: true },
    });
    const requiredSeconds = Math.ceil(targetSeconds * 0.8);
    return NextResponse.json({
      lessonId: context.lesson.id,
      viewedSeconds: updated.viewedSeconds,
      acceptedSeconds,
      targetSeconds,
      requiredSeconds,
      progressPercent: Math.min(100, Math.floor((updated.viewedSeconds / targetSeconds) * 100)),
      completed: updated.viewedSeconds >= requiredSeconds,
    });
  } catch (error) {
    console.error("Lesson progress update failed", error);
    return NextResponse.json({ error: "Unable to save lesson progress." }, { status: 500 });
  }
}