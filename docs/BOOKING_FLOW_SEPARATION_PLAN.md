# Booking Flow Separation - Implementation Plan

**Date**: November 16, 2025  
**Objective**: Separate booking form from payment to create smoother UX for both Auto and Manual flows

---

## Current Flow Proble(my)

### Issues

1. **Booking form too complex**: Mixes angler details + payment method selection
2. **Manual flow not accessible**: Payment always required, can't create PENDING bookings
3. **Poor UX**: Payment happens on same page as booking details
4. **No review step**: Users can't review pricing before payment

---

## Proposed New Flow

### Auto Flow (Instant Booking)

```
/book/[charterId]
→ Fill booking details (angler, emergency, participants, date, notes)
→ Click "Proceed to Payment"
→ Redirect to /book/payment/preview
  - **Session starts: 30-minute timeout ⏱️**
  - Show countdown timer (prominent)
  - Show booking summary
  - Show detailed pricing breakdown
  - Select payment method (Card/FPX/E-wallet)
  - Enter card details (if Card)
  - Re-validate availability & pricing before submission
→ Submit payment
  - Card: Tokenize → Create booking with PAYMENT_AUTHORIZED → /book/confirm
  - FPX/E-wallet: Create booking → Redirect to gateway → Callback → /book/confirm
→ **Session expires**: Auto-redirect to /book/[charterId] with warning message
```

### Manual Flow (Request Approval)

```
/book/[charterId]
→ Fill booking details (angler, emergency, participants, date, notes)
→ Click "Request Booking"
→ Create booking with PENDING status
→ Redirect to /book/confirm with PENDING status
  - Show "Awaiting captain approval" message
  - Show countdown timer (24h approval deadline)
→ Captain approves → Status changes to AWAITING_PAYMENT
→ "Make Payment" button appears
→ Click "Make Payment"
→ Redirect to /book/payment/[bookingId]
  - Show booking summary
  - Show detailed pricing
  - Select payment method
  - Submit payment
→ Redirect to /book/confirm with PAID status
```

---

## Implementation Tasks

### Phase 1: Create Payment Preview Page

**New File**: `/book/payment/preview/page.tsx`

**Purpose**: Intermediate page between booking form and payment processing

**Features**:

- Receives booking details from form (via POST or query para(my))
- **Session timeout: 30 minutes** ⏱️
- **Countdown timer** (prominent display at top)
- Displays booking summary (charter, dates, participants)
- Shows detailed pricing breakdown
- Payment method selector (Card/FPX/E-wallet)
- Card details input (conditional on Card selection)
- **Re-validates availability & pricing** before payment submission
- "Confirm & Pay" button
- **Auto-redirect** on session expiry

**Flow**:

```typescript
// For Auto flow bookings
1. User submits booking form
2. Validate form data
3. Store in session/state with timestamp
4. Redirect to /book/payment/preview?data=[encoded]&sessionStart=[timestamp]
5. Start 30-minute countdown timer
6. User reviews and selects payment
7. Before submission: Re-validate availability and pricing
8. Submit to /api/bookings/create with payment details
9. Handle response (redirect to gateway or confirmation)
10. If session expires: Auto-redirect to /book/[charterId] with toast warning
```

**Data Structure**:

```typescript
interface BookingPreviewData {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  startTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  note?: string;

  // Session management
  sessionStart: number; // Unix timestamp
  sessionExpiresAt: number; // Unix timestamp (sessionStart + 30 minutes)

  // Calculated fields (snapshot - must be re-validated)
  tripPrice: number;
  finalPrice: number;
  platformFee: number;
  serviceFee: number;
}
```

**Session Timeout Implementation**:

