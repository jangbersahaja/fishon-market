# Dual-Flow Payment System: Quick Reference

## Flow Decision Matrix

| Payment Method      | Flow Type | Money Movement          | Status After Creation             | Captain Approval Action        |
| ------------------- | --------- | ----------------------- | --------------------------------- | ------------------------------ |
| **CARD**            | TOKENIZED | Token stored, no charge | PAYMENT_PENDING                   | Charge token → PAID            |
| **FPX**             | DIRECT    | Charged immediately     | PAYMENT_PENDING → callback → PAID | Just confirm (already charged) |
| **EWALLET**         | DIRECT    | Charged immediately     | PAYMENT_PENDING → callback → PAID | Just confirm (already charged) |
| **MOCK** (dev only) | MOCK      | None                    | PAYMENT_PENDING                   | Mock approval → PAID           |

## API Endpoints

### 1. Create Booking (Authenticated)

**POST** `/api/bookings/create`

**Request Body**:

```typescript
{
  // Existing fields
  tripId: string;
  date: string; // YYYY-MM-DD
  days: number;
  adults: number;
  children: number;
  startTime?: string;
  note?: string;
  phone?: string;

  // NEW: Payment fields
  paymentMethod: "CARD" | "FPX" | "EWALLET" | "MOCK";

  // Required for CARD
  cardNumber?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  cardCvv?: string;
}
```

**Response** (TOKENIZED/MOCK):

```typescript
{
  booking: {
    id: string;
    status: "PAYMENT_PENDING";
    paymentMethod: "CARD" | "MOCK";
    paymentFlow: "TOKENIZED" | "MOCK";
    paymentIntentId: string; // Token ID
    paymentAuthorizedAt: string; // ISO timestamp
    // ... other booking fields
  }
}
```

**Response** (DIRECT):

```typescript
{
  booking: { /* ... */ },
  requiresRedirect: true,
  redirectUrl: string // Senang Pay gateway URL
}
```

### 2. Create Booking (Guest)

**POST** `/api/bookings/create-guest`

Same as authenticated, plus:

```typescript
{
  verificationToken: string; // From email verification
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  // ... payment fields same as authenticated
}
```

### 3. Payment Callback

**GET/POST** `/api/payment/callback`

**Query/Body Para(my)** (from Senang Pay):

```typescript
{
  status_id: "1" | "0"; // 1 = success, 0 = failed
  order_id: string; // "booking-{bookingId}"
  transaction_id: string; // Senang Pay transaction ID
  (my)g: string; // Status message
  hash: string; // HMAC-SHA256 signature
}
```

**Redirects**:

- Success: `/book/confirm?id={bookingId}&payment=success`
- Error: `/book/payment-error?error={message}`

## Client Integration

### Step 1: Collect Payment Method

```tsx
const [paymentMethod, setPaymentMethod] = useState<"CARD" | "FPX" | "EWALLET">(
  "CARD"
);
const [cardDetails, setCardDetails] = useState({
  number: "",
  cvv: "",
  expMonth: "",
  expYear: "",
});
```

### Step 2: Submit Booking

```typescript
const response = await fetch("/api/bookings/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tripId,
    date,
    days,
    adults,
    children,
    paymentMethod,
    ...(paymentMethod === "CARD"
      ? {
          cardNumber: cardDetails.number,
          cardExpMonth: cardDetails.expMonth,
          cardExpYear: cardDetails.expYear,
          cardCvv: cardDetails.cvv,
        }
      : {}),
  }),
});

const data = await response.json();
```

### Step 3: Handle Response

```typescript
if (data.requiresRedirect) {
  // DIRECT flow: Redirect to Senang Pay
  window.location.href = data.redirectUrl;
} else {
  // TOKENIZED/MOCK flow: Show confirmation
  router.push(`/book/confirm?id=${data.booking.id}`);
}
```

## Status Transitions

### TOKENIZED Flow (Card)

```
1. Create booking: status = PAYMENT_PENDING
   - paymentIntentId = token ID
   - paymentAuthorizedAt = now
   - paymentCapturedAt = null

2. Captain approves: capturePayment(tokenId)
   - status = PAID
   - paymentCapturedAt = now
   - paymentTransactionId = transaction ID

3. Captain rejects: releasePayment(tokenId)
   - status = REJECTED
   - paymentReleasedAt = now
   - (No charge, no refund)
```

### DIRECT Flow (FPX/E-wallet)

```
1. Create booking: status = PAYMENT_PENDING
   - paymentIntentId = booking ID
   - paymentAuthorizedAt = null

2. Angler redirects to Senang Pay: (no status change)

3. Angler completes payment: callback updates
   - status = PAID
   - paymentTransactionId = transaction ID
   - paymentCapturedAt = now

4. Captain approves: (no payment action)
   - Just update booking confirmation
   - Send notifications

5. Captain rejects: initiateRefund()
   - status = REJECTED
   - refundStatus = PROCESSING
   - refundTransactionId = refund transaction ID
```

## Database Queries

