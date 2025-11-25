# Promo Code Implementation Plan - Fishon Market

## Executive Summary

This document outlines the complete implementation plan for the promo code system in fishon-market, with a focus on the **FISHONTRIP1** welcome promo code for new registered ANGLER users.

### Key Requirements

1. **FISHONTRIP1**: One-time welcome promo code for new ANGLER users only
   - Automatically created on user registration
   - Sent via email and displayed in account dashboard
   - Not eligible for GUEST users
   - One-time use per user (redeemable only once)
2. **Flexible System**: Architecture supports future promo codes
   - Not bound to registration only
   - Support for admin-managed codes
   - Multiple promo types (percentage, fixed amount, etc.)

3. **No Backward Compatibility Needed**: All current bookings are test data

---

## Database Schema

### Phase 1: Database Layer (2 hours)

**1.1 PromoCode Model**

```prisma
// prisma/schema.prisma

enum PromoCodeType {
  PERCENTAGE  // e.g., 10% off
  FIXED       // e.g., RM50 off (future)
}

enum PromoCodeStatus {
  ACTIVE
  INACTIVE
  EXPIRED
  EXHAUSTED   // Max uses reached
}

enum PromoCodeScope {
  UNIVERSAL     // Can be used by anyone (admin-created codes)
  REGISTRATION  // Auto-assigned on registration (like FISHONTRIP1)
  CHARTER       // Charter-specific codes (future)
  REFERRAL      // Referral codes (future)
}

model PromoCode {
  id          String   @id @default(cuid())
  code        String   @unique // e.g., "FISHONTRIP1", "SUMMER10"
  name        String   // Display name: "Welcome Bonus", "Summer Sale"
  description String?  // "Get 10% off your first trip"

  // Discount configuration
  type        PromoCodeType @default(PERCENTAGE)
  percentage  Int?     // For PERCENTAGE type (e.g., 10 for 10%)
  fixedAmount Decimal? @db.Decimal(10, 2) // For FIXED type (future)

  // Scope and eligibility
  scope       PromoCodeScope @default(UNIVERSAL)

  // Validity period
  startDate   DateTime
  endDate     DateTime

  // Usage limits
  maxUses     Int?     // Total times code can be used (null = unlimited)
  usesCount   Int      @default(0) // Current usage count
  maxUsesPerUser Int   @default(1) // Per-user limit (default: one-time use)

  // Eligibility rules
  minPurchase Decimal? @db.Decimal(10, 2) // Minimum booking amount
  maxDiscount Decimal? @db.Decimal(10, 2) // Maximum discount cap
  newUsersOnly Boolean @default(false) // Only for users with no completed bookings

  // Targeting (future - Phase 2)
  specificCharters String[] // Charter IDs (empty = all charters)

  // Status
  status      PromoCodeStatus @default(ACTIVE)

  // Tracking
  createdBy   String?  // Admin user ID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  bookings    Booking[] @relation("BookingPromoCode")
  assignments UserPromoCodeAssignment[]

  @@index([code])
  @@index([status, endDate])
  @@index([scope])
}

// Track which users have been assigned which promo codes
model UserPromoCodeAssignment {
  id           String   @id @default(cuid())
  userId       String
  promoCodeId  String

  // Tracking
  assignedAt   DateTime @default(now())
  usedAt       DateTime? // When user redeemed the code
  usedInBookingId String? // Which booking used this code

  // Relations
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
  promoCode    PromoCode @relation(fields: [promoCodeId], references: [id], onDelete: Cascade)

  @@unique([userId, promoCodeId]) // User can only be assigned each code once
  @@index([userId])
  @@index([promoCodeId])
}

// Update User model
model User {
  id            String    @id @default(cuid())
  // ... existing fields ...

  // Promo code assignments
  promoCodeAssignments UserPromoCodeAssignment[]

  // ... rest of fields ...
}

// Update Booking model
model Booking {
  // ... existing fields ...

  // Add promo code relation
  promoCodeId String?
  promoCode   PromoCode? @relation("BookingPromoCode", fields: [promoCodeId], references: [id])

  // Keep existing discount JSON for structured data
  discount    Json? // { "code": "FISHONTRIP1", "percentage": 10, "amount": 50.00 }

  // ... rest of fields ...
}
```

