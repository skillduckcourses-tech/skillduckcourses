import { NextResponse } from "next/server";
import { hashPassword } from "@/src/lib/server-auth";
import { prisma } from "@/src/lib/prisma";
import { sendTransactionalEmail } from "@/src/lib/mailer";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string; name?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password || "";
  const name = body?.name?.trim() || email?.split("@")[0] || "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  try {
    const user = await prisma.user.create({
      data: { email, name, fullName: name, passwordHash: await hashPassword(password), role: "STUDENT" },
      select: { id: true, email: true, name: true },
    });
    await sendTransactionalEmail(user.email, "Welcome to Certified SkillDuck", `<p>Welcome, ${user.name || user.email}.</p><p>Your account is ready for professional assessments and certificates.</p>`);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}