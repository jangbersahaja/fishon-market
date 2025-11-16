import { auth } from "@/lib/auth/auth";
import { validateSessionAndAvailability } from "@/lib/helpers/payment-validation";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/validate-session
 *
 * Validate booking session before payment submission
 * Checks: session timeout, availability, pricing
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    // Only authenticated users can validate sessions
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          valid: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

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
