import { PrismaClient } from "@prisma/client";

export class DatabaseConfigurationError extends Error {
  readonly code = "DATABASE_CONFIGURATION_ERROR";

  constructor() {
    super("DATABASE_URL must be a valid PostgreSQL connection URL.");
    this.name = "DatabaseConfigurationError";
  }
}

export function assertDatabaseConfigured() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseConfigurationError();

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabaseConfigurationError();
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) {
    throw new DatabaseConfigurationError();
  }
}

export function prismaErrorDiagnostics(error: unknown): { errorName: string; prismaCode?: string } {
  if (!(error instanceof Error)) return { errorName: "UnknownError" };

  const prismaCode =
    "errorCode" in error && typeof error.errorCode === "string"
      ? error.errorCode
      : "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
  return { errorName: error.name, ...(prismaCode ? { prismaCode } : {}) };
}

export function isPrismaConnectionFailure(error: unknown) {
  const { errorName, prismaCode } = prismaErrorDiagnostics(error);
  return (
    errorName === "PrismaClientInitializationError" ||
    errorName === "PrismaClientUnknownRequestError" ||
    errorName === "PrismaClientRustPanicError" ||
    prismaCode?.startsWith("P1") === true ||
    prismaCode === "P2024"
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();
globalForPrisma.prisma = prisma;