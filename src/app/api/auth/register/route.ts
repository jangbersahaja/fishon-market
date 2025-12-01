import { prisma } from "@/lib/database/prisma";
import { sendVerificationCode } from "@/lib/services/email-service";
import { upgradeGuestToAngler } from "@/lib/services/guest-user-service";
import bcrypt from "bcryptjs";
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
    const password = String(body?.password || "");
    const name = body?.name ? String(body.name).trim() : undefined;
    const phone = body?.phone ? String(body.phone).trim() : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If GUEST user, upgrade to ANGLER (still requires verification)
      if (existing.role === "GUEST") {
        const passwordHash = await bcrypt.hash(password, 10);
        const upgraded = await upgradeGuestToAngler({
          email,
          passwordHash,
          name: name || existing.name || undefined,
          phone: phone || existing.phone || undefined,
        });

        // Generate and send verification code for upgraded user
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
            to: email,
            userName: name || email.split("@")[0],
            code,
            purpose: "registration",
            expiryMinutes: 10,
            userId: upgraded.id,
          });
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          // Continue - user can request resend
        }

        return NextResponse.json(
          {
            requiresVerification: true,
            email,
            upgraded: true,
            message:
              "Account upgraded! Please check your email for the verification code.",
          },
          { status: 200 }
        );
      }

      // Already a registered user (ANGLER/ADMIN)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Create new user with unverified email
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name,
        phone,
        emailVerified: null, // Explicitly unverified
        // role defaults to ANGLER via Prisma schema
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    // Generate and store verification code
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
      // Continue - user can request resend from verification page
    }

    return NextResponse.json(
      {
        requiresVerification: true,
        email: user.email,
        message: "Please check your email for the verification code.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Register error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
