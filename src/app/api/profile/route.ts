import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

async function currentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { email: session.email }, select: { id: true, email: true, name: true, fullName: true } });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { fullName?: unknown };
  if (typeof body.fullName !== "string" || body.fullName.trim().split(/\s+/).length < 2) return NextResponse.json({ error: "Enter your complete first and last name." }, { status: 400 });
  const fullName = body.fullName.trim().replace(/\s+/g, " ");
  if (user.fullName?.trim()) return NextResponse.json({ error: "Your certificate name has already been locked and cannot be changed." }, { status: 409 });
  const locked = await prisma.user.updateMany({ where: { id: user.id, OR: [{ fullName: null }, { fullName: "" }] }, data: { fullName, name: fullName } });
  if (locked.count !== 1) return NextResponse.json({ error: "Your certificate name has already been locked and cannot be changed." }, { status: 409 });
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, email: true, name: true, fullName: true } });
  return NextResponse.json({ user: updated, locked: true });
}
