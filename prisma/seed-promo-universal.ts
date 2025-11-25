/**
 * Seed script for FISHONPROMO2025 - Universal promo code
 * Run with: npx tsx prisma/seed-promo-universal.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FISHONPROMO2025 universal promo code...");

  const promoCode = await prisma.promoCode.upsert({
    where: { code: "FISHONPROMO2025" },
    update: {
      // Update existing code if it exists
      name: "2025 Promo",
      description: "Get 10% off your booking - available to all users",
      status: "ACTIVE",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31T23:59:59Z"),
      type: "PERCENTAGE",
      percentage: 10,
      scope: "UNIVERSAL",
      maxUses: null, // Unlimited uses
      maxUsesPerUser: 5, // Each user can use up to 5 times
      newUsersOnly: false, // Available to all users
      minPurchase: null, // No minimum purchase
      maxDiscount: null, // No max discount cap
      specificCharters: [], // Valid for all charters
    },
    create: {
      code: "FISHONPROMO2025",
      name: "2025 Promo",
      description: "Get 10% off your booking - available to all users",
      status: "ACTIVE",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31T23:59:59Z"),
      type: "PERCENTAGE",
      percentage: 10,
      fixedAmount: null,
      scope: "UNIVERSAL",
      maxUses: null, // Unlimited global uses
      usesCount: 0,
      maxUsesPerUser: 5, // Each user can use up to 5 times
      newUsersOnly: false, // Available to all users (including existing)
      minPurchase: null,
      maxDiscount: null,
      specificCharters: [],
    },
  });

  console.log("✅ FISHONPROMO2025 promo code created/updated:", {
    id: promoCode.id,
    code: promoCode.code,
    discount: `${promoCode.percentage}%`,
    scope: promoCode.scope,
    validUntil: promoCode.endDate,
    maxUsesPerUser: promoCode.maxUsesPerUser,
    newUsersOnly: promoCode.newUsersOnly,
  });

  console.log("\n📋 Promo Code Details:");
  console.log("- Code: FISHONPROMO2025");
  console.log("- Discount: 10% off");
  console.log("- Scope: UNIVERSAL (no assignment needed)");
  console.log("- Eligibility: All users (new and existing)");
  console.log("- Max uses per user: 5 times");
  console.log("- Valid until: December 31, 2025");
  console.log("- No minimum purchase required");
  console.log("- Valid for all charters");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding promo code:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
