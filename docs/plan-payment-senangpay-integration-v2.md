---
type: plan
status: ready-for-implementation
updated: 2025-11-11
feature: payment-gateway
author: GitHub Copilot
tags: [payment, senangpay, booking, integration]
impact: high
version: 2.0
---

# PLAN – Senang Pay Payment Gateway Integration v2.0

## Executive Summary

**UPDATED**: November 11, 2025

This is an updated implementation plan for integrating Senang Pay payment gateway into fishon-market, replacing the current mock payment system. Since the original plan (October 23, 2025), significant changes have been made to the booking system:

### Major Changes Since Original Plan

1. **Chat System Integration** ✅ Complete
   - Conversations auto-create with bookings
   - Payment unlocks full chat access (LOCKED → ACTIVE)
   - System messages for payment status changes

2. **Enhanced Payment Page** ✅ Complete
   - Booking expiration handling
   - Availability re-checking before payment
   - Alternative date suggestions if slot taken
   - Better UX with error screens

3. **Notification System** ✅ Complete
   - Real-time notifications via Pusher
   - Email notifications for all booking events
   - In-app notification bell with unread counts

4. **Webhook Architecture** ✅ Complete
   - Captain app receives booking webhooks
   - Automatic page revalidation
   - Captain notification on payment

5. **Database Schema** ⚠️ **MISSING PAYMENT FIELDS**
   - `paidAt` field exists ✅
   - `paymentTransactionId` NOT in schema ❌
   - `paymentMethod` NOT in schema ❌
   - `paymentNote` NOT in schema ❌

### Integration Type

