import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

export const CERTIFICATE_PASS_SCORE = 70;

export type CertificateStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export async function createCertificateRequest(
  transaction: Prisma.TransactionClient,
  input: { userId: number; examId: number; courseId: number; sessionId: number },
  status: CertificateStatus = "PENDING_APPROVAL",
) {
  const certificateNo = `SKD-${new Date().getFullYear()}-${input.sessionId}`;
  const existing = await transaction.certificate.findUnique({ where: { sessionId: input.sessionId } });
  return transaction.certificate.upsert({
    where: { sessionId: input.sessionId },
    update: {
      status,
      certificateNo: existing?.certificateNo || certificateNo,
      verificationHash: existing?.verificationHash || randomUUID(),
      issuedAt: existing?.issuedAt || new Date(),
    },
    create: {
      certificateNo,
      verificationHash: randomUUID(),
      userId: input.userId,
      examId: input.examId,
      courseId: input.courseId,
      sessionId: input.sessionId,
      status,
    },
  });
}

export async function issueCertificate(
  transaction: Prisma.TransactionClient,
  input: { userId: number; examId: number; courseId: number; sessionId: number },
) {
  return createCertificateRequest(transaction, input, "APPROVED");
}
