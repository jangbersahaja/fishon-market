# Automated Booking Status Updates

This system automatically updates booking statuses using a scheduled cron job.

## Status Transitions

### 1. PENDING → EXPIRED

- **Trigger**: When `expiresAt` timestamp has passed
- **Purpose**: Auto-cancel bookings that weren't approved within 12 hours
- **Check frequency**: Every 15 minutes

### 2. PAID → COMPLETED

- **Trigger**: When trip end time has passed
- **Calculation**: `tripEndTime = date + startTime + (days × 8 hours)`
- **Purpose**: Mark trips as completed for review collection
- **Check frequency**: Every 15 minutes

## Setup

### 1. Environment Variables

Add to `.env`:

```bash
CRON_SECRET="your-random-secret-here"
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### 2. Vercel Cron (Production)

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-booking-status",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Schedule**: Runs every 15 minutes

**Vercel automatically**:

- Sets the `Authorization: Bearer ${CRON_SECRET}` header
- Calls the endpoint on schedule
- Handles retries and monitoring

### 3. Manual Testing

Test the cron job locally or in staging:

```bash
# With authentication
curl -X POST http://localhost:3001/api/cron/update-booking-status \
  -H "Authorization: Bearer your-cron-secret"

# Response:
{
  "success": true,
  "timestamp": "2025-10-27T15:30:00.000Z",
  "results": {
    "expired": { "updated": 2, "errors": 0 },
    "completed": { "updated": 1, "errors": 0 }
  }
}
```

## How It Works

### Job Flow

1. **Cron triggers** `/api/cron/update-booking-status`
2. **Authentication** verifies `CRON_SECRET`
3. **Run updaters**:
   - `updateExpiredBookings()` - Find PENDING bookings past `expiresAt`
   - `updateCompletedBookings()` - Find PAID bookings past trip end time
4. **Update database** - Batch update booking statuses
5. **Return results** - Count of updated/failed bookings

### Timezone Handling

All time calculations use **Malaysian time (MYT/UTC+8)**:

```typescript
function getMalaysianTime(): Date {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
  );
}
```

### Trip End Calculation

```typescript
tripStartTime = date + startTime  // e.g., "2025-10-27 08:00"
tripDuration = days × 8 hours     // e.g., 1 day × 8h = 8 hours
tripEndTime = tripStartTime + tripDuration  // "2025-10-27 16:00"
```

## Monitoring

### Logs

Check Vercel logs for cron execution:

```
🚀 Starting booking status update job...
🔄 Found 2 expired PENDING bookings
✅ Updated booking abc123 to EXPIRED
✅ Updated booking def456 to EXPIRED
🔄 Checking 15 PAID bookings for completion
✅ Updated booking ghi789 to COMPLETED (ended at 2025-10-27T08:00:00.000Z)
✅ Booking status update completed in 245(my)
```

### Metrics

```json
{
  "expired": {
    "updated": 2, // Successfully updated
    "errors": 0 // Failed updates
  },
  "completed": {
    "updated": 1,
    "errors": 0
  }
}
```

## Fallback Behavior

Even without the cron job, the UI will still work:

- `isTripCompleted()` checks COMPLETED status **first**
- Falls back to calculating trip end time if status is still PAID
- This ensures smooth UX during cron deployment/issues

## Security

### API Protection

1. **Production**: Requires `Authorization: Bearer ${CRON_SECRET}` header
2. **Development**: No auth required for easier testing
3. **Vercel Cron**: Automatically includes correct auth header

### Best Practices

- ✅ Use a strong random CRON_SECRET
- ✅ Keep CRON_SECRET in Vercel environment variables
- ✅ Never commit CRON_SECRET to git
- ✅ Rotate secret periodically

## Troubleshooting

### Bookings not auto-updating

1. **Check Vercel Cron logs**:

   - Go to Vercel Dashboard → Project → Cron
   - Verify job is running every 15 minutes

2. **Verify CRON_SECRET**:

   ```bash
   # Check environment variable is set
   echo $CRON_SECRET
   ```

3. **Test manually**:

   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/update-booking-status \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

4. **Check job duration**:
   - Ensure job completes within 60 seconds (maxDuration limit)
   - Large batch? Consider pagination

### Timezone issues

Check debug logs for time calculations:

```javascript
{
  now: "2025-10-27T15:30:00.000Z",
  nowMYT: "27/10/2025, 11:30:00 pm",  // Should match Malaysian time
  tripEndTime: "2025-10-27T08:00:00.000Z",
  tripEndTimeMYT: "27/10/2025, 4:00:00 pm"
}
```

If times are wrong, server timezone might be incorrect.

## Future Improvements

- [ ] Email notifications when bookings expire
- [ ] Webhook to captain app when bookings complete
- [ ] Metrics dashboard for cron job health
- [ ] Batch processing for large datasets
- [ ] Retry logic for failed updates
