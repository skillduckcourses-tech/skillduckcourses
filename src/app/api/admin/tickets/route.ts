import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const tickets = await prisma.legacySupportTicket.findMany({ include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ tickets });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { id?: number; status?: "OPEN" | "IN_PROGRESS" | "RESOLVED"; adminNote?: string };
  if (!body.id || !body.status || !body.adminNote?.trim()) return NextResponse.json({ error: "Ticket ID, reply, and status are required." }, { status: 400 });
  const ticket = await prisma.legacySupportTicket.update({ where: { id: body.id }, data: { status: body.status, adminNote: body.adminNote.trim() } });
  return NextResponse.json({ ok: true, ticket });
}