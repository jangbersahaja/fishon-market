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
    try {
      await sendVerificationCode({
        to: email,
        userName: firstName || "there",
        code,
        purpose: "guest_booking",
        expiryMinutes: 10,
      });
    } catch (emailError) {
      // Log detailed email error for debugging
      console.error("Email sending failed:", {
        error: emailError,
        message:
          emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : undefined,
        email: email, // Include email (sanitized in logs)
        smtpConfigured: !!(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)
        ),
      });

      // Throw to outer catch with more context
      throw new Error(
        `Email delivery failed: ${emailError instanceof Error ? emailError.message : "Unknown error"}`
      );
    }

    return NextResponse.json(
      {
        success: true,
        sentAt: Date.now(),
        expiresAt: expiresAt.getTime(),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Guest verification error:", {
      error: e,
      message: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined,
    });

    // Return more helpful error message in development
    const errorMessage =
      e instanceof Error
        ? e.message
        : "Failed to send verification code. Please try again.";
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: isDev
          ? errorMessage
          : "Failed to send verification code. Please try again.",
        details: isDev
          ? {
              smtpConfigured: !!(
                process.env.SMTP_HOST &&
                process.env.SMTP_USER &&
                (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)
              ),
            }
          : undefined,
      },
      { status: 500 }
    );
  }
}
