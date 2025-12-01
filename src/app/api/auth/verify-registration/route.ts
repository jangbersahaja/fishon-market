import { prisma } from "@/lib/database/prisma";
import { sendWelcomeEmail } from "@/lib/services/email-service";
import {
  assignPromoCodeToUser,
  getPromoCodeByCode,
} from "@/lib/services/promo-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    // Find valid, unused verification code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type: "REGISTRATION",
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
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

    // Update user and mark code as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Assign FISHONTRIP1 welcome promo code to newly verified user
    // Non-blocking: don't fail verification if promo assignment fails
    let assignedPromoCode: string | undefined;
    try {
      const welcomePromo = await getPromoCodeByCode("FISHONTRIP1");
      if (welcomePromo) {
        await assignPromoCodeToUser(user.id, welcomePromo.id);
        assignedPromoCode = welcomePromo.code;
      }
    } catch (promoError) {
      console.error("Failed to assign welcome promo code:", promoError);
      // Continue - promo assignment is not critical
    }

    // Send welcome email with promo code (non-blocking)
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://fishon.my"}/login`;
      await sendWelcomeEmail({
        to: user.email,
        userName: user.name || user.email.split("@")[0],
        loginUrl,
        promoCode: assignedPromoCode,
        userId: user.id,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue - email sending is not critical
    }

    return NextResponse.json({
      verified: true,
      email: user.email,
      message: "Email verified successfully! You can now sign in.",
      promoCode: assignedPromoCode,
    });
  } catch (e) {
    console.error("Verify registration error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
