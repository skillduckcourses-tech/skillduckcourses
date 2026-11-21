import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/server-session";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 });
  const payment = await prisma.payment.findUnique({ where: { id }, select: { proofUrl: true } });
  if (!payment?.proofUrl || !/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(payment.proofUrl)) {
    return NextResponse.json({ error: "Payment proof not found." }, { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "private", "payment-proofs", payment.proofUrl));
    const extension = path.extname(payment.proofUrl).toLowerCase();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Content-Disposition": `inline; filename="payment-proof${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Payment proof file is unavailable." }, { status: 404 });
  }
}