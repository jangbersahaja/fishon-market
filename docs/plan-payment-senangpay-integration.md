---
type: plan
status: draft
updated: 2025-10-23
feature: payment-gateway
author: GitHub Copilot
tags: [payment, senangpay, booking, integration]
impact: high
version-introduced: TBD
---

# PLAN – Senang Pay Payment Gateway Integration

## Summary

This document outlines the complete implementation plan for integrating Senang Pay, a Malaysian payment gateway, into the fishon-market booking system. Senang Pay will replace the current mock payment implementation, enabling real payment processing for charter bookings.

**Integration Type:** Redirect-based payment flow with server-side hash verification  
**Payment Provider:** Senang Pay (<https://app.senangpay.my>)  
**Security:** HMAC-SHA256 hash verification for request/response validation  
**Booking Flow:** Book Charter → Payment → Confirmation (with callbacks)

---

## What's in this plan

- [ ] Step 1: Set up Senang Pay account and obtain credentials
- [ ] Step 2: Implement hash generation utilities
- [ ] Step 3: Create payment initiation page
- [ ] Step 4: Implement return URL handler
- [ ] Step 5: Implement callback webhook
- [ ] Step 6: Add payment status tracking
- [ ] Step 7: Update booking confirmation UI
- [ ] Step 8: Testing in sandbox environment
- [ ] Step 9: Production deployment
- [ ] Step 10: Documentation and monitoring

---

## Implementation 1 — Environment Setup

### Problem

Before integrating Senang Pay, we need proper credentials and environment configuration. The payment gateway requires:

- Merchant ID (merchant_id)
- Secret Key (secret_key) for hash generation
- Sandbox vs Production mode toggle

### Completed Job Summary

**Not yet started** - Prerequisites to complete:

- Register for Senang Pay merchant account at <https://app.senangpay.my>
- Obtain sandbox credentials for testing
- Configure environment variables

### Environment Variables Required

```bash
# Senang Pay Configuration
SENANGPAY_MERCHANT_ID=your_merchant_id
SENANGPAY_SECRET_KEY=your_secret_key
SENANGPAY_MODE=sandbox # sandbox | production
SENANGPAY_SANDBOX_URL=https://sandbox.senangpay.my/payment/your_merchant_id
SENANGPAY_PRODUCTION_URL=https://app.senangpay.my/payment/your_merchant_id
```

### Future Plan

- [ ] Register Senang Pay merchant account
- [ ] Obtain sandbox credentials
- [ ] Add environment variables to `.env.local`
- [ ] Update `.env.example` with Senang Pay variables

---

## Implementation 2 — Hash Generation Utilities

### Problem

Senang Pay requires HMAC-SHA256 hash verification for:

1. **Payment Request Hash**: Sent with payment form to validate request authenticity
2. **Return Hash**: Verified when user returns from payment page
3. **Callback Hash**: Verified when Senang Pay sends payment notification

Hash format: `HMAC-SHA256(secret_key, merchant_id + detail + amount + order_id)`

### Completed Job Summary

**Not yet started** - Files to create:

```typescript
// src/lib/payment/senangpay.ts
```

### Implementation Code

```typescript
// src/lib/payment/senangpay.ts
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
  msg: string;
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
 * Verify return hash from Senang Pay
 * Used when user returns from payment page
 */
export function verifyReturnHash(
  response: PaymentResponse,
  secretKey: string,
  merchantId: string
): boolean {
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(
      `${merchantId}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
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
export function validateSenangPayConfig(): void {
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secretKey = process.env.SENANGPAY_SECRET_KEY;

  if (!merchantId || !secretKey) {
    throw new Error(
      "Senang Pay is not configured. Please set SENANGPAY_MERCHANT_ID and SENANGPAY_SECRET_KEY environment variables."
    );
  }
}
```

### Future Plan

- [ ] Create utility file with hash functions
- [ ] Add unit tests for hash generation
- [ ] Add environment validation
- [ ] Document hash generation process

---

## Implementation 3 — Payment Initiation Page

### Problem

Replace the current mock payment page (`/book/payment/[bookingId]/page.tsx`) with a real Senang Pay integration that:

1. Fetches booking details
2. Generates payment hash
3. Submits payment form to Senang Pay
4. Handles payment initiation errors

### Completed Job Summary

**Current State:**

- Mock payment page exists at `src/app/(marketplace)/book/payment/[bookingId]/page.tsx`
- Simple "Confirm Payment" button that updates booking to PAID status
- No real payment processing

**To Replace With:**

- Real Senang Pay form submission
- Hash generation and validation
- Proper error handling

### Implementation Code

```typescript
// src/app/(marketplace)/book/payment/[bookingId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  generatePaymentHash,
  getSenangPayUrl,
  formatAmount,
  validateSenangPayConfig,
} from "@/lib/payment/senangpay";
import { PaymentForm } from "./PaymentForm";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
  const { bookingId } = await params;

  // Validate Senang Pay configuration
  try {
    validateSenangPayConfig();
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-900 mb-2">
              Payment Configuration Error
            </h1>
            <p className="text-red-700">
              {error instanceof Error ? error.message : "Configuration error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      charter: {
        select: {
          title: true,
          slug: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  // Check if booking is in correct status
  if (booking.status !== "APPROVED") {
    redirect(`/book/confirm?id=${bookingId}`);
  }

  // Check if already paid
  if (booking.paidAt) {
    redirect(`/book/confirm?id=${bookingId}`);
  }

  // Prepare payment data
  const merchantId = process.env.SENANGPAY_MERCHANT_ID!;
  const secretKey = process.env.SENANGPAY_SECRET_KEY!;
  const amount = formatAmount(booking.totalAmount);
  const orderId = booking.id;
  const detail = `Charter Booking: ${booking.charter.title}`;

  // Generate payment hash
  const hash = generatePaymentHash({
    merchantId,
    secretKey,
    detail,
    amount,
    orderId,
  });

  // Payment form data
  const paymentData = {
    merchantId,
    detail,
    amount,
    orderId,
    hash,
    name: booking.user?.name || "",
    email: booking.user?.email || "",
    phone: booking.guestPhone || "",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Complete Payment</h1>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Charter:</span>
              <span className="font-semibold">{booking.charter.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booking Date:</span>
              <span className="font-semibold">
                {new Date(booking.bookingDate).toLocaleDateString("en-MY")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Guests:</span>
              <span className="font-semibold">{booking.guestCount}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-blue-600">
                RM {booking.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <PaymentForm
            paymentUrl={getSenangPayUrl()}
            paymentData={paymentData}
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Secure Payment</h3>
          <p className="text-sm text-blue-700">
            You will be redirected to Senang Pay secure payment page. After
            completing payment, you will be redirected back to view your booking
            confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// src/app/(marketplace)/book/payment/[bookingId]/PaymentForm.tsx
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

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
  };
}

export function PaymentForm({ paymentUrl, paymentData }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = () => {
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
        {/* Return URL - where Senang Pay redirects after payment */}
        <input
          type="hidden"
          name="return_url"
          value={`${process.env.NEXT_PUBLIC_APP_URL}/book/payment/return`}
        />
        {/* Callback URL - server-to-server notification */}
        <input
          type="hidden"
          name="callback_url"
          value={`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/senangpay-callback`}
        />
      </form>

      <Button onClick={handleSubmit} className="w-full" size="lg">
        Proceed to Payment
      </Button>
    </>
  );
}
```

### Future Plan

- [ ] Replace mock payment page with Senang Pay integration
- [ ] Create PaymentForm client component
- [ ] Add loading states and error handling
- [ ] Test payment initiation flow

---

## Implementation 4 — Return URL Handler

### Problem

After payment completion (success or failure), Senang Pay redirects the user back to our application with payment details in the URL. We need to:

1. Parse and validate the return parameters
2. Verify the hash to ensure data integrity
3. Update booking status based on payment result
4. Redirect to confirmation page with appropriate message

**Return Parameters:**

- `status_id`: "1" (success) or "0" (failed)
- `order_id`: Booking ID
- `transaction_id`: Senang Pay transaction ID
- `msg`: Status message
- `hash`: Verification hash

### Completed Job Summary

**Not yet started** - Files to create:

```typescript
// src/app/(marketplace)/book/payment/return/page.tsx
```

### Implementation Code

```typescript
// src/app/(marketplace)/book/payment/return/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyReturnHash } from "@/lib/payment/senangpay";

interface PageProps {
  searchParams: Promise<{
    status_id?: string;
    order_id?: string;
    transaction_id?: string;
    msg?: string;
    hash?: string;
  }>;
}

export default async function PaymentReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status_id, order_id, transaction_id, msg, hash } = params;

  // Validate required parameters
  if (!status_id || !order_id || !transaction_id || !msg || !hash) {
    redirect("/book/confirm?error=invalid_payment_response");
  }

  // Verify hash
  const merchantId = process.env.SENANGPAY_MERCHANT_ID!;
  const secretKey = process.env.SENANGPAY_SECRET_KEY!;

  const isValid = verifyReturnHash(
    {
      status_id,
      order_id,
      transaction_id,
      msg,
      hash,
    },
    secretKey,
    merchantId
  );

  if (!isValid) {
    redirect("/book/confirm?error=invalid_payment_hash");
  }

  // Update booking status
  try {
    if (status_id === "1") {
      // Payment success
      await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: msg,
        },
      });

      redirect(`/book/confirm?id=${order_id}&payment=success`);
    } else {
      // Payment failed
      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: msg,
        },
      });

      redirect(
        `/book/confirm?id=${order_id}&payment=failed&reason=${encodeURIComponent(
          msg
        )}`
      );
    }
  } catch (error) {
    console.error("Error updating booking after payment:", error);
    redirect(`/book/confirm?id=${order_id}&error=update_failed`);
  }
}
```

### Future Plan

- [ ] Create return URL handler page
- [ ] Add hash verification
- [ ] Update booking status based on payment result
- [ ] Add error handling for invalid responses
- [ ] Test success and failure scenarios

---

## Implementation 5 — Callback Webhook

### Problem

Senang Pay sends a server-to-server callback notification to ensure payment status is recorded even if the user closes the browser. The callback webhook:

1. Receives POST request with payment details
2. Verifies hash to prevent fraud
3. Updates booking status
4. Returns "OK" response to acknowledge receipt

**Critical:** This is the authoritative payment confirmation. The return URL handler is for user experience only.

### Completed Job Summary

**Not yet started** - Files to create:

```typescript
// src/app/api/bookings/senangpay-callback/route.ts
```

### Implementation Code

```typescript
// src/app/api/bookings/senangpay-callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyReturnHash } from "@/lib/payment/senangpay";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const status_id = formData.get("status_id")?.toString();
    const order_id = formData.get("order_id")?.toString();
    const transaction_id = formData.get("transaction_id")?.toString();
    const msg = formData.get("msg")?.toString();
    const hash = formData.get("hash")?.toString();

    // Validate required fields
    if (!status_id || !order_id || !transaction_id || !msg || !hash) {
      console.error("Missing required fields in callback");
      return new NextResponse("Bad Request", { status: 400 });
    }

    // Verify hash
    const merchantId = process.env.SENANGPAY_MERCHANT_ID!;
    const secretKey = process.env.SENANGPAY_SECRET_KEY!;

    const isValid = verifyReturnHash(
      {
        status_id,
        order_id,
        transaction_id,
        msg,
        hash,
      },
      secretKey,
      merchantId
    );

    if (!isValid) {
      console.error("Invalid hash in callback");
      return new NextResponse("Invalid Hash", { status: 400 });
    }

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: order_id },
    });

    if (!booking) {
      console.error("Booking not found:", order_id);
      return new NextResponse("Booking Not Found", { status: 404 });
    }

    // Update booking based on payment status
    if (status_id === "1") {
      // Payment success
      await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: msg,
        },
      });

      console.log("Payment success callback processed:", {
        bookingId: order_id,
        transactionId: transaction_id,
      });
    } else {
      // Payment failed
      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: `Payment Failed: ${msg}`,
        },
      });

      console.log("Payment failure callback processed:", {
        bookingId: order_id,
        reason: msg,
      });
    }

    // Return "OK" to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Senang Pay callback:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

