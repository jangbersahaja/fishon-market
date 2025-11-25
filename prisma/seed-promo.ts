// prisma/seed-promo.ts
// Seed script for promo codes

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPromoCodes() {
  console.log("🎁 Seeding promo codes...");

  // Create FISHONTRIP1 welcome promo
  const fishontrip1 = await prisma.promoCode.upsert({
    where: { code: "FISHONTRIP1" },
    update: {
      // Update fields if code already exists
      status: "ACTIVE",
      endDate: new Date("2026-12-31"),
    },
    create: {
      code: "FISHONTRIP1",
      name: "Welcome Bonus",
      description: "Get 10% off your first trip! Welcome to Fishon.",
      type: "PERCENTAGE",
      percentage: 10,
      scope: "REGISTRATION",
      startDate: new Date("2025-11-25"),
      endDate: new Date("2026-12-31"),
      maxUsesPerUser: 1,
      newUsersOnly: true,
      status: "ACTIVE",
    },
  });

  console.log("✅ Created/Updated FISHONTRIP1 promo code");
  console.log("   ID:", fishontrip1.id);
  console.log("   Code:", fishontrip1.code);
  console.log("   Discount:", `${fishontrip1.percentage}%`);
  console.log(
    "   Valid Until:",
    fishontrip1.endDate.toISOString().split("T")[0]
  );
  console.log("   Scope:", fishontrip1.scope);
  console.log("   Status:", fishontrip1.status);
}

seedPromoCodes()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
