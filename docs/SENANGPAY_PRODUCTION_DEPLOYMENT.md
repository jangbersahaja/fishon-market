# Phase 9: Production Deployment Checklist

## Pre-Deployment Verification

### 1. Verify Environment Variables in Vercel

Go to your Vercel project: <https://vercel.com/jangbersahaja/fishon-market/settings/environment-variables>

**Required Senang Pay Variables:**

| Variable                | Value            | Notes                     |
| ----------------------- | ---------------- | ------------------------- |
| `SENANGPAY_MERCHANT_ID` | Your merchant ID | From Senang Pay dashboard |
| `SENANGPAY_SECRET_KEY`  | Your secret key  | From Senang Pay dashboard |
| `SENANGPAY_MODE`        | `production`     | Must be "production"      |

**DO NOT set these in production:**

- ❌ `SENANGPAY_FORCE_MOCK` - Remove or set to empty (this would bypass real payments!)

**Captain Webhook Variables (for side effects):**

- `CAPTAIN_WEBHOOK_URL` - Should be: `https://captain.fishon.my/api/webhooks/market`
- `CAPTAIN_API_SECRET` - Your captain webhook secret

---

### 2. Verify Senang Pay Dashboard Configuration

Go to: <https://app.senangpay.my/merchant/settings>

**Confirm these URLs are set:**

| Field            | Production Value                                       |
| ---------------- | ------------------------------------------------------ |
| **Return URL**   | `https://www.fishon.my/book/payment/return`            |
| **Callback URL** | `https://www.fishon.my/api/payment/senangpay-callback` |
| **Parameters**   | _(Leave empty - use defaults)_                         |
| **Refund URL**   | _(Leave empty - not implemented)_                      |

✅ URLs must use HTTPS
✅ No trailing slashes
✅ Domain is `www.fishon.my`

---

### 3. Code Review Checklist

**Before deploying, verify:**

- [ ] All code committed to main branch
- [ ] No `SENANGPAY_FORCE_MOCK=1` in production env
- [ ] Hash verification enabled in both handlers (return + callback)
- [ ] Idempotency checks in place
- [ ] Side effects function (`triggerPaymentSideEffects`) used consistently
- [ ] Error handling for all payment states (success, failure, missing para(my))
- [ ] Availability check prevents race conditions
- [ ] All 87 tests passing
- [ ] TypeScript compiles without errors
- [ ] No ESLint errors

---

## Deployment Steps

### Step 1: Push to Main Branch

```bash
# Ensure you're on the correct branch
git status

# Commit all Phase 1-8 changes if not already committed
git add .
git commit -m "feat: complete Senang Pay payment gateway integration (Phases 1-8)"

# Push to main
git push origin main
```

### Step 2: Deploy to Vercel

**Option A: Auto-deploy (if configured)**

- Push to main triggers automatic deployment
- Watch Vercel dashboard for build progress

**Option B: Manual deploy**

```bash
vercel --prod
```

### Step 3: Verify Deployment

Once deployed, check:

1. **Build Status**: Visit Vercel dashboard, ensure build succeeded
2. **Environment Variables**: Verify all Senang Pay variables are set
3. **Domain**: Confirm deployment is live at <https://www.fishon.my>

---

## Post-Deployment Testing

### Test 1: Configuration Check (No Payment)

**Objective**: Verify payment gateway is configured correctly

**Steps:**

1. Go to <https://www.fishon.my>
2. Create a booking (or use existing approved booking)
3. Navigate to payment page: `/book/payment/{bookingId}`
4. **Verify**: Should see Senang Pay payment form (NOT mock payment)
5. **Do NOT complete payment yet** - just verify the form loads

**Expected**:

- ✅ Senang Pay form displays
- ✅ Amount is correct
- ✅ "Pay with Senang Pay" button visible
- ❌ NO "Mock Payment" warning banner

**If you see mock payment warning:**

- Check Vercel env vars: `SENANGPAY_MERCHANT_ID` and `SENANGPAY_SECRET_KEY` are set
- Check `SENANGPAY_FORCE_MOCK` is NOT set
- Redeploy if needed

---

### Test 2: Small Real Payment (RM 1.00)

**Objective**: End-to-end validation with minimal financial risk

**Preparation:**

1. Create a test charter with RM 1.00 price (or create booking and manually adjust in DB)
2. Get booking approved
3. Have payment method ready (FPX or credit card)

**Steps:**

1. **Navigate to payment page**:
   - Go to `/book/payment/{bookingId}`
   - Verify amount is RM 1.00

2. **Complete payment**:
   - Click "Pay with Senang Pay"
   - You'll be redirected to Senang Pay's payment page
   - Complete payment with real payment method