### Future Plan

- [ ] Create callback webhook route
- [ ] Add hash verification
- [ ] Update booking status
- [ ] Add comprehensive logging
- [ ] Test webhook with Senang Pay sandbox
- [ ] Configure webhook URL in Senang Pay dashboard

---

## Implementation 6 — Database Schema Updates

### Problem

Need to add fields to the Booking model to track payment details:

- `paymentTransactionId`: Senang Pay transaction ID
- `paymentMethod`: Payment method used (SENANGPAY)
- `paymentNote`: Payment status message or error details

**Note:** `paidAt` field already added in Phase 5.1

### Completed Job Summary

**Partially Complete:**

- ✅ `paidAt` field added (DateTime? @db.Timestamptz)

**Still Needed:**

- Payment tracking fields

### Implementation Code

```prisma
// prisma/schema.prisma
model Booking {
  // ... existing fields ...

  paidAt                DateTime?  @db.Timestamptz // Already added
  paymentTransactionId  String?    @db.VarChar(255)
  paymentMethod         String?    @db.VarChar(50)
  paymentNote           String?    @db.Text

  // ... rest of model ...
}
```

```sql
-- Migration: prisma/migrations/YYYYMMDD_add_payment_fields/migration.sql
ALTER TABLE "Booking" ADD COLUMN "paymentTransactionId" VARCHAR(255);
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" VARCHAR(50);
ALTER TABLE "Booking" ADD COLUMN "paymentNote" TEXT;
```

