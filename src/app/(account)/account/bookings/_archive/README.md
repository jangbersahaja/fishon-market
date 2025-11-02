# Archived: Old Booking Detail Route

**Archived Date**: 2025-10-28  
**Reason**: Route consolidation - merged into `/book/confirm`

## What Was Removed

The `/account/bookings/[id]` route has been deprecated and archived as part of the booking route consolidation plan.

### Original Route

- **Path**: `src/app/(account)/account/bookings/[id]/page.tsx`
- **Purpose**: Authenticated user booking detail page
- **Features**: Timeline, actions, receipt download, reviews

### Replacement

All functionality has been moved to the unified route:

- **New Path**: `/book/confirm?id=[bookingId]`
- **Location**: `src/app/(marketplace)/book/confirm/page.tsx`
- **Benefits**:
  - Single source of truth
  - Works for both guests and authenticated users
  - Email verification for sensitive actions
  - Shareable booking links

## Migration Details

See full migration plan: `/docs/plan-booking-route-consolidation.md`

### Key Changes

1. All booking card links now point to `/book/confirm?id=xxx`
2. Permanent redirect added in `next.config.ts`
3. API revalidation paths updated
4. Helper functions updated
5. Review links updated

## Components Used (Now Archived)

- `BookingTimeline` - Replaced by unified `BookingProgressTimeline`
- `BookingSummary` - Replaced by unified `BookingDetails`
- Route-specific action buttons - Replaced by unified `BookingActions`

## Retention Period

This archive will be kept for 1 sprint (2 weeks) for reference, then deleted.

**Delete After**: 2025-11-11
