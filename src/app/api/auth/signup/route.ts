import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertAuthSecretConfigured, AuthConfigurationError, createSession, SESSION_COOKIE } from "@/src/lib/auth";
import { hashPassword } from "@/src/lib/server-auth";
import { assertDatabaseConfigured, DatabaseConfigurationError, isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { sendTransactionalEmail } from "@/src/lib/mailer";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown; name?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
  const name = requestedName || email.split("@")[0] || "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  let user: { id: number; email: string; name: string | null };
  let sessionToken: string;
  try {
    assertAuthSecretConfigured();
    assertDatabaseConfigured();
    user = await prisma.user.create({
      data: { email, name, fullName: name, passwordHash: await hashPassword(password), role: "STUDENT" },
      select: { id: true, email: true, name: true },
    });
    sessionToken = await createSession({
      email: user.email,
      name: user.name || user.email,
      isAdmin: false,
      canBypassPayment: false,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    if (error instanceof AuthConfigurationError) {
      console.error("Signup is blocked by invalid authentication configuration.", error.code);
      return NextResponse.json({ error: "Sign-in is not configured correctly. Please contact support.", code: error.code }, { status: 503 });
    }
    if (error instanceof DatabaseConfigurationError) {
      console.error("Signup is blocked by invalid database configuration.", error.code);
      return NextResponse.json({ error: "The account service is not configured correctly. Please contact support.", code: error.code }, { status: 503 });
    }
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Failed to create a signup account.", diagnostics);
    if (isPrismaConnectionFailure(error)) {
      return NextResponse.json({ error: "The account database is temporarily unavailable. Please try again shortly.", code: "DATABASE_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Account creation failed because of a server error. Please try again later.", code: "SIGNUP_INTERNAL_ERROR" }, { status: 500 });
  }

  try {
    await sendTransactionalEmail(user.email, "Welcome to Certified SkillDuck", `<p>Welcome, ${user.name || user.email}.</p><p>Your account is ready for professional assessments and certificates.</p>`);
  } catch (error) {
    console.error("Account created, but the welcome email could not be sent.", error);
  }

  const response = NextResponse.json({ ok: true, user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}