### Future Plan

- [ ] Add payment tracking fields to schema
- [ ] Create migration
- [ ] Run migration in development
- [ ] Regenerate Prisma client
- [ ] Update TypeScript types

---

## Implementation 7 — Booking Confirmation UI Updates

### Problem

Update the booking confirmation page to:

1. Show payment status clearly
2. Display transaction ID for paid bookings
3. Add receipt download button for paid bookings
4. Show payment error message if payment failed
5. Booking transaction - status change refresh related pages i.e fishon-market: /book/confirm and /account/bookings, fishon-captain: /captain/bookings and /captain/bookings/[id]

### Completed Job Summary

**Current State:**

- Basic confirmation page at `/book/confirm`
- Shows booking status
- Has download receipt button for PAID status
- Need to reload page to see status change

**Enhancements Needed:**

- Display transaction ID
- Show payment method
- Better error messaging
- Revalidate pages when status change

### Implementation Code

```typescript
// src/app/(marketplace)/book/confirm/page.tsx
// Add to existing file:

// Display transaction ID for paid bookings
{
  booking.status === "PAID" && booking.paymentTransactionId && (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600">Transaction ID</div>
      <div className="font-mono text-sm">{booking.paymentTransactionId}</div>
    </div>
  );
}

// Show payment error if failed
{
  searchParams.payment === "failed" && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-2">Payment Failed</h3>
      <p className="text-sm text-red-700">
        {searchParams.reason ||
          "Payment could not be processed. Please try again."}
      </p>
      <Button href={`/book/payment/${booking.id}`} className="mt-4">
        Try Again
      </Button>
    </div>
  );
}
```