3. **Monitor logs** (Vercel dashboard → Logs):

   ```
   🔙 [PAYMENT RETURN] User returned from Senang Pay
   ✅ [PAYMENT RETURN] Hash verified successfully
   ✅ [PAYMENT RETURN] Booking updated to PAID
   📥 [SENANGPAY CALLBACK] Received callback
   ✅ [SENANGPAY CALLBACK] Hash verified successfully
   ✨ [PAYMENT SIDE EFFECTS] Starting (source: return)
   📤 [PAYMENT SIDE EFFECTS] Sending captain webhook
   ✅ [PAYMENT SIDE EFFECTS] Captain webhook sent successfully
   ✅ [PAYMENT SIDE EFFECTS] Angler notification created
   ```

4. **Verify UI**:
   - Should redirect to confirmation page
   - Should see green "Payment Successful!" banner
   - Booking details should show "PAID" status

5. **Verify database**:

   ```sql
   SELECT id, status, paidAt, paymentTransactionId, paymentMethod, paymentNote
   FROM "Booking"
   WHERE id = 'your_booking_id';
   ```

   Expected:
   - `status` = 'PAID'
   - `paidAt` = timestamp
   - `paymentTransactionId` = Senang Pay transaction ID (e.g., "TXN123456")
   - `paymentMethod` = 'SENANGPAY'
   - `paymentNote` = 'Payment was successful'

6. **Verify captain app**:
   - Log into <https://captain.fishon.my>
   - Check if booking shows as PAID
   - Captain should have received webhook notification

7. **Verify angler notification** (if authenticated booking):
   - Log into fishon.my as the angler
   - Check notifications (bell icon)
   - Should see "Payment Confirmed! ✅" notification

**Expected Result**: ✅ Payment completes successfully, all syste(my) updated

**If test fails, check:**

- Vercel logs for errors
- Database for booking status
- Senang Pay dashboard for transaction record
- Environment variables are correct

---

### Test 3: Failed Payment (Optional but Recommended)

**Objective**: Verify graceful handling of payment failures

**Steps:**

1. Create another test booking (RM 1.00)
2. Navigate to payment page
3. Click "Pay with Senang Pay"
4. On Senang Pay page, click "Cancel" or "Back to Merchant"

**Verify:**

- Should redirect to confirmation page
- Should see red "Payment Failed" banner
- Should see "Try Payment Again" button (if booking still APPROVED)
- Booking status should remain APPROVED (not PAID)
- `paymentNote` should contain failure reason

**Expected**: ✅ Failure handled gracefully, user can retry

---

## Production Validation Checklist

After successful test payment, verify:

### Database

- [x] Booking status = PAID
- [x] paidAt timestamp set
- [x] paymentTransactionId populated
- [x] paymentMethod = 'SENANGPAY'
- [x] paymentNote contains success message

### UI/UX

- [x] Confirmation page shows success banner
- [x] Booking details show PAID status
- [x] No errors in browser console
- [x] Payment page shows Senang Pay form (not mock)

### Side Effects

- [x] Captain webhook sent successfully
- [x] Captain app shows booking as PAID
- [x] Angler notification created (if authenticated)
- [x] Pages revalidated (fresh data on refresh)

### Logs

- [x] Return handler logged payment
- [x] Callback webhook logged payment
- [x] Hash verification passed both times
- [x] Side effects completed successfully
- [x] No errors in Vercel logs

### Security

- [x] Hash verification working (prevents tampering)
- [x] No mock payment bypass available
- [x] Idempotency working (duplicate callbacks handled)
- [x] Authorization checks in place

---

## Monitoring Setup

### Vercel Dashboard

1. **Set up alerts** for errors:
   - Go to Vercel project → Monitoring
   - Enable error notifications
   - Set threshold (e.g., notify if >5 errors in 5 minutes)

2. **Watch key endpoints**:
   - `/api/payment/senangpay-callback` - Server-to-server webhook
   - `/book/payment/return` - User return handler
   - `/book/payment/[bookingId]` - Payment page

### Captain App

1. **Monitor webhook logs**:
   - Check captain app logs for `booking.paid` events
   - Verify webhooks arriving and processing correctly

2. **Set up alerts** (if not already):
   - Notify captain when payments received
   - Alert if webhook failures detected

### Database Monitoring

**Key metrics to track:**

- Payment success rate (PAID / (PAID + APPROVED))
- Average payment time (booking creation → payment)
- Payment method distribution (SENANGPAY)
- Failed payments (paymentNote contains "Failed")

**Query for monitoring:**

```sql
-- Payment success rate (last 30 days)
SELECT
  COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
  COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
  COUNT(*) as total_bookings,
  ROUND(COUNT(CASE WHEN status = 'PAID' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as success_rate
FROM "Booking"
WHERE "createdAt" > NOW() - INTERVAL '30 days';

-- Recent payments
SELECT id, status, paidAt, paymentMethod, paymentTransactionId, "finalPrice"
FROM "Booking"
WHERE status = 'PAID'
ORDER BY paidAt DESC
LIMIT 10;
```

