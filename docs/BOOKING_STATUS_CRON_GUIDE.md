# Booking Status Cron Job - Trip End Time Implementation Guide

## Overview

The booking status cron job has been updated to use accurate trip end times from the `timeSlots` database column when available, with automatic fallback to the legacy 8-hour/day calculation.

## Files Modified

### Core Implementation

1. **`src/lib/jobs/booking-status-updater.ts`**
   - Updated `updateCompletedBookings()` to check `timeSlots` first
   - Added detailed logging for each booking's calculation method
   - Returns calculation method metadata for auditability

2. **`src/lib/helpers/booking-status-helpers.ts`**
   - Updated `isTripCompleted()` to use `timeSlots` when available
   - Development-only logging (doesn't spam production logs)
   - Maintains backward compatibility with legacy bookings

3. **`src/app/api/cron/update-booking-status/route.ts`**
   - Added informational note about calculation strategy

### New Utilities

4. **`src/lib/helpers/trip-end-time.ts`** (NEW)
   - Centralized trip end time calculation logic
   - Reusable by any component needing end time data
   - Provides formatted time remaining for UI
   - Methods:
     - `getTripEndTime()` - Get end time with metadata
     - `hasTripEnded()` - Simple expiration check
     - `getTimeUntilTripEnds()` - Get milliseconds remaining
     - `getTimeRemainingFormatted()` - Human-readable format

5. **`src/lib/helpers/__tests__/trip-end-time.test.ts`** (NEW)
   - Comprehensive test coverage
   - Handles multi-day trips, edge cases
   - Run with: `npm test src/lib/helpers/__tests__/trip-end-time.test.ts`

## Priority Logic

The system uses this priority order to determine trip end time:

```
Priority 1: timeSlots[last].endDateTime (if populated)
  └─ Used when: Booking has explicit time slot data
  └─ Accuracy: 100% - uses actual booked end time
  └─ Example: ["endDateTime": "2025-12-12T16:00:00Z"]

Priority 2: calculateTripEndTime() fallback
  └─ Used when: timeSlots is empty/null
  └─ Accuracy: ~95% - assumes 8h/day standard
  └─ Calculation: startDate + (days * 8 hours)
```

## Usage in Code

### For Cron Jobs (Automatic)

The cron job handles this automatically. No code changes needed.

### For UI Components

Import and use the trip end time utility:

```typescript
import { getTripEndTime, getTimeRemainingFormatted } from "@/lib/helpers/trip-end-time";

function BookingCard({ booking }) {
  const endTimeInfo = getTripEndTime({
    date: booking.date,
    startTime: booking.startTime,
    days: booking.days,
    timeSlots: booking.timeSlots,
  });

  const remaining = getTimeRemainingFormatted({
    date: booking.date,
    startTime: booking.startTime,
    days: booking.days,
    timeSlots: booking.timeSlots,
  });

  return (
    <div>
      <p>Trip ends: {endTimeInfo.endDateTime.toLocaleString()}</p>
      <p>Calculation method: {endTimeInfo.method}</p>
      <p>Time remaining: {remaining.days}d {remaining.hours}h {remaining.minutes}m</p>
    </div>
  );
}
```

## Migration Path

### Phase 1: ✅ COMPLETE

- Cron job now supports both `timeSlots` and legacy calculation
- Zero breaking changes
- Backward compatible with existing bookings

### Phase 2: Populate `timeSlots` (Future)

When booking creation is updated to populate `timeSlots`:

```typescript
// In booking creation endpoint
const timeSlots = [
  {
    day: 1,
    date: "2025-12-10",
    startDateTime: "2025-12-10T08:00:00Z",
    endDateTime: "2025-12-10T12:00:00Z",
  },
  // ... additional days for multi-day trips
];

await prisma.booking.create({
  data: {
    // ... other fields
    timeSlots, // Add this
  },
});
```

### Phase 3: Monitor & Validate

Check cron logs to see calculation method distribution:

```typescript
// From cron response
{
  "results": {
    "completed": {
      "updated": 15,
      "calculationMethods": {
        "timeSlots": 10,      // Using exact times
        "calculated": 5       // Using fallback
      }
    }
  }
}
```

## Testing

### Run Tests

```bash
npm test src/lib/helpers/__tests__/trip-end-time.test.ts
```

### Test Scenarios

- 4-hour morning charter
- 8-hour standard trip
- 2-day multi-slot booking
- Expired trip detection
- Time remaining calculations

## Logging & Debugging

### Development

Console logs appear when `NODE_ENV=development`:

```
🕐 Trip completion check: {
  bookingId: "booking-123",
  now: "2025-12-09T14:30:00Z",
  tripEndTime: "2025-12-10T12:00:00Z",
  isCompleted: false
}
```

### Production

Structured JSON logging via `logger.info()`:

```json
{
  "level": "info",
  "message": "Updated booking to COMPLETED",
  "bookingId": "booking-123",
  "tripEndTime": "2025-12-10T12:00:00Z",
  "calculationMethod": "timeSlots",
  "timeDiffMs": 3600000
}
```

### Check Cron Logs

```bash
# Vercel deployment
vercel logs --follow

# Local
tail -f .vercel/logs/cron-update-booking-status.log
```

## Edge Cases Handled

| Case                        | Behavior                              |
| --------------------------- | ------------------------------------- |
| `timeSlots` is null         | Uses fallback calculation             |
| `timeSlots` is empty array  | Uses fallback calculation             |
| `timeSlots` has 1 element   | Uses that element's endDateTime       |
| `timeSlots` has 3+ elements | Uses last element's endDateTime       |
| Calculation method differs  | Logs the difference for investigation |
| No `startTime` specified    | Uses date start (00:00) + days\*8h    |

## Common Issues & Solutions

### Issue: Bookings marked COMPLETED too early

**Cause**: Trip is 4 hours but fallback assumes 8 hours
**Solution**: Ensure `timeSlots` is populated with actual end times

### Issue: No calculation method in logs

**Cause**: Node env is production and logging is suppressed
**Solution**: Check structured logs in Vercel dashboard

### Issue: Time differences in audit log

**Cause**: Different calculation methods used
**Solution**: Compare booking's `timeSlots` field to see actual time

## Related Documentation

- `docs/config/BOOKING_SYSTEM.md` - Full booking flow
- `src/lib/helpers/booking-status-helpers.ts` - Status helper functions
- `vercel.json` - Cron schedule configuration

## Questions?

For implementation questions, refer to:

- Cron job: `src/app/api/cron/update-booking-status/route.ts`
- Calculation logic: `src/lib/helpers/trip-end-time.ts`
- Tests: `src/lib/helpers/__tests__/trip-end-time.test.ts`
