import { NextResponse } from "next/server";
import { ADMIN_EMAIL, assertAuthSecretConfigured, AuthConfigurationError, createSession, SESSION_COOKIE } from "@/src/lib/auth";
import { hashPassword, verifyLocalCredentials } from "@/src/lib/server-auth";
import { assertDatabaseConfigured, DatabaseConfigurationError, isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
    if (typeof body?.email !== "string" || typeof body.password !== "string" || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    assertAuthSecretConfigured();
    assertDatabaseConfigured();

    let user = await prisma.user.findUnique({ where: { email } });
    const adminEmail = (process.env.LOCAL_ADMIN_EMAIL || ADMIN_EMAIL).trim().toLowerCase();
    if (!user && email === adminEmail) {
      const adminPassword = process.env.LOCAL_ADMIN_PASSWORD;
      if (process.env.NODE_ENV === "production" && !adminPassword) {
        console.error("Cannot initialize the production admin account: LOCAL_ADMIN_PASSWORD is not configured.");
        return NextResponse.json({ error: "Admin sign-in is not configured. Please contact support.", code: "ADMIN_AUTH_NOT_CONFIGURED" }, { status: 503 });
      }
      user = await prisma.user.create({
        data: {
          email,
          name: process.env.LOCAL_ADMIN_NAME || "Muhammad Wajdan Chaudhry",
          passwordHash: await hashPassword(adminPassword || "local-admin-password"),
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
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error("Local sign-in is blocked by invalid auth configuration.", error.code);
      return NextResponse.json({ error: "Sign-in is not configured correctly. Please contact support.", code: error.code }, { status: 503 });
    }
    if (error instanceof DatabaseConfigurationError) {
      console.error("Local sign-in is blocked by invalid database configuration.", error.code);
      return NextResponse.json({ error: "The account service is not configured correctly. Please contact support.", code: error.code }, { status: 503 });
    }
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Local sign-in failed.", diagnostics);
    if (isPrismaConnectionFailure(error)) {
      return NextResponse.json({ error: "The account database is temporarily unavailable. Please try again shortly.", code: "DATABASE_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Sign-in failed because of a server error. Please try again later.", code: "AUTH_INTERNAL_ERROR" }, { status: 500 });
  }
}
