import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/server-session";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { courseId?: number; lines?: string };
  if (!body.courseId || !body.lines?.trim()) return NextResponse.json({ error: "Select a published course and provide batch lines." }, { status: 400 });
  const course = await prisma.course.findFirst({ where: { id: body.courseId, isPublished: true }, select: { id: true, slug: true, title: true } });
  if (!course) return NextResponse.json({ error: "Select an existing published course." }, { status: 404 });
  const rows = body.lines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, position) => {
    const [videoId, title, hook, attribution] = line.split("|").map((part) => part.trim());
    return { courseId: body.courseId as number, videoId, title: title || videoId, hook, attribution, position, isPublished: true };
  });
  const result = await prisma.youTubeVideo.createMany({ data: rows, skipDuplicates: true });
  return NextResponse.json({ ok: true, imported: result.count, course });
}