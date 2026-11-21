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
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.legacySupportTicket.findMany({ where: { userId: user.id }, include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { subject?: string; message?: string; courseSlug?: string };
  if (!body.subject?.trim() || !body.message?.trim()) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  const course = body.courseSlug ? await prisma.course.findUnique({ where: { slug: body.courseSlug }, select: { id: true } }) : null;
  const ticket = await prisma.legacySupportTicket.create({ data: { userId: user.id, courseId: course?.id, subject: body.subject.trim(), message: body.message.trim() } });
  return NextResponse.json({ ok: true, ticket }, { status: 201 });
}