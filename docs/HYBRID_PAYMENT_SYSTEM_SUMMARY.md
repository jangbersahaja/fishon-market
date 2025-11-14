# Hybrid Payment System Implementation Summary

## Overview

Successfully implemented a dual-flow payment system for fishon-market that supports:

- **TOKENIZED Flow**: Card payments with authorization-then-capture (no charge until approved)
- **DIRECT Flow**: FPX/E-wallet immediate payment with refund-if-rejected

## Completed Components

### Backend Infrastructure (Steps 1-12) ✅

#### 1. Database Schema

- Added `BookingStatus.PAYMENT_PENDING` for authorization hold state
- Payment tracking: `paymentMethod`, `paymentFlow`, `paymentIntentId`, `paymentAuthorizedAt`, `paymentCapturedAt`, `paymentReleasedAt`
- Refund tracking: `refundStatus`, `refundAmount`, `refundTransactionId`, `refundReason`, `refundedBy`, `refundedAt`
- Cancellation policy: `cancellationPolicy` JSON field for policy snapshot
- Analytics: Added `PAYMENT_RELEASED` and `PAYMENT_REFUNDED` event types

#### 2. Payment Gateway (`/lib/payment/payment-gateway.ts`)

- `createPaymentIntent()`: Creates card token (TOKENIZED) or redirect URL (DIRECT)
- `capturePayment()`: Charges tokenized card on approval
- `releasePayment()`: Releases token without charge
- `refundPayment()`: Processes refunds for both flows
- Helper: `getPaymentFlow()` determines flow based on payment method

#### 3. Refund Service (`/lib/services/refund-service.ts`)

- `calculateRefundAmount()`: Time-based policy (>30d: 80%, 15-30d: 50%, <15d: 0%)
- `initiateRefund()`: Starts refund process with status tracking
- `processRefund()`: Handles actual gateway refund
- `completeRefund()`: Marks refund as completed
- `failRefund()`: Handles refund failures with retry

#### 4. Booking Creation (`/api/bookings/create`, `/api/bookings/create-guest`)

- Payment method validation (CARD, FPX, EWALLET)
- Flow detection: TOKENIZED for cards, DIRECT for FPX/E-wallet
- TOKENIZED: Store token, set status PAYMENT_PENDING
- DIRECT: Redirect to gateway, callback updates to PAID
- 12-hour expiration timer starts at booking creation

#### 5. Payment Callback (`/api/payment/callback`)

- Handles Senang Pay callbacks for DIRECT flow
- Verifies payment signature
- Updates booking from PAYMENT_PENDING to PAID
- Sends confirmation notifications

#### 6. Approval Flow (`/api/bookings/approve`)

- **TOKENIZED**: Charges card via `capturePayment()`, updates to PAID
- **DIRECT**: Confirms booking (already charged), updates to PAID
- **MOCK**: Simulates capture for testing
- Error handling: 402 if card charge fails
- Notifications: BOOKING_CONFIRMED for PAID status
- Analytics: Tracks PAYMENT_CAPTURED events

#### 7. Rejection Flow (`/api/bookings/reject`)

- **TOKENIZED**: Releases token via `releasePayment()` (no charge)
- **DIRECT**: Initiates FULL refund via `initiateRefund()`
- **MOCK**: Simulates release
- Error handling: 500 with `refundError` flag if refund fails
- Notifications: Differentiated by flow ("Card not charged" vs "Refund processing")
- Analytics: Tracks PAYMENT_RELEASED and PAYMENT_REFUNDED events

#### 8. Cancellation Flow (`/api/bookings/cancel`)

- **PAYMENT_PENDING + TOKENIZED**: Releases token (no charge)
- **PAID**: Applies cancellation policy:
  - > 30 days before trip: 80% refund
  - 15-30 days: 50% refund
  - <15 days: No refund
- Calculates refund via `calculateRefundAmount()`
- Initiates policy-based refund via `initiateRefund()`
- Notifications: Shows refund percentage and amount
- Analytics: Tracks refund events with policy metadata

#### 9. Expiration Handling (`/api/cron/expire-bookings`)

- Runs every 15 minutes via Vercel Cron
- Finds bookings with `expiresAt < NOW()` and status PAYMENT_PENDING
- **TOKENIZED**: Releases token (no charge)
- **DIRECT**: Initiates FULL refund (already charged)
- Updates status to REJECTED with reason "Booking expired"
- Batch processes 50 bookings per run
- Protected by CRON_SECRET authentication
- Comprehensive logging and error handling