### Find Tokenized Bookings Pending Approval

```typescript
const tokenizedPending = await prisma.booking.findMany({
  where: {
    status: "PAYMENT_PENDING",
    paymentFlow: "TOKENIZED",
    expiresAt: { gt: new Date() }, // Not expired
  },
});
```

### Find Direct Bookings Awaiting Captain Decision

```typescript
const directPendingApproval = await prisma.booking.findMany({
  where: {
    status: "PAID", // Already charged
    paymentFlow: "DIRECT",
    captainDecisionAt: null, // No decision yet
    expiresAt: { gt: new Date() },
  },
});
```

### Find Expired Bookings Needing Refund

```typescript
const expiredDirect = await prisma.booking.findMany({
  where: {
    status: "PAID",
    paymentFlow: "DIRECT",
    captainDecisionAt: null,
    expiresAt: { lt: new Date() }, // Expired
    refundStatus: null, // Not yet refunded
  },
});
```

## Error Codes

### 400 Bad Request

- Invalid payment method
- Card details missing (CARD payment)
- Invalid card format
- MOCK payment in production

### 401 Unauthorized

- Verification token missing/invalid (guest booking)

### 404 Not Found

- Trip not found
- User not found

### 409 Conflict

- Date/time already booked
- Unique constraint violation

### 429 Too Many Requests

- Guest booking rate limit exceeded (2/hour)

### 500 Internal Server Error

- Payment gateway error
- Database error
- Webhook delivery failure (non-blocking)

## Environment Variables

### Required

```env
# Senang Pay
SENANGPAY_MERCHANT_ID=123456
SENANGPAY_SECRET_KEY=your_secret_key
SENANGPAY_MODE=production  # or "sandbox"

# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://fishon.my

# Base URL (for callback redirect)
NEXT_PUBLIC_BASE_URL=https://fishon.my
```

### Optional

```env
# Captain webhook
CAPTAIN_WEBHOOK_URL=https://captain.fishon.my/api/webhooks
CAPTAIN_API_SECRET=your_secret

# Development only
SENANGPAY_FORCE_MOCK=true  # Force mock payments (dev only)
```

## Testing Commands

### Mock Payment (Development)

```bash
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "trip-123",
    "date": "2025-02-15",
    "days": 1,
    "adults": 2,
    "children": 0,
    "paymentMethod": "MOCK"
  }'
```

### Card Payment

```bash
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "trip-123",
    "date": "2025-02-15",
    "days": 1,
    "adults": 2,
    "paymentMethod": "CARD",
    "cardNumber": "4111111111111111",
    "cardExpMonth": "12",
    "cardExpYear": "2025",
    "cardCvv": "123"
  }'
```

### Simulate Callback (Success)

```bash
# Calculate hash: HMAC-SHA256(secretKey + statusId + orderId + transactionId + (my)g)
curl "http://localhost:3000/api/payment/callback?status_id=1&order_id=booking-abc123&transaction_id=TXN123&(my)g=Payment+Success&hash=calculated_hash"
```

## Monitoring Queries

### Payment Success Rate (Last 24h)

```sql
SELECT
  payment_method,
  payment_flow,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid,
  ROUND(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM booking
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND payment_method IS NOT NULL
GROUP BY payment_method, payment_flow;
```

### Failed Tokenizations (Last 24h)

```sql
SELECT COUNT(*) as failed_tokens
FROM booking
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND payment_method = 'CARD'
  AND payment_intent_id IS NULL
  AND status != 'PAID';
```

### Callback Processing Times

```sql
-- Track time between booking creation and payment capture (DIRECT flow)
SELECT
  AVG(EXTRACT(EPOCH FROM (payment_captured_at - created_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (payment_captured_at - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (payment_captured_at - created_at))) as max_seconds
FROM booking
WHERE payment_flow = 'DIRECT'
  AND payment_captured_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting

### Issue: "Invalid payment hash"

- **Cause**: Hash mismatch in callback
- **Check**: Verify `SENANGPAY_SECRET_KEY` is correct
- **Solution**: Regenerate hash or update secret key

### Issue: "Payment gateway error"

- **Cause**: Senang Pay API failure
- **Check**: API credentials, network connectivity
- **Solution**: Retry payment or contact Senang Pay support

### Issue: "Booking not found" (callback)

- **Cause**: order_id doesn't match any booking
- **Check**: Order ID format ("booking-{id}")
- **Solution**: Verify booking exists before payment

### Issue: Duplicate callbacks

- **Cause**: Senang Pay sends multiple callbacks
- **Solution**: Idempotency check already implemented (no action needed)

### Issue: Token expired (TOKENIZED)

- **Cause**: Booking expired before captain approval
- **Solution**: Run expiration handler to release token

## Support Contacts

- **Senang Pay Support**: support@senangpay.my
- **Documentation**: https://app.senangpay.my/docs
- **API Issues**: Check `/api/payment/callback` logs
- **Database Issues**: Check Neon PostgreSQL dashboard
