import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

type HelpDeskAction = "reply" | "toggleAi" | "resolve" | "reopen";

function isHelpDeskAction(action: unknown): action is HelpDeskAction {
  return action === "reply" || action === "toggleAi" || action === "resolve" || action === "reopen";
}

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const tickets = await prisma.supportTicket.findMany({
      take: 100,
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Admin help-desk inbox load failed", error);
    return NextResponse.json({ error: "Unable to load support conversations." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = await request.json().catch(() => null) as {
      ticketId?: unknown;
      action?: unknown;
      message?: unknown;
      isAiHandled?: unknown;
    } | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
    }
    if (typeof body.ticketId !== "string" || !body.ticketId || body.ticketId.length > 100 || !isHelpDeskAction(body.action)) {
      return NextResponse.json({ error: "A valid ticket and action are required." }, { status: 400 });
    }
    const ticket = await prisma.supportTicket.findUnique({ where: { id: body.ticketId }, select: { id: true } });
    if (!ticket) return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });

    if (body.action === "reply") {
      const content = typeof body.message === "string" ? body.message.trim() : "";
      if (!content || content.length > 5000) return NextResponse.json({ error: "Enter an admin reply up to 5,000 characters." }, { status: 400 });
      await prisma.$transaction([
        prisma.supportMessage.create({ data: { ticketId: ticket.id, sender: "ADMIN", content } }),
        prisma.supportTicket.update({ where: { id: ticket.id }, data: { isAiHandled: false, status: "OPEN", updatedAt: new Date() } }),
      ]);
    } else if (body.action === "toggleAi") {
      if (typeof body.isAiHandled !== "boolean") return NextResponse.json({ error: "Select whether AI auto-reply should be on or off." }, { status: 400 });
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { isAiHandled: body.isAiHandled, updatedAt: new Date() } });
    } else {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: body.action === "resolve" ? "RESOLVED" : "OPEN", updatedAt: new Date() },
      });
    }

    const updated = await prisma.supportTicket.findUnique({ where: { id: ticket.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    return NextResponse.json({ ok: true, ticket: updated });
  } catch (error) {
    console.error("Admin help-desk action failed", error);
    return NextResponse.json({ error: "Unable to update the support conversation." }, { status: 500 });
  }
}
