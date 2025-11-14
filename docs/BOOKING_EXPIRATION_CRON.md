# Booking Expiration Cron Job

## Overview

The expiration cron job automatically processes bookings that have exceeded their 12-hour hold period without captain approval. This ensures timely release of payment authorizations and refunds.

## Schedule

- **Frequency**: Every 15 minutes (`*/15 * * * *`)
- **Endpoint**: `POST /api/cron/expire-bookings`
- **Timeout**: 60 seconds (configured via `maxDuration`)
- **Batch Size**: 50 bookings per run

## Logic Flow

### 1. Find Expired Bookings

```sql
SELECT * FROM Booking
WHERE status = 'PAYMENT_PENDING'
  AND expiresAt < NOW()
LIMIT 50
```

### 2. Process Payment by Flow

#### TOKENIZED Flow (Card)

- **Action**: Release card token via `releasePayment()`
- **Result**: No charge to customer
- **Update**: Set `paymentReleasedAt` timestamp
- **Notification**: "Your card was not charged"

#### DIRECT Flow (FPX/E-wallet)

- **Action**: Initiate FULL refund via `initiateRefund()`
- **Result**: 100% refund to customer
- **Update**: Set `refundStatus = 'PENDING'`, `refundAmount = finalPrice`
- **Notification**: "Full refund of RM{amount} will be processed within 3-5 business days"

### 3. Update Booking Status

- Set `status = 'REJECTED'`
- Set `rejectionReason = "Booking expired - captain did not respond within 12 hours"`
- Set `captainDecisionAt = NOW()`

### 4. Send Notifications

- **Angler**: In-app notification with payment outcome
- **Captain App**: Webhook notification (`booking.expired`)

### 5. Track Analytics

- `PAYMENT_RELEASED` (TOKENIZED flow)
- `PAYMENT_REFUNDED` (DIRECT flow)

## Authentication

The cron job is protected by the `CRON_SECRET` environment variable:

```bash
# .env
CRON_SECRET=your-secure-random-secret-here
```

Vercel automatically adds the correct `Authorization: Bearer {CRON_SECRET}` header when calling cron endpoints.

## Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X POST https://your-domain.com/api/cron/expire-bookings \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or check the count of expired bookings:

```bash
curl https://your-domain.com/api/cron/expire-bookings
```

## Monitoring

### Success Response

```json
{
  "ok": true,
  "expired": 5,
  "success": 5,
  "failed": 0
}
```

### Partial Failure Response

```json
{
  "ok": true,
  "expired": 5,
  "success": 4,
  "failed": 1,
  "failures": [
    {
      "id": "booking_123",
      "error": "Payment gateway timeout"
    }
  ]
}
```

### Error Response

```json
{
  "error": "Failed to process expired bookings",
  "details": "Database connection failed"
}
```

## Edge Cases

### No Expired Bookings

- Returns `{ ok: true, expired: 0, message: "No expired bookings found" }`
- Normal operation, no action required

### Payment Gateway Failure

- Individual booking failure is logged but doesn't stop batch processing
- Failed bookings are included in `failures` array
- Booking remains in PAYMENT_PENDING state and will be retried on next run

### Webhook Failure

- Non-blocking operation (async)
- Logged but doesn't affect booking status update
- Captain app may miss notification but will see updated status on next sync

### Notification Failure

- Non-blocking operation (async)
- Logged but doesn't affect booking status update
- Angler may miss notification but will see updated status in dashboard

## Performance Considerations

### Batch Processing

- Processes 50 bookings per run to avoid timeout
- If >50 expired bookings exist, next run will process remaining
- 15-minute interval ensures timely processing even with backlog

### Database Load

- Single query with indexed fields (`status`, `expiresAt`)
- Individual updates per booking (no batch update due to payment processing)
- Async operations (notifications, webhooks) don't block main flow

### Payment Gateway Load

- Sequential processing to avoid rate limits
- Each booking waits for payment operation to complete
- 60-second timeout allows ~10-15 bookings with payment operations

## Configuration

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Environment Variables

- `CRON_SECRET`: Authentication secret (required)
- `CAPTAIN_WEBHOOK_URL`: Captain app webhook endpoint (optional)
- `CAPTAIN_API_SECRET`: Captain app webhook secret (optional)

## Troubleshooting

### Cron Job Not Running

1. Check Vercel dashboard → Cron Jobs section
2. Verify `CRON_SECRET` is set in environment variables
3. Check deployment logs for cron trigger events

### Bookings Not Expiring

1. Check `expiresAt` values in database (should be 12 hours after creation)
2. Verify booking creation endpoints set `expiresAt` correctly
3. Run manual trigger to test endpoint functionality

### Payment Operations Failing

1. Check payment gateway credentials and connectivity
2. Review logs for specific error messages
3. Verify `paymentIntentId` is valid and not already processed

### Refund Not Processing

1. Check `refund-service.ts` logs for detailed error
2. Verify payment gateway supports refunds for the payment method
3. Ensure `finalPrice` is valid and refund hasn't already been processed

## Future Enhancements

- [ ] Add retry logic for failed payment operations
- [ ] Implement dead letter queue for permanently failed bookings
- [ ] Add monitoring alerts for high failure rates
- [ ] Create dashboard for viewing expired booking statistics
- [ ] Add email notifications in addition to in-app notifications
