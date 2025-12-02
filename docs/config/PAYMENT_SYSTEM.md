# Payment System Configuration

**Last Updated**: 25 November 2025  
**Status**: Production Ready ✅  
**Provider**: SenangPay (Malaysia)  
**Applies To**: fishon-market (primary), fishon-captain (webhook receiver)

---

## System Overview

The Fishon payment system handles all monetary transactions between anglers and captains using SenangPay as the payment gateway. It supports multiple payment methods with flow-aware processing.

### Payment Methods Supported

| Method      | Flow      | Behavior                                        |
| ----------- | --------- | ----------------------------------------------- |
| **CARD**    | TOKENIZED | Authorization hold, charged only after approval |
| **FPX**     | DIRECT    | Immediate bank transfer, refund if rejected     |
| **EWALLET** | DIRECT    | Immediate capture, refund if rejected           |
| **MOCK**    | TOKENIZED | Development only, simulates card flow           |

### Key Features

- ✅ Dual-flow architecture (TOKENIZED vs DIRECT)
- ✅ Authorization hold for cards (no charge until approval)
- ✅ Automated refund processing
- ✅ Time-based cancellation policy
- ✅ Webhook integration for real-time updates
- ✅ Guest checkout support

---

## Architecture

```
Angler (fishon-market)
        ↓
  Payment Intent Created
        ↓
  ┌─────────────────────────────────────────────┐
  │ TOKENIZED (Card)      │ DIRECT (FPX/E-wallet)│
  │ Token stored          │ Redirect to gateway  │
  │ No charge yet         │ Immediate capture    │
  └─────────────────────────────────────────────┘
        ↓
  Captain Decision (12h deadline)
        ↓
  ┌─────────────────────────────────────────────┐
  │ APPROVE               │ REJECT/EXPIRE        │
  │ Charge card           │ Release token OR     │
  │ Confirm booking       │ Initiate refund      │
  └─────────────────────────────────────────────┘
        ↓
  Webhook → fishon-captain
```

---

## Payment Flow by Booking Type

### MANUAL Booking Flow

```
PENDING → Captain Approves → AWAITING_PAYMENT → Angler Pays → PAID
```

- No payment at booking time
- Payment collected after captain approval
- 48h payment deadline

### AUTO Booking Flow

```
PAYMENT_AUTHORIZED → Captain Acknowledges → PAID
```

- **TOKENIZED**: Card authorized immediately (not charged)
- **DIRECT**: FPX/E-wallet charged immediately
- Captain has 12h to acknowledge

---

## Database Schema

### Booking Payment Fields

```prisma
model Booking {
  // Payment method & flow
  paymentMethod        PaymentMethod?  // CARD, FPX, EWALLET, MOCK
  paymentFlow          PaymentFlow?    // TOKENIZED, DIRECT
  paymentIntentId      String?         // SenangPay transaction ID

  // Payment timestamps
  paymentAuthorizedAt  DateTime?       // Token created (TOKENIZED)
  paymentCapturedAt    DateTime?       // Payment charged
  paymentReleasedAt    DateTime?       // Token released (no charge)

  // Refund tracking
  refundStatus         RefundStatus?   // PENDING, PROCESSING, COMPLETED, FAILED
  refundAmount         Decimal?
  refundTransactionId  String?
  refundReason         String?
  refundedBy           String?
  refundedAt           DateTime?

  // Cancellation policy snapshot
  cancellationPolicy   Json?
}

enum PaymentMethod {
  CARD
  FPX
  EWALLET
  MOCK
}

enum PaymentFlow {
  TOKENIZED
  DIRECT
}

enum RefundStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## API Endpoints

### Payment Intent Creation

**POST** `/api/bookings/create` or `/api/bookings/create-guest`

Creates booking with payment intent based on method:

```typescript
// Request body includes:
{
  paymentMethod: "CARD" | "FPX" | "EWALLET",
  // ... other booking fields
}

// Response for TOKENIZED (Card):
{
  booking: { id, status: "PAYMENT_AUTHORIZED", paymentFlow: "TOKENIZED" },
  paymentToken: "tok_xxx"  // Stored for later capture
}

