import { prisma } from "@/lib/database/prisma";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/verify-code
 *
 * Verify guest email code and return temporary JWT token.
 * Token is valid for 15 minutes and can be used to create a guest booking.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
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

    // Rate limiting: Check verification attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentFailedAttempts = await prisma.verificationCode.count({
      where: {
        email,
        type: "GUEST_BOOKING",
        createdAt: { gte: fiveMinutesAgo },
        usedAt: null,
        NOT: { code },
      },
    });

    if (recentFailedAttempts >= 5) {
      return NextResponse.json(
        {
          error:
            "Too many failed attempts. Please request a new code and try again.",
        },
        { status: 429 }
      );
    }

    // Find valid, unused verification code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type: "GUEST_BOOKING",
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // Generate temporary JWT token (15 minutes)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret"
    );
    const token = await new SignJWT({ email, purpose: "guest_booking" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);

    return NextResponse.json(
      {
        valid: true,
        token,
        email,
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
