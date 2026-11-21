import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { findCourse } from "@/src/lib/course-lookup";

export async function POST(request: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = (await request.json().catch(() => ({}))) as { courseId?: string };
  if (!courseId) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const course = await findCourse(courseId);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await prisma.enrollment.upsert({ where: { userId_courseSlug: { userId: user.id, courseSlug: course.slug } }, create: { userId: user.id, courseSlug: course.slug }, update: {} });
  return NextResponse.json({ ok: true, courseId: course.slug });
}