import { prisma } from "@/lib/database/prisma";
import { sendVerificationCode } from "@/lib/services/email-service";
import { NextResponse } from "next/server";

/**
 * Generate 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified", alreadyVerified: true },
        { status: 400 }
      );
    }

    // Rate limiting: Check for recent codes (max 3 per 10 minutes)
    const recentCodes = await prisma.verificationCode.count({
      where: {
        email,
        type: "REGISTRATION",
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (recentCodes >= 3) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Generate and store new verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: "REGISTRATION",
        expiresAt,
      },
    });

    // Send verification email
    try {
      await sendVerificationCode({
        to: user.email,
        userName: user.name || user.email.split("@")[0],
        code,
        purpose: "registration",
        expiryMinutes: 10,
        userId: user.id,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sent: true,
      email: user.email,
      message: "Verification code sent successfully.",
      sentAt: Date.now(),
    });
  } catch (e) {
    console.error("Resend registration code error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