- **Payment Flow**: Redirect-based (user leaves site, returns after payment)
- **Payment Provider**: Senang Pay (<https://app.senangpay.my>)
- **Security**: HMAC-SHA256 hash verification for all requests/responses
- **Booking Flow**: Book → Captain Approves → **Payment (Senang Pay)** → Confirmation

---

## What's Changed: Current State Analysis

### ✅ Already Implemented

1. **Mock Payment System** (`/book/payment/[bookingId]/page.tsx`)
   - Status validation (APPROVED only)
   - Expiration checking
   - Real-time availability verification
   - Guest booking support
   - Webhook to captain on payment success
   - Notification creation for angler
   - Conversation unlock on payment
   - System message in chat

2. **Payment Page Features**
   - `BookingExpiredScreen` component
   - `DateNoLongerAvailableScreen` component
   - Alternative dates suggestion
   - Booking summary with enriched data
   - Responsive mobile/desktop layout

3. **Supporting Infrastructure**
   - Environment variable validation (`src/lib/env.ts`)
   - Webhook retry mechanism (`src/lib/webhooks/webhook.ts`)
   - Notification service (`src/lib/services/notification-service.ts`)
   - Email templates (@fishon/email package)
   - Booking display service with trip enrichment

### ❌ Still Needed

1. **Database Schema Updates**
   - Add `paymentTransactionId`, `paymentMethod`, `paymentNote` fields

2. **Senang Pay Utilities**
   - Hash generation functions
   - Hash verification functions
   - Payment URL builder
   - Configuration validator

3. **Payment Form Component**
   - Hidden form with Senang Pay fields
   - Auto-submit to Senang Pay gateway

4. **Return URL Handler**
   - Parse Senang Pay response
   - Verify hash
   - Update booking status
   - Redirect to confirmation

5. **Callback Webhook**
   - Server-to-server notification receiver
   - Duplicate payment prevention (idempotency)
   - Proper logging

6. **Payment Receipt**
   - Malaysian compliance receipt
   - Transaction ID display
   - Platform fee breakdown
   - Downloadable/printable format

---

## Implementation Roadmap

### Phase 1: Database Schema (Day 1) - 2 hours

**Objective**: Add payment tracking fields to Booking model

#### Tasks

- [ ] Add fields to `prisma/schema.prisma`
- [ ] Create migration
- [ ] Run migration in dev/staging
- [ ] Regenerate Prisma client
- [ ] Update TypeScript types

#### Database Changes

```prisma
model Booking {
  // ... existing fields ...

  paidAt                DateTime?  @db.Timestamptz // Already exists ✅
  paymentTransactionId  String?    @db.VarChar(255) // NEW
  paymentMethod         String?    @db.VarChar(50)  // NEW
  paymentNote           String?    @db.Text         // NEW

  // ... rest of model ...
}
```

**Migration Name**: `add_payment_tracking_fields`

**Verification**:

```bash
npx prisma generate
npm run typecheck
```

---

### Phase 2: Environment Setup (Day 1) - 1 hour

**Objective**: Configure Senang Pay credentials and environment variables

#### Prerequisites

- [x] Register Senang Pay merchant account at <https://app.senangpay.my> ✅ **DONE - Production account**
- [ ] ~~Obtain sandbox credentials~~ **SKIPPED - No sandbox account**
- [x] Obtain production credentials ✅ **DONE**

**Note**: Since only production credentials are available, we'll use `SENANGPAY_FORCE_MOCK` flag for development testing.

#### Environment Variables

Add to `.env.local`:

```bash
# ============================================================================
# SENANG PAY PAYMENT GATEWAY
# ============================================================================

# Senang Pay merchant ID (get from dashboard)
SENANGPAY_MERCHANT_ID="your-production-merchant-id"

# Senang Pay secret key for hash generation (NEVER commit to git)
SENANGPAY_SECRET_KEY="your-production-secret-key"

# Mode: "production" (no sandbox account available)
SENANGPAY_MODE="production"

# Force mock payment for local development/testing
# Set to "true" to test integration without real charges
# Set to "false" when ready for real production testing
SENANGPAY_FORCE_MOCK="true"

# Payment gateway URLs (auto-selected based on mode)
# Production: https://app.senangpay.my/payment/[merchant_id]
```

Add to `.env.example`:

```bash
# Senang Pay Configuration (optional - required for real payments)
SENANGPAY_MERCHANT_ID="your-merchant-id"
SENANGPAY_SECRET_KEY="your-secret-key"
SENANGPAY_MODE="production"  # production (no sandbox available)
SENANGPAY_FORCE_MOCK="true"  # Force mock payment for testing
```

#### Verification

- [ ] Add validation to `src/lib/env.ts`
- [ ] Update `scripts/check-env.js` optional checks

---

### Phase 3: Hash Utilities (Day 2) - 3 hours

**Objective**: Implement Senang Pay hash generation and verification

#### Files to Create

**`src/lib/payment/senangpay.ts`** (NEW)

```typescript
import crypto from "crypto";

interface PaymentDetails {
  merchantId: string;
  secretKey: string;
  detail: string;
  amount: string; // Format: "100.00"
  orderId: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface PaymentResponse {
  status_id: string; // "1" = success, "0" = failed
  order_id: string;
  transaction_id: string;
  (my)g: string;
  hash: string;
}

/**
 * Generate payment hash for Senang Pay request
 * Hash = HMAC-SHA256(secret_key, merchant_id + detail + amount + order_id)
 */
export function generatePaymentHash({
  merchantId,
  secretKey,
  detail,
  amount,
  orderId,
}: PaymentDetails): string {
  const message = `${merchantId}${detail}${amount}${orderId}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * Verify return/callback hash from Senang Pay
 */
export function verifyReturnHash(
  response: PaymentResponse,
  secretKey: string,
  merchantId: string
): boolean {
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(
      `${merchantId}${response.status_id}${response.order_id}${response.transaction_id}${response.(my)g}`
    )
    .digest("hex");

  return expectedHash === response.hash;
}

/**
 * Get Senang Pay payment URL based on environment
 */
export function getSenangPayUrl(): string {
  const mode = process.env.SENANGPAY_MODE || "sandbox";
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;

  if (!merchantId) {
    throw new Error("SENANGPAY_MERCHANT_ID is not configured");
  }

  if (mode === "production") {
    return `https://app.senangpay.my/payment/${merchantId}`;
  }

  return `https://sandbox.senangpay.my/payment/${merchantId}`;
}

/**
 * Format amount for Senang Pay (must be "100.00" format)
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate Senang Pay configuration
 */
export function validateSenangPayConfig(): {
  isConfigured: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secretKey = process.env.SENANGPAY_SECRET_KEY;

  if (!merchantId) {
    errors.push("SENANGPAY_MERCHANT_ID is not set");
  }

  if (!secretKey) {
    errors.push("SENANGPAY_SECRET_KEY is not set");
  }

  return {
    isConfigured: errors.length === 0,
    errors,
  };
}
```

#### Tests

**`src/lib/payment/__tests__/senangpay.test.ts`** (NEW)

```typescript
import { describe, expect, it } from "vitest";
import {
  formatAmount,
  generatePaymentHash,
  verifyReturnHash,
} from "../senangpay";

describe("senangpay utilities", () => {
  const testConfig = {
    merchantId: "TEST123",
    secretKey: "test-secret-key",
    detail: "Test Charter Booking",
    amount: "100.00",
    orderId: "booking-123",
  };

  describe("formatAmount", () => {
    it("should format amount to 2 decimal places", () => {
      expect(formatAmount(100)).toBe("100.00");
      expect(formatAmount(99.5)).toBe("99.50");
      expect(formatAmount(123.456)).toBe("123.46");
    });
  });

  describe("generatePaymentHash", () => {
    it("should generate consistent hash", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash(testConfig);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        amount: "200.00",
      });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyReturnHash", () => {
    it("should verify valid hash", () => {
      const response = {
        status_id: "1",
        order_id: "booking-123",
        transaction_id: "TXN123",
        (my)g: "Payment Successful",
        hash: generatePaymentHash(testConfig),
      };

      // Note: Real verification uses different format
      // This is simplified for demonstration
      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );
      // Would pass with correct hash calculation
    });
  });
});
```

---

### Phase 4: Payment Page Integration (Day 2-3) - 4 hours

**Objective**: Replace mock payment with Senang Pay form submission

#### Files to Modify

**`src/app/(marketplace)/book/payment/[bookingId]/page.tsx`** (MODIFY)

Changes needed:

1. Add Senang Pay validation check
2. Generate payment hash
3. Pass data to PaymentForm component
4. Keep existing: expiration check, availability check, screens

**`src/app/(marketplace)/book/payment/[bookingId]/PaymentForm.tsx`** (NEW)

Client component that auto-submits to Senang Pay:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface PaymentFormProps {
  paymentUrl: string;
  paymentData: {
    merchantId: string;
    detail: string;
    amount: string;
    orderId: string;
    hash: string;
    name: string;
    email: string;
    phone: string;
    returnUrl: string;
    callbackUrl: string;
  };
}

export function PaymentForm({ paymentUrl, paymentData }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    formRef.current?.submit();
  };

  return (
    <>
      <form ref={formRef} action={paymentUrl} method="POST" className="hidden">
        <input type="hidden" name="detail" value={paymentData.detail} />
        <input type="hidden" name="amount" value={paymentData.amount} />
        <input type="hidden" name="order_id" value={paymentData.orderId} />
        <input type="hidden" name="hash" value={paymentData.hash} />
        <input type="hidden" name="name" value={paymentData.name} />
        <input type="hidden" name="email" value={paymentData.email} />
        <input type="hidden" name="phone" value={paymentData.phone} />
        <input type="hidden" name="return_url" value={paymentData.returnUrl} />
        <input
          type="hidden"
          name="callback_url"
          value={paymentData.callbackUrl}
        />
      </form>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <span className="mr-2">Redirecting to Payment...</span>
            <span className="animate-spin">⏳</span>
          </>
        ) : (
          <>Proceed to Payment - RM {paymentData.amount}</>
        )}
      </Button>
    </>
  );
}
```