### Future Plan

- [ ] Add transaction ID display
- [ ] Add payment method badge
- [ ] Improve error messaging
- [ ] Add "Try Again" button for failed payments
- [ ] Add payment success animation

---

## Implementation 8 — Payment Receipt Card

### Problem

Malaysian payment regulations require proper receipts showing payment breakdown. When booking status is PAID, we need to display a detailed receipt card showing:

**Required Information (Malaysian Tax/Regulatory Compliance):**

- Payment date and time
- Transaction/Receipt ID
- Booking reference number
- Charter service details
- Amount breakdown:
  - Subtotal (charter price)
  - Fishon service fee/commission (%)
  - SST (Sales & Service Tax) if applicable
  - Total amount paid
- Payment method (Senang Pay)
- Merchant details (Fishon.my business registration)
- Customer details (name, email)

**Regulatory Context:**

- Malaysia requires businesses to issue receipts for all transactions
- Service tax (6% SST) may apply depending on business registration
- Platform commission should be transparent to customers
- Receipt must be downloadable/printable for record keeping

### Completed Job Summary

**Not yet started** - Files to update:

```typescript
// src/app/(marketplace)/book/confirm/PaymentReceipt.tsx (NEW)
// src/app/(marketplace)/book/confirm/page.tsx (UPDATE)
```

### Implementation Code

