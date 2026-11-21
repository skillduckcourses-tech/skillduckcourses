import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

type LegacyTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

function isLegacyTicketStatus(status: unknown): status is LegacyTicketStatus {
  return status === "OPEN" || status === "IN_PROGRESS" || status === "RESOLVED";
}

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const tickets = await prisma.legacySupportTicket.findMany({ include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Admin support ticket load failed", error);
    return NextResponse.json({ error: "Unable to load support tickets." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = await request.json().catch(() => null) as {
      id?: unknown;
      status?: unknown;
      adminNote?: unknown;
    } | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
    }

    const note = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
    if (typeof body.id !== "number" || !Number.isSafeInteger(body.id) || body.id <= 0 || !isLegacyTicketStatus(body.status) || !note || note.length > 5000) {
      return NextResponse.json({ error: "A valid ticket ID, status, and reply up to 5,000 characters are required." }, { status: 400 });
    }

    const ticket = await prisma.legacySupportTicket.update({
      where: { id: body.id },
      data: { status: body.status, adminNote: note },
    });
    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }
    console.error("Admin support ticket update failed", error);
    return NextResponse.json({ error: "Unable to update the support ticket." }, { status: 500 });
  }
}