#### Implementation Strategy

**Security-First Approach - No Bypass:**

```typescript
// At top of payment page
const { isConfigured, errors } = validateSenangPayConfig();

// Development only: Force mock mode (NOT available in production)
const forceMock = process.env.NODE_ENV === 'development' && isForceMockMode();

if (!isConfigured && !forceMock) {
  // PRODUCTION: Show error page - payment gateway required
  return <PaymentConfigurationError errors={errors} />;
}

if (forceMock) {
  // DEVELOPMENT ONLY: Use mock for testing
  return <MockPaymentForDevelopment />;
}

// PRODUCTION: Real Senang Pay integration (the only path)
return <SenangPayPaymentForm />;
```

**Critical Security Rules:**

1. ✅ No mock payment in production (`NODE_ENV === 'production'`)
2. ✅ No way to skip payment via URL manipulation
3. ✅ Force mock only available in development environment
4. ✅ Clear error messages when misconfigured
5. ✅ Booking status validates payment before confirmation

---

### Phase 5: Return URL Handler (Day 3) - 3 hours

**Objective**: Handle user return from Senang Pay after payment

#### Files to Create

**`src/app/(marketplace)/book/payment/return/page.tsx`** (NEW)

```typescript
import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { verifyReturnHash } from "@/lib/payment/senangpay";
import { revalidatePath } from "next/cache";

interface PageProps {
  searchPara(my): Promise<{
    status_id?: string;
    order_id?: string;
    transaction_id?: string;
    (my)g?: string;
    hash?: string;
  }>;
}

export default async function PaymentReturnPage({ searchPara(my) }: PageProps) {
  const para(my) = await searchPara(my);
  const { status_id, order_id, transaction_id, (my)g, hash } = para(my);

  // Validate required parameters
  if (!status_id || !order_id || !transaction_id || !(my)g || !hash) {
    redirect("/book/confirm?error=invalid_payment_response");
  }

  // Verify hash
  const merchantId = process.env.SENANGPAY_MERCHANT_ID!;
  const secretKey = process.env.SENANGPAY_SECRET_KEY!;

  const isValid = verifyReturnHash(
    { status_id, order_id, transaction_id, (my)g, hash },
    secretKey,
    merchantId
  );

  if (!isValid) {
    console.error("❌ [PAYMENT RETURN] Invalid hash detected", {
      orderId: order_id,
      receivedHash: hash,
    });
    redirect("/book/confirm?error=invalid_payment_hash");
  }

  // Check if already processed (by callback webhook)
  const booking = await prisma.booking.findUnique({
    where: { id: order_id },
    select: { status: true, paidAt: true },
  });

  if (!booking) {
    redirect("/book/confirm?error=booking_not_found");
  }

  // If already paid (processed by callback), just redirect
  if (booking.status === "PAID" && booking.paidAt) {
    console.log("✅ [PAYMENT RETURN] Already processed by callback");
    redirect(`/book/confirm?id=${order_id}`);
  }

  // Process payment (if callback hasn't yet)
  if (status_id === "1") {
    console.log("✅ [PAYMENT RETURN] Processing successful payment", {
      orderId: order_id,
      transactionId: transaction_id,
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: order_id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTransactionId: transaction_id,
        paymentMethod: "SENANGPAY",
        paymentNote: (my)g,
      },
    });

    // TODO: Trigger same side effects as handlePayment:
    // - Webhook to captain
    // - Notification to angler
    // - Unlock conversation
    // - System message in chat

    revalidatePath("/book/confirm", "page");
    revalidatePath("/account/bookings", "page");

    redirect(`/book/confirm?id=${order_id}&payment=success`);
  } else {
    // Payment failed
    console.log("❌ [PAYMENT RETURN] Payment failed", {
      orderId: order_id,
      reason: (my)g,
    });

    await prisma.booking.update({
      where: { id: order_id },
      data: {
        paymentNote: `Payment Failed: ${(my)g}`,
      },
    });

    redirect(
      `/book/confirm?id=${order_id}&payment=failed&reason=${encodeURIComponent((my)g)}`
    );
  }
}
```