## Payment Flow Diagrams

### TOKENIZED Flow (Card)

```
Angler Books
     ↓
Card Token Created (no charge)
     ↓
Status: PAYMENT_PENDING
     ↓
[Wait 12 hours for captain]
     ↓
┌────────────────┬────────────────┬──────────────────┐
│   APPROVED     │   REJECTED     │    EXPIRED       │
│                │                │                  │
│ Charge Card    │ Release Token  │ Release Token    │
│ Status: PAID   │ Status: REJECT │ Status: REJECTED │
│ No Refund      │ No Charge      │ No Charge        │
└────────────────┴────────────────┴──────────────────┘

If PAID, Angler Can Cancel:
  - >30d: 80% refund
  - 15-30d: 50% refund
  - <15d: No refund
```

### DIRECT Flow (FPX/E-wallet)

```
Angler Books
     ↓
Redirect to Gateway
     ↓
Payment Captured (immediate)
     ↓
Callback: Status: PAID
     ↓
[Wait 12 hours for captain]
     ↓
┌────────────────┬────────────────┬──────────────────┐
│   APPROVED     │   REJECTED     │    EXPIRED       │
│                │                │                  │
│ Confirm Only   │ FULL Refund    │ FULL Refund      │
│ Status: PAID   │ Status: REJECT │ Status: REJECTED │
│ (already paid) │ (3-5 days)     │ (3-5 days)       │
└────────────────┴────────────────┴──────────────────┘

If PAID (Approved), Angler Can Cancel:
  - >30d: 80% refund
  - 15-30d: 50% refund
  - <15d: No refund
```

## Status Transitions

### Booking Status Flow

```
PAYMENT_PENDING (hold created)
    ↓
    ├─→ PAID (approved or DIRECT callback)
    │   ├─→ COMPLETED (trip finished)
    │   └─→ CANCELLED (angler cancels with policy refund)
    │
    ├─→ REJECTED (captain rejects)
    │   └─→ [Release token or refund]
    │
    └─→ REJECTED (expired)
        └─→ [Release token or refund]
```

### Payment Status Tracking

```
TOKENIZED:
  paymentAuthorizedAt (token created)
      ↓
  ├─→ paymentCapturedAt (charged on approval)
  └─→ paymentReleasedAt (released on reject/expire/cancel)

DIRECT:
  paymentCapturedAt (immediate on callback)
      ↓
  └─→ refundStatus: PENDING → COMPLETED (if rejected/expired)
```

## Key Features

### 1. Dual-Flow Architecture

- **Method Detection**: Automatically determines flow based on payment method
- **Flow-Specific Logic**: Each endpoint handles both flows appropriately
- **Consistent UX**: Similar user experience regardless of payment method

### 2. Authorization Hold (TOKENIZED)

- **No Immediate Charge**: Card authorized but not charged until approval
- **Captain Flexibility**: 12 hours to decide without holding customer funds
- **Automatic Release**: Token released if rejected, cancelled, or expired

### 3. Refund Policy (PAID Cancellations)

- **Time-Based**: Fairer to both captain and angler
- **Automated Calculation**: `calculateRefundAmount()` applies policy consistently
- **Transparent**: Shows refund percentage in notifications

### 4. Expiration Safety Net

- **Automated Processing**: Cron job prevents abandoned authorizations
- **TOKENIZED**: Releases token (no charge to customer)
- **DIRECT**: Full refund (customer already paid)
- **Batch Processing**: Handles high volume without timeout

### 5. Analytics Tracking

- **Payment Events**: PAYMENT_RELEASED, PAYMENT_REFUNDED
- **Metadata Rich**: Includes flow, method, amounts, percentages
- **Captain Insights**: Displayed in fishon-captain analytics dashboard

## Error Handling

### Payment Gateway Failures

- **Capture Failed**: Returns 402 with error message, booking remains PAYMENT_PENDING
- **Release Failed**: Logs error, continues with status update (token expires naturally)
- **Refund Failed**: Returns 500 with `refundError` flag, refund marked FAILED for retry

### Race Conditions

- **Concurrent Approvals**: Prevented by transaction + conflict detection
- **Double Refunds**: Checked via `refundStatus` before initiating
- **Expired During Approval**: `expiresAt` checked before capture

### Network Issues

