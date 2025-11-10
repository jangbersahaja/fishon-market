# Senang Pay Integration Testing Guide

**Phase 8: Comprehensive Testing with Real Payment Gateway**

This guide covers end-to-end testing of the Senang Pay integration using ngrok to expose local webhooks.

---

## Prerequisites

### 1. Install ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Create ngrok Account (Free)

1. Sign up at <https://dashboard.ngrok.com/signup>p>
2. Get your auth token from <https://dashboard.ngrok.com/get-started/your-authtoken>n>
3. Configure ngrok:

   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### 3. Verify Environment Variables

Ensure these are set in `.env.local`:

```bash
# Senang Pay Configuration (Production)
SENANGPAY_MERCHANT_ID=your_merchant_id
SENANGPAY_SECRET_KEY=your_secret_key
SENANGPAY_MODE=production

# DO NOT set SENANGPAY_FORCE_MOCK=1 during testing
# This would bypass real payment gateway

# Captain Webhook (for side effects testing)
CAPTAIN_WEBHOOK_URL=https://captain.fishon.my/api/webhooks/market
CAPTAIN_API_SECRET=your_captain_secret

# Database
DATABASE_URL=your_postgres_url
```

---

## Testing Setup

### Step 1: Start Local Development Server

```bash
cd /Users/jangbersahaja/Website/fishon-market
npm run dev
```

Server should be running on `http://localhost:3000`

---

### Step 2: Start ngrok Tunnel

Open a new terminal:

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding   https://abc123xyz.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123xyz.ngrok-free.app`)

---

### St<https://app.senangpay.my/merchant/settings>rily)

Go to <https://app.senangpay.my/merchant/settings>

**Before Testing** - Update these URLs with your ngrok URL:

| Field            | Testing Value (Replace abc123xyz with your ngrok ID)              |
| ---------------- | ----------------------------------------------------------------- |
| **Return URL**   | `https://abc123xyz.ngrok-free.app/book/payment/return`            |
| **Callback URL** | `https://abc123xyz.ngrok-free.app/api/payment/senangpay-callback` |

**Save Changes**

⚠️ **Important**: Remember to revert to production URLs after testing:

- Return URL: `https://www.fishon.my/book/payment/return`
- Callback URL: `https://www.fishon.my/api/payment/senangpay-callback`

---

## Test Scenarios

### Test 1: Successful Payment Flow

**Objective**: Verify complete payment flow from start to finish

**Steps**:

1. **Create a Booking**:
   - Go to `http://localhost:3000`
   - Browse charters and select a trip
   - Fill booking form and submit
   - Captain should approve the booking (via captain app or API)

2. **Navigate to Payment Page**:
   - Go to `/book/payment/{bookingId}`
   - Verify payment form displays correct amount
   - Verify Senang Pay form loads (not mock payment)

3. **Complete Payment**:
   - Click "Pay with Senang Pay"
   - You'll be redirected to Senang Pay's payment page
   - Use test card (if sandbox) or real card (if production - use small amount like RM 1.00)
   - Complete payment

4. **Verify Return URL Handler**:
   - Monitor terminal logs for: `🔙 [PAYMENT RETURN] User returned from Senang Pay`
   - Should see hash verification: `✅ [PAYMENT RETURN] Hash verified successfully`
   - Should see booking update: `✅ [PAYMENT RETURN] Booking updated to PAID`
   - You should be redirected to confirmation page with success banner

5. **Verify Callback Webhook**:
   - Within 1-2 seconds, monitor logs for: `📥 [SENANGPAY CALLBACK] Received callback`
   - Should see: `✅ [SENANGPAY CALLBACK] Hash verified successfully`
   - Should see idempotency check: `✅ [SENANGPAY CALLBACK] Already processed by callback webhook` OR booking update

6. **Verify Side Effects**:
   - Check logs for: `✨ [PAYMENT SIDE EFFECTS] Starting`
   - Captain webhook: `📤 [PAYMENT SIDE EFFECTS] Sending captain webhook`
   - Angler notification: `✅ [PAYMENT SIDE EFFECTS] Angler notification created`

   - Page revalidation: `✅ [PAYMENT SIDE EFFECTS] Pages revalidated successfully`

