/**
 * Guest User Service
 *
 * Handles guest user creation, verification, and conversion to registered users
 */

import { prisma } from "@/lib/database/prisma";
import {
  sendVerificationCode,
  sendWelcomeEmail,
} from "@/lib/services/email-service";
import {
  assignPromoCodeToUser,
  getPromoCodeByCode,
} from "@/lib/services/promo-service";

/**
 * Generate 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Find or create guest user by email
 * If user exists with GUEST role, return existing user
 * If user exists with ANGLER/ADMIN role, return null (cannot book as guest)
 * If user doesn't exist, create new GUEST user
 */
export async function findOrCreateGuestUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ id: string; email: string; role: string } | null> {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  // If registered user (ANGLER/ADMIN), they should sign in instead
  if (existingUser && existingUser.role !== "GUEST") {
    return null; // Signal that user should sign in
  }

  // If GUEST user exists, return it
  if (existingUser && existingUser.role === "GUEST") {
    // Update name/phone if provided (allow updating profile)
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
      },
    });

    return {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    };
  }

  // Create new GUEST user
  const newUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone,
      role: "GUEST",
      emailVerified: null, // Will be verified via TAC
    },
    select: { id: true, email: true, role: true },
  });

  return newUser;
}

/**
 * Send verification code to guest user email
 * Returns the verification code ID for tracking
 */
export async function sendGuestVerificationCode(
  email: string,
  userName: string
): Promise<{ codeId: string; expiresAt: Date }> {
  const normalizedEmail = email.toLowerCase().trim();
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store verification code
  const verificationCode = await prisma.verificationCode.create({
    data: {
      email: normalizedEmail,
      code,
      type: "TAC", // Use existing TAC type
      expiresAt,
    },
  });

  // Send email
  await sendVerificationCode({
    to: normalizedEmail,
    userName,
    code,
    purpose: "guest_booking",
    expiryMinutes: 10,
  });

  return {
    codeId: verificationCode.id,
    expiresAt,
  };
}

/**
 * Verify guest email with TAC code
 * Returns verification result if code is valid
 * User creation happens separately after verification
 */
export async function verifyGuestEmail(
  email: string,
  code: string
): Promise<{ email: string; verified: boolean } | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find valid, unused verification code
  const verification = await prisma.verificationCode.findFirst({
    where: {
      email: normalizedEmail,
      code,
      type: "TAC",
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!verification) {
    return null; // Invalid or expired code
  }

  // Mark code as used
  await prisma.verificationCode.update({
    where: { id: verification.id },
    data: { usedAt: new Date() },
  });

  // Check if user exists and mark email as verified if they do
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user && !user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  // Return success even if user doesn't exist yet (they'll be created after)
  return {
    email: normalizedEmail,
    verified: true,
  };
}

/**
 * Upgrade guest user to registered angler
 * Used when guest registers an account
 */
export async function upgradeGuestToAngler(data: {
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
}): Promise<{ id: string; email: string; upgraded: boolean }> {
  const normalizedEmail = data.email.toLowerCase().trim();

  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      role: "ANGLER",
      passwordHash: data.passwordHash,
      name: data.name || undefined,
      phone: data.phone || undefined,
      emailVerified: new Date(), // Ensure verified on registration
    },
    select: { id: true, email: true, role: true, name: true },
  });

  // Assign FISHONTRIP1 welcome promo code to upgraded user
  // Non-blocking: don't fail upgrade if promo assignment fails
  let assignedPromoCode: string | undefined;
  try {
    const welcomePromo = await getPromoCodeByCode("FISHONTRIP1");
    if (welcomePromo) {
      await assignPromoCodeToUser(user.id, welcomePromo.id);
      assignedPromoCode = welcomePromo.code;
    }
  } catch (promoError) {
    console.error(
      "Failed to assign welcome promo code on upgrade:",
      promoError
    );
    // Continue with upgrade - promo assignment is not critical
  }

  // Send welcome email with promo code (non-blocking)
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://fishon.my"}/login`;
    await sendWelcomeEmail({
      to: user.email,
      userName: user.name || user.email.split("@")[0],
      loginUrl,
      promoCode: assignedPromoCode,
    });
  } catch (emailError) {
    console.error("Failed to send welcome email on upgrade:", emailError);
    // Continue with upgrade - email sending is not critical
  }

  return {
    id: user.id,
    email: user.email,
    upgraded: true,
  };
}

/**
 * Get guest bookings by email
 * Useful for showing booking history before/after registration
 */
export async function getGuestBookingsByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return [];
  }

  return prisma.booking.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
