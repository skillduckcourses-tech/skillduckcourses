import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/src/lib/auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/verify/") || pathname.startsWith("/certificates/") || pathname.startsWith("/api/certificates/verify/")) {
    return NextResponse.next();
  }
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const adminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const adminApi = pathname.startsWith("/api/admin/");
  if (adminApi) {
    if (!session) {
      return NextResponse.json({ error: "Authentication required.", code: "UNAUTHENTICATED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Admin access required.", code: "ADMIN_REQUIRED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (adminPage && !session?.isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required.", code: "UNAUTHENTICATED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (request.nextUrl.pathname.startsWith("/exam") && !request.cookies.get("skillduck_exam_access")) {
    return NextResponse.redirect(new URL("/dashboard?error=watch_required", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-skillduck-admin", String(session.isAdmin));
  response.headers.set("x-skillduck-payment-bypass", String(session.canBypassPayment));
  return response;
}


export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*", "/profile/:path*", "/api/profile/:path*", "/api/dashboard/:path*", "/exam/:path*", "/api/exams/:path*"],
};