- **Webhook Failures**: Non-blocking, captain app syncs on next request
- **Notification Failures**: Non-blocking, angler sees status in dashboard
- **Gateway Timeouts**: Retry logic with exponential backoff

## Testing Checklist

### TOKENIZED Flow

- [ ] Create booking with card → token stored, status PAYMENT_PENDING
- [ ] Approve booking → card charged, status PAID
- [ ] Reject booking → token released, no charge
- [ ] Expire booking → token released, no charge
- [ ] Cancel PAYMENT_PENDING → token released, no charge
- [ ] Cancel PAID (>30d) → 80% refund
- [ ] Cancel PAID (15-30d) → 50% refund
- [ ] Cancel PAID (<15d) → no refund

### DIRECT Flow

- [ ] Create booking with FPX → redirect to gateway
- [ ] Payment callback → status PAID
- [ ] Approve booking → confirm only (already paid)
- [ ] Reject booking → FULL refund initiated
- [ ] Expire booking → FULL refund initiated
- [ ] Cancel PAID (>30d) → 80% refund
- [ ] Cancel PAID (15-30d) → 50% refund
- [ ] Cancel PAID (<15d) → no refund

### Edge Cases

- [ ] Gateway timeout during capture → error handling
- [ ] Duplicate webhook callbacks → idempotency
- [ ] Concurrent approve + expire → race condition handling
- [ ] Refund failure → retry mechanism
- [ ] Invalid payment method → validation error

## Pending UI Work (Steps 13-15)

### 13. Payment Method Selector

- Add radio group with CARD, FPX, EWALLET options
- Show badges: "No Charge Until Approved" vs "Immediate Payment"
- Info boxes explaining flow differences

### 14. Booking Confirmation Messages

- TOKENIZED: "Card authorized, will charge if approved"
- DIRECT: "Payment received, awaiting approval"
- Show 12-hour captain decision deadline

### 15. Captain UI Badges

- TOKENIZED bookings: Blue badge "Card Held"
- DIRECT bookings: Green badge "Already Paid"
- Detail view: Show payment flow and amount

## Environment Variables

### Required

```bash
# Payment Gateway
SENANG_PAY_MERCHANT_ID=your-merchant-id
SENANG_PAY_SECRET_KEY=your-secret-key

# Cron Authentication
CRON_SECRET=your-secure-random-secret

# Captain App Integration
CAPTAIN_WEBHOOK_URL=https://fishon-captain.com/api/webhooks
CAPTAIN_API_SECRET=your-webhook-secret
```

### Optional

```bash
# Testing
USE_MOCK_PAYMENT=true  # Use mock payment gateway
```

## Documentation

- **Expiration Cron**: `/docs/BOOKING_EXPIRATION_CRON.md`
- **Video Routes**: `/docs/API_VIDEO_ROUTES.md`
- **Analytics**: `/docs/ANALYTICS_PHASE1_COMPLETE.md`

## Migration Path

### Before Deployment

1. ✅ Update database schemas (both apps)
2. ✅ Create payment gateway abstraction
3. ✅ Create refund service
4. ⏳ Run database migrations (Step 17)

### After Deployment

1. Monitor expiration cron execution (Vercel dashboard)
2. Check analytics for payment events
3. Review refund processing logs
4. Test both payment flows in production

### Rollback Plan

If issues arise:

1. Set `USE_MOCK_PAYMENT=true` to disable real charges
2. Manually process stuck bookings via admin dashboard
3. Revert to previous deployment if critical failure

## Success Metrics

### Technical

- Zero abandoned authorizations (cron handles all expirations)
- <1% payment gateway failures
- <5min average refund initiation time
- 100% notification delivery rate

### Business

- Reduced booking abandonment (no immediate charge for cards)
- Faster captain response time (authorization pressure)
- Higher conversion rate (flexible payment options)
- Lower customer service load (automated refunds)

## Next Steps

1. **Complete UI Updates** (Steps 13-15)
2. **Write Comprehensive Tests** (Step 16)
3. **Run Database Migrations** (Step 17)
4. **Deploy to Staging** for end-to-end testing
5. **Monitor & Optimize** based on real-world usage

---

**Implementation Status**: 12/17 steps complete (70%)  
**Backend Status**: ✅ Complete and type-safe  
**Frontend Status**: ⏳ Pending (Steps 13-15)  
**Testing Status**: ⏳ Pending (Step 16)  
**Deployment Status**: ⏳ Pending migrations (Step 17)
