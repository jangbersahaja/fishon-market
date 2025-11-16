# Manual Flow Verification & Implementation Status

**Date**: November 16, 2025  
**Status**: ⚠️ PARTIALLY IMPLEMENTED - Critical Gap Identified

---

## Critical Finding: Manual Flow Not Accessible

### ❌ Problem: Booking Creation Always Uses AUTO Flow

**Current Implementation**:

```typescript
// src/app/api/bookings/create/route.ts (line 547)
bookingFlowType: "AUTO", // TODO: Read from charter.bookingFlowType once implemented
```

**Impact**:

- **All bookings** are created with `bookingFlowType: "AUTO"`
- Manual flow is **not accessible** through the booking creation UI
- The approve endpoint works correctly but is **never triggered** because no bookings have `PENDING` status
- All bookings go straight to `PAYMENT_AUTHORIZED` status (Auto flow)

---

## What Works (Manual Flow Backend)

### ✅ 1. Approve Endpoint (`/api/bookings/approve`)

**File**: `src/app/api/bookings/approve/route.ts`

**Implementation**: ✅ COMPLETE

**Features**:

- ✅ Validates `PENDING` status only
- ✅ Checks `bookingFlowType === "MANUAL"`
- ✅ Transitions: `PENDING` → `AWAITING_PAYMENT`
- ✅ Sets 48-hour payment deadline
- ✅ Sends notifications and emails
- ✅ Creates system message in conversation
- ✅ Webhook to captain app

**Flow**:

```typescript
if (booking.status !== "PENDING") {
  return NextResponse.json(
    { error: "Only pending bookings can be approved" },
    { status: 409 }
  );
}

if (booking.bookingFlowType !== "MANUAL") {
  return NextResponse.json(
    {
      error:
        "Only manual flow bookings can be approved. Auto flow bookings are already paid.",
    },
    { status: 409 }
  );
}
```

### ✅ 2. Payment Endpoint (`/api/bookings/pay`)

**Status**: ✅ Updated for new statuses

**Features**:

- ✅ Accepts `AWAITING_PAYMENT` status
- ✅ Transitions: `AWAITING_PAYMENT` → `PAID`
- ✅ Works for Manual flow bookings

### ✅ 3. Database Schema

**Status**: ✅ COMPLETE

**Features**:

- ✅ `BookingFlowType` enum (MANUAL, AUTO)
- ✅ `BookingStatus` enum with `AWAITING_PAYMENT`
- ✅ `approvalDeadline` field for Manual flow
- ✅ `paymentDeadline` field for Manual flow (48h after approval)
- ✅ Charter schema has `bookingFlowType` field

### ✅ 4. UI Components

**Status**: ✅ All updated for dual-flow system

**Components Updated**:

- ✅ `BookingCard.tsx` - Handles `AWAITING_PAYMENT` status
- ✅ `BookingProgressTimeline.tsx` - Distinguishes Manual/Auto flows
- ✅ `BookingTimeline.tsx` - Shows correct timeline for Manual flow
- ✅ `BookingActions.tsx` - Shows payment button for `AWAITING_PAYMENT`
- ✅ Confirm page - Displays Manual flow status correctly
- ✅ Payment page - Accepts `AWAITING_PAYMENT` bookings

---

## What's Missing (Manual Flow Access)

### ❌ 1. Booking Creation Logic

**Problem**: Hardcoded to AUTO flow

**Current Code**:

```typescript
// Line 547 in /api/bookings/create/route.ts
bookingFlowType: "AUTO", // TODO: Read from charter.bookingFlowType once implemented
```

**What's Needed**:

```typescript
// Read charter's bookingFlowType setting
const charter = await getCharterById(trip.charterId);
const bookingFlowType = charter.bookingFlowType || "MANUAL"; // Default to MANUAL for safety

// For MANUAL flow: No payment processing, set PENDING status
let initialStatus: "PENDING" | "PAYMENT_AUTHORIZED" | "PAID";
if (bookingFlowType === "MANUAL") {
  initialStatus = "PENDING";
  // Skip payment processing
} else {
  // AUTO flow - existing payment logic
  initialStatus = "PAYMENT_AUTHORIZED";
  // Process payment...
}
```

### ❌ 2. Charter Service Integration

**Problem**: No function to read charter's `bookingFlowType`

**What's Needed**:

```typescript
// src/lib/services/charter-service.ts
export async function getCharterFlowType(
  charterId: string
): Promise<BookingFlowType> {
  // Read from captain database view or API
  // Return charter.bookingFlowType
}
```

### ❌ 3. Booking Page Logic

**Problem**: Always requires payment method selection

**What's Needed**:

- Check charter's `bookingFlowType` before showing payment form
- For MANUAL flow: Hide payment method selector, show "Request Booking" button
- For AUTO flow: Show payment method selector (current behavior)

**UI Changes**:

```typescript
// Check flow type before rendering payment section
if (charter.bookingFlowType === "MANUAL") {
  // Show: "Submit Booking Request" button
  // Message: "Captain will review and approve within 24 hours"
} else {
  // Show: Payment method selector (current behavior)
  // Message: "Instant booking - pay now to confirm"
}
```

### ❌ 4. Captain Dashboard (fishon-captain)

**Problem**: No UI to set charter's `bookingFlowType`

**What's Needed**:

