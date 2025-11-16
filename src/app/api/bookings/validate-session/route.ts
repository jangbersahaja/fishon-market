import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { validateSessionAndAvailability } from "@/lib/helpers/payment-validation";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/validate-session
 *
 * Validate booking session before payment submission
 * Checks: session timeout, availability, pricing
 * Supports both authenticated users (ANGLER) and verified guests (GUEST)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();

    // Check authentication: either logged-in user OR verified guest
    const isAuthenticated = !!session?.user?.id;
    const hasGuestVerification =
      body.guestVerification?.userId && body.guestVerification?.email;

    if (!isAuthenticated && !hasGuestVerification) {
      return NextResponse.json(
        {
          valid: false,
          error: "Authentication or guest verification required",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // For guest bookings, verify the guest user exists and has GUEST role
    if (!isAuthenticated && hasGuestVerification) {
      const guestUser = await prisma.user.findUnique({
        where: { id: body.guestVerification.userId },
        select: { id: true, email: true, role: true },
      });

      if (!guestUser) {
        return NextResponse.json(
          {
            valid: false,
            error: "Invalid guest verification",
            code: "INVALID_GUEST",
          },
          { status: 401 }
        );
      }

      if (
        guestUser.email.toLowerCase() !==
        body.guestVerification.email.toLowerCase()
      ) {
        return NextResponse.json(
          {
            valid: false,
            error: "Guest email mismatch",
            code: "EMAIL_MISMATCH",
          },
          { status: 400 }
        );
      }

      if (guestUser.role !== "GUEST") {
        return NextResponse.json(
          {
            valid: false,
            error: "Please sign in to your account to book",
            code: "NOT_GUEST",
          },
          { status: 400 }
        );
      }
    }

    // Validate session and availability
    const result = await validateSessionAndAvailability(body);

    return NextResponse.json(result, {
      status: result.valid ? 200 : 400,
    });
  } catch (error: any) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error.message || "Validation failed",
        code: "VALIDATION_ERROR",
      },
      { status: 500 }
    );
  }
}