**1.2 Migration Commands**

```bash
# Create migration
npm run db:migrate:safe add-promo-code-system

# After migration, seed FISHONTRIP1 code (see Seeding section below)
```

---

## Backend Implementation

### Phase 2: Core Services (5 hours)

**2.1 Promo Code Service** (`src/lib/services/promo-service.ts`)

```typescript
// src/lib/services/promo-service.ts

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
        status: { in: ["CONFIRMED", "COMPLETED"] },
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
  };
}

/**
 * Assign promo code to user (for REGISTRATION scope codes)
 */
export async function assignPromoCodeToUser(
  userId: string,
  promoCodeId: string
) {
  return prisma.userPromoCodeAssignment.create({
    data: {
      userId,
      promoCodeId,
    },
  });
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
```

**2.2 API Endpoint for Validation** (`src/app/api/promo-codes/validate/route.ts`)

```typescript
// src/app/api/promo-codes/validate/route.ts

import { validatePromoCode } from "@/lib/services/promo-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth-options";

/**
 * POST /api/promo-codes/validate
 *
 * Validate a promo code for a booking
 * Requires authentication (only registered users can use promo codes)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { valid: false, error: "Authentication required to use promo codes" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code, charterId, subtotal } = body;

    if (!code || !charterId || !subtotal) {
      return NextResponse.json(
        {
          valid: false,
          error: "Missing required fields: code, charterId, subtotal",
        },
        { status: 400 }
      );
    }

    const validation = await validatePromoCode({
      code: code.trim().toUpperCase(),
      userId: session.user.id,
      charterId,
      subtotal: Number(subtotal),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 200 } // 200 to allow client to display error message
      );
    }

    return NextResponse.json({
      valid: true,
      discount: validation.discount,
      promoCodeId: validation.promoCodeId,
    });
  } catch (error) {
    console.error("[PromoValidateAPI] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
```

**2.3 API Endpoint for User's Promo Codes** (`src/app/api/account/promo-codes/route.ts`)

```typescript
// src/app/api/account/promo-codes/route.ts

import { getUserPromoCodes } from "@/lib/services/promo-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth-options";

/**
 * GET /api/account/promo-codes
 *
 * Get user's available promo codes
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoCodes = await getUserPromoCodes(session.user.id);

    return NextResponse.json({
      promoCodes: promoCodes.map((assignment) => ({
        id: assignment.promoCode.id,
        code: assignment.promoCode.code,
        name: assignment.promoCode.name,
        description: assignment.promoCode.description,
        type: assignment.promoCode.type,
        percentage: assignment.promoCode.percentage,
        fixedAmount: assignment.promoCode.fixedAmount,
        startDate: assignment.promoCode.startDate,
        endDate: assignment.promoCode.endDate,
        assignedAt: assignment.assignedAt,
      })),
    });
  } catch (error) {
    console.error("[PromoCodesAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo codes" },
      { status: 500 }
    );
  }
}
```

**2.4 Update Registration to Assign FISHONTRIP1** (`src/app/api/auth/register/route.ts`)