---

## Troubleshooting Production Issues

### Issue: Mock payment still showing

**Sympto(my)**: Payment page shows "Development Mode - Mock Payment" banner

**Causes**:

1. `SENANGPAY_FORCE_MOCK=1` set in Vercel env
2. Missing `SENANGPAY_MERCHANT_ID` or `SENANGPAY_SECRET_KEY`

**Fix**:

```bash
# Remove SENANGPAY_FORCE_MOCK from Vercel env
# Verify SENANGPAY_MERCHANT_ID and SENANGPAY_SECRET_KEY are set
# Redeploy
vercel --prod
```

---

### Issue: Hash verification fails

**Sympto(my)**: Logs show "Invalid hash detected"

**Causes**:

1. `SENANGPAY_SECRET_KEY` doesn't match Senang Pay dashboard
2. `SENANGPAY_MERCHANT_ID` doesn't match Senang Pay dashboard
3. Custom parameters set in Senang Pay dashboard

**Fix**:

1. Verify env vars match Senang Pay dashboard exactly
2. Check Senang Pay dashboard "Parameters" field is empty
3. Redeploy if env vars changed

---

### Issue: Callback webhook not arriving

**Sympto(my)**: Return handler works, but callback never arrives

**Causes**:

1. Callback URL incorrect in Senang Pay dashboard
2. Vercel deployment failed for that route
3. Firewall blocking Senang Pay's servers

**Fix**:

1. Verify callback URL: `https://www.fishon.my/api/payment/senangpay-callback`
2. Test manually: `curl -X POST https://www.fishon.my/api/payment/senangpay-callback`
3. Check Vercel logs for incoming POST requests
4. Contact Senang Pay if webhooks consistently fail

---

### Issue: Side effects not triggering

**Sympto(my)**: Payment succeeds, but captain webhook or notification missing

**Causes**:

1. `CAPTAIN_WEBHOOK_URL` not set in Vercel
2. `CAPTAIN_API_SECRET` not set in Vercel
3. Captain app is down
4. Network issue between Vercel and captain app

**Fix**:

1. Verify env vars: `CAPTAIN_WEBHOOK_URL`, `CAPTAIN_API_SECRET`
2. Test captain webhook manually: `curl` to webhook URL
3. Check Vercel logs for webhook errors
4. Check captain app logs for incoming webhooks

---

## Rollback Plan

If critical issues found after deployment:

### Option 1: Quick Fix (If Code Issue)

```bash
# Fix the issue in code
git add .
git commit -m "fix: critical payment issue"
git push origin main
# Wait for auto-deploy or: vercel --prod
```

### Option 2: Revert Deployment (If Major Issues)

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback in Vercel dashboard:
# Go to Deployments → Previous deployment → "Promote to Production"
```

### Option 3: Emergency Disable (If Security Issue)

```bash
# Set force mock in Vercel to disable real payments
# Vercel dashboard → Environment Variables
# Add: SENANGPAY_FORCE_MOCK=1
# Redeploy
```

**Important**: If you disable payments, notify users via announcement banner!

---

## Success Criteria

Phase 9 is complete when:

- [x] Code deployed to production (<https://www.fishon.my>)
- [x] All environment variables configured correctly
- [x] Senang Pay dashboard configured with production URLs
- [x] Test payment (RM 1.00) completes successfully
- [x] Database updated correctly (status, transaction ID, etc.)
- [x] Captain webhook sent and received
- [x] Angler notification created
- [x] No errors in Vercel logs
- [x] Payment page shows Senang Pay form (not mock)
- [x] Failed payment test passed (if optional test run)
- [x] Monitoring alerts configured

---

## Post-Deployment Actions

### 1. Document First Payment

Create a record of the test payment:

- Date/time
- Booking ID
- Transaction ID
- Amount (RM 1.00)
- Result (success/failure)
- Screenshots

### 2. Notify Stakeholders

Inform relevant parties:

- Payment gateway is live
- Test payment completed successfully
- Ready for real customer payments
- Monitoring in place

### 3. Monitor Closely (First 48 Hours)

- Check Vercel logs frequently
- Monitor Senang Pay dashboard for transactions
- Watch for any error patterns
- Be ready to rollback if issues arise

### 4. Customer Communication

Consider adding announcement:

- "Secure online payment now available"
- "Pay with FPX or credit card"
- Link to payment help/FAQ

---

## Next Phase Preview

**Phase 10: Monitoring** will add:

- Automated error alerts
- Payment success/failure dashboard
- Webhook failure tracking
- Performance metrics
- User feedback collection

---

**Ready to deploy?** Follow the checklist above and complete the test payment!