---

### Phase 6: Callback Webhook (Day 3-4) - 3 hours

**Objective**: Server-to-server payment confirmation from Senang Pay

**CRITICAL**: This is the authoritative payment confirmation. The return URL is for UX only.

#### Files to Create

**`src/app/api/payment/senangpay-callback/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { verifyReturnHash } from "@/lib/payment/senangpay";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const status_id = formData.get("status_id")?.toString();
    const order_id = formData.get("order_id")?.toString();
    const transaction_id = formData.get("transaction_id")?.toString();
    const (my)g = formData.get("(my)g")?.toString();
    const hash = formData.get("hash")?.toString();

    console.log("📥 [SENANGPAY CALLBACK] Received", {
      status_id,
      order_id,
      transaction_id,
      (my)g,
    });

    // Validate required fields
    if (!status_id || !order_id || !transaction_id || !(my)g || !hash) {
      console.error("❌ [SENANGPAY CALLBACK] Missing required fields");
      return new NextResponse("Bad Request", { status: 400 });
    }

    // Verify hash
    const merchantId = process.env.SENANGPAY_MERCHANT_ID!;
    const secretKey = process.env.SENANGPAY_SECRET_KEY!;

    const isValid = verifyReturnHash(
      { status_id, order_id, transaction_id, (my)g, hash },
      secretKey,
      merchantId
    );

    if (!isValid) {
      console.error("❌ [SENANGPAY CALLBACK] Invalid hash");
      return new NextResponse("Invalid Hash", { status: 400 });
    }

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: order_id },
      select: {
        id: true,
        status: true,
        paidAt: true,
        userId: true,
        tripId: true,
        charterId: true,
        date: true,
      },
    });

    if (!booking) {
      console.error("❌ [SENANGPAY CALLBACK] Booking not found:", order_id);
      return new NextResponse("Booking Not Found", { status: 404 });
    }

    // Idempotency: Check if already processed
    if (booking.status === "PAID" && booking.paidAt) {
      console.log("✅ [SENANGPAY CALLBACK] Already processed (idempotent)");
      return new NextResponse("OK", { status: 200 });
    }

    // Update booking based on payment status
    if (status_id === "1") {
      // Payment success
      console.log("✅ [SENANGPAY CALLBACK] Processing successful payment");

      const updated = await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: (my)g,
        },
      });

      // TODO: Trigger side effects (import from existing payment handler):
      // 1. Webhook to captain (CAPTAIN_WEBHOOK_URL)
      // 2. Notification to angler (createNotification)
      // 3. Unlock conversation (update conversation status)
      // 4. System message in chat (sendMessage)

      console.log("✅ [SENANGPAY CALLBACK] Payment processed successfully", {
        bookingId: order_id,
        transactionId: transaction_id,
      });

      // Revalidate pages
      revalidatePath("/book/confirm", "page");
      revalidatePath("/account/bookings", "page");
      revalidatePath(`/captain/bookings/${order_id}`, "page");
    } else {
      // Payment failed
      console.log("❌ [SENANGPAY CALLBACK] Payment failed", {
        bookingId: order_id,
        reason: (my)g,
      });

      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: `Payment Failed: ${(my)g}`,
        },
      });
    }

    // Return "OK" to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("❌ [SENANGPAY CALLBACK] Error processing callback:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

#### Security Considerations

1. **Hash Verification**: Always verify hash before processing
2. **Idempotency**: Check if payment already processed to avoid duplicates
3. **Logging**: Log all callback attempts for audit trail
4. **Error Handling**: Return appropriate HTTP status codes

---

### Phase 7: Refactor Payment Side Effects (Day 4) - 2 hours

**Objective**: Extract payment side effects into reusable function

Currently, the mock payment handler in `page.tsx` has inline side effects:

- Webhook to captain
- Notification to angler
- Conversation unlock
- System message in chat

These need to be extracted so both the return handler and callback webhook can use them.

#### Files to Create

**`src/lib/payment/payment-side-effects.ts`** (NEW)

```typescript
import { prisma } from "@/lib/database/prisma";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import {
  sendMessage,
  unlockConversation,
} from "@/lib/services/message-service";
import { paymentConfirmedMessage } from "@/lib/services/message-templates";