```typescript
// Constants
const PAYMENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PAYMENT_SESSION_WARNING_MS = 5 * 60 * 1000; // Show warning at 5 minutes

// Client-side countdown
"use client";
export function PaymentSessionTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAt.getTime() - Date.now();

      if (remaining <= 0) {
        // Session expired - redirect with warning
        toast.error("Payment session expired. Please try again.");
        router.push(`/book/${charterId}`);
        return;
      }

      if (remaining <= PAYMENT_SESSION_WARNING_MS && !warningShown) {
        toast.warning("5 minutes remaining to complete payment!");
        setWarningShown(true);
      }

      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="fixed top-4 right-4 bg-amber-50 border border-amber-300 px-4 py-2 rounded-lg">
      <div className="flex ite(my)-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-900">
          Session expires in: {formatTimeRemaining(timeLeft)}
        </span>
      </div>
    </div>
  );
}

// Server-side validation before payment
export async function validateSessionAndAvailability(data: BookingPreviewData) {
  const now = Date.now();

  // 1. Check session timeout
  if (now > data.sessionExpiresAt) {
    return {
      valid: false,
      error: "Payment session expired. Please start again.",
      code: "SESSION_EXPIRED"
    };
  }

  // 2. Re-check availability
  const availability = await checkDateAvailability({
    charterId: data.charterId,
    tripId: data.tripId,
    date: new Date(data.date),
    startTime: data.startTime,
    days: data.days,
  });

  if (!availability.available) {
    return {
      valid: false,
      error: "Selected date is no longer available.",
      code: "DATE_UNAVAILABLE"
    };
  }

  // 3. Re-validate pricing
  const currentPricing = await calculateCurrentPricing({
    tripId: data.tripId,
    days: data.days,
  });

  if (currentPricing.finalPrice !== data.finalPrice) {
    return {
      valid: false,
      error: "Pricing has changed. Please review the updated price.",
      code: "PRICE_CHANGED",
      newPrice: currentPricing.finalPrice
    };
  }

  return { valid: true };
}
```

### Phase 2: Update Booking Form (No Payment)

**File**: `/book/[charterId]/page.tsx` and `CheckoutForm.tsx`

**Changes**:

1. **Remove Payment Section**:
   - Remove `PaymentMethodSelector` component
   - Remove `CardDetailsInput` component
   - Remove payment validation

2. **Add Flow Detection**:

```typescript
// Fetch charter's bookingFlowType from captain database
const charter = await getCharterById(charterId);
const isAutoFlow = charter.bookingFlowType === "AUTO";
const isManualFlow = charter.bookingFlowType === "MANUAL";
```

3. **Conditional Submit Button**:

```typescript
{isAutoFlow && (
  <Button type="submit">
    Proceed to Payment
  </Button>
)}

{isManualFlow && (
  <Button type="submit">
    Request Booking
  </Button>
)}
```

4. **Form Submission Logic**:

```typescript
// Auto flow: Redirect to payment preview
if (isAutoFlow) {
  const encodedData = encodeBookingData(formData);
  router.push(`/book/payment/preview?data=${encodedData}`);
  return;
}

// Manual flow: Create booking with PENDING status
if (isManualFlow) {
  const response = await fetch("/api/bookings/create-manual", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  const { booking } = await response.json();
  router.push(`/book/confirm?id=${booking.id}`);
  return;
}
```

### Phase 3: Create Manual Flow API Endpoint

**New File**: `/api/bookings/create-manual/route.ts`

**Purpose**: Create booking without payment for Manual flow

**Implementation**:

```typescript
export async function POST(req: Request) {
  // 1. Validate session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate booking data
  const body = await req.json();
  const {
    charterId,
    tripId,
    date,
    days,
    startTime,
    adults,
    children,
    firstName,
    lastName,
    email,
    phone,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    note,
  } = body;

  // 3. Get charter and verify it's Manual flow
  const charter = await getCharterById(charterId);
  if (charter.bookingFlowType !== "MANUAL") {
    return NextResponse.json(
      { error: "Charter requires instant booking" },
      { status: 400 }
    );
  }

  // 4. Calculate pricing (same as Auto flow)
  const trip = await getTripById(tripId);
  const pricingBreakdown = calculatePricing({
    tripPrice: trip.price,
    days,
  });

  // 5. Check availability (same as Auto flow)
  const availabilityCheck = await checkDateAvailability({
    charterId,
    tripId,
    date: new Date(date),
    startTime,
    days,
  });

  if (!availabilityCheck.available) {
    return NextResponse.json(
      { error: "Date no longer available" },
      { status: 409 }
    );
  }

  // 6. Create booking with PENDING status
  const approvalDeadline = new Date(
    Date.now() + (charter.approvalTimeHours || 24) * 60 * 60 * 1000
  );

  const booking = await prisma.booking.create({
    data: {
      userId: session.user.id,
      charterId,
      tripId,
      date: new Date(date),
      days,
      startTime,
      guests: { adults, children },
      tripPrice: pricingBreakdown.tripPrice,
      finalPrice: pricingBreakdown.finalPrice,
      platformFee: pricingBreakdown.platformFee,
      serviceFee: pricingBreakdown.serviceFee,
      captainEarnings: pricingBreakdown.captainEarnings,

      // Manual flow specific
      status: "PENDING",
      bookingFlowType: "MANUAL",
      approvalDeadline,
      expiresAt: approvalDeadline, // Will expire if not approved

      // No payment fields
      paymentMethod: null,
      paymentFlow: null,
      paymentIntentId: null,
      paymentAuthorizedAt: null,

      note: note || undefined,
    },
  });

  // 7. Send notifications
  await sendBookingRequestNotification(booking, charter);

  // 8. Return booking ID
  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
```

