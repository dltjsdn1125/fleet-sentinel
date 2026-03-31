import { NextRequest, NextResponse } from "next/server";

// 경량 미들웨어 — NextAuth JWT 쿠키 존재 여부만 체크 (Prisma 미포함)
export function middleware(req: NextRequest) {
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token") ??
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/logs/:path*",
    "/expenses/:path*",
    "/fleet/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/support/:path*",
  ],
};
