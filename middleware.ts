import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./src/i18n/navigation";

// Create next-intl middleware with routing config
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass i18n for /admin and /dev routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/dev")) {
    // Protect /admin routes (ADMIN or STAFF role check)
    if (pathname.startsWith("/admin")) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "next-auth.session-token.market",
      });

      // Check if user is authenticated and has ADMIN or STAFF role
      const userRole = (token as any)?.role;
      if (!token || !["ADMIN", "STAFF"].includes(userRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/en/login";
        url.searchParams.set("callbackUrl", pathname);
        url.searchParams.set("error", "admin_only");
        return NextResponse.redirect(url);
      }
    }

    // Allow admin and dev routes to bypass i18n middleware
    return NextResponse.next();
  }

  // Handle i18n routing for user-facing routes
  const intlResponse = intlMiddleware(request); // Extract locale from pathname for protected routes check
  const pathnameWithoutLocale = pathname.replace(/^\/(my|en)/, "") || "/";

  // 2. Protect /account routes (NextAuth-based)
  if (pathnameWithoutLocale.startsWith("/account")) {
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
  if (pathnameWithoutLocale.startsWith("/book/payment")) {
    return intlResponse;
  }

  return intlResponse;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