```typescript
// Add to existing imports
import {
  assignPromoCodeToUser,
  getPromoCodeByCode,
} from "@/lib/services/promo-service";
import { sendWelcomeEmail } from "@/lib/services/email-service";

// In the POST handler, after user creation:

// Create new user
const passwordHash = await bcrypt.hash(password, 10);
const user = await prisma.user.create({
  data: {
    email,
    passwordHash,
    name: name,
    phone,
    role: "ANGLER",
    emailVerified: new Date(), // Auto-verify on registration
  },
  select: {
    id: true,
    email: true,
    name: true,
    phone: true,
    role: true,
  },
});

// ASSIGN FISHONTRIP1 PROMO CODE
try {
  const welcomePromo = await getPromoCodeByCode("FISHONTRIP1");

  if (welcomePromo && welcomePromo.status === "ACTIVE") {
    await assignPromoCodeToUser(user.id, welcomePromo.id);
    console.log(`[Register] Assigned FISHONTRIP1 to user ${user.id}`);
  }
} catch (error) {
  console.error("[Register] Failed to assign welcome promo:", error);
  // Don't fail registration if promo assignment fails
}

// SEND WELCOME EMAIL WITH PROMO CODE
try {
  await sendWelcomeEmail({
    to: user.email,
    userName: user.name || "there",
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    promoCode: "FISHONTRIP1", // Include promo code in welcome email
  });
} catch (error) {
  console.error("[Register] Failed to send welcome email:", error);
}

return NextResponse.json({ user }, { status: 201 });
```

**2.5 Update Guest Upgrade to Assign FISHONTRIP1** (`src/lib/services/guest-user-service.ts`)

```typescript
// In upgradeGuestToAngler function, after upgrade:

import { assignPromoCodeToUser, getPromoCodeByCode } from "./promo-service";
import { sendWelcomeEmail } from "./email-service";

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

  // ASSIGN FISHONTRIP1 PROMO CODE (if not already used)
  try {
    const welcomePromo = await getPromoCodeByCode("FISHONTRIP1");

    if (welcomePromo && welcomePromo.status === "ACTIVE") {
      // Check if user has any completed bookings (to respect newUsersOnly rule)
      const hasBookings = await prisma.booking.findFirst({
        where: {
          userId: user.id,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      });

      // Only assign if user hasn't completed any bookings yet
      if (!hasBookings) {
        await assignPromoCodeToUser(user.id, welcomePromo.id);
        console.log(`[GuestUpgrade] Assigned FISHONTRIP1 to user ${user.id}`);
      }
    }
  } catch (error) {
    console.error("[GuestUpgrade] Failed to assign welcome promo:", error);
  }

  // SEND WELCOME EMAIL
  try {
    await sendWelcomeEmail({
      to: user.email,
      userName: user.name || "there",
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      promoCode: "FISHONTRIP1",
    });
  } catch (error) {
    console.error("[GuestUpgrade] Failed to send welcome email:", error);
  }

  return {
    id: user.id,
    email: user.email,
    upgraded: true,
  };
}
```

---

## Frontend Implementation

### Phase 3: UI Components (6 hours)

**3.1 Promo Code Input Component** (`src/components/booking/PromoCodeInput.tsx`)

```typescript
// src/components/booking/PromoCodeInput.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, Tag, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface PromoCodeInputProps {
  charterId: string;
  subtotal: number;
  onApply: (discount: {
    code: string;
    percentage?: number;
    fixedAmount?: number;
    amount: number;
    promoCodeId: string;
  }) => void;
  onRemove: () => void;
  currentCode?: string | null;
  disabled?: boolean;
  isAuthenticated: boolean; // New: check if user is logged in
}

export function PromoCodeInput({
  charterId,
  subtotal,
  onApply,
  onRemove,
  currentCode,
  disabled = false,
  isAuthenticated,
}: PromoCodeInputProps) {
  const t = useTranslations("booking.promoCode");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    if (!isAuthenticated) {
      setError(t("loginRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          charterId,
          subtotal,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.error || t("invalidCode"));
        return;
      }

      onApply({
        code: code.trim().toUpperCase(),
        percentage: data.discount.percentage,
        fixedAmount: data.discount.fixedAmount,
        amount: data.discount.amount,
        promoCodeId: data.promoCodeId,
      });
      setCode("");
    } catch (err) {
      setError(t("validationError"));
    } finally {
      setLoading(false);
    }
  };

  // Show auth message if not logged in
  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded-lg border-amber-200 bg-amber-50">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              {t("loginForPromo")}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {t("loginForPromoDesc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentCode) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">
              {t("applied")}
            </p>
            <p className="text-xs text-green-700">{currentCode}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder={t("placeholder")}
            className="pl-9"
            disabled={loading || disabled}
            maxLength={20}
          />
        </div>
        <Button
          type="button"
          onClick={handleApply}
          disabled={!code.trim() || loading || disabled}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("apply")
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

**3.2 Available Promo Codes Card** (`src/components/account/PromoCodesCard.tsx`)

```typescript
// src/components/account/PromoCodesCard.tsx

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, Copy, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  percentage?: number;
  fixedAmount?: number;
  startDate: string;
  endDate: string;
  assignedAt: string;
}

