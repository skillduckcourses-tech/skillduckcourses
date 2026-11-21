import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

async function authenticatedUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tickets = await prisma.legacySupportTicket.findMany({ where: { userId: user.id }, include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Student support ticket load failed", error);
    return NextResponse.json({ error: "Unable to load support tickets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as {
      subject?: unknown;
      message?: unknown;
      courseSlug?: unknown;
    } | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
    }

    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!subject || subject.length > 200 || !message || message.length > 5000) {
      return NextResponse.json({ error: "Enter a subject up to 200 characters and a message up to 5,000 characters." }, { status: 400 });
    }
    if (body.courseSlug !== undefined && body.courseSlug !== null && typeof body.courseSlug !== "string") {
      return NextResponse.json({ error: "Invalid course selection." }, { status: 400 });
    }

    const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug.trim() : "";
    if (courseSlug.length > 200) return NextResponse.json({ error: "Invalid course selection." }, { status: 400 });
    const course = courseSlug ? await prisma.course.findUnique({ where: { slug: courseSlug }, select: { id: true } }) : null;
    if (courseSlug && !course) return NextResponse.json({ error: "The selected course was not found." }, { status: 404 });

    const ticket = await prisma.legacySupportTicket.create({
      data: { userId: user.id, courseId: course?.id, subject, message },
    });
    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (error) {
    console.error("Student support ticket submission failed", error);
    return NextResponse.json({ error: "Unable to submit your support ticket." }, { status: 500 });
  }
}