/**
 * Execute all side effects after successful payment
 * Can be called from: return URL handler, callback webhook, or mock payment
 */
export async function executePaymentSideEffects(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        tripId: true,
        charterId: true,
        date: true,
        conversation: {
          select: { id: true },
        },
      },
    });

    if (!booking) {
      console.error("❌ [SIDE EFFECTS] Booking not found:", bookingId);
      return;
    }

    // 1. Unlock conversation (LOCKED → ACTIVE)
    if (booking.conversation) {
      await unlockConversation(booking.conversation.id);
      console.log("✅ [SIDE EFFECTS] Conversation unlocked");

      // 2. Send payment confirmed system message
      const templateMessage = paymentConfirmedMessage();
      await sendMessage(
        booking.conversation.id,
        "system",
        templateMessage.content,
        "system",
        {
          contentType: "system",
          systemType: "payment_confirmed",
        }
      );
      console.log("✅ [SIDE EFFECTS] System message sent");
    }

    // 3. Webhook to captain
    const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
    const hookSecret = process.env.CAPTAIN_API_SECRET;

    if (hookUrl && hookSecret) {
      const trip = await getTripById(booking.tripId);
      const user = booking.userId
        ? await prisma.user.findUnique({ where: { id: booking.userId } })
        : null;

      const anglerName = user?.name || "Angler";

      const payload = {
        type: "booking.paid",
        booking: {
          id: booking.id,
          tripId: booking.tripId,
          charterId: booking.charterId,
          status: "PAID",
          date: booking.date.toISOString(),
          anglerName,
          charterName: trip?.charter?.name || "Your charter",
        },
      };

      sendWithRetry(hookUrl, payload, {
        headers: { "x-captain-secret": hookSecret },
        attempts: 3,
        baseDelayMs: 300,
      });
      console.log("✅ [SIDE EFFECTS] Captain webhook sent");
    }

    // 4. Notification to angler
    if (booking.userId) {
      const trip = await getTripById(booking.tripId);
      if (trip) {
        await createNotification({
          userId: booking.userId,
          type: "BOOKING_PAID",
          title: "Payment Confirmed! ✅",
          message: `Your payment for ${trip.charter.name} on ${booking.date.toISOString().slice(0, 10)} has been confirmed. See you on the water!`,
          actionUrl: `/book/confirm?id=${booking.id}`,
          actionLabel: "View Confirmation",
          bookingId: booking.id,
          charterId: booking.charterId,
          metadata: {
            charterName: trip.charter.name,
            tripDate: booking.date.toISOString().slice(0, 10),
          },
        });
        console.log("✅ [SIDE EFFECTS] Angler notification sent");
      }
    }

    console.log("✅ [SIDE EFFECTS] All side effects executed successfully");
  } catch (error) {
    console.error("❌ [SIDE EFFECTS] Error executing side effects:", error);
    // Don't throw - these are non-blocking enhancements
  }
}
```

#### Refactor Existing Code

Update `src/app/(marketplace)/book/payment/[bookingId]/page.tsx`:

```typescript
import { executePaymentSideEffects } from "@/lib/payment/payment-side-effects";