### Phase 4: Update Payment Page for Manual Flow

**File**: `/book/payment/[bookingId]/page.tsx`

**Current**: Only accepts `AWAITING_PAYMENT` bookings
**Keep**: This behavior is correct for Manual flow

**Changes Needed**: None! This page already works for Manual flow.

**Verification**:

```typescript
// Line 88 - Already checks for AWAITING_PAYMENT
if (booking.status !== "AWAITING_PAYMENT") {
  redirect(`/book/confirm?id=${bookingId}`);
}
```

### Phase 5: Update Payment Preview Page for Auto Flow

**New File**: `/book/payment/preview/page.tsx`

**Purpose**: Handle Auto flow payment initiation

**Implementation**:

```typescript
export default async function PaymentPreviewPage({
  searchPara(my),
}: {
  searchPara(my): Promise<{ data?: string }>;
}) {
  const sp = await searchPara(my);
  const session = await auth();

  // 1. Decode booking data
  const encodedData = sp.data;
  if (!encodedData) {
    redirect('/');
  }

  const bookingData = decodeBookingData(encodedData);

  // 2. Check session timeout
  const now = Date.now();
  if (now > bookingData.sessionExpiresAt) {
    redirect(`/book/${bookingData.charterId}?error=session_expired`);
  }

  // 3. Fetch charter and trip details
  const charter = await getCharterById(bookingData.charterId);
  const trip = await getTripById(bookingData.tripId);

  // 4. Calculate pricing (snapshot only - will be re-validated on submit)
  const pricingBreakdown = calculatePricing({
    tripPrice: trip.price,
    days: bookingData.days,
  });

  // 5. Render payment form with session timer
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Session Countdown Timer */}
      <PaymentSessionTimer
        expiresAt={new Date(bookingData.sessionExpiresAt)}
        charterId={bookingData.charterId}
      />

      <h1>Review & Pay</h1>

      {/* Booking Summary */}
      <BookingSummaryCard
        charter={charter}
        trip={trip}
        bookingData={bookingData}
      />

      {/* Pricing Breakdown */}
      <PricingBreakdownCard pricing={pricingBreakdown} />

      {/* Payment Form (with pre-submission validation) */}
      <PaymentFormCard
        bookingData={bookingData}
        finalPrice={pricingBreakdown.finalPrice}
        session={session}
        onSubmit={validateSessionAndAvailability}
      />
    </main>
  );
}
```

### Phase 6: Charter Service Integration

**File**: `/lib/services/charter-service.ts`

**Add Function**: Read charter's bookingFlowType

```typescript
export async function getCharterFlowType(
  charterId: string
): Promise<'MANUAL' | 'AUTO'> {
  try {
    // Option 1: Read from captain database view (if available)
    const captainCharter = await captainDb.charter.findUnique({
      where: { id: charterId },
      select: { bookingFlowType: true },
    });

    return captainCharter?.bookingFlowType || 'MANUAL';
  } catch (error) {
    console.error('Failed to fetch charter flow type:', error);
    return 'MANUAL'; // Default to safer Manual flow
  }
}

// Add to existing getCharterById function
export async function getCharterById(id: string) {
  const charter = await /* existing query */;

  // Add bookingFlowType field
  charter.bookingFlowType = await getCharterFlowType(id);

  return charter;
}
```

---

## Migration Strategy

### Phase 1: Backend First (1 day)

1. ✅ Create `/api/bookings/create-manual` endpoint
2. ✅ Add `getCharterFlowType()` to charter service
3. ✅ Test manual booking creation

