import { NextResponse } from "next/server";
import { ADMIN_EMAIL, createSession, SESSION_COOKIE } from "@/src/lib/auth";
import { hashPassword, verifyLocalCredentials } from "@/src/lib/server-auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user && email === (process.env.LOCAL_ADMIN_EMAIL || ADMIN_EMAIL).toLowerCase()) {
    user = await prisma.user.create({
      data: {
        email,
        name: process.env.LOCAL_ADMIN_NAME || "Muhammad Wajdan Chaudhry",
        passwordHash: await hashPassword(process.env.LOCAL_ADMIN_PASSWORD || "local-admin-password"),
        role: "ADMIN",
      },
    });
  }

  const session = user && await verifyLocalCredentials(email, body.password, user.passwordHash, user.fullName || user.name || email);
  if (!session) return NextResponse.json({ error: "Invalid local credentials." }, { status: 401 });

  session.isAdmin = user?.role === "ADMIN";
  session.canBypassPayment = session.isAdmin;

  const response = NextResponse.json({ ok: true, user: session });
  response.cookies.set(SESSION_COOKIE, await createSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}