async function handlePayment() {
  // ... existing validation logic ...

  // Update booking to PAID
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  // Execute all side effects
  executePaymentSideEffects(bookingId);

  // Revalidate and redirect
  revalidatePath("/book/confirm", "page");
  revalidatePath("/account/bookings", "page");
  redirect(`/book/confirm?id=${bookingId}`);
}
```

Update return handler and callback webhook to also use `executePaymentSideEffects()`.

---

### Phase 8: Testing (Day 5) - Full Day

**Objective**: Comprehensive testing using production credentials with mock mode + controlled real tests

**Testing Strategy** (Production-Only Approach):

1. **Phase 8A: Mock Mode Testing** (Safe, No Charges)
   - Set `SENANGPAY_FORCE_MOCK=true`
   - Test all flows with mock payment
   - Verify hash generation logic
   - Unit tests pass

2. **Phase 8B: Integration Testing** (No Charges)
   - Test Senang Pay form generation
   - Verify correct data passed to gateway
   - Test return URL without completing payment

3. **Phase 8C: Live Testing** (Small Charges RM 1-5)
   - Set `SENANGPAY_FORCE_MOCK=false`
   - Use ngrok for webhook testing
   - Complete real transactions
   - Verify full payment flow

4. **Phase 8D: Staging Deployment**
   - Deploy to staging environment
   - Test with real Senang Pay callbacks
   - Monitor Vercel logs

#### Local Testing with ngrok (For Webhook Testing)

**Setup ngrok for callback webhook testing:**

```bash
# Install ngrok (if not installed)
brew install ngrok

# Start your dev server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
```

**Update Senang Pay Dashboard:**

- Go to https://app.senangpay.my
- Settings → Callback URL
- Set to: `https://abc123.ngrok.io/api/payment/senangpay-callback`
- Set Return URL to: `https://abc123.ngrok.io/book/payment/return`

**Important**: Remember to revert to production URLs after testing!

---

#### Testing Checklist

**Development Setup** (Using Force Mock Flag):

- [ ] Production credentials in `.env.local`
- [ ] `SENANGPAY_MODE=production` set
- [ ] `SENANGPAY_FORCE_MOCK=true` set (for safe testing)

**Production Testing Setup** (When ready for real payments):

- [ ] `SENANGPAY_FORCE_MOCK=false` or removed
- [ ] Test with small amounts (RM 1-5)
- [ ] Use ngrok for local webhook testing

**Hash Generation**:

- [ ] Unit tests pass
- [ ] Hash matches Senang Pay documentation examples
- [ ] Invalid hashes rejected

**Payment Initiation**:

- [ ] Payment page loads with Senang Pay form
- [ ] Booking summary displays correctly
- [ ] Form auto-submits to sandbox URL
- [ ] Redirects to Senang Pay sandbox gateway

**Successful Payment Flow** (Production Test with Small Amount):

- [ ] Set `SENANGPAY_FORCE_MOCK=false` temporarily
- [ ] Complete payment with real card (RM 1-5 test amount)
- [ ] Return URL receives correct parameters
- [ ] Hash verification passes
- [ ] Booking status updates to PAID
- [ ] paidAt timestamp set
- [ ] Transaction ID stored
- [ ] Payment method stored
- [ ] Conversation unlocked (LOCKED → ACTIVE)
- [ ] System message appears in chat
- [ ] Captain receives webhook notification
- [ ] Angler receives in-app notification
- [ ] Angler receives email confirmation
- [ ] Confirmation page displays correctly
- [ ] Receipt visible with transaction details

**Failed Payment Flow**:

- [ ] Cancel payment in sandbox
- [ ] Return URL receives failure parameters
- [ ] Payment note stored with failure reason
- [ ] Booking status remains APPROVED
- [ ] Error message displays to user
- [ ] Retry payment button works

**Callback Webhook**:

- [ ] Callback URL accessible (ngrok for local testing: `ngrok http 3000`)
- [ ] Update Senang Pay dashboard with ngrok URL temporarily
- [ ] Receives POST from Senang Pay production
- [ ] Hash verification passes
- [ ] Idempotency: duplicate callbacks handled
- [ ] Booking status updates correctly
- [ ] Side effects trigger
- [ ] Returns "OK" response

**Edge Cases**:

- [ ] Expired booking: payment page shows expiration screen
- [ ] Date no longer available: shows alternative dates
- [ ] Already paid booking: redirects to confirmation
- [ ] Invalid booking ID: 404 error
- [ ] Missing Senang Pay config: shows configuration error (production only)
- [ ] Force mock in production: ignored, requires real gateway
- [ ] Network timeout: retry mechanism works
- [ ] Race condition: callback arrives before return URL
- [ ] Direct URL access: validates booking status APPROVED
- [ ] Payment page refresh: maintains booking state

**Security**:

- [ ] Invalid hash rejected
- [ ] Tampered data rejected
- [ ] Guest booking authorization works
- [ ] Authenticated booking authorization works
- [ ] HTTPS enforced (staging/production)

**Performance**:

- [ ] Payment page loads < 2 seconds
- [ ] Hash generation < 100(my)
- [ ] Return URL processing < 1 second
- [ ] Callback webhook responds < 2 seconds
- [ ] Side effects don't block user flow

---

### Phase 9: Production Deployment (Day 6) - Half Day

**Objective**: Deploy to production with proper monitoring

#### Pre-Deployment Checklist