// Response for DIRECT (FPX/E-wallet):
{
  booking: { id, status: "PENDING" },
  redirectUrl: "https://senangpay.my/payment/xxx"  // Redirect to gateway
}
```

### Payment Callback

**POST** `/api/payment/senangpay-callback`

Handles SenangPay callbacks after DIRECT flow payment:

- Verifies payment signature
- Updates booking to PAID
- Sends confirmation notifications
- Triggers webhook to fishon-captain

### Captain Actions

**POST** `/api/bookings/approve`

- TOKENIZED: Captures card payment
- DIRECT: Confirms booking (already paid)

**POST** `/api/bookings/reject`

- TOKENIZED: Releases token (no charge)
- DIRECT: Initiates full refund

**POST** `/api/bookings/acknowledge`

- AUTO flow only
- Transitions PAYMENT_AUTHORIZED → PAID

---

## Refund Policy

### Cancellation Refunds (After PAID)

| Timing     | Refund Amount |
| ---------- | ------------- |
| > 30 days  | 80%           |
| 15-30 days | 50%           |
| < 15 days  | 0%            |

### Rejection/Expiry Refunds

- **TOKENIZED**: Token released, no charge
- **DIRECT**: Full refund initiated (3-5 business days)

### Refund Service

```typescript
// src/lib/services/refund-service.ts

calculateRefundAmount(booking, tripDate); // Applies policy
initiateRefund(options); // Starts refund
processRefund(refundId); // Gateway call
completeRefund(refundId); // Mark complete
failRefund(refundId, error); // Handle failure
```

---

## Environment Configuration

### Required Variables

```bash
# SenangPay Gateway
SENANGPAY_MERCHANT_ID="your-merchant-id"
SENANGPAY_SECRET_KEY="your-secret-key"
SENANGPAY_MODE="sandbox"  # or "production"

# Base URL for callbacks
NEXT_PUBLIC_BASE_URL="https://fishon.my"

# Cron job authentication
CRON_SECRET="your-secure-random-secret"

# Captain webhook
CAPTAIN_WEBHOOK_URL="https://captain.fishon.my/api/webhooks/booking"
CAPTAIN_API_SECRET="shared-webhook-secret"
```

### Optional Variables

```bash
# Development only - force mock payments
SENANGPAY_FORCE_MOCK="true"  # Blocked in production
```

---

## Expiration Handling

### Cron Job

**Route**: `/api/cron/expire-bookings`  
**Schedule**: Every 15 minutes (`*/15 * * * *`)  
**Auth**: `CRON_SECRET` header

Handles expired bookings:

1. Finds PAYMENT_AUTHORIZED bookings past deadline (12h)
2. TOKENIZED: Releases token
3. DIRECT: Initiates full refund
4. Updates status to REJECTED
5. Sends notifications

### Vercel Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## Key Files

| File                                              | Purpose                         |
| ------------------------------------------------- | ------------------------------- |
| `src/lib/payment/payment-gateway.ts`              | SenangPay integration           |
| `src/lib/services/refund-service.ts`              | Refund calculation & processing |
| `src/lib/payment/payment-side-effects.ts`         | Notifications & webhooks        |
| `src/app/api/payment/senangpay-callback/route.ts` | Payment callback handler        |
| `src/app/api/bookings/create/route.ts`            | Booking creation with payment   |
| `src/app/api/cron/expire-bookings/route.ts`       | Expiration cron job             |

---

## Testing

### Development Mode

Set `SENANGPAY_FORCE_MOCK="true"` to use mock payments:

- Cards: Simulated tokenization
- No real charges or refunds
- Useful for local development

### Sandbox Testing

```bash
SENANGPAY_MODE="sandbox"
```

Use SenangPay test cards:

- Success: `4111111111111111`
- Decline: `4000000000000002`

### Production Verification

1. Create booking with each payment method
2. Verify webhook delivery to fishon-captain
3. Test approve/reject/cancel flows
4. Verify refund processing

---

## Troubleshooting

### Payment Creation Failed

**Check**:

1. `SENANGPAY_MERCHANT_ID` and `SENANGPAY_SECRET_KEY` configured
2. `NEXT_PUBLIC_BASE_URL` set for callbacks
3. Payment method validation in request

### Callback Not Received

**Check**:

1. SenangPay dashboard for webhook logs
2. `NEXT_PUBLIC_BASE_URL` is publicly accessible
3. Callback route returns 200 OK

### Refund Failed

**Check**:

1. SenangPay balance sufficient
2. Transaction ID valid
3. Refund not already processed

---

## Security

- ✅ Webhook signature verification
- ✅ CRON_SECRET for job authentication
- ✅ No PII in payment metadata
- ✅ Secure token storage (not logged)
- ✅ Rate limiting on payment endpoints

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Owner**: Engineering Team
