import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, locales } from "./src/i18n/config";

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // Always show locale in URL (temporary test)
  localeDetection: true, // Enable locale detection
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle i18n routing first - this will rewrite /home to /my/home internally
  const intlResponse = intlMiddleware(request);

  // Extract locale from pathname for protected routes check
  const pathnameWithoutLocale = pathname.replace(/^\/(my|en)/, "") || "/";

  // 1. Protect /admin routes (NextAuth with ADMIN role check)
  if (pathnameWithoutLocale.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token.market",
    });

    // Check if user is authenticated and has ADMIN role
    if (!token || (token as any).role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      url.searchParams.set("error", "admin_only");
      return NextResponse.redirect(url);
    }
  }

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
