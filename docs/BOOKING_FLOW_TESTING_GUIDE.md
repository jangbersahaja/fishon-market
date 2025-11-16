# Booking Flow Testing Guide

## Overview

This guide covers end-to-end testing for the booking flow separation implementation.

**Two Flow Types:**

- **Manual Flow**: Request → Captain Approval (24h) → Payment
- **Auto Flow**: Request → Payment (30min session) → Captain Acknowledgment → PAID

---

## Pre-Testing Checklist

### Environment Setup

- [ ] Development server running on port 3001
- [ ] Database connection verified
- [ ] fishon-captain database accessible (for charter data)
- [ ] Email service configured (Resend)
- [ ] Google OAuth working for authentication

### Test Data Requirements

- [ ] At least one charter with `bookingFlowType: "MANUAL"`
- [ ] At least one charter with `bookingFlowType: "AUTO"`
- [ ] Test user account (authenticated)
- [ ] Test guest user (unauthenticated)
- [ ] Available trip dates in the future

---

## Test Suite 1: Manual Flow (Request → Approve → Pay)

### Test 1.1: Manual Flow - Authenticated User Booking

**Prerequisites:**

- User logged in
- Charter with `bookingFlowType: "MANUAL"`

**Steps:**

1. Navigate to charter detail page with Manual flow charter
2. Click "Book Now" button
3. Fill out booking form:
   - Select trip
   - Choose date (future date)
   - Select participants (adults/children)
   - Fill personal details (name, email, phone)
   - Add emergency contact
   - Add note (optional)
4. Click "Request Booking" button (NOT "Continue to Payment")
5. Verify redirect to `/book/confirm` page

**Expected Results:**

