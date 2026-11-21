import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function currentSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await currentSession();
  if (!session?.isAdmin) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session : null;
}