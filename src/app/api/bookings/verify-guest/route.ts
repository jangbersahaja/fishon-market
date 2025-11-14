import { prisma } from "@/lib/database/prisma";
import { sendVerificationCode } from "@/lib/services/email-service";
import { NextResponse } from "next/server";

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/bookings/verify-guest
 *
 * Send verification code to guest email for booking creation.
 * Rate limited to 3 requests per email per 15 minutes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const firstName = String(body?.firstName || "").trim();

    // Validate email
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Rate limiting: Check recent verification attempts
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await prisma.verificationCode.count({
      where: {
        email,
        type: "TAC",
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentAttempts >= 3) {
      return NextResponse.json(
        {
          error:
            "Too many verification requests. Please try again in 15 minutes.",
        },
        { status: 429 }
      );
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database (use TAC type for consistency)
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: "TAC",
        expiresAt,
      },
    });

    // Send verification email using new email service
    await sendVerificationCode({
      to: email,
      userName: firstName || "there",
      code,
      purpose: "guest_booking",
      expiryMinutes: 10,
    });

    return NextResponse.json(
      {
        success: true,
        sentAt: Date.now(),
        expiresAt: expiresAt.getTime(),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Guest verification error", e);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
