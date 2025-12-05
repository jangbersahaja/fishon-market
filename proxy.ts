import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./src/i18n/navigation";

// Create next-intl middleware with routing config
const intlMiddleware = createMiddleware(routing);

/**
 * Ensure session ID cookie exists for campaign tracking
 */
function ensureSessionIdCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const sessionId = request.cookies.get("fishon_session_id")?.value;

  if (!sessionId) {
    // Generate a new session ID
    const newSessionId = crypto.randomUUID();
    response.cookies.set("fishon_session_id", newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
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
    const response = NextResponse.next();
    return ensureSessionIdCookie(request, response);
  }

  // Handle i18n routing for user-facing routes
  const intlResponse = intlMiddleware(request);
  const pathnameWithoutLocale = pathname.replace(/^\/(ms|en)/, "") || "/";

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
    return ensureSessionIdCookie(request, intlResponse);
  }

  // Ensure session ID cookie exists for campaign tracking
  return ensureSessionIdCookie(request, intlResponse);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
