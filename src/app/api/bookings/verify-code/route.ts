import { prisma } from "@/lib/database/prisma";
import {
  findOrCreateGuestUser,
  verifyGuestEmail,
} from "@/lib/services/guest-user-service";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/verify-code
 *
 * Verify guest email code and create/find GUEST user.
 * Returns user ID for booking creation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const phone = String(body?.phone || "").trim();

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    // Verify email with TAC code
    const verificationResult = await verifyGuestEmail(email, code);

    if (!verificationResult) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Find or create GUEST user (after successful verification)
    const guestUser = await findOrCreateGuestUser({
      email,
      firstName,
      lastName,
      phone,
    });

    // If user was just created, mark email as verified
    if (guestUser) {
      await prisma.user.update({
        where: { id: guestUser.id },
        data: { emailVerified: new Date() },
      });
    }

    if (!guestUser) {
      // User exists but is not a GUEST (ANGLER/ADMIN)
      return NextResponse.json(
        {
          error: "This email is registered. Please sign in to continue.",
          requireSignIn: true,
        },
        { status: 400 }
      );
    }

    // Return verified user data for booking creation
    return NextResponse.json(
      {
        valid: true,
        verified: true,
        userId: guestUser.id,
        email: guestUser.email,
        message: "Email verified successfully",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Verify code error", e);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