export function PromoCodesCard() {
  const t = useTranslations("account.promoCodes");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const response = await fetch("/api/account/promo-codes");
      const data = await response.json();
      setPromoCodes(data.promoCodes || []);
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(t("codeCopied"));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (promoCodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Tag className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">{t("noPromosAvailable")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {promoCodes.map((promo) => (
            <div
              key={promo.id}
              className="p-4 border rounded-lg border-green-200 bg-green-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-green-900">{promo.name}</h3>
                  </div>
                  <p className="text-sm text-green-700 mb-2">{promo.description}</p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 text-lg font-mono font-bold text-green-900 bg-white border-2 border-green-300 rounded">
                      {promo.code}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(promo.code)}
                      className="text-green-700 hover:text-green-900"
                    >
                      {copiedCode === promo.code ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    {t("validUntil")}: {new Date(promo.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {promo.type === "PERCENTAGE" && promo.percentage && (
                    <div className="text-2xl font-bold text-green-600">
                      {promo.percentage}%
                    </div>
                  )}
                  {promo.type === "FIXED" && promo.fixedAmount && (
                    <div className="text-2xl font-bold text-green-600">
                      RM{promo.fixedAmount}
                    </div>
                  )}
                  <div className="text-xs text-green-700 mt-1">
                    {t("off")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**3.3 Update CheckoutForm** (`src/app/[locale]/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`)

```typescript
// Add imports
import { PromoCodeInput } from "@/components/booking/PromoCodeInput";
import { useSession } from "next-auth/react";

// Add state for promo code (around line 100)
const { data: session } = useSession();
const [appliedPromo, setAppliedPromo] = useState<{
  code: string;
  percentage?: number;
  fixedAmount?: number;
  amount: number;
  promoCodeId: string;
} | null>(null);

// Update pricing calculation (around line 815)
const pricingBreakdown = useMemo(() => {
  const tripPrice = chosenTrip?.price ?? 0;
  if (tripPrice === 0) return null;

  const subtotal = tripPrice * Math.max(1, days);
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100;

  // Apply promo code discount
  const discount = appliedPromo ? appliedPromo.amount : 0;

  const amountBeforeGateway = subtotal + platformFee - discount;
  const paymentGatewayFee = Math.round(amountBeforeGateway * 0.015 * 100) / 100;
  const sst = 0;
  const finalPrice = Math.round((amountBeforeGateway + paymentGatewayFee + sst) * 100) / 100;

  return {
    tripPrice,
    days: Math.max(1, days),
    subtotal,
    platformFee,
    discount,
    paymentGatewayFee,
    sst,
    finalPrice,
    promoCode: appliedPromo ? {
      code: appliedPromo.code,
      percentage: appliedPromo.percentage,
      fixedAmount: appliedPromo.fixedAmount,
    } : undefined,
  };
}, [chosenTrip?.price, days, appliedPromo]);

// Add PromoCodeInput component (before payment method section, around line 900)
{/* Promo Code Section */}
<div className="p-4 border border-gray-200 rounded-lg">
  <h3 className="mb-3 text-sm font-medium">{t("promoCode.title")}</h3>
  <PromoCodeInput
    charterId={charter.id}
    subtotal={pricingBreakdown?.subtotal ?? 0}
    onApply={setAppliedPromo}
    onRemove={() => setAppliedPromo(null)}
    currentCode={appliedPromo?.code}
    disabled={isSubmitting}
    isAuthenticated={!!session?.user}
  />
</div>

// Update form submission (around line 1000)
const onSubmit = async (data: FormData) => {
  // ... existing code ...

  const payload = {
    // ... existing fields ...
    promoCodeId: appliedPromo?.promoCodeId,
  };

  // ... rest of submission ...
};
```

**3.4 Add to Account Dashboard** (`src/app/[locale]/(account)/account/overview/page.tsx`)

```typescript
import { PromoCodesCard } from "@/components/account/PromoCodesCard";

// Add to dashboard layout
<PromoCodesCard />
```

---

## Email Template Updates

### Phase 4: Welcome Email with Promo Code (2 hours)

**4.1 Update Welcome Email Template** (`fishon-email/emails/welcome.tsx`)

```typescript
// Update interface
interface WelcomeEmailProps {
  userName: string;
  userType: "angler" | "captain";
  loginUrl: string;
  promoCode?: string; // NEW: Optional promo code
}

// Add promo code section in email body (after welcome message)
{promoCode && userType === "angler" && (
  <Section style={promoBox}>
    <Text style={promoTitle}>🎁 Welcome Gift: 10% Off Your First Trip!</Text>
    <Text style={promoText}>
      Use this exclusive promo code to get 10% off your first booking:
    </Text>
    <Section style={codeBox}>
      <Text style={codeText}>{promoCode}</Text>
    </Section>
    <Text style={promoNote}>
      This code is valid for one use and expires on December 31, 2026.
      Simply enter it at checkout when booking your first trip!
    </Text>
  </Section>
)}

// Add styles
const promoBox = {
  margin: "30px 0",
  padding: "24px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  border: "2px solid #86efac",
};

const promoTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#15803d",
  margin: "0 0 12px",
  textAlign: "center" as const,
};

const promoText = {
  fontSize: "14px",
  color: "#166534",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const codeBox = {
  textAlign: "center" as const,
  margin: "16px 0",
  padding: "16px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "2px dashed #15803d",
};

const codeText = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#15803d",
  letterSpacing: "2px",
  fontFamily: "monospace",
};

const promoNote = {
  fontSize: "12px",
  color: "#166534",
  margin: "16px 0 0",
  textAlign: "center" as const,
  fontStyle: "italic",
};
```

**4.2 Update Email Service** (`src/lib/services/email-service.ts`)

```typescript
// Update interface
interface SendWelcomeParams {
  to: string;
  userName: string;
  loginUrl: string;
  promoCode?: string; // NEW
}

export async function sendWelcomeEmail(params: SendWelcomeParams) {
  const html = await renderWelcomeEmail({
    userName: params.userName,
    userType: "angler",
    loginUrl: params.loginUrl,
    promoCode: params.promoCode, // Pass promo code
  });

  return sendMail({
    to: params.to,
    subject: params.promoCode
      ? "Welcome to Fishon - Get 10% Off Your First Trip! 🎣"
      : "Welcome to Fishon!",
    html,
  });
}
```

---

## Backend Integration Updates

### Phase 5: Booking API Integration (3 hours)

**5.1 Update Authenticated Booking API** (`src/app/api/bookings/create/route.ts`)

```typescript
// Add imports
import {
  validatePromoCode,
  markPromoCodeUsed,
} from "@/lib/services/promo-service";

// Extract promoCodeId from request body (around line 180)
const { promoCodeId, ...otherFields } = body;

// Validate and apply promo code (before pricing calculation, around line 235)
let promoDiscount:
  | { code: string; percentage?: number; amount: number }
  | undefined;
let validatedPromoCodeId: string | undefined;

if (promoCodeId) {
  // Re-validate promo code to prevent race conditions
  const validation = await validatePromoCode({
    code: "", // We have ID, need to fetch code
    userId: session.user.id,
    charterId: trip.charter.id,
    subtotal: tripPrice * ds,
  });

  // Better approach: fetch promo code first, then validate
  const promoCode = await prisma.promoCode.findUnique({
    where: { id: promoCodeId },
  });

  if (!promoCode || promoCode.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Invalid or expired promo code" },
      { status: 400 }
    );
  }

  const validation = await validatePromoCode({
    code: promoCode.code,
    userId: session.user.id,
    charterId: trip.charter.id,
    subtotal: tripPrice * ds,
  });

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "Promo code validation failed" },
      { status: 400 }
    );
  }

  promoDiscount = {
    code: promoCode.code,
    percentage: validation.discount?.percentage,
    amount: validation.discount!.amount,
  };
  validatedPromoCodeId = promoCodeId;
}

// Update pricing calculation (around line 240)
const pricingBreakdown = calculatePricing({
  tripPrice,
  days: ds,
  promoCode: promoDiscount
    ? {
        code: promoDiscount.code,
        percentage: promoDiscount.percentage || 0,
      }
    : undefined,
});

// Create booking with promo code (around line 400)
const booking = await prisma.booking.create({
  data: {
    // ... existing fields ...
    promoCodeId: validatedPromoCodeId,
    discount: promoDiscount
      ? {
          code: promoDiscount.code,
          percentage: promoDiscount.percentage,
          amount: promoDiscount.amount,
        }
      : undefined,
    // ... rest of fields ...
  },
});

// Mark promo code as used (after booking creation, around line 500)
if (validatedPromoCodeId) {
  try {
    await markPromoCodeUsed(session.user.id, validatedPromoCodeId, booking.id);
  } catch (error) {
    console.error("[BookingAPI] Failed to mark promo code as used:", error);
    // Don't fail the booking if this fails
  }
}
```

**5.2 Update Guest Booking API** (`src/app/api/bookings/create-guest/route.ts`)

```typescript
// GUEST USERS CANNOT USE PROMO CODES
// Add validation at the beginning of POST handler

const { promoCodeId } = body;

if (promoCodeId) {
  return NextResponse.json(
    {
      error:
        "Promo codes are only available for registered users. Please sign in or create an account to use promo codes.",
    },
    { status: 400 }
  );
}

// Rest of handler remains unchanged
```

**5.3 Update BookingDetails Component** (`src/components/booking/BookingDetails.tsx`)

```typescript
// Add discount display (around line 320)
{booking.discount && typeof booking.discount === 'object' && 'code' in booking.discount && (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">
      {t("discount")} ({booking.discount.code})
    </span>
    <span className="text-green-600 font-medium">
      - {formatCurrency(booking.discount.amount || 0)}
    </span>
  </div>
)}
```

---

## Translations

### Phase 6: Add Translations (1 hour)

**6.1 English** (`messages/en.json`)

```json
{
  "booking": {
    "promoCode": {
      "title": "Have a Promo Code?",
      "placeholder": "Enter promo code",
      "apply": "Apply",
      "applied": "Promo code applied!",
      "remove": "Remove",
      "invalidCode": "Invalid promo code",
      "validationError": "Failed to validate promo code",
      "expired": "This promo code has expired",
      "maxUses": "This promo code has reached its usage limit",
      "minPurchase": "Minimum purchase required",
      "notEligible": "You are not eligible for this promo code",
      "loginRequired": "Sign in to use promo codes",
      "loginForPromo": "Sign in to use promo codes",
      "loginForPromoDesc": "Promo codes are available for registered users. Create an account or sign in to apply your promo code and save on your booking!"
    }
  },
  "account": {
    "promoCodes": {
      "title": "Your Promo Codes",
      "description": "Available promo codes and discounts",
      "loading": "Loading your promo codes...",
      "noPromosAvailable": "No promo codes available",
      "validUntil": "Valid until",
      "off": "OFF",
      "codeCopied": "Promo code copied to clipboard!"
    }
  }
}
```

**6.2 Malay** (`messages/ms.json`)

```json
{
  "booking": {
    "promoCode": {
      "title": "Ada Kod Promo?",
      "placeholder": "Masukkan kod promo",
      "apply": "Guna",
      "applied": "Kod promo digunakan!",
      "remove": "Buang",
      "invalidCode": "Kod promo tidak sah",
      "validationError": "Gagal mengesahkan kod promo",
      "expired": "Kod promo ini telah tamat tempoh",
      "maxUses": "Kod promo ini telah mencapai had penggunaan",
      "minPurchase": "Pembelian minimum diperlukan",
      "notEligible": "Anda tidak layak untuk kod promo ini",
      "loginRequired": "Log masuk untuk menggunakan kod promo",
      "loginForPromo": "Log masuk untuk menggunakan kod promo",
      "loginForPromoDesc": "Kod promo hanya tersedia untuk pengguna berdaftar. Buat akaun atau log masuk untuk menggunakan kod promo anda dan jimat!"
    }
  },
  "account": {
    "promoCodes": {
      "title": "Kod Promo Anda",
      "description": "Kod promo dan diskaun yang tersedia",
      "loading": "Memuatkan kod promo anda...",
      "noPromosAvailable": "Tiada kod promo tersedia",
      "validUntil": "Sah sehingga",
      "off": "DISKAUN",
      "codeCopied": "Kod promo disalin!"
    }
  }
}
```

---

## Database Seeding

### Phase 7: Seed FISHONTRIP1 (30 minutes)

**Create Seed Script** (`prisma/seed-promo.ts`)

```typescript
// prisma/seed-promo.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPromoCodes() {
  console.log("Seeding promo codes...");

  // Create FISHONTRIP1 welcome promo
  const fishontrip1 = await prisma.promoCode.upsert({
    where: { code: "FISHONTRIP1" },
    update: {},
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

  console.log("✓ Created FISHONTRIP1 promo code:", fishontrip1.id);
}

seedPromoCodes()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run Seed**

```bash
npx tsx prisma/seed-promo.ts
```

---

## Testing Checklist

### Phase 8: Testing (3 hours)

**Backend Tests**

- [ ] Validate FISHONTRIP1 code with eligible user
- [ ] Validate with ineligible user (guest, already used, has bookings)
- [ ] Validate expired code
- [ ] Validate inactive code
- [ ] Validate with minimum purchase not met
- [ ] Apply promo code in authenticated booking
- [ ] Reject promo code in guest booking
- [ ] Mark promo code as used after booking
- [ ] Verify promo code assignment on registration
- [ ] Verify promo code assignment on guest upgrade
- [ ] Verify usage count increment
- [ ] Test race conditions (concurrent bookings with same code)

**Frontend Tests**

- [ ] Display promo code input (authenticated user)
- [ ] Hide promo code input (guest user)
- [ ] Show login message for guest users
- [ ] Apply valid promo code
- [ ] Show error for invalid code
- [ ] Remove applied promo code
- [ ] Display discount in pricing breakdown
- [ ] Display promo codes in account dashboard
- [ ] Copy promo code to clipboard
- [ ] Show promo in welcome email
- [ ] Show discount in booking details

**Integration Tests**

- [ ] Complete booking flow with FISHONTRIP1
- [ ] Register new user → receive email → apply FISHONTRIP1 → book
- [ ] Upgrade guest → receive email → apply FISHONTRIP1 → book
- [ ] Try to use FISHONTRIP1 twice (should fail)
- [ ] Try to use expired code (should fail)

---

## Deployment Checklist

### Phase 9: Deployment (1 hour)

**Pre-Deployment**

- [ ] Run migration on staging database
- [ ] Seed FISHONTRIP1 on staging
- [ ] Test complete flow on staging
- [ ] Review all email templates
- [ ] Test translations (EN and MS)

**Deployment**

- [ ] Merge to main branch
- [ ] Run migration on production database
- [ ] Seed FISHONTRIP1 on production
- [ ] Verify promo code exists in production
- [ ] Monitor error logs for 24 hours

**Post-Deployment**

- [ ] Register test account and verify promo assignment
- [ ] Complete test booking with promo code
- [ ] Verify email delivery with promo code
- [ ] Check analytics for promo code usage

---

## Time Estimates

| Phase     | Task                        | Hours          |
| --------- | --------------------------- | -------------- |
| 1         | Database Schema & Migration | 2              |
| 2         | Backend Services & APIs     | 5              |
| 3         | Frontend Components         | 6              |
| 4         | Email Template Updates      | 2              |
| 5         | Booking API Integration     | 3              |
| 6         | Translations                | 1              |
| 7         | Database Seeding            | 0.5            |
| 8         | Testing                     | 3              |
| 9         | Deployment                  | 1              |
| **Total** |                             | **23.5 hours** |

---

## Implementation Order

1. **Phase 1** - Database schema and migration
2. **Phase 7** - Seed FISHONTRIP1 code
3. **Phase 2** - Backend services and validation
4. **Phase 4** - Email template updates
5. **Phase 5** - Booking API integration
6. **Phase 3** - Frontend UI components
7. **Phase 6** - Translations
8. **Phase 8** - Testing
9. **Phase 9** - Deployment

---

## Future Enhancements (Phase 2)

After initial implementation, consider:

1. **Admin Dashboard for Promo Management**
   - Create/edit/deactivate promo codes
   - View usage analytics
   - Set charter-specific codes

2. **Advanced Promo Types**
   - Fixed amount discounts (RM50 off)
   - Buy-one-get-one (BOGO)
   - Free add-ons (e.g., free meals)

3. **Referral System**
   - Give RM10 to referrer and referee
   - Track referral conversions
   - Leaderboard for top referrers

4. **Time-Limited Flash Sales**
   - Hourly flash codes
   - Limited quantity codes
   - Countdown timers

5. **Charter-Specific Codes**
   - Captains can create their own codes
   - Platform takes commission on discounted bookings

---

## Notes

- **FISHONTRIP1 is Registration-Bound**: Only assigned to new ANGLER users
- **Guest Users Cannot Use Promo Codes**: Must register to use promo codes
- **One-Time Use**: Each user can only use FISHONTRIP1 once
- **Email Integration**: Promo code included in welcome email
- **Dashboard Display**: Users can view available promo codes in account dashboard
- **Flexible Architecture**: System supports future promo types (universal, referral, charter-specific)
- **No Backward Compatibility**: Current bookings are test data, no migration needed

---

## Questions & Answers

**Q: Can guest users use promo codes?**  
A: No, promo codes are only for registered ANGLER users.

**Q: What happens if a user upgrades from GUEST to ANGLER?**  
A: They are assigned FISHONTRIP1 if they haven't completed any bookings yet.

**Q: Can users use FISHONTRIP1 multiple times?**  
A: No, it's a one-time use code (maxUsesPerUser: 1).

**Q: What if promo code assignment fails during registration?**  
A: Registration still succeeds. The user can contact support to get the code manually assigned.

**Q: How long is FISHONTRIP1 valid?**  
A: Valid until December 31, 2026 (can be extended by admin).

**Q: Can we create other promo codes later?**  
A: Yes, the system is flexible and supports universal codes that admins can create.