```typescript
// src/app/(marketplace)/book/confirm/PaymentReceipt.tsx
"use client";

import { Download, Receipt } from "lucide-react";

interface PaymentReceiptProps {
  booking: {
    id: string;
    charterName: string;
    tripName: string;
    totalPrice: number;
    paidAt: Date | null;
    paymentTransactionId: string | null;
    unitPrice: number;
    days: number;
  };
  user: {
    name: string | null;
    email: string;
  } | null;
}

// Platform commission rate (adjust as needed)
const PLATFORM_COMMISSION_RATE = 0.15; // 15%
const SST_RATE = 0.06; // 6% (if applicable)

export function PaymentReceipt({ booking, user }: PaymentReceiptProps) {
  if (!booking.paidAt || !booking.paymentTransactionId) {
    return null;
  }

  // Calculate breakdown
  const subtotal = booking.totalPrice;
  const platformFee = subtotal * PLATFORM_COMMISSION_RATE;
  const captainAmount = subtotal - platformFee;
  // const sst = subtotal * SST_RATE; // Uncomment if SST applicable
  const totalPaid = subtotal;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate PDF or trigger print dialog
    window.print();
  };

  return (
    <section className="bg-white border-2 border-slate-200 rounded-2xl p-6 print:border-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 print:mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-[#ec2227]" />
            <h2 className="text-xl font-bold text-slate-900">
              Payment Receipt
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Receipt #: {booking.paymentTransactionId}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border-2 border-[#ec2227] text-[#ec2227] rounded-lg hover:bg-[#ec2227] hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Merchant Details */}
      <div className="mb-6 pb-6 border-b border-slate-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-slate-900">Fishon.my</p>
            <p className="text-slate-600">123 Jalan Fishing, Pelabuhan Klang</p>
            <p className="text-slate-600">Selangor, Malaysia</p>
            <p className="text-slate-600">SSM: 202400XXXXX (TBD)</p>
          </div>
          <div className="text-right">
            <p className="text-slate-600">
              Date: {new Date(booking.paidAt).toLocaleDateString("en-MY")}
            </p>
            <p className="text-slate-600">
              Time:{" "}
              {new Date(booking.paidAt).toLocaleTimeString("en-MY", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="mb-6 pb-6 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">Bill To:</h3>
        <p className="text-sm text-slate-900">{user?.name || "Guest"}</p>
        <p className="text-sm text-slate-600">{user?.email}</p>
        <p className="text-sm text-slate-600 mt-2">Booking Ref: {booking.id}</p>
      </div>

      {/* Service Details */}
      <div className="mb-6">
        <h3 className="font-semibold text-slate-900 mb-3">Service Details:</h3>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-600">Charter:</span>
            <span className="text-sm font-medium text-slate-900">
              {booking.charterName}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-600">Trip:</span>
            <span className="text-sm font-medium text-slate-900">
              {booking.tripName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Duration:</span>
            <span className="text-sm font-medium text-slate-900">
              {booking.days} day{booking.days > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="space-y-3 mb-6">
        <h3 className="font-semibold text-slate-900">Payment Breakdown:</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal (Charter Fee)</span>
            <span className="font-medium text-slate-900">
              RM {subtotal.toFixed(2)}
            </span>
          </div>

          {/* Uncomment if SST is applicable */}
          {/* <div className="flex justify-between text-slate-600">
            <span>SST (6%)</span>
            <span>RM {sst.toFixed(2)}</span>
          </div> */}

          <div className="pt-2 border-t border-slate-200">
            <div className="flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">
                Total Paid
              </span>
              <span className="text-xl font-bold text-[#ec2227]">
                RM {totalPaid.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Fee Breakdown (Transparency) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Fee Distribution:
        </h4>
        <div className="space-y-1 text-xs text-blue-800">
          <div className="flex justify-between">
            <span>Captain receives:</span>
            <span className="font-medium">
              RM {captainAmount.toFixed(2)} (
              {((captainAmount / totalPaid) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fishon service fee:</span>
            <span className="font-medium">
              RM {platformFee.toFixed(2)} (
              {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)
            </span>
          </div>
          <p className="text-[10px] text-blue-700 mt-2">
            *Platform fee covers payment processing, customer support, insurance
            coverage, and platform maintenance.
          </p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-6 pb-6 border-b border-slate-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Payment Method:</span>
          <span className="font-medium text-slate-900">Senang Pay</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-slate-600">Transaction ID:</span>
          <span className="font-mono text-xs text-slate-900">
            {booking.paymentTransactionId}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        <p>Thank you for booking with Fishon.my</p>
        <p className="mt-1">
          For inquiries, contact support@fishon.my or +60 12-345 6789
        </p>
        <p className="mt-2 text-[10px]">
          This is an official receipt issued by Fishon.my
        </p>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </section>
  );
}
```