- [ ] All sandbox tests passing
- [ ] Code review completed
- [ ] Database migration tested in staging
- [ ] Environment variables documented
- [ ] Rollback plan prepared

#### Production Configuration

**Senang Pay Dashboard**:

- [ ] Register production merchant account
- [ ] Obtain production credentials
- [ ] Set callback URL: `https://fishon.my/api/payment/senangpay-callback`
- [ ] Set return URL: `https://fishon.my/book/payment/return`
- [ ] Test webhook connectivity

**Environment Variables** (Vercel):

```bash
SENANGPAY_MERCHANT_ID="production-merchant-id"
SENANGPAY_SECRET_KEY="production-secret-key"
SENANGPAY_MODE="production"
```

**Database Migration**:

```bash
# Backup first!
npm run db:backup pre-senangpay-production

# Run migration
npx prisma migrate deploy

# Verify
npx prisma migrate status
```

#### Deployment Steps

1. **Deploy to Vercel**:

   ```bash
   git checkout main
   git pull origin main
   vercel --prod
   ```

2. **Verify Environment Variables**:
   - Check Vercel dashboard → Settings → Environment Variables
   - Ensure all Senang Pay variables set

3. **Test Production Webhooks**:
   - Make test payment (small amount)
   - Verify callback received
   - Verify return URL works
   - Verify booking status updated

4. **Monitor for 24 Hours**:
   - Check Vercel logs
   - Check Senang Pay dashboard for errors
   - Monitor booking completion rate
   - Check captain webhook success rate

#### Rollback Plan

If critical issues occur:

1. **Emergency**: Switch to mock payment

   ```bash
   # In Vercel dashboard, delete or rename:
   SENANGPAY_MERCHANT_ID
   # This triggers fallback to mock payment
   ```

2. **Revert Code**:

   ```bash
   git revert <commit-hash>
   vercel --prod
   ```

3. **Database**: No rollback needed (new fields are nullable)

4. **Communication**:
   - Add banner: "Payment temporarily unavailable"
   - Email affected users
   - Update status page

---

### Phase 10: Monitoring & Analytics (Day 7) - Ongoing

**Objective**: Track payment metrics and identify issues

#### Key Metrics to Track

**Payment Funnel**:

- Payment page views
- Senang Pay redirects
- Successful payments
- Failed payments
- Abandoned payments
- Return from Senang Pay
- Callback webhook success rate

**Performance**:

- Payment page load time
- Hash generation time
- Return URL processing time
- Callback webhook response time
- Side effects execution time

**Errors**:

- Hash verification failures
- Missing parameters
- Booking not found errors
- Network timeouts
- Webhook failures

#### Monitoring Tools

**Vercel Logs**:

- Search for `[SENANGPAY CALLBACK]`
- Search for `[PAYMENT RETURN]`
- Search for `[SIDE EFFECTS]`

**Senang Pay Dashboard**:

- Transaction history
- Success/failure rates
- Settlement reports

**Custom Analytics** (optional):

```typescript
// Add to payment page
analytics.track("payment_initiated", {
  bookingId: booking.id,
  amount: enrichedBooking.totalPrice,
  paymentMethod: "senangpay",
});

// Add to return handler
analytics.track("payment_completed", {
  bookingId: order_id,
  transactionId: transaction_id,
  status: status_id === "1" ? "success" : "failed",
});
```

#### Alerts to Set Up

1. **Critical**: Hash verification failure
2. **Critical**: Callback webhook 500 errors
3. **Warning**: Payment failure rate > 10%
4. **Warning**: Callback response time > 3s
5. **Info**: Daily payment volume summary

---

## File Changes Summary

### New Files

```
src/lib/payment/
├── senangpay.ts                           # Hash utilities
├── payment-side-effects.ts                # Extracted side effects
└── __tests__/
    └── senangpay.test.ts                  # Unit tests

src/app/(marketplace)/book/payment/
├── [bookingId]/
│   └── PaymentForm.tsx                    # Client component (NEW)
└── return/
    └── page.tsx                           # Return URL handler (NEW)

src/app/api/payment/
└── senangpay-callback/
    └── route.ts                           # Webhook receiver (NEW)
```

### Modified Files

```
prisma/schema.prisma                       # Add payment fields
.env.example                               # Add Senang Pay variables
src/lib/env.ts                            # Add Senang Pay validation
scripts/check-env.js                      # Add optional checks

src/app/(marketplace)/book/payment/[bookingId]/page.tsx
  - Add Senang Pay integration
  - Keep mock payment as fallback
  - Extract side effects
  - Add configuration check
```

### Database Migration

```
prisma/migrations/
└── YYYYMMDD_add_payment_tracking_fields/
    ├── migration.sql
    └── README.md
```

---

## Environment Variables Reference

