import type { SupportMessage } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { COURSE_PRICE_PKR } from "@/src/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const systemPrompt = `You are the Certified SkillDuck Help Desk assistant. Answer only from this official knowledge base and do not invent policies, transaction outcomes, or certificate status.

Official knowledge base:
- Platform: Certified SkillDuck, an assessment-first learning management system.
- Course and certificate pathway fee: ${COURSE_PRICE_PKR} PKR for local payment, or minimum $10 USD for international bank/crypto.
- Local payment methods: Meezan Bank account 02290107660173; UPaisa/NayaPay 03377775957; secondary JazzCash/EasyPaisa wallet 03398033003. Account title for all: Muhammad Wajdan Chaudhry.
- International bank: Citibank account/routing number 70587070002569995, account title Muhammad Wajdan Chaudhry.
- Crypto: USDT minimum $10 USD; use the wallet and network displayed on the official checkout page.
- Process: Complete the course and MCQ assessment, submit payment TID/reference and optional receipt, wait for an admin to verify (usually within 1–2 hours), then download the official QR-verified certificate from the dashboard.
- Be helpful, polite, professional, concise, and support English and Roman Urdu. Never ask for passwords, full card data, secret keys, or recovery phrases.
- If a human/admin is requested, or the issue involves a disputed/missing/duplicate payment, suspected fraud, refund/chargeback, or a complex transaction issue, set escalate=true and tell the student an admin has been notified.