- ✅ Booking created with status: `PENDING`
- ✅ Approval deadline set to 24 hours from now (or charter's custom approval time)
- ✅ Conversation created with status: `LOCKED`
- ✅ No payment processed yet
- ✅ Captain receives email notification (check Resend dashboard)
- ✅ Angler receives confirmation email
- ✅ System notification created for captain
- ✅ Analytics event tracked (`CHARTER_VIEW` type)
- ✅ Confirm page shows:
  - Booking ID
  - Status: "Pending Approval"
  - Approval deadline countdown
  - Message: "Waiting for captain's approval"
  - Locked conversation indicator

**Database Verification:**

```sql
-- Check booking
SELECT id, status, finalPrice, approvalDeadline, captainApprovedAt, paidAt
FROM "Booking"
WHERE id = '<booking_id>'
ORDER BY createdAt DESC LIMIT 1;

-- Check conversation
SELECT id, status, bookingId
FROM "Conversation"
WHERE bookingId = '<booking_id>';

-- Check notification
SELECT id, type, userId, message
FROM "Notification"
WHERE bookingId = '<booking_id>';
```

**Expected Database State:**

- `Booking.status` = `PENDING`
- `Booking.approvalDeadline` = ~24 hours from now
- `Booking.captainApprovedAt` = `NULL`
- `Booking.paidAt` = `NULL`
- `Conversation.status` = `LOCKED`

---

### Test 1.2: Manual Flow - Guest User (Should Redirect to Login)

**Prerequisites:**

- User NOT logged in
- Charter with `bookingFlowType: "MANUAL"`

**Steps:**

1. Navigate to charter detail page
2. Click "Book Now" button
3. Attempt to fill form and submit

**Expected Results:**

- ✅ User redirected to `/login` with return URL
- ✅ After login, user returns to booking page
- ✅ Form data preserved (if stored in URL params)

---

### Test 1.3: Manual Flow - Approval Deadline Expiry

**Prerequisites:**

- Existing PENDING booking with approvalDeadline in the past

**Steps:**

1. Check booking status before deadline
2. Wait for deadline to pass (or manually update database)
3. Run cron job or check booking status endpoint

**Expected Results:**

- ✅ Booking status changes to `EXPIRED` (if implemented)
- ✅ Angler notified of expiry
- ✅ Conversation remains locked

**Note:** This requires a cron job implementation (may be future work).

---

## Test Suite 2: Auto Flow (Payment First)

### Test 2.1: Auto Flow - Payment Session Creation

**Prerequisites:**

- User logged in
- Charter with `bookingFlowType: "AUTO"`

**Steps:**

1. Navigate to charter detail page with Auto flow charter
2. Click "Book Now" button
3. Fill out booking form (same fields as Manual flow)
4. Click "Continue to Payment" button (NOT "Request Booking")
5. Verify redirect to `/book/payment/preview?data=<encoded>`

**Expected Results:**

- ✅ Redirected to payment preview page
- ✅ No booking created in database yet (payment-first approach)
- ✅ URL contains encoded form data
- ✅ Session timer starts (30 minutes)
- ✅ Timer visible in UI (countdown)

---

### Test 2.2: Auto Flow - Payment Preview Page Display

**Prerequisites:**

- On payment preview page from Test 2.1

**Steps:**

1. Verify page layout and content
2. Check all sections render correctly

**Expected Results:**

- ✅ Booking summary displayed:
  - Charter name
  - Trip details (date, duration, participants)
  - Pricing breakdown (base price, days, subtotal, gateway fee, total)
- ✅ Payment session timer visible (e.g., "29:45 remaining")
- ✅ Payment method selection:
  - Card option
  - FPX option
  - E-wallet option (if enabled)
- ✅ Terms & conditions checkbox
- ✅ "Proceed to Payment" button enabled only when:
  - Payment method selected
  - Terms accepted

---

### Test 2.3: Auto Flow - Pre-Submission Validation

**Prerequisites:**

- On payment preview page
- Valid session (not expired)

**Steps:**

1. Select payment method
2. Accept terms
3. Click "Proceed to Payment" button
4. Observe validation API call

**Expected Results:**

- ✅ API call to `/api/bookings/validate` (or similar)
- ✅ Validation checks:
  - Session not expired
  - Date still available
  - Pricing still valid
- ✅ If validation passes: proceed to payment gateway
- ✅ If validation fails: show error message

**Expected Validation Response (Success):**

```json
{
  "valid": true,
  "pricing": {
    "basePrice": 500.0,
    "days": 2,
    "subtotal": 1000.0,
    "paymentGatewayFee": 30.0,
    "finalPrice": 1030.0
  }
}
```

**Expected Validation Response (Failure - Date Unavailable):**

```json
{
  "valid": false,
  "error": "Selected date is no longer available"
}
```

---

### Test 2.4: Auto Flow - Session Timeout (30 Minutes)

**Prerequisites:**

- On payment preview page
- Session started

**Steps:**

1. Wait for 25 minutes (or manipulate `sessionStart` in URL)
2. Observe 5-minute warning toast
3. Wait for full 30 minutes to expire
4. Verify auto-redirect

**Expected Results:**

- ✅ At 25 minutes (5 min remaining): Warning toast appears
  - "Your payment session expires in 5 minutes"
- ✅ At 30 minutes: Auto-redirect to booking form with error message
  - "Payment session expired. Please submit your booking again."
- ✅ Form data cleared (new session required)

**Manual Test (Fast Forward):**

```javascript
// In browser console, manipulate URL
const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const data = JSON.parse(atob(params.get("data")));
// Set session start to 31 minutes ago
data.sessionStart = new Date(Date.now() - 31 * 60 * 1000).toISOString();
const newData = btoa(JSON.stringify(data));
window.location.href = `/book/payment/preview?data=${newData}`;
```

---

### Test 2.5: Auto Flow - Payment Processing & Acknowledgment

**Prerequisites:**

- Valid session
- Payment method selected

**Steps:**

1. Complete payment (use test card or mock payment)
2. Verify booking created with `PAYMENT_AUTHORIZED` status
3. Captain receives notification
4. Captain acknowledges booking via `/api/bookings/acknowledge`
5. Verify status changes to `PAID`

**Expected Results:**

**After Payment:**

- ✅ Booking created with status: `PAYMENT_AUTHORIZED`
- ✅ Conversation created with status: `LOCKED` (until acknowledgment)
- ✅ Payment record created
- ✅ Captain receives email: "New booking received (payment authorized)"
- ✅ Angler receives email: "Payment authorized, awaiting captain confirmation"

**After Captain Acknowledgment:**

- ✅ Booking status: `PAYMENT_AUTHORIZED` → `PAID`
- ✅ Conversation status: `LOCKED` → `ACTIVE` (unlocked)
- ✅ Captain receives email: "Booking confirmed"
- ✅ Angler receives email: "Booking confirmed by captain"
- ✅ Both parties can now chat

**API Test for Acknowledgment:**

```bash
curl -X POST http://localhost:3001/api/bookings/acknowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "bookingId": "<booking_id>"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "booking": {
    "id": "<booking_id>",
    "status": "PAID",
    "paidAt": "2025-11-16T14:30:00.000Z"
  }
}
```

---

## Test Suite 3: Edge Cases

### Test 3.1: Date Becomes Unavailable During Payment Session

**Steps:**

1. Start Auto flow payment session
2. In another tab/browser, book the same date (create conflict)
3. Return to payment session
4. Attempt to proceed to payment

**Expected Results:**

- ✅ Validation fails with "Date no longer available"
- ✅ User redirected back to booking form
- ✅ Error message displayed

---

### Test 3.2: Price Changes During Payment Session

**Steps:**

1. Start Auto flow payment session
2. In database, update trip basePrice
3. Return to payment session
4. Attempt to proceed to payment

**Expected Results:**

- ✅ Validation detects price mismatch
- ✅ User shown updated price
- ✅ Option to accept new price or cancel

---

### Test 3.3: Multiple Users Booking Same Date Simultaneously

**Steps:**

1. Two users open same charter at same time
2. Both select same date
3. Both submit within seconds of each other

**Expected Results:**

- ✅ First booking succeeds
- ✅ Second booking fails with "Date unavailable" error
- ✅ Database integrity maintained (no double-booking)

---

### Test 3.4: Guest User Attempts Auto Flow

**Prerequisites:**

- User NOT logged in
- Charter with `bookingFlowType: "AUTO"`

**Steps:**

1. Navigate to charter detail page
2. Fill booking form
3. Click "Continue to Payment"

**Expected Results:**

- ✅ User redirected to `/login` with return URL
- ✅ After login, user can complete booking
- ✅ Payment session timer starts AFTER login (not before)

---

## Test Suite 4: API Endpoints

### Test 4.1: `/api/bookings/create-manual` (Manual Flow)

**Request:**

```bash
curl -X POST http://localhost:3001/api/bookings/create-manual \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "tripId": "trip_123",
    "date": "2025-12-01",
    "days": 2,
    "adults": 4,
    "children": 1,
    "startTime": "08:00",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+60123456789",
    "note": "First time fishing trip!",
    "emergencyName": "Jane Doe",
    "emergencyPhone": "+60198765432",
    "emergencyRelation": "Spouse"
  }'
```

**Expected Response (Success):**

```json
{
  "success": true,
  "booking": {
    "id": "booking_123",
    "status": "PENDING",
    "approvalDeadline": "2025-11-17T14:00:00.000Z",
    "conversationId": "conv_123"
  }
}
```

**Expected Response (Error - Unauthenticated):**

```json
{
  "error": "Authentication required"
}
```

---

### Test 4.2: `/api/bookings/acknowledge` (Auto Flow)

**Request:**

```bash
curl -X POST http://localhost:3001/api/bookings/acknowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: <captain_session_cookie>" \
  -d '{
    "bookingId": "booking_123"
  }'
```

**Expected Response (Success):**

```json
{
  "success": true,
  "booking": {
    "id": "booking_123",
    "status": "PAID",
    "paidAt": "2025-11-16T14:30:00.000Z"
  }
}
```

**Expected Response (Error - Not Captain):**

```json
{
  "error": "Only the captain can acknowledge this booking"
}
```

**Expected Response (Error - Wrong Status):**

```json
{
  "error": "Booking must be in PAYMENT_AUTHORIZED status"
}
```

---

## Test Suite 5: Database Integrity

### Test 5.1: Check Booking Records

```sql
-- Recent bookings
SELECT
  id,
  status,
  bookingFlowType,
  finalPrice,
  approvalDeadline,
  captainApprovedAt,
  paidAt,
  createdAt
FROM "Booking"
ORDER BY createdAt DESC
LIMIT 10;
```

### Test 5.2: Check Conversation Lock Status

```sql
-- Conversations by booking
SELECT
  c.id,
  c.status,
  c.bookingId,
  b.status as booking_status,
  b.bookingFlowType
FROM "Conversation" c
JOIN "Booking" b ON b.id = c.bookingId
ORDER BY c.createdAt DESC
LIMIT 10;
```

### Test 5.3: Check Analytics Events

```sql
-- Analytics for bookings
SELECT
  eventType,
  metadata,
  createdAt
FROM "AnalyticsEvent"
WHERE metadata::jsonb @> '{"bookingFlowType": "MANUAL"}'::jsonb
ORDER BY createdAt DESC
LIMIT 10;
```

---

## Test Suite 6: Email Notifications

### Test 6.1: Manual Flow Emails

**Emails Sent:**

1. **To Angler**: "Booking Request Received"
   - Booking ID
   - Charter details
   - Approval deadline
   - Status: Pending

2. **To Captain**: "New Booking Request"
   - Angler details
   - Trip details
   - Approval required
   - Link to approve/reject

**Verification:**

- Check Resend dashboard for sent emails
- Verify email content matches template
- Check all variables populated correctly

---

### Test 6.2: Auto Flow Emails

**After Payment:**

1. **To Angler**: "Payment Authorized"
   - Payment confirmation
   - Awaiting captain acknowledgment
   - Booking details

2. **To Captain**: "New Booking - Payment Received"
   - Angler details
   - Payment confirmed
   - Action required: Acknowledge booking

**After Acknowledgment:**

1. **To Angler**: "Booking Confirmed"
   - Booking confirmed by captain
   - Can now chat with captain
   - Trip details

2. **To Captain**: "Booking Confirmed"
   - Confirmation sent to angler
   - Conversation unlocked
   - Prepare for trip

---

## Test Suite 7: UI/UX Verification

### Test 7.1: Flow Detection Display

**Steps:**

1. Visit Manual flow charter
2. Check booking button text
3. Visit Auto flow charter
4. Check booking button text

**Expected Results:**

- ✅ Manual: "Request Booking" button
- ✅ Auto: "Continue to Payment" button
- ✅ Flow type indicator visible (optional badge/label)

---

### Test 7.2: Conversation Lock UI

**Manual Flow:**

- ✅ Conversation locked until captain approves
- ✅ Lock icon visible
- ✅ Message: "Conversation will unlock after approval"

**Auto Flow:**

- ✅ Conversation locked until captain acknowledges
- ✅ Lock icon visible
- ✅ Message: "Conversation will unlock after captain confirms"

---

### Test 7.3: Booking Status Display

**Check `/account/bookings` page:**

- ✅ PENDING bookings show countdown to approval deadline
- ✅ PAYMENT_AUTHORIZED bookings show "Awaiting confirmation"
- ✅ PAID bookings show "Confirmed"
- ✅ Status badges color-coded correctly

---

## Known Issues & Limitations

### Current Limitations:

1. **No automatic expiry handling**: PENDING bookings don't auto-expire after approval deadline (requires cron job)
2. **Session persistence**: Payment session data stored in URL (consider localStorage for better UX)
3. **Offline support**: No offline queue for failed analytics/email sends
4. **Rate limiting**: No rate limiting on API endpoints (potential abuse vector)

### Future Enhancements:

1. Add cron job for booking expiry
2. Add retry queue for failed webhooks
3. Add comprehensive logging/monitoring
4. Add admin dashboard for booking management
5. Add SMS notifications (optional)
6. Add refund flow for cancelled bookings

---

## Test Execution Checklist

### Before Testing:

- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run build` - successful
- [ ] Database seeded with test data
- [ ] Email service configured and tested

### During Testing:

- [ ] Test Manual flow (all scenarios)
- [ ] Test Auto flow (all scenarios)
- [ ] Test edge cases
- [ ] Verify API endpoints
- [ ] Check database records
- [ ] Verify email notifications
- [ ] Test UI/UX elements

### After Testing:

- [ ] Document any bugs found
- [ ] Create GitHub issues for bugs
- [ ] Update documentation with findings
- [ ] Plan fixes for critical issues
- [ ] Schedule deployment

---

## Bug Report Template

```markdown
**Bug Title:** [Short description]

**Severity:** Critical | High | Medium | Low

**Flow:** Manual | Auto | Both

**Steps to Reproduce:**

1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Environment:**

- Browser: ...
- User Type: Authenticated | Guest
- Charter ID: ...
- Booking ID: ...

**Logs/Screenshots:**
...

**Database State:**
...
```

---

## Success Criteria

All tests pass with:

- ✅ Zero TypeScript errors
- ✅ Zero runtime errors
- ✅ All API endpoints return expected responses
- ✅ Database integrity maintained
- ✅ Email notifications sent correctly
- ✅ UI displays correctly in all flows
- ✅ Session timeout works as expected
- ✅ Validation prevents invalid bookings
- ✅ Conversations lock/unlock correctly
- ✅ Analytics events tracked properly

---

## Next Steps After Testing

1. **Code Review**: Review all changes with team
2. **Documentation**: Update API docs, README, and deployment guide
3. **Deployment Plan**: Plan staging → production rollout
4. **Monitoring**: Set up alerts for booking errors
5. **User Communication**: Notify users of new booking flows
