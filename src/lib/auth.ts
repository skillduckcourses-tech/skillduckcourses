import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "skillduck_session";
export const ADMIN_EMAIL = "admin@theelitegrow.me";

export type Session = {
  email: string;
  name: string;
  isAdmin: boolean;
  canBypassPayment: boolean;
};

function secret() {
  const configuredSecret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters in production.");
  }
  return new TextEncoder().encode(
    configuredSecret || "development-only-change-me",
  );
}

export async function createSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.canBypassPayment !== "boolean"
    ) {
      return null;
    }

    return {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin,
      canBypassPayment: payload.canBypassPayment,
    };
  } catch {
    return null;
  }
}

export async function createExamAccess(sessionId: number, examId: number, expiresAt: Date) {
  return new SignJWT({ sessionId, examId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret());
}

export async function verifyExamAccess(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sessionId !== "number" || typeof payload.examId !== "number") return null;
    return { sessionId: payload.sessionId, examId: payload.examId };
  } catch {
    return null;
  }
}