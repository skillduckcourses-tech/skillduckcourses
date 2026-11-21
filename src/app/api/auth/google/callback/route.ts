import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ADMIN_EMAIL, createSession, SESSION_COOKIE } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { hashPassword } from "@/src/lib/server-auth";

type GoogleProfile = { sub?: string; email?: string; name?: string; email_verified?: boolean };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const expectedState = request.headers.get("cookie")?.match(/(?:^|; )skillduck_oauth_state=([^;]+)/)?.[1];
  if (!state || state !== expectedState) return NextResponse.redirect(new URL("/?error=oauth_state", request.url));
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = (await profileResponse.json()) as GoogleProfile;
    if (!profileResponse.ok || !profile.email || profile.email_verified === false) return NextResponse.redirect(new URL("/?error=profile_failed", request.url));
    const email = profile.email.toLowerCase();
    const adminEmail = (process.env.LOCAL_ADMIN_EMAIL || ADMIN_EMAIL).trim().toLowerCase();
    const isAdmin = email === adminEmail;
    const user = await prisma.user.upsert({ where: { email }, update: { name: profile.name, googleId: profile.sub }, create: { email, name: profile.name, googleId: profile.sub, passwordHash: await hashPassword(randomUUID()), role: isAdmin ? "ADMIN" : "STUDENT" } });
    const isUserAdmin = user.role === "ADMIN";
    const response = NextResponse.redirect(new URL(isUserAdmin ? "/admin" : "/dashboard", request.url));
    response.cookies.set(SESSION_COOKIE, await createSession({ email: user.email, name: user.name || email, isAdmin: isUserAdmin, canBypassPayment: isUserAdmin }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.delete("skillduck_oauth_state");
    return response;
  } catch (error) {
    console.error("Google sign-in failed.", error);
    const response = NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
    response.cookies.delete("skillduck_oauth_state");
    return response;
  }
}
