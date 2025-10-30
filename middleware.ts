import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protect /admin routes (custom cookie-based auth)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const isAuthed = request.cookies.get("admin_auth")?.value === "1";
    if (!isAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect /account routes (NextAuth-based)
  if (pathname.startsWith("/account")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token.market",
    });

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 3. Allow /book/payment to handle its own authentication
  // (it will redirect to login with proper bookingId context)
  if (pathname.startsWith("/book/payment")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/book/payment/:path*"],
};