```typescript
// Update src/app/(marketplace)/book/confirm/page.tsx
// Add import:
import { PaymentReceipt } from "./PaymentReceipt";

// Add to page component after BookingSummaryCard:
{
  booking.status === "PAID" && (
    <PaymentReceipt
      booking={{
        id: booking.id,
        charterName: booking.charterName,
        tripName: booking.tripName,
        totalPrice: booking.totalPrice,
        paidAt: booking.paidAt,
        paymentTransactionId: booking.paymentTransactionId,
        unitPrice: booking.unitPrice,
        days: booking.days,
      }}
      user={
        booking.userId
          ? {
              name: booking.user?.name ?? null,
              email: booking.user?.email ?? "",
            }
          : null
      }
    />
  );
}
```

### Future Plan

- [ ] Review Malaysian business/tax regulations for receipt requirements
- [ ] Confirm platform commission rate (currently 15%)
- [ ] Determine if SST (6%) is applicable based on business registration
- [ ] Add Fishon.my business registration number (SSM)
- [ ] Add proper business address
- [ ] Implement PDF generation for downloadable receipts
- [ ] Add print stylesheet optimization
- [ ] Test receipt printing on different browsers
- [ ] Verify all required information is displayed
- [ ] Consult with accountant/legal on compliance

### Regulatory Notes

**Malaysian Receipt Requirements:**

- Business name and registration number (SSM)
- Business address
- Receipt/transaction number
- Date and time of transaction
- Description of goods/services
- Amount paid (with breakdown if applicable)
- Tax information (SST if registered)

**Platform Transparency:**

- Show commission/fee breakdown
- Explain what platform fee covers
- Make it clear how much captain receives
- Build trust with customers

**Tax Considerations:**

- Check if Fishon.my needs to register for SST
- Consult with tax advisor on service tax applicability
- Keep receipt records for audit purposes
- Issue monthly statements if required

### References

