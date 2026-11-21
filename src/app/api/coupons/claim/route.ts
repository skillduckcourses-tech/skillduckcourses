import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { dailyCouponCode } from "@/src/lib/coupon";

export async function POST(request: Request) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (body.code?.trim().toUpperCase() !== dailyCouponCode()) return NextResponse.json({ error: "That coupon is invalid or expired." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const today = new Date();
  const expiresAt = new Date(today); expiresAt.setUTCHours(23, 59, 59, 999);
  const coupon = await prisma.whatsAppCoupon.upsert({ where: { code: dailyCouponCode() }, create: { code: dailyCouponCode(), phoneNumber: "+92 339 8033003", discount: 100, expiresAt }, update: {} });
  const claimed = await prisma.whatsAppCoupon.updateMany({ where: { id: coupon.id, redeemedAt: null, expiresAt: { gt: today } }, data: { userId: user.id, redeemedAt: today } });
  if (!claimed.count) return NextResponse.json({ error: "Today’s free certificate has already been claimed. Please continue to paid checkout." }, { status: 409 });
  return NextResponse.json({ ok: true, discount: 100, message: "Free certificate claim approved." });
}