Return only JSON: {"reply":"...", "escalate": false}.`;

function escalationRequested(text: string) {
  const value = text.toLowerCase();
  const asksHuman = /\b(human|admin|agent|real person|representative|speak to someone|talk to someone)\b/.test(value)
    || /\b(kisi|insaan|admin|banday|banday se)\b/.test(value) && /baat|talk|chat|connect/.test(value);
  const paymentDispute = /(charged twice|double charged|duplicate payment|payment (missing|not received|not credited|failed but)|sent (the )?(wrong|incorrect) amount|wrong network|refund|chargeback|fraud|scam|transaction (missing|not found|not showing)|payment dispute|paisay (kat|gaye|bhej) |payment nahi|payment show nahi)/.test(value);
  return asksHuman || paymentDispute;
}

type AssistantReply = { reply: string; escalate: boolean };

function builtInReply(message: string): AssistantReply | null {
  const value = message.toLowerCase();
  if (/\b(verify|verification|certificate id|certificate number|check (my |a |the )?certificate|tasdeeq)\b/.test(value)) {
    return {
      reply: "You can verify a certificate on the SkillDuck verification page using its unique Certificate ID. Payment proofs are reviewed by an admin within a few hours after you submit your receipt.",
      escalate: false,
    };
  }
  if (/\b(payment methods?|ways to pay|how can i pay|bank transfer|jazzcash|upaisa|nayapay|meezan|citibank|usdt|crypto)\b/.test(value)) {
    return {
      reply: "Available payment methods are Meezan Bank, UPaisa / NayaPay, JazzCash, Citibank Wire, and USDT (Tron). Submit your transaction ID and receipt through the checkout page.",
      escalate: false,
    };
  }
  if (/\b(fee|fees|price|cost|how much|qeemat|kitne)\b/.test(value)) {
    return {
      reply: `The standard course and certificate pathway fee is PKR ${COURSE_PRICE_PKR}. International payments have a minimum of $10 USD.`,
      escalate: false,
    };
  }
  return null;
}

function fallbackReply(message: string): AssistantReply {
  return builtInReply(message) ?? {
    reply: "Thanks for contacting Certified SkillDuck. Your message has been added to the support inbox, and an admin will reply shortly.",
    escalate: true,
  };
}

async function callAi(message: string, signal: AbortSignal): Promise<{ reply: string; escalate: boolean }> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const text = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
        if (text) {
          const parsed = JSON.parse(text) as { reply?: string; escalate?: boolean };
          if (typeof parsed.reply === "string" && parsed.reply.trim()) return { reply: parsed.reply.trim(), escalate: Boolean(parsed.escalate) };
        }
      }
    } catch (error) {
      console.warn("Gemini help-desk response failed", error);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const text = payload.choices?.[0]?.message?.content;
        if (typeof text === "string") {
          const parsed = JSON.parse(text) as { reply?: string; escalate?: boolean };
          if (typeof parsed.reply === "string" && parsed.reply.trim()) return { reply: parsed.reply.trim(), escalate: Boolean(parsed.escalate) };
        }
      }
    } catch (error) {
      console.warn("OpenAI help-desk response failed", error);
    }
  }

  return fallbackReply(message);
}

function canAccessTicket(ticket: { userId: string | null; userEmail: string | null }, userId: number | null, email: string | null) {
  if (ticket.userId) return userId !== null && ticket.userId === String(userId);
  if (ticket.userEmail) return Boolean(email && ticket.userEmail.toLowerCase() === email.toLowerCase());
  return userId === null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticketId = url.searchParams.get("ticketId");
    const guestEmail = url.searchParams.get("email")?.trim().toLowerCase() || null;
    if (!ticketId || ticketId.length > 100) return NextResponse.json({ error: "A valid ticket ID is required." }, { status: 400 });
    if (guestEmail && (guestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    const user = session ? await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } }) : null;
    if (session && !user) return NextResponse.json({ error: "Please sign in again to continue this conversation." }, { status: 401 });
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!ticket || !canAccessTicket(ticket, user?.id ?? null, session?.email || guestEmail)) {
      return NextResponse.json({ error: "Support conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Help-desk conversation load failed", error);
    return NextResponse.json({ error: "Unable to load your support conversation." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      ticketId?: unknown;
      message?: unknown;
      name?: unknown;
      email?: unknown;
      userName?: unknown;
      userEmail?: unknown;
    };
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 5000) return NextResponse.json({ error: "Enter a message up to 5,000 characters." }, { status: 400 });
    const rawName = typeof body.name === "string" ? body.name : typeof body.userName === "string" ? body.userName : "";
    const rawEmail = typeof body.email === "string" ? body.email : typeof body.userEmail === "string" ? body.userEmail : "";
    const submittedName = rawName.trim();
    const submittedEmail = rawEmail.trim();
    if (submittedName.length > 100) return NextResponse.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
    if (submittedEmail.length > 254 || (submittedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail))) {
      return NextResponse.json({ error: "Enter a valid email address up to 254 characters." }, { status: 400 });
    }
    if (body.ticketId !== undefined && (typeof body.ticketId !== "string" || !body.ticketId || body.ticketId.length > 100)) {
      return NextResponse.json({ error: "Invalid support conversation ID." }, { status: 400 });
    }
    const requestedTicketId = typeof body.ticketId === "string" ? body.ticketId : "";
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    const user = session ? await prisma.user.findUnique({ where: { email: session.email }, select: { id: true, name: true, fullName: true } }) : null;
    if (session && !user) return NextResponse.json({ error: "Please sign in again to continue this conversation." }, { status: 401 });
    const userId = user?.id ?? null;
    const userEmail = session?.email || submittedEmail.toLowerCase() || null;
    const userName = (session?.name || user?.fullName || user?.name || submittedName) || "Student";

    let ticket = requestedTicketId ? await prisma.supportTicket.findUnique({ where: { id: requestedTicketId } }) : null;
    if (requestedTicketId && (!ticket || !canAccessTicket(ticket, userId, userEmail))) {
      return NextResponse.json({ error: "Support conversation not found." }, { status: 404 });
    }
    let messages: SupportMessage[];
    if (!ticket) {
      const createdTicket = await prisma.supportTicket.create({
        data: {
          userId: userId === null ? null : String(userId),
          userName,
          userEmail,
          messages: { create: { sender: "USER", content: message } },
        },
        include: { messages: true },
      });
      ticket = createdTicket;
      messages = createdTicket.messages;
    } else {
      const previousMessages = await prisma.supportMessage.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
      });
      const [userMessage] = await prisma.$transaction([
        prisma.supportMessage.create({ data: { ticketId: ticket.id, sender: "USER", content: message } }),
        prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN", updatedAt: new Date() } }),
      ]);
      messages = [...previousMessages, userMessage];
    }

    if (!ticket.isAiHandled) {
      return NextResponse.json({ ticketId: ticket.id, messages, isAiHandled: false, escalated: true }, { status: requestedTicketId ? 200 : 201 });
    }

    const escalatedByRule = escalationRequested(message);
    const knownReply = builtInReply(message);
    const aiResult = escalatedByRule
      ? { reply: "An admin has been notified and will review this conversation shortly. For payment disputes, include your TID and receipt, but never share passwords or wallet recovery phrases.", escalate: true }
      : knownReply ?? await callAi(message, AbortSignal.timeout(6000));
    const escalated = escalatedByRule || aiResult.escalate;
    try {
      const [aiMessage, updatedTicket] = await prisma.$transaction([
        prisma.supportMessage.create({ data: { ticketId: ticket.id, sender: "AI", content: aiResult.reply } }),
        prisma.supportTicket.update({ where: { id: ticket.id }, data: { isAiHandled: !escalated, updatedAt: new Date() } }),
      ]);
      return NextResponse.json({
        ticketId: updatedTicket.id,
        messages: [...messages, aiMessage],
        isAiHandled: updatedTicket.isAiHandled,
        escalated,
      }, { status: requestedTicketId ? 200 : 201 });
    } catch (error) {
      console.error("Help-desk reply could not be saved; the user message was already recorded.", error);
      return NextResponse.json({
        ticketId: ticket.id,
        messages,
        isAiHandled: ticket.isAiHandled,
        escalated: false,
        warning: "Your message was received, but the assistant response could not be saved. Admin support can still respond.",
      }, { status: requestedTicketId ? 200 : 201 });
    }
  } catch (error) {
    console.error("Help-desk message submission failed", error);
    return NextResponse.json({ error: "Unable to send your message. Please try again." }, { status: 500 });
  }
}
