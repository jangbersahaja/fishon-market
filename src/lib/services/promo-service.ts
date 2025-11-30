/**
 * Promo Code Service
 *
 * Handles promo code validation, assignment, and usage tracking
 */

import { prisma } from "@/lib/database/prisma";

export interface PromoCodeValidation {
  valid: boolean;
  error?: string;
  discount?: {
    type: "PERCENTAGE" | "FIXED";
    percentage?: number;
    fixedAmount?: number;
    amount: number; // Calculated discount amount
  };
  promoCodeId?: string;
  maxDiscount?: number | null; // Maximum discount cap for percentage-based codes
}

export interface ValidatePromoCodeInput {
  code: string;
  userId: string; // Required - only registered users can use promo codes
  charterId: string;
  subtotal: number; // Trip price * days
}

/**
 * Validate promo code for a booking
 * Checks all eligibility rules and calculates discount
 */
export async function validatePromoCode(
  input: ValidatePromoCodeInput
): Promise<PromoCodeValidation> {
  const { code, userId, charterId, subtotal } = input;

  // Fetch promo code
  const promoCode = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      assignments: {
        where: { userId },
      },
    },
  });

  if (!promoCode) {
    return { valid: false, error: "Invalid promo code" };
  }

  // Check status
  if (promoCode.status !== "ACTIVE") {
    return { valid: false, error: "This promo code is no longer active" };
  }

  // Check date validity
  const now = new Date();
  if (now < promoCode.startDate) {
    return { valid: false, error: "This promo code is not yet active" };
  }
  if (now > promoCode.endDate) {
    return { valid: false, error: "This promo code has expired" };
  }

  // Check global max uses
  if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
    return {
      valid: false,
      error: "This promo code has reached its usage limit",
    };
  }

  // Check minimum purchase
  if (promoCode.minPurchase && subtotal < Number(promoCode.minPurchase)) {
    return {
      valid: false,
      error: `Minimum purchase of RM${Number(promoCode.minPurchase).toFixed(2)} required`,
    };
  }

  // Check charter-specific codes
  if (
    promoCode.specificCharters.length > 0 &&
    !promoCode.specificCharters.includes(charterId)
  ) {
    return {
      valid: false,
      error: "This promo code is not valid for this charter",
    };
  }

  // Check if user has been assigned this code (for REGISTRATION scope)
  if (promoCode.scope === "REGISTRATION") {
    const assignment = promoCode.assignments[0]; // Already filtered by userId

    if (!assignment) {
      return {
        valid: false,
        error: "You are not eligible for this promo code",
      };
    }

    // Check if already used
    if (assignment.usedAt) {
      return { valid: false, error: "You have already used this promo code" };
    }
  }

  // Check per-user usage limit (for UNIVERSAL codes)
  if (promoCode.scope === "UNIVERSAL") {
    const userUsageCount = await prisma.booking.count({
      where: {
        userId,
        promoCodeId: promoCode.id,
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
    });

    if (userUsageCount >= promoCode.maxUsesPerUser) {
      return {
        valid: false,
        error: `You can only use this promo code ${promoCode.maxUsesPerUser} time${promoCode.maxUsesPerUser > 1 ? "s" : ""}`,
      };
    }
  }

  // Check new users only restriction
  if (promoCode.newUsersOnly) {
    const hasCompletedBookings = await prisma.booking.findFirst({
      where: {
        userId,
        status: { in: ["PAID", "COMPLETED"] },
      },
    });

    if (hasCompletedBookings) {
      return {
        valid: false,
        error: "This promo code is only valid for new users",
      };
    }
  }

  // Calculate discount
  let discountAmount = 0;

  if (promoCode.type === "PERCENTAGE" && promoCode.percentage) {
    discountAmount =
      Math.round(subtotal * (promoCode.percentage / 100) * 100) / 100;

    // Apply max discount cap
    if (
      promoCode.maxDiscount &&
      discountAmount > Number(promoCode.maxDiscount)
    ) {
      discountAmount = Number(promoCode.maxDiscount);
    }
  } else if (promoCode.type === "FIXED" && promoCode.fixedAmount) {
    discountAmount = Math.min(Number(promoCode.fixedAmount), subtotal);
  }

  return {
    valid: true,
    discount: {
      type: promoCode.type,
      percentage: promoCode.percentage || undefined,
      fixedAmount: promoCode.fixedAmount
        ? Number(promoCode.fixedAmount)
        : undefined,
      amount: discountAmount,
    },
    promoCodeId: promoCode.id,
    maxDiscount: promoCode.maxDiscount ? Number(promoCode.maxDiscount) : null,
  };
}

/**
 * Assign promo code to user (for REGISTRATION scope codes)
 */
export async function assignPromoCodeToUser(
  userId: string,
  promoCodeId: string
) {
  try {
    return await prisma.userPromoCodeAssignment.create({
      data: {
        userId,
        promoCodeId,
      },
    });
  } catch (error) {
    // If assignment already exists (unique constraint violation), ignore error
    console.log(
      `[PromoService] Assignment already exists for user ${userId} and promo ${promoCodeId}`
    );
    return null;
  }
}

/**
 * Mark promo code as used for a booking
 */
export async function markPromoCodeUsed(
  userId: string,
  promoCodeId: string,
  bookingId: string
) {
  // Update assignment (if exists)
  const assignment = await prisma.userPromoCodeAssignment.findUnique({
    where: {
      userId_promoCodeId: { userId, promoCodeId },
    },
  });

  if (assignment && !assignment.usedAt) {
    await prisma.userPromoCodeAssignment.update({
      where: { id: assignment.id },
      data: {
        usedAt: new Date(),
        usedInBookingId: bookingId,
      },
    });
  }

  // Increment global usage count
  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: { usesCount: { increment: 1 } },
  });
}

/**
 * Get user's available promo codes
 */
export async function getUserPromoCodes(userId: string) {
  const now = new Date();

  return prisma.userPromoCodeAssignment.findMany({
    where: {
      userId,
      usedAt: null, // Not used yet
      promoCode: {
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: {
      promoCode: true,
    },
    orderBy: {
      assignedAt: "desc",
    },
  });
}

/**
 * Get promo code details by code
 */
export async function getPromoCodeByCode(code: string) {
  return prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });
}

/**
 * Create the FISHONTRIP1 welcome promo code
 * Call this once during initial setup or in seed script
 */
export async function createWelcomePromoCode() {
  const existing = await prisma.promoCode.findUnique({
    where: { code: "FISHONTRIP1" },
  });

  if (existing) {
    console.log("FISHONTRIP1 promo code already exists");
    return existing;
  }

  return prisma.promoCode.create({
    data: {
      code: "FISHONTRIP1",
      name: "Welcome Bonus",
      description: "Get 10% off your first trip! Welcome to Fishon.",
      type: "PERCENTAGE",
      percentage: 10,
      scope: "REGISTRATION",
      startDate: new Date("2025-11-25"), // Today
      endDate: new Date("2026-12-31"), // Valid for 1+ year
      maxUsesPerUser: 1, // One-time use per user
      newUsersOnly: true,
      status: "ACTIVE",
    },
  });
}