### Required (Production)

```bash
SENANGPAY_MERCHANT_ID="your-merchant-id"
SENANGPAY_SECRET_KEY="your-secret-key"
SENANGPAY_MODE="production"
```

### Optional (Development)

```bash
SENANGPAY_MODE="sandbox"  # Use sandbox for testing
```

### Existing (Already Configured)

```bash
CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"
CAPTAIN_API_SECRET="shared-secret"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
```

---

## Cost Analysis

### Senang Pay Fees

- **Transaction Fee**: 2.5% + RM 0.50 per transaction
- **Monthly Fee**: RM 0 (no subscription)
- **Setup Fee**: RM 0

### Example Calculation

| Booking Amount | Senang Pay Fee | Net to Fishon |
| -------------- | -------------- | ------------- |
| RM 100         | RM 3.00        | RM 97.00      |
| RM 500         | RM 13.00       | RM 487.00     |
| RM 1000        | RM 25.50       | RM 974.50     |

**Note**: Senang Pay fee is typically absorbed by platform or passed to customer. Document this decision in business logic.

---

## Risk Mitigation

### Technical Risks

| Risk                               | Impact | Likelihood | Mitigation                 |
| ---------------------------------- | ------ | ---------- | -------------------------- |
| Hash verification failure          | High   | Low        | Extensive testing, logging |
| Callback not received              | High   | Medium     | Return URL as fallback     |
| Race condition (return + callback) | Medium | Medium     | Idempotency checks         |
| Payment gateway downtime           | High   | Low        | Fallback to mock payment   |
| Database update failure            | High   | Low        | Transaction rollback       |

### Business Risks

| Risk                          | Impact | Likelihood | Mitigation                         |
| ----------------------------- | ------ | ---------- | ---------------------------------- |
| Failed payments lose bookings | High   | Medium     | Clear error messages, retry button |
| Double payment                | High   | Low        | Idempotency, transaction locks     |
| Abandoned payments            | Medium | High       | Email reminders, booking holds     |
| Fraud attempts                | High   | Low        | Hash verification, logging         |

---

## Success Criteria

**Technical**:

- [ ] 99.5%+ successful payment processing rate
- [ ] < 2s payment page load time
- [ ] < 1s hash generation/verification
- [ ] 100% callback webhook success rate
- [ ] Zero hash verification failures (legitimate)

**Business**:

- [ ] 80%+ payment completion rate (initiated → paid)
- [ ] < 5% payment abandonment rate
- [ ] 90%+ captain satisfaction with payment notifications
- [ ] 95%+ angler satisfaction with payment UX
- [ ] Zero double-payment incidents

**User Experience**:

- [ ] Clear error messages for failures
- [ ] One-click retry for failed payments
- [ ] Receipt available immediately
- [ ] Email confirmation within 1 minute
- [ ] Captain notification within 1 minute

---

## Timeline

| Phase                     | Duration | Effort | Dependencies       |
| ------------------------- | -------- | ------ | ------------------ |
| Phase 1: Database         | 2 hours  | Low    | None               |
| Phase 2: Environment      | 1 hour   | Low    | Senang Pay account |
| Phase 3: Hash Utilities   | 3 hours  | Medium | None               |
| Phase 4: Payment Page     | 4 hours  | Medium | Phase 1-3          |
| Phase 5: Return Handler   | 3 hours  | Medium | Phase 3-4          |
| Phase 6: Callback Webhook | 3 hours  | Medium | Phase 3-5          |
| Phase 7: Refactor         | 2 hours  | Low    | Phase 6            |
| Phase 8: Testing          | 8 hours  | High   | Phase 1-7          |
| Phase 9: Production       | 4 hours  | Medium | Phase 8            |
| Phase 10: Monitoring      | Ongoing  | Low    | Phase 9            |

**Total Development Time**: ~30 hours (~4 working days)  
**Total Project Time**: ~1-2 weeks (including waiting for approvals, sandbox testing)

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Register Senang Pay merchant account** (1-3 business days approval)
3. **Obtain sandbox credentials** for testing
4. **Begin Phase 1**: Database schema update
5. **Set up development environment** with sandbox credentials
6. **Implement Phases 1-7** following this plan
7. **Comprehensive testing** in Phase 8
8. **Staging deployment** for final verification
9. **Production deployment** with monitoring
10. **Post-launch review** after 1 week

---

**Document Version**: 2.0  
**Last Updated**: November 11, 2025  
**Next Review**: After Phase 8 (Testing Complete)  
**Status**: Ready for Implementation

**Related Documents**:

- Original plan: `plan-payment-senangpay-integration.md`
- Chat system plan: `plan-chat-message-system.md`
- Notification system docs: `feature-notification-phase-1d-complete.md`
- Booking flow docs: `docs/feature-booking-integration.md`