- Charter settings page with flow type toggle
- Options: "Manual Approval" vs "Instant Booking"
- Approval time selector (12h/24h/48h) for Manual flow
- UI to show PENDING bookings requiring approval

---

## Testing the Manual Flow Today

### Option 1: Database Manual Entry (Quick Test)

**Step 1**: Create a test booking with MANUAL flow directly in database:

```sql
-- Update an existing booking to MANUAL flow with PENDING status
UPDATE "Booking"
SET
  "bookingFlowType" = 'MANUAL',
  "status" = 'PENDING',
  "approvalDeadline" = NOW() + INTERVAL '24 hours',
  "paymentAuthorizedAt" = NULL,
  "paymentIntentId" = NULL
WHERE id = 'your-booking-id';
```

**Step 2**: Test the approve endpoint:

```bash
curl -X POST http://localhost:3000/api/bookings/approve \
  -H "Content-Type: application/json" \
  -H "x-captain-api-secret: your-secret" \
  -d '{"id": "your-booking-id"}'
```

**Expected**:

- ✅ Status changes from `PENDING` to `AWAITING_PAYMENT`
- ✅ `paymentDeadline` set to 48 hours from now
- ✅ Email sent to angler
- ✅ Notification created

**Step 3**: Test payment page:

```
Visit: http://localhost:3000/book/payment/your-booking-id
```

**Expected**:

- ✅ Shows payment form for `AWAITING_PAYMENT` booking
- ✅ Can complete payment → `PAID` status

### Option 2: Code Patch (Temporary)

**Modify booking creation to test Manual flow**:

```typescript
// In src/app/api/bookings/create/route.ts around line 340-420

// Add this flag at the top of the function
const FORCE_MANUAL_FLOW = true; // FOR TESTING ONLY

// Then around line 361, replace payment processing logic:
let initialStatus: "PENDING" | "PAYMENT_AUTHORIZED" | "PAID";

if (FORCE_MANUAL_FLOW) {
  // MANUAL FLOW TEST
  initialStatus = "PENDING";
  paymentResult = null; // No payment processing
  console.log("🧪 TEST MODE: Using MANUAL flow (PENDING status)");
} else {
  // AUTO FLOW (original logic)
  const paymentFlow = getPaymentFlow(paymentMethod as "CARD" | "FPX" | "EWALLET" | "MOCK");
  // ... existing payment logic ...
}

// Then around line 547, replace:
bookingFlowType: FORCE_MANUAL_FLOW ? "MANUAL" : "AUTO",
approvalDeadline: FORCE_MANUAL_FLOW ? expiresAt : undefined, // 12h approval deadline for Manual
acknowledgmentDeadline: FORCE_MANUAL_FLOW ? undefined : expiresAt, // Only for Auto flow

// Skip payment fields for Manual flow
...(FORCE_MANUAL_FLOW ? {} : {
  paymentMethod: paymentMethod as string,
  paymentFlow: paymentFlow,
  paymentIntentId: paymentResult?.paymentIntentId || null,
  paymentAuthorizedAt: paymentFlow === "TOKENIZED" && paymentResult?.success ? new Date() : null,
}),
```

**Then test the booking flow**:

1. Create booking via UI → Should show `PENDING` status
2. Call approve endpoint → Should change to `AWAITING_PAYMENT`
3. Go to payment page → Should allow payment
4. Complete payment → Should change to `PAID`

---

## Implementation Roadmap

### Phase 2A: Enable Manual Flow (Priority: HIGH)

**Tasks**:

1. **Update Booking Creation Logic** (~2 hours)
   - [ ] Add function to read charter's `bookingFlowType` from captain database
   - [ ] Modify `/api/bookings/create` to check flow type
   - [ ] For MANUAL: Skip payment, set `PENDING` status
   - [ ] For AUTO: Keep existing payment logic

2. **Update Booking UI** (~2 hours)
   - [ ] Fetch charter's `bookingFlowType` on booking page
   - [ ] Show conditional UI based on flow type
   - [ ] Manual: "Request Booking" button (no payment form)
   - [ ] Auto: "Pay Now" button (with payment form)

3. **Captain Dashboard Integration** (~4 hours)
   - [ ] Add charter settings page in fishon-captain
   - [ ] Toggle: "Enable Instant Booking" (AUTO) vs "Require Approval" (MANUAL)
   - [ ] Approval time selector (12/24/48 hours)
   - [ ] Show pending bookings list with approve/reject buttons

4. **Testing** (~2 hours)
   - [ ] Test Manual flow end-to-end
   - [ ] Test Auto flow still works
   - [ ] Test expiration for both flows
   - [ ] Test edge cases (expired approval, double approval, etc.)

**Total Effort**: ~10 hours

---

## Summary

### Current State

- ✅ Manual flow **backend is ready** (approve, pay, UI components)
- ❌ Manual flow **not accessible** (always creates AUTO flow bookings)
- ✅ Auto flow **works end-to-end**

### To Access Manual Flow

**Quick Test**: Use database manual entry or code patch (see above)

**Production Ready**: Need to implement Phase 2A (charter flow type selection + booking creation logic)

### Recommendation

1. **Short term**: Use Option 2 (code patch) to test Manual flow today
2. **Long term**: Implement Phase 2A to make Manual flow production-ready

The system is well-architected for dual flows, but the booking creation needs the final piece: reading charter settings and conditionally creating MANUAL or AUTO flow bookings.
