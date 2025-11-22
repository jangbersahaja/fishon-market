# Critical Issues Found and Fixed

## Date: November 16, 2025

## Issues Identified by User

You correctly identified several critical proble(my) with my implementation:

### 1. ❌ Hardcoded "AUTO" Flow Type

**Problem:** All bookings were being created with `bookingFlowType: "AUTO"` regardless of the charter's actual configuration.

**Files Affected:**

- `/src/app/api/bookings/create-guest/route.ts` (line 422)
- `/src/app/api/bookings/create/route.ts` (line 546)

**Root Cause:** I left TODO comments but never actually implemented the charter flow type lookup.

**Fix Applied:**

```typescript
// Before (WRONG):
bookingFlowType: "AUTO", // TODO: Read from charter.bookingFlowType once implemented

// After (CORRECT):
const { getCharterFlowType } = await import("@/lib/services/charter-service");
const bookingFlowType = await getCharterFlowType(trip.charter.id);
// ...
bookingFlowType: bookingFlowType, // Now reads from charter configuration
```

---

### 2. ❌ Email Service Assumption (Resend)

**Problem:** I incorrectly assumed you were using Resend for email delivery.

**Reality:** You're using **Zoho SMTP** (configured in `.env.local`):

```env
SMTP_HOST=smtppro.zoho.com
SMTP_PORT=465
SMTP_USER=no-reply@fishon.my
SMTP_PASSWORD=FmJvn2w2twBL
SMTP_SECURE=true
```

**Impact:**

- Testing documentation referenced Resend dashboard
- No actual code issue (email service already uses SMTP)
- Documentation was misleading

---

### 3. ❌ Didn't Check Environment File

**Problem:** I created tests without verifying your actual `.env.local` configuration.

**What I Should Have Done:**

1. Read `.env.local` FIRST
2. Check which services are actually configured
3. Verify database connections
4. Check payment gateway setup (SenangPay, not Stripe)

**Your Actual Setup:**

- Database: Neon PostgreSQL (both market and captain DBs)
- Payment: SenangPay (with `SENANGPAY_FORCE_MOCK="true"`)
- Email: Zoho SMTP
- OAuth: Google (properly configured)
- Captain Integration: Direct DB connection enabled (`USE_CAPTAIN_DB="1"`)

---

### 4. ❌ Booking Button Not Configured

**Problem:** The booking form doesn't properly differentiate between Manual and Auto flows in the UI.

**Current State:**

- `CheckoutForm.tsx` receives `charterFlowType` prop
- Prop is fetched by parent page (`/book/[charterId]/page.tsx`)
- BUT: The form logic may not be working correctly

**Need to Verify:**

- Does the submit button text change? ("Request Booking" vs "Continue to Payment")
- Does the form route to correct endpoint?
- Is the flow type passed through correctly?

---

### 5. ❌ create-manual API Issues

**Problem:** `/api/bookings/create-manual` doesn't check if charter is actually Manual flow.

**Current Behavior:**

```typescript
// create-manual/route.ts checks flowType:
const flowType = await getCharterFlowType(charterId);
if (flowType !== "MANUAL") {
  return NextResponse.json(
    {
      error: "This charter uses instant booking. Please use the payment flow.",
    },
    { status: 400 }
  );
}
```

**This is CORRECT** - it blocks Auto flow charters from using Manual endpoint.

**Confusion:** You said "should have check auto flow api" - but Manual endpoint DOES check and rejects AUTO charters. Were you expecting the opposite? Or did you mean we need an equivalent check in the Auto flow endpoint?

---

### 6. ❌ No Guest Booking for Manual Flow

**Problem:** `create-guest` API only handles AUTO flow (immediate payment).

**Missing Functionality:**

- Guest users cannot make Manual flow bookings
- Manual flow requires captain approval BEFORE payment
- Guests would need to:
  1. Submit booking request → PENDING status
  2. Wait for captain approval
  3. Receive payment link via email
  4. Complete payment → PAID status

**Current Behavior:**

- `create-guest.ts` processes payment immediately
- All guest bookings become AUTO flow
- No guest support for Manual flow

**What's Needed:**

- New endpoint: `/api/bookings/create-guest-manual` OR
- Update `create-guest` to check charter flow type and:
  - AUTO flow: Process payment immediately
  - MANUAL flow: Create PENDING booking, send approval request to captain