- [SSM Malaysia](https://www.ssm.com.my) - Business registration
- [MyTax](https://www.hasil.gov.my) - Tax information
- [Senang Pay Documentation](https://app.senangpay.my/docs) - Payment gateway
- Malaysian Consumer Protection Act 1999

---

## Implementation 9 — Testing Strategy

### Problem

Comprehensive testing is required before production deployment:

1. Sandbox environment testing
2. Hash generation validation
3. Payment flow testing (success/failure scenarios)
4. Callback webhook testing
5. Edge cases and error handling

### Testing Checklist

#### Sandbox Testing

- [ ] Register sandbox merchant account
- [ ] Configure sandbox credentials
- [ ] Test successful payment flow
- [ ] Test failed payment flow
- [ ] Test cancelled payment (user closes payment page)
- [ ] Test timeout scenarios
- [ ] Verify callback webhook receives notifications
- [ ] Verify return URL handler works correctly

#### Hash Validation

- [ ] Test hash generation with known values
- [ ] Verify hash matches Senang Pay examples
- [ ] Test hash verification with valid hashes
- [ ] Test hash verification rejects invalid hashes
- [ ] Test hash verification rejects tampered data

#### Database Updates

- [ ] Verify booking status updates correctly
- [ ] Verify paidAt timestamp is set
- [ ] Verify transaction ID is stored
- [ ] Verify payment notes are recorded
- [ ] Test idempotency (callback received multiple times)

#### Error Scenarios

- [ ] Invalid booking ID
- [ ] Already paid booking
- [ ] Missing environment variables
- [ ] Invalid hash in callback
- [ ] Database update failures
- [ ] Network timeouts

#### User Experience

- [ ] Payment page loads correctly
- [ ] Form submission redirects to Senang Pay
- [ ] Return redirect works after payment
- [ ] Confirmation page shows correct status
- [ ] Receipt download works for paid bookings

### Future Plan

- [ ] Create test plan document
- [ ] Execute sandbox testing
- [ ] Document test results
- [ ] Fix any issues found
- [ ] Get approval for production deployment

---

## Implementation 9 — Production Deployment

### Problem

Safe deployment to production requires:

1. Production credentials configuration
2. Environment variable setup
3. Database migration
4. Webhook URL registration
5. Monitoring setup
6. Rollback plan

### Deployment Checklist

#### Pre-Deployment

- [ ] Obtain production Senang Pay credentials
- [ ] Configure production environment variables
- [ ] Test in staging environment
- [ ] Review security settings
- [ ] Prepare rollback plan

#### Database Migration

- [ ] Backup production database
- [ ] Run payment fields migration
- [ ] Verify migration success
- [ ] Regenerate Prisma client in production

#### Senang Pay Configuration

- [ ] Register callback URL in Senang Pay dashboard
- [ ] Register return URL in Senang Pay dashboard
- [ ] Test webhook connectivity
- [ ] Verify credentials are correct

#### Monitoring

- [ ] Set up payment success/failure alerts
- [ ] Monitor callback webhook logs
- [ ] Track payment conversion rates
- [ ] Monitor error rates

#### Post-Deployment

- [ ] Test complete payment flow in production
- [ ] Monitor for errors in first 24 hours
- [ ] Verify callbacks are received
- [ ] Check booking status updates are working

### Rollback Plan

If issues occur:

1. Revert to mock payment page
2. Disable Senang Pay routes
3. Add maintenance message on payment page
4. Fix issues in staging
5. Re-deploy after verification

### Future Plan

- [ ] Prepare production deployment plan
- [ ] Execute deployment checklist
- [ ] Monitor production deployment
- [ ] Document any issues and resolutions

---

## Implementation 10 — Security Considerations

### Problem

Payment processing requires strict security measures:

1. Hash verification to prevent fraud
2. Environment variable protection
3. HTTPS enforcement
4. PCI compliance considerations
5. Logging without exposing sensitive data

### Security Measures

#### Hash Verification

✅ **Implemented:**

- Hash generation using HMAC-SHA256
- Hash verification on return and callback
- Rejection of invalid hashes

#### Environment Protection

🔒 **Required:**

- Store secret key in environment variables only
- Never commit credentials to repository
- Use different credentials for sandbox/production
- Rotate keys periodically

#### HTTPS Enforcement

🔒 **Required:**

- All payment pages must use HTTPS
- Callback webhook must use HTTPS
- Verify SSL certificates are valid

#### Data Protection

🔒 **Required:**

- Log payment events without exposing sensitive data
- Don't log secret keys or full credit card numbers
- Sanitize error messages shown to users
- Encrypt sensitive data in database

#### PCI Compliance

ℹ️ **Note:**

- Senang Pay is PCI compliant
- We don't handle credit card data directly
- Still need to secure booking and user data

### Security Checklist

- [ ] Verify hash generation is secure
- [ ] Confirm environment variables are not exposed
- [ ] Enable HTTPS for all payment routes
- [ ] Add rate limiting to callback webhook
- [ ] Sanitize logs to remove sensitive data
- [ ] Add monitoring for suspicious activity
- [ ] Document security procedures
- [ ] Train team on security best practices

### Future Plan

- [ ] Review security measures with team
- [ ] Implement additional protections if needed
- [ ] Schedule regular security audits
- [ ] Keep security documentation up to date

---

## Archive / Legacy Notes

### Replaced Implementation

**Mock Payment System** (Phase 5.1):

- Location: `src/app/(marketplace)/book/payment/[bookingId]/page.tsx`
- Functionality: Simple "Confirm Payment" button that directly updates booking to PAID status
- Created: October 23, 2025
- To be replaced: When Senang Pay integration is complete

**Migration Strategy:**

1. Keep mock payment as fallback during testing
2. Add feature flag to toggle between mock and real payment
3. Test Senang Pay thoroughly in sandbox
4. Replace mock with Senang Pay in production
5. Remove mock payment code after successful deployment

**Feature Flag Example:**

```typescript
// .env
ENABLE_REAL_PAYMENT=false # true to enable Senang Pay

// In payment page:
if (process.env.ENABLE_REAL_PAYMENT === 'true') {
  // Use Senang Pay integration
} else {
  // Use mock payment
}
```

---

## Review Notes

**Document Status:** Draft - awaiting implementation

**Review Checklist:**

- [x] All implementation steps documented
- [x] Code examples provided
- [x] Security considerations addressed
- [x] Testing strategy defined
- [x] Deployment plan outlined
- [ ] Team review completed
- [ ] Senang Pay account registered
- [ ] Sandbox testing completed
- [ ] Production deployment planned

**Next Actions:**

1. Register Senang Pay merchant account
2. Obtain sandbox credentials
3. Begin Implementation 1 (Environment Setup)
4. Follow implementation steps in order
5. Update this document with progress

**Dependencies:**

- Senang Pay merchant account approval
- Sandbox credentials access
- Production credentials (for deployment)

**Timeline:**

- Setup & Development: 2-3 days
- Sandbox Testing: 2-3 days
- Production Deployment: 1 day
- Monitoring & Fixes: Ongoing

**Estimated Total:** 5-7 days

---

**Last Updated:** October 23, 2025  
**Next Review:** After Implementation 1 complete  
**Document Version:** 1.0
