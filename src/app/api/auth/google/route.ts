import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertAuthSecretConfigured, AuthConfigurationError } from "@/src/lib/auth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Google sign-in is not configured. Please contact support.", code: "GOOGLE_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  try {
    assertAuthSecretConfigured();
  } catch (error) {
    console.error("Google sign-in cannot start because authentication configuration is invalid.", error);
    return NextResponse.json({ error: "Sign-in is not configured correctly. Please contact support.", code: error instanceof AuthConfigurationError ? error.code : "AUTH_CONFIGURATION_ERROR" }, { status: 503 });
  }
  const state = randomUUID();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google/callback`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("skillduck_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}