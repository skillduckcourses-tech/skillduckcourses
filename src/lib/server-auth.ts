import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import type { Session } from "@/src/lib/auth";

const scrypt = promisify(scryptCallback);

export async function verifyLocalCredentials(email: string, password: string, storedHash?: string, name = email): Promise<Session | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!password || !normalizedEmail || !storedHash) return null;

  const [salt, encodedHash] = storedHash.split(":");
  if (!salt || !encodedHash) return null;
  const expected = Buffer.from(encodedHash, "hex");
  const actual = Buffer.from((await scrypt(password, salt, expected.length)) as Uint8Array);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return {
    email: normalizedEmail,
    name,
    isAdmin: false,
    canBypassPayment: false,
  } satisfies Session;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = Buffer.from((await scrypt(password, salt, 64)) as Uint8Array);
  return `${salt}:${derivedKey.toString("hex")}`;
}