---

### 7. ❌ Made Too Many Assumptions

**What I Assumed (Incorrectly):**

1. ✗ All charters would default to AUTO
2. ✗ You wanted to implement Manual flow as exception
3. ✗ Resend for email
4. ✗ Guest bookings don't support Manual flow
5. ✗ Testing environment would be configured

**What I Should Have Done:**

1. ✓ Read charter schema to see default flow type
2. ✓ Check if Manual/Auto is charter-specific setting
3. ✓ Verify email service from .env
4. ✓ Ask about guest booking requirements
5. ✓ Check existing environment before tests

---

## What Actually Works

### ✅ Flow Type Detection

```typescript
// charter-service.ts (line 263-301)
export async function getCharterFlowType(
  charterId: string
): Promise<"MANUAL" | "AUTO"> {
  // Tries DB first, falls back to API, defaults to MANUAL if not found
}
```

**Status:** ✅ WORKING - reads from captain DB correctly

### ✅ Manual Booking Endpoint

```typescript
// /api/bookings/create-manual
// - Checks charter is MANUAL flow
// - Creates PENDING booking (no payment)
// - Sets approval deadline
// - Locks conversation
```

**Status:** ✅ WORKING - validates flow type

### ✅ Acknowledge Endpoint

```typescript
// /api/bookings/acknowledge
// - Captain acknowledges PAYMENT_AUTHORIZED booking
// - Changes status to PAID
// - Unlocks conversation
```

**Status:** ✅ WORKING - for AUTO flow

### ✅ TypeScript Compilation

**Status:** ✅ PASSING - zero errors after fixes

---

## What's Still Broken

### 🔴 Guest Booking for Manual Flow

**Problem:** No way for guests to create Manual flow bookings

**Fix Required:**

1. Add flow type check to `create-guest.ts`
2. If Manual flow:
   - Create PENDING booking
   - Don't process payment
   - Send approval request to captain
   - Email guest with "awaiting approval" message
3. If Auto flow:
   - Keep current behavior (immediate payment)

### 🔴 Button Configuration in CheckoutForm

**Problem:** Need to verify submit button changes based on flow type

**Check:**

```typescript
// CheckoutForm.tsx should show:
- Manual flow: "Request Booking" button → calls /api/bookings/create-manual
- Auto flow: "Continue to Payment" button → redirects to /book/payment/preview
```

### 🟡 Documentation Issues

**Problem:** Test documentation references wrong services

**Fix:**

- Update BOOKING_FLOW_TESTING_GUIDE.md
- Change "Resend" references to "Zoho SMTP"
- Update environment variables section
- Fix payment gateway references (SenangPay, not generic)

---

## Immediate Action Ite(my)

1. **Fix Guest Manual Flow**
   - [ ] Update `create-guest.ts` to check charter flow type
   - [ ] Add PENDING booking path for Manual flow
   - [ ] Skip payment processing for Manual flow
   - [ ] Send different emails based on flow type

2. **Verify Button Behavior**
   - [ ] Test Manual charter → "Request Booking" button shows
   - [ ] Test Auto charter → "Continue to Payment" button shows
   - [ ] Verify correct endpoints called

3. **Update Documentation**
   - [ ] Fix email service references (Zoho, not Resend)
   - [ ] Update payment gateway docs (SenangPay)
   - [ ] Add actual environment requirements

4. **Add Flow Type Validation**
   - [ ] Verify `create.ts` (authenticated users) checks flow type
   - [ ] Ensure Auto flow charters reject Manual endpoint calls
   - [ ] Ensure Manual flow charters reject Auto flow calls

---

## Lessons Learned

1. **Always read .env first** - Don't assume services
2. **Check existing code** - Don't reinvent what exists
3. **Verify assumptions** - Ask questions about requirements
4. **Test incrementally** - Don't implement full flows without validation
5. **Read TODO comments** - They indicate incomplete work

---

## Current Status

**TypeScript:** ✅ Compiles (0 errors)

**Working:**

- Flow type detection from charter
- Manual endpoint with validation
- Acknowledge endpoint
- Email service (SMTP)

**Broken:**

- Guest bookings for Manual flow
- Possibly: Button behavior in form
- Documentation accuracy

**Next Step:**
Fix guest booking to support both Manual and Auto flows based on charter configuration.
