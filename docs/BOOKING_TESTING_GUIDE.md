# Booking System Testing Guide

## Quick Start

### Access the Testing Dashboard

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3001/dev/booking-tests
3. Use the dashboard to create and manipulate test bookings

---

## Testing Scenarios

### 1. PENDING → EXPIRED Flow

**Purpose:** Verify that PENDING bookings expire after 12 hours and show the appropriate expired screen.

**Steps:**

1. **Create Test Booking:**
   - Click "Create PENDING (30m)" quick action button
   - This creates a booking that expires in 30 minutes

2. **Set to Expired:**
   - In the bookings table, find your test booking
   - Use the "Set Expiry" dropdown, select "Expired" (-1h)
   - Click "Set" button

3. **View Expired Screen:**
   - Click the "Detail" link for the booking
   - **Expected Result:** Should show BookingExpiredScreen with:
     - "Your Booking Hold Has Expired" heading
     - PENDING expiration type message
     - Red expired badge
     - Browse charters CTA

**Success Criteria:**

- ✅ BookingExpiredScreen renders correctly
- ✅ Shows PENDING expiration messaging
- ✅ Expired badge displays in red
- ✅ CTA redirects to browse page

---

### 2. APPROVED → EXPIRED Flow

**Purpose:** Verify that APPROVED bookings expire after 48 hours and show the correct expiration type.

**Steps:**

1. **Create Test Booking:**
   - Click "Create APPROVED (1h)" quick action button
   - This creates an APPROVED booking that expires in 1 hour

2. **Set to Expired:**
   - Find the booking in the table
   - Use "Set Expiry" dropdown, select "Expired" (-1h)
   - Click "Set"

3. **View Payment Page:**
   - Click the "Payment" link for the booking
   - **Expected Result:** Should show BookingExpiredScreen with:
     - "Your Payment Window Has Expired" heading
     - APPROVED expiration type message
     - Explanation about 48-hour payment window
     - Browse charters CTA

**Success Criteria:**

- ✅ BookingExpiredScreen renders on payment page
- ✅ Shows APPROVED expiration messaging (different from PENDING)
- ✅ Mentions 48-hour payment deadline
- ✅ Expired badge displays correctly

---

### 3. Date Conflict Detection

**Purpose:** Verify that payment page shows DateNoLongerAvailableScreen when date becomes unavailable.

**Steps:**

1. **Create First Booking (APPROVED):**
   - Click "Create APPROVED (5h)"
   - Note the booking ID

2. **Create Conflicting Booking:**
   - Create another APPROVED booking
   - Manually update the date/time to match the first booking:
     - Same `date`
     - Same `startTime`
     - Same `charterId`

3. **Change Second Booking to PAID:**
   - In bookings table, find second booking
   - Change status dropdown to "PAID"
   - This simulates another angler completing payment

4. **View First Booking's Payment Page:**
   - Click "Payment" link for the FIRST booking
   - **Expected Result:** Should show DateNoLongerAvailableScreen with:
     - "Date No Longer Available" heading
     - Explanation that another angler booked
     - List of alternative available dates
     - "Browse All Charters" CTA

**Success Criteria:**

- ✅ DateNoLongerAvailableScreen renders correctly
- ✅ Shows empathetic messaging about conflict
- ✅ Displays alternative dates (if available)
- ✅ Browse CTA works

**Database Setup (Alternative Method):**

```sql
-- Create two bookings with same date/time
INSERT INTO "Booking" (id, "charterId", "tripId", date, "startTime", days, status, "guestEmail", "guestFirstName", "guestLastName", "emailVerified", guests, "tripPrice", "finalPrice", "expiresAt", "createdAt", "updatedAt")
VALUES
  ('test-approved-1', 'charter-id', 'trip-id', '2025-11-15', '08:00', 1, 'APPROVED', 'test1@example.com', 'Test', 'User1', true, '{"adults":2,"children":0}', 450, 450, NOW() + INTERVAL '5 hours', NOW(), NOW()),
  ('test-paid-2', 'charter-id', 'trip-id', '2025-11-15', '08:00', 1, 'PAID', 'test2@example.com', 'Test', 'User2', true, '{"adults":2,"children":0}', 450, 450, NULL, NOW(), NOW());

-- Then visit payment page for test-approved-1
```

---

### 4. Countdown Timer Accuracy

**Purpose:** Verify BookingCountdown component updates every second and shows correct urgency levels.

**Steps:**

1. **Create Bookings with Different Expiry Times:**
   - Create APPROVED booking with 48h expiry (low urgency - green)
   - Create APPROVED booking with 5h expiry (high urgency - red + pulse)
   - Create APPROVED booking with 23h expiry (medium urgency - yellow)
   - Create APPROVED booking with 30m expiry (critical - red + pulse)

2. **Test on Booking Cards:**
   - Go to `/account/bookings` page
   - **Expected Results:**
     - 48h booking: Green badge, calm countdown
     - 23h booking: Yellow badge, moderate urgency
     - 5h booking: Red badge with pulse animation, urgent
     - 30m booking: Red badge with pulse, "URGENT" label

3. **Test Timer Updates:**
   - Watch a countdown for 60+ seconds
   - **Expected:** Timer should update every second
   - Verify minutes and hours decrement correctly

4. **Test Expired State:**
   - Set a booking to "Expired" (-1h)
   - **Expected:** Shows "Expired" text in red, no countdown

**Success Criteria:**

- ✅ Low urgency (>24h): Green badge, no pulse
- ✅ Medium urgency (6-24h): Yellow badge, no pulse
- ✅ High urgency (<6h): Red badge with pulse animation
- ✅ Timer updates every second accurately
- ✅ Expired bookings show "Expired" text
- ✅ Hours/minutes format correctly (e.g., "23h 45m")