### Phase 2: Payment Preview Page (1 day)

1. ✅ Create `/book/payment/preview` route
2. ✅ Build payment form UI
3. ✅ Implement 30-minute session timeout with countdown timer
4. ✅ Add session expiry handler (auto-redirect)
5. ✅ Add pre-submission validation (availability + pricing)
6. ✅ Connect to existing `/api/bookings/create` endpoint
7. ✅ Test Auto flow payment processing
8. ✅ Test session expiry scenarios

### Phase 3: Update Booking Form (0.5 days)

1. ✅ Remove payment components
2. ✅ Add flow detection logic
3. ✅ Add conditional submit buttons
4. ✅ Update form submission handlers

### Phase 4: Testing (0.5 days)

1. ✅ Test Manual flow end-to-end
2. ✅ Test Auto flow end-to-end
3. ✅ Test edge cases (expired bookings, double submissions)
4. ✅ Verify payment gateway redirects work

### Phase 5: Documentation (0.5 days)

1. ✅ Update API documentation
2. ✅ Create user flow diagra(my)
3. ✅ Update help center articles

**Total Effort**: ~3.5 days

---

## URL Structure

### Current

```
/book/[charterId] - Booking form with payment
/book/confirm - Confirmation page
/book/payment/[bookingId] - Payment page (Manual flow only)
```

### New

```
/book/[charterId] - Booking form (NO payment)
/book/payment/preview - Payment preview (Auto flow)
/book/payment/[bookingId] - Payment page (Manual flow)
/book/confirm - Confirmation page (both flows)
```

---

## Session Timeout Rationale

### Why 30 Minutes?

**Industry Standards**:

- Airbnb: 30 minutes (checkout session)
- Booking.com: 15 minutes (booking page)
- GetYourGuide: 20 minutes (payment page)
- Airlines: 15-30 minutes (seat hold)

**Balance Considerations**:

- ✅ **Too short (< 15 min)**: User frustration, abandoned payments
- ✅ **Just right (30 min)**: Time to review, compare, get card, still urgent
- ❌ **Too long (> 60 min)**: Stale pricing, availability conflicts, inventory lock

**Benefits**:

- Prevents stale pricing issues
- Prevents double-booking conflicts
- Creates healthy urgency (improves conversion)
- Aligns with user expectations from other platfor(my)
- Protects captain's availability calendar

### Comparison: Session Timeout vs Payment Deadline

| Aspect            | Session Timeout                  | Payment Deadline                       |
| ----------------- | -------------------------------- | -------------------------------------- |
| **Duration**      | 30 minutes                       | 48 hours                               |
| **Applies To**    | Payment preview page (Auto flow) | AWAITING_PAYMENT status (Manual flow)  |
| **Purpose**       | Prevent stale data in checkout   | Give angler time to pay after approval |
| **When Starts**   | Clicking "Proceed to Payment"    | Captain approves booking               |
| **Countdown UI**  | Prominent fixed timer            | Card badge & detail page               |
| **Expiry Action** | Redirect to booking form         | Status → EXPIRED, release date         |
| **Recovery**      | Re-submit form immediately       | Must request new booking               |

## Benefits

### User Experience

- ✅ Clearer separation of concerns
- ✅ Review step before payment
- ✅ Less overwhelming booking form
- ✅ Better mobile experience (shorter for(my))
- ✅ **Clear urgency without pressure** (30-min countdown)
- ✅ **Fair expectations** (matches industry nor(my))

### Technical

- ✅ Manual flow becomes accessible
- ✅ Easier to test payment flows
- ✅ More flexible routing
- ✅ Better error handling per step
- ✅ **Prevents stale pricing conflicts**
- ✅ **Prevents double-booking race conditions**
- ✅ **Session validation before payment**

### Business

- ✅ Higher conversion (simpler for(my))
- ✅ Better analytics per step
- ✅ Easier A/B testing
- ✅ Manual flow unlocks new markets
- ✅ **Reduced payment failures** (fresh data validation)
- ✅ **Better inventory management** (no stale holds)

---

## Next Steps

1. **Review this plan** - Confirm approach is correct
2. **Start Phase 1** - Create manual booking endpoint
3. **Build iteratively** - One phase at a time
4. **Test thoroughly** - Each flow independently

Ready to proceed?