7. **Verify Database**:

   ```sql

   ```

SELECT id, status, paidAt, paymentTransactionId, paymentMethod, paymentNote
FROM "Booking"
WHERE id = 'your_booking_id';

````

Expected:
- `status` = 'PAID'
- `paidAt` = timestamp
- `paymentTransactionId` = Senang Pay transaction ID
- `paymentMethod` = 'SENANGPA<https://captain.fishon.my>
- `paymentNote` = 'Payment was successful'

8. **Verify Captain App**:
- Check captain dashboard at <https://captain.fishon.my>
- Should see booking status updated to PAID
- Captain should receive notification about payment

**Expected Result**: ✅ Payment completed, booking updated, all side effects triggered

---

### Test 2: Failed Payment Flow

**Objective**: Verify system handles payment failures gracefully

**Steps**:

1. Create and approve a booking (same as Test 1, steps 1-2)

2. **Decline Payment**:
- On Senang Pay payment page, click "Cancel" or use a declined test card
- You'll be redirected back to fishon.my

3. **Verify Return URL Handler**:
- Monitor logs for: `❌ [PAYMENT RETURN] Payment failed`

- Should see failure note recorded
- You should see confirmation page with red "Payment Failed" banner

4. **Verify Database**:

```sql
SELECT id, status, paymentNote
FROM "Booking"
WHERE id = 'your_booking_id';
````

Expected:

- `status` = 'APPROVED' (unchanged)
- `paymentNote` = 'Payment Failed: [reason]'

5. **Verify Retry Option**:
   - On confirmation page, should see "Try Payment Again" button
   - Click button, should redirect to payment page
   - Payment page should still work

**Expected Result**: ✅ Booking remains APPROVED, user can retry payment

---

### Test 3: Hash Tampering Detection

**Objective**: Verify hash verification prevents fake payments

**Steps**:

1. Create and approve a booking

2. **Attempt Hash Tampering**:
   - Manually craft a URL with fake success parameters:

   ```
   http://localhost:3000/book/payment/return?status_id=1&order_id=BOOKING_ID&transaction_id=FAKE_123&msg=fake&hash=invalid_hash
   ```

3. **Verify Security**:
   - Monitor logs for: `❌ [PAYMENT RETURN] Invalid hash detected - possible tampering`
   - Should redirect to error page: `/book/confirm?error=invalid_payment_hash`
   - Database should NOT update to PAID

**Expected Result**: ✅ Tampering detected, payment rejected, booking unchanged

---

### Test 4: Idempotency (Double Processing)

**Objective**: Verify system handles duplicate callbacks gracefully

**Steps**:

1. Complete a successful payment (Test 1)

2. **Simulate Duplicate Callback**:
   - Use curl to send the same callback again:

   ```bash
   curl -X POST http://localhost:3000/api/payment/senangpay-callback \
     -d "status_id=1" \
     -d "order_id=BOOKING_ID" \
     -d "transaction_id=TXN_123" \
     -d "msg=Payment%20was%20successful" \
     -d "hash=VALID_HASH_FROM_FIRST_CALLBACK"
   ```

3. **Verify Idempotency**:
   - Monitor logs for: `✅ [SENANGPAY CALLBACK] Already processed (idempotent request)`
   - Should return 200 OK
   - Should NOT send duplicate webhooks or notifications
   - Database should remain unchanged

**Expected Result**: ✅ Duplicate callback acknowledged, no duplicate side effects

---

### Test 5: Race Condition (Return vs Callback)

**Objective**: Verify both handlers can run simultaneously without conflicts

**Steps**:

1. Create and approve a booking

2. **Monitor Both Handlers**:
   - Open two terminal windows with logs
   - Complete payment on Senang Pay

3. **Observe Timing**:
   - Return URL handler runs first (user redirect): ~500ms
   - Callback webhook runs second (server-to-server): ~1-2 seconds
   - OR callback might arrive first if user has slow connection

4. **Verify Idempotency**:
   - Whichever runs first updates booking to PAID
   - Whichever runs second sees idempotency check
   - Both should trigger side effects (but webhook service should deduplicate)
   - No database conflicts or errors

**Expected Result**: ✅ Both handlers work correctly regardless of order

---

### Test 6: Missing Parameters

**Objective**: Verify validation of required parameters

**Steps**:

1. **Test Return URL with Missing Param**:

   ```
   http://localhost:3000/book/payment/return?status_id=1&order_id=BOOKING_ID

   # Missing: transaction_id, msg, hash
   ```

2. **Verify Validation**:
   - Monitor logs for: `❌ [PAYMENT RETURN] Missing required parameters`
   - Should redirect to: `/book/confirm?error=invalid_payment_response`

3. **Test Callback with Missing Param**:

   ```bash
   curl -X POST http://localhost:3000/api/payment/senangpay-callback \
     -d "status_id=1" \
     -d "order_id=BOOKING_ID"
   # Missing: transaction_id, msg, hash
   ```

4. **Verify Error Handling**:
   - Monitor logs for: `❌ [SENANGPAY CALLBACK] Missing required fields`
   - Should return 400 Bad Request

**Expected Result**: ✅ Missing parameters detected and rejected

---

### Test 7: Gateway Configuration Check

**Objective**: Verify system detects missing configuration

**Steps**:

1. **Temporarily Remove Config**:

   ```bash
   # In .env.local, comment out:
   # SENANGPAY_MERCHANT_ID=...
   # SENANGPAY_SECRET_KEY=...
   ```

2. **Restart Dev Server**:

   ```bash
   npm run dev
   ```

3. **Attempt Payment**:
   - Navigate to payment page
   - Should see "Payment gateway is not properly configured" error
   - Should NOT see payment form

4. **Verify Callback Rejects**:

   ```bash
   curl -X POST http://localhost:3000/api/payment/senangpay-callback \
     -d "status_id=1&order_id=test&transaction_id=123&msg=test&hash=abc"
   ```

   - Should return 500 Internal Server Error
   - Log: `❌ [SENANGPAY CALLBACK] Gateway not configured`

5. **Restore Config** and restart server

**Expected Result**: ✅ Missing config detected, user sees clear error

---

### Test 8: Guest Booking Payment

**Objective**: Verify guest bookings can complete payment (no user account)

**Steps**:

1. **Create Guest Booking**:
   - Log out or use incognito mode
   - Create booking with guest email
   - Get booking approved

2. **Complete Payment** as guest (Test 1 steps)

3. **Verify Side Effects**:
   - Captain webhook should send (with guest name)
   - Angler notification should SKIP (no userId)
   - Log: `⏭️ [PAYMENT SIDE EFFECTS] Skipping angler notification - guest booking`

**Expected Result**: ✅ Guest payment works, no notification sent (only email)

---

### Test 9: Concurrent Bookings (Same Charter)

**Objective**: Verify availability check prevents double-booking

**Steps**:

1. **Create Two Bookings** for same charter, same date:
   - Booking A (User 1)
   - Booking B (User 2)
   - Both get approved by captain

2. **User 1 Completes Payment**:
   - Navigate to payment page
   - Complete payment
   - Booking A → PAID

3. **User 2 Attempts Payment**:
   - Navigate to payment page
   - Before clicking "Pay", check if availability check blocks it
   - Expected: Page should show "Date no longer available" screen

4. **If User 2 Already Clicked Pay**:
   - Senang Pay form loads
   - User completes payment
   - Return handler should check availability

   - Should see: `❌ [PAYMENT] Date no longer available - blocking payment`
   - Booking updated to EXPIRED with rejection reason
   - User sees error screen with alternative dates

**Expected Result**: ✅ Only one booking can be paid, second is blocked

---

## Monitoring & Debugging

### Log Files to Watch

**Dev Server Terminal**:

- Payment page loads
- Form submissions
- Return URL handler

- Callback webhook
- Side effects
- Errors

**ngrok Terminal**:

- HTTP requests from Senang Pay
- POST to callback URL

- Response status codes<http://127.0.0.1:4040>

### Common Issues & Solutions

#### Issue: ngrok URL not working

**Solution**:

- Check ngrok is running: `ngrok http 3000`
- Verify HTTPS URL (not HTTP)
- Update Senang Pay dashboard with correct ngrok URL
- Restart ngrok if URL expired (free tier URLs expire after 2 hours)

#### Issue: Callback webhook not receiving POST

**Solution**:

- Check ngrok web interface: <http://127.0.0.1:4040>
- Look for POST requests to `/api/payment/senangpay-callback`
- Verify Senang Pay dashboard has correct callback URL
- Check firewall isn't blocking ngrok

#### Issue: Hash verification fails

**Solution**:

- Verify `SENANGPAY_SECRET_KEY` matches Senang Pay dashboard
- Verify `SENANGPAY_MERCHANT_ID` matches Senang Pay dashboard
- Check logs for parameter order (must match: status_id, order_id, transaction_id, msg)
- Ensure no custom parameters in Senang Pay dashboard

#### Issue: Side effects not triggering

**Solution**:

- Check `CAPTAIN_WEBHOOK_URL` is set
- Check `CAPTAIN_API_SECRET` is set
- Verify captain app is running and reachable
- Check logs for side effects errors
- Verify user has `userId` (guest bookings skip notifications)

#### Issue: Mock payment still showing

**Solution**:

- Check `SENANGPAY_FORCE_MOCK` is NOT set in `.env.local`
- Verify `SENANGPAY_MERCHANT_ID` and `SENANGPAY_SECRET_KEY` are set
- Restart dev server after env changes

---

## Test Checklist

Before moving to Phase 9 (Production Deployment), verify:

- ✅ Successful payment updates booking to PAID
- ✅ Failed payment keeps booking APPROVED with retry option
- ✅ Hash tampering is detected and blocked
- ✅ Duplicate callbacks are idempotent (no duplicate side effects)
- ✅ Both return and callback handlers work (regardless of order)
- ✅ Missing parameters are rejected with proper errors
- ✅ Missing configuration shows clear error to users
- ✅ Guest bookings can complete payment
- ✅ Concurrent bookings prevented (availability check)
- ✅ Captain webhook sent successfully
- ✅ Angler notification created (authenticated users only)
- ✅ Pages revalidated (confirmation page shows fresh data)
- ✅ All logs show expected messages
- ✅ No errors in console or server logs
- ✅ Database updates correctly (status, paidAt, transactionId, method, note)

---

<https://app.senangpay.my/merchant/settings>

## Security Verification

**Critical Security Checks**:

1. ✅ Hash verification prevents tampering
2. ✅ No way to bypass payment (mock only in dev with force flag)
3. ✅ Authorization check (user owns booking or guest booking)
4. ✅ Availability check prevents race conditions
5. ✅ Idempotency prevents duplicate processing
6. ✅ All payment responses logged for audit trail
7. ✅ Sensitive data not exposed in logs (hash truncated)
8. ✅ HTTPS enforced (ngrok and production)

---

## After Testing

### 1. Revert Senang Pay Dashboard

Go to <https://app.senangpay.my/merchant/settings>

**Production URLs**:

- Return URL: `https://www.fishon.my/book/payment/return`
- Callback URL: `https://www.fishon.my/api/payment/senangpay-callback`

**Save Changes**

### 2. Stop ngrok

```bash
# Ctrl+C in ngrok terminal
```

### 3. Document Test Results

Create a test report documenting:

- Date/time of testing
- Test scenarios completed
- Any issues found and resolved<help@senangpay.my>
- Payment amounts used (for accounting)
- Screenshots of successful flows

### 4. Ready for Production Deployment (Phase 9)

Once all tests pass, proceed with Phase 9:

- Deploy to Vercel
- Verify production environment variables
- Test one small real payment on production
- Monitor logs for first few payments

---

## Support

If you encounter issues during testing:

1. Check logs first (dev server and ngrok)
2. Verify environment variables
3. Check Senang Pay dashboard configuration
4. Review this guide's troubleshooting section
5. Contact Senang Pay support: <help@senangpay.my> (for gateway issues)

---

**Next Steps**: After completing all test scenarios successfully, commit Phase 8 completion and proceed to Phase 9 (Production Deployment).