---

## Testing Dashboard Features

### Quick Actions

- **Create PENDING (30m):** Test near-expiry PENDING flow
- **Create APPROVED (1h):** Test near-expiry APPROVED flow
- **Create APPROVED (5h):** Test urgent reminder threshold (<6h)
- **Clear All Tests:** Delete all test bookings in one click

### Booking Manipulation

For each booking, you can:

- **Change Status:** Dropdown to switch between PENDING/APPROVED/PAID/EXPIRED/CANCELLED
- **Set Expiry:** Dropdown with preset times: -1h (expired), 15m, 30m, 1h, 5h, 12h, 24h, 48h
- **View Detail:** Opens booking detail page in new tab
- **View Payment:** Opens payment page in new tab (only for APPROVED bookings)
- **Delete:** Remove individual test booking

### Visual Indicators

- **Status Badges:** Color-coded by status (yellow=PENDING, blue=APPROVED, green=PAID, gray=EXPIRED)
- **Time to Expiry:** Shows countdown with color coding:
  - Green: >24h remaining
  - Yellow: 6-24h remaining
  - Orange: 1-6h remaining
  - Red: <1h or expired

---

## Manual Testing Checklist

Use this checklist when testing manually:

### PENDING Expiration

- [ ] Create PENDING booking with short expiry
- [ ] Set to expired (-1h)
- [ ] Visit detail page
- [ ] Verify BookingExpiredScreen shows (PENDING type)
- [ ] Verify messaging is correct
- [ ] Click Browse CTA, verify redirect works

### APPROVED Expiration

- [ ] Create APPROVED booking with short expiry
- [ ] Set to expired (-1h)
- [ ] Visit payment page
- [ ] Verify BookingExpiredScreen shows (APPROVED type)
- [ ] Verify 48h payment deadline mentioned
- [ ] Click Browse CTA, verify redirect works

### Date Conflict

- [ ] Create APPROVED booking A
- [ ] Create APPROVED booking B (same date/time)
- [ ] Change booking B to PAID
- [ ] Visit payment page for booking A
- [ ] Verify DateNoLongerAvailableScreen shows
- [ ] Verify alternative dates listed (if available)
- [ ] Click Browse CTA, verify redirect works

### Countdown Timer

- [ ] Create bookings with 48h, 23h, 5h, 30m expiry
- [ ] Go to /account/bookings
- [ ] Verify 48h shows green badge, no pulse
- [ ] Verify 23h shows yellow badge, no pulse
- [ ] Verify 5h shows red badge WITH pulse
- [ ] Verify 30m shows red badge WITH pulse + "URGENT"
- [ ] Watch timer for 60s, verify it updates every second
- [ ] Set booking to expired, verify shows "Expired" text

### Email Templates (Manually Send)

- [ ] Trigger BookingApproved email
- [ ] Verify 48h payment deadline warning shows
- [ ] Verify CTA says "Complete Payment Now"
- [ ] Trigger BookingPaymentReminder (normal mode, >6h)
- [ ] Verify yellow warning box, friendly tone
- [ ] Trigger BookingPaymentReminder (urgent mode, <6h)
- [ ] Verify red warning box with pulse, urgent CTA

---

## Troubleshooting

### Dashboard Not Loading

- Ensure you're running in development mode (`NODE_ENV=development`)
- Check browser console for errors
- Verify database connection is working

### Bookings Not Appearing

- Dashboard only shows test bookings (email contains "test", "dev", or "angler")
- Create new test booking using quick actions
- Check database directly: `SELECT * FROM "Booking" WHERE "guestEmail" LIKE '%test%'`

### Payment Page Shows 404

- Only APPROVED bookings have payment pages
- Ensure booking status is APPROVED before clicking "Payment" link
- Check booking expiresAt is in the future

### Expired Screen Not Showing

- Verify booking status is EXPIRED or expiresAt is in the past
- Check the payment page route is `/book/payment/[bookingId]`
- Clear browser cache if seeing old cached version

---

## Database Queries (Advanced)

### Check Booking Conflicts

```sql
SELECT
  b1.id as booking1,
  b2.id as booking2,
  b1.date,
  b1."startTime",
  b1.status as status1,
  b2.status as status2
FROM "Booking" b1
JOIN "Booking" b2 ON
  b1."charterId" = b2."charterId"
  AND b1.date = b2.date
  AND b1."startTime" = b2."startTime"
  AND b1.id != b2.id
WHERE b1.status = 'PAID' OR b2.status = 'PAID';
```

### Find Expired Bookings

```sql
SELECT id, status, "expiresAt",
  EXTRACT(EPOCH FROM (NOW() - "expiresAt"))/3600 as hours_expired
FROM "Booking"
WHERE "expiresAt" < NOW()
  AND status IN ('PENDING', 'APPROVED')
ORDER BY "expiresAt" DESC;
```

### Simulate Payment Deadline Urgency

```sql
-- Create booking expiring in 5 hours (urgent)
INSERT INTO "Booking" (...)
VALUES (..., NOW() + INTERVAL '5 hours', ...);

-- Create booking expiring in 30 minutes (critical)
UPDATE "Booking"
SET "expiresAt" = NOW() + INTERVAL '30 minutes'
WHERE id = 'your-booking-id';
```

---

## Next Steps

After completing manual testing:

1. Document any bugs or issues found
2. Update component behavior based on UX feedback
3. Consider adding automated E2E tests (Playwright)
4. Implement cron job to auto-expire bookings
5. Set up email reminder system for payment deadlines
