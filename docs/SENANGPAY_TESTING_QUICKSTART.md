# Senang Pay Testing - Quick Start

## 🚀 Fast Setup (5 minutes)

### 1. Start Dev Server

```bash
cd /Users/jangbersahaja/Website/fishon-market
npm run dev
```

### 2. Start ngrok

```bash
# New terminal
ngrok http 3000
```

Copy the HTTPS URL: `https://abc123xyz.ngrok-free.app`

### 3. Update Senang Pay Dashboard

Go to: https://app.senangpay.my/merchant/settings

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Return URL   | `https://abc123xyz.ngrok-free.app/book/payment/return`            |
| Callback URL | `https://abc123xyz.ngrok-free.app/api/payment/senangpay-callback` |

Replace `abc123xyz` with your ngrok ID. **Save**.

---

## ✅ Essential Tests (30 minutes)

### Test 1: Happy Path ✨

1. Create booking → Get approval → Go to payment page
2. Pay with Senang Pay (use small amount: RM 1.00)
3. **Watch logs** for:
   - ✅ Return handler: Hash verified, booking updated
   - ✅ Callback webhook: Hash verified, idempotency check
   - ✅ Side effects: Captain webhook sent, angler notified
4. **Check database**: status=PAID, paidAt set, transactionId present
5. **Check captain app**: Booking shows PAID status

**Expected**: Payment succeeds, all side effects trigger

---

### Test 2: Failed Payment 🚫

1. Create booking → Get approval → Go to payment page
2. Click "Cancel" on Senang Pay page
3. **Watch logs** for: Payment failed, note recorded
4. **Check UI**: Red "Payment Failed" banner with retry button
5. **Check database**: status=APPROVED (unchanged), paymentNote has failure reason

**Expected**: Booking stays APPROVED, user can retry

---

### Test 3: Security 🔒

1. Create booking
2. **Manually craft fake success URL**:
   ```
   http://localhost:3000/book/payment/return?status_id=1&order_id=YOUR_BOOKING_ID&transaction_id=fake&(my)g=test&hash=invalid
   ```
3. **Watch logs** for: Invalid hash detected - tampering
4. **Check database**: status unchanged (not PAID)

**Expected**: Tampering detected and blocked

---

### Test 4: Guest Booking 👤

1. **Log out** or use incognito
2. Create booking with guest email → Get approval
3. Complete payment
4. **Watch logs** for: "Skipping angler notification - guest booking"
5. **Check database**: status=PAID

**Expected**: Payment works, no notification (guests get email instead)

---

## 🔍 Log Monitoring

Watch for these key log messages:

**✅ Success Indicators:**

```
🔙 [PAYMENT RETURN] User returned from Senang Pay
✅ [PAYMENT RETURN] Hash verified successfully
✅ [PAYMENT RETURN] Booking updated to PAID
📥 [SENANGPAY CALLBACK] Received callback
✅ [SENANGPAY CALLBACK] Hash verified successfully
✨ [PAYMENT SIDE EFFECTS] Starting
📤 [PAYMENT SIDE EFFECTS] Sending captain webhook
✅ [PAYMENT SIDE EFFECTS] Captain webhook sent successfully
✅ [PAYMENT SIDE EFFECTS] Angler notification created
✅ [PAYMENT SIDE EFFECTS] Pages revalidated successfully
```

**❌ Error Indicators:**

```
❌ [PAYMENT RETURN] Invalid hash detected - possible tampering
❌ [PAYMENT RETURN] Missing required parameters
❌ [SENANGPAY CALLBACK] Gateway not configured
❌ [PAYMENT SIDE EFFECTS] Failed to send captain webhook
```

---

## 🐛 Quick Troubleshooting

**Callback not arriving?**

- Check ngrok is running: `ngrok http 3000`
- Open ngrok inspector: http://127.0.0.1:4040
- Verify Senang Pay callback URL is correct

**Hash verification fails?**

- Verify `SENANGPAY_SECRET_KEY` in `.env.local` matches Senang Pay dashboard
- Verify `SENANGPAY_MERCHANT_ID` matches

**Mock payment still shows?**

- Remove `SENANGPAY_FORCE_MOCK=1` from `.env.local`
- Restart dev server

**Side effects not triggering?**

- Check `CAPTAIN_WEBHOOK_URL` is set
- Check captain app is running

---

## 🔄 After Testing

### Revert Senang Pay Dashboard to Production

| Field        | Production Value                                       |
| ------------ | ------------------------------------------------------ |
| Return URL   | `https://www.fishon.my/book/payment/return`            |
| Callback URL | `https://www.fishon.my/api/payment/senangpay-callback` |

**Save** and you're ready for Phase 9!

---

## 📊 Test Checklist

Before Phase 9, verify:

- [ ] Successful payment works (booking → PAID)
- [ ] Failed payment works (booking stays APPROVED)
- [ ] Hash tampering is blocked
- [ ] Guest bookings can pay
- [ ] Captain webhook sent
- [ ] Angler notification created (auth users only)
- [ ] All logs show expected messages
- [ ] No errors in console

---

**Need detailed instructions?** See `docs/SENANGPAY_TESTING_GUIDE.md`

**Ready?** Start with Test 1 (Happy Path) and work through the checklist!
