import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";
import { DatabaseConfigurationError, isPrismaConnectionFailure, prisma, prismaErrorDiagnostics } from "@/src/lib/prisma";
import { paymentOptions, type PaymentOptionKey } from "@/src/lib/payments";
import { createCertificateRequest } from "@/src/lib/certificates";

export const runtime = "nodejs";

type CheckoutPayload = { courseSlug?: unknown; method?: unknown; reference?: unknown; proof?: unknown };

class ReceiptValidationError extends Error {}
class ReceiptStorageUnavailableError extends Error {}

async function createPaymentSubmission(input: {
  userId: number;
  courseId: number;
  passedExam: { id: number; examId: number } | null;
  amount: number;
  currency: string;
  method: (typeof paymentOptions)[PaymentOptionKey]["method"];
  reference: string;
  proofUrl?: string;
  provider: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existingPayment = await transaction.payment.findFirst({
          where: { userId: input.userId, courseId: input.courseId, status: { in: ["PENDING", "COMPLETED"] } },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        });
        if (existingPayment) return { payment: existingPayment, alreadySubmitted: true };

        const payment = await transaction.payment.create({
          data: {
            userId: input.userId,
            courseId: input.courseId,
            amount: input.amount,
            currency: input.currency,
            method: input.method,
            reference: input.reference,
            proofUrl: input.proofUrl,
            provider: input.provider,
          },
        });
        if (input.passedExam) {
          await createCertificateRequest(transaction, {
            userId: input.userId,
            examId: input.passedExam.examId,
            courseId: input.courseId,
            sessionId: input.passedExam.id,
          });
        }
        return { payment, alreadySubmitted: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("Unable to serialize payment submission.");
}

async function readPayload(request: Request): Promise<CheckoutPayload> {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      courseSlug: form.get("courseSlug"),
      method: form.get("method"),
      reference: form.get("reference"),
      proof: form.get("proof"),
    };
  }
  return await request.json().catch(() => ({})) as CheckoutPayload;
}

async function saveProof(file: File) {
  if (file.size < 1 || file.size > 8 * 1024 * 1024) throw new ReceiptValidationError("Payment receipts must be no larger than 8 MB.");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!allowed.has(file.type)) throw new ReceiptValidationError("Upload a JPG, PNG, WebP, or PDF payment receipt.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(bytes.slice(0, 8));
  const valid = file.type === "image/jpeg"
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === "image/png"
      ? bytes[0] === 0x89 && header.slice(1, 4) === "PNG"
      : file.type === "image/webp"
        ? header.startsWith("RIFF") && header.slice(8, 12) === "WEBP"
        : header.startsWith("%PDF-");
  if (!valid) throw new ReceiptValidationError("The uploaded receipt file does not match its format.");
  if (process.env.VERCEL) throw new ReceiptStorageUnavailableError("Durable receipt storage is not configured for this deployment.");
  const extension = file.type === "image/jpeg" ? ".jpg" : file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".pdf";
  const filename = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "private", "payment-proofs");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx", mode: 0o600 });
  return filename;
}

export async function POST(request: Request) {
  try {
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await readPayload(request);
    if (typeof body.courseSlug !== "string" || !body.courseSlug.trim()) return NextResponse.json({ error: "Choose a course from the available course list." }, { status: 400 });
    if (typeof body.method !== "string" || !Object.prototype.hasOwnProperty.call(paymentOptions, body.method)) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
    const method = body.method as PaymentOptionKey;
    const option = paymentOptions[method];
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference || reference.length > 180) return NextResponse.json({ error: "Enter a transaction ID, hash, or reference (maximum 180 characters)." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true, role: true } });
    const course = await prisma.course.findUnique({ where: { slug: body.courseSlug.trim() }, select: { id: true, slug: true, isPublished: true } });
    if (!user || !course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    if (!course.isPublished) return NextResponse.json({ error: "This course is not available for checkout." }, { status: 404 });
    if (user.role === "ADMIN") {
      await prisma.enrollment.upsert({ where: { userId_courseSlug: { userId: user.id, courseSlug: course.slug } }, create: { userId: user.id, courseSlug: course.slug }, update: {} });
      return NextResponse.json({ ok: true, bypassed: true, status: "COMPLETED", courseSlug: course.slug });
    }

    const passedExam = await prisma.examSession.findFirst({
      where: { userId: user.id, exam: { courseId: course.id }, status: "PASSED", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { id: true, examId: true },
    });

    const existingPayment = await prisma.payment.findFirst({
      where: { userId: user.id, courseId: course.id, status: { in: ["PENDING", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    if (existingPayment?.status === "PENDING") {
      return NextResponse.json({ ok: true, paymentId: existingPayment.id, status: "PENDING", certificateStatus: "PENDING_APPROVAL", alreadySubmitted: true });
    }
    if (existingPayment?.status === "COMPLETED") {
      return NextResponse.json({ ok: true, paymentId: existingPayment.id, status: "COMPLETED", certificateStatus: passedExam ? "APPROVED" : null, alreadySubmitted: true });
    }

    let proofUrl: string | undefined;
    if (body.proof !== undefined && body.proof !== null && !(body.proof instanceof File)) {
      return NextResponse.json({ error: "The payment receipt upload is invalid." }, { status: 400 });
    }
    if (body.proof instanceof File && body.proof.size > 0) {
      try {
        proofUrl = await saveProof(body.proof);
      } catch (error) {
        if (error instanceof ReceiptValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("Payment receipt storage failed.", prismaErrorDiagnostics(error));
        return NextResponse.json({
          error: "Receipt storage is unavailable. Remove the optional file and submit the transaction reference, or contact support.",
          code: "PAYMENT_PROOF_STORAGE_UNAVAILABLE",
        }, { status: 503 });
      }
    }

    const submission = await createPaymentSubmission({
      userId: user.id,
      courseId: course.id,
      passedExam,
      amount: option.amount,
      currency: option.currency,
      method: option.method,
      reference,
      proofUrl,
      provider: option.label,
    });

    if (submission.alreadySubmitted) {
      return NextResponse.json({
        ok: true,
        paymentId: submission.payment.id,
        status: submission.payment.status,
        certificateStatus: submission.payment.status === "PENDING" ? "PENDING_APPROVAL" : passedExam ? "APPROVED" : null,
        alreadySubmitted: true,
      });
    }
    return NextResponse.json({ ok: true, paymentId: submission.payment.id, status: submission.payment.status, certificateStatus: "PENDING_APPROVAL", instructions: { label: option.label, amount: option.amount, currency: option.currency } }, { status: 201 });
  } catch (error) {
    const diagnostics = prismaErrorDiagnostics(error);
    console.error("Certificate payment submission failed.", diagnostics);
    const unavailable = isPrismaConnectionFailure(error) || error instanceof DatabaseConfigurationError;
    return NextResponse.json({
      error: unavailable ? "The payment service is temporarily unavailable. Please try again shortly." : "Unable to submit payment for verification. Please try again.",
      code: unavailable ? "PAYMENT_DATABASE_UNAVAILABLE" : "PAYMENT_SUBMISSION_ERROR",
    }, { status: unavailable ? 503 : 500 });
  }
}