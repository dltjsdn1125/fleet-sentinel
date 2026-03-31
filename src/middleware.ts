export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // onboarding 체크가 필요한 앱 경로
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
