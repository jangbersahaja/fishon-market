# Enhancement: Time-Based Booking Blocks

## Issue

After fixing time-based unavailability, we discovered that **PAID and PAYMENT_AUTHORIZED bookings still blocked entire dates** on the calendar picker, even when they were time-based (e.g., a 4-hour trip from 08:00-12:00 was blocking the full day).

## Root Cause

The `/api/charters/[id]/booked-dates` API was returning a simple array of date strings (`bookedDates: string[]`), treating all bookings as full-day blocks. It didn't differentiate between:

- Full-day bookings (multi-day trips or trips without time info)
- Time-based bookings (single trips with specific `startTime` and `timeSlots`)

## Solution

### 1. Updated Booked-Dates API Response Format

**File:** `src/app/api/charters/[id]/booked-dates/route.ts`

Changed from:

```typescript
// OLD: Simple array of blocked dates
{ bookedDates: ["2025-11-24", "2025-11-25", ...] }
```

To:

```typescript
// NEW: Separate full-day blocks from time-based blocks
{
  fullDayBlocks: ["2025-11-26", ...],  // Dates fully blocked
  timeBasedBlocks: [                    // Time-specific blocks
    {
      date: "2025-11-24",
      startTime: "08:00",
      endTime: "12:00",
      isFullDay: false
    },
    ...
  ]
}
```

**Logic:**

- Checks if booking has `startTime` and valid `timeSlots` JSON array
- If YES: Extracts time ranges from `timeSlots` → `timeBasedBlocks`
- If NO: Treats as full-day booking → `fullDayBlocks`

### 2. Updated TypeScript Types

**File:** `src/lib/helpers/availability-helpers.ts`

Added new interface:

```typescript
export interface BookedDatesResponse {
  fullDayBlocks: string[];
  timeBasedBlocks: Array<{
    date: string;
    startTime: string;
    endTime: string;
    isFullDay: boolean;
  }>;
}
```

### 3. Updated Availability Helpers

#### `calculateBlockedDates()`

- **Changed signature:** Accepts `BookedDatesResponse | { bookedDates: string[] } | null`
- **Backward compatible:** Still supports legacy `{ bookedDates }` format
- **Behavior:** Only adds `fullDayBlocks` to blocked dates Set
- **Time-based blocks** are NOT added (handled by `calculatePartialAvailability`)

#### `calculatePartialAvailability()`

- **Changed signature:** Now accepts `bookedDatesData` parameter
- **New logic:** Processes `timeBasedBlocks` alongside unavailability periods
- **Result:** Merges time-based bookings and unavailability into unified `Map<string, PartialAvailability>`

### 4. Updated Components

#### DateGuestsCard.tsx

- Changed state from `bookedDates: string[]` to `bookedDatesData: BookedDatesResponse | null`
- Updated API fetch to handle new response format with legacy fallback:
  ```typescript
  if (data.fullDayBlocks) {
    // New format
    setBookedDatesData({
      fullDayBlocks: data.fullDayBlocks,
      timeBasedBlocks: data.timeBasedBlocks || [],
    });
  } else if (data.bookedDates) {
    // Legacy format: convert
    setBookedDatesData({
      fullDayBlocks: data.bookedDates,
      timeBasedBlocks: [],
    });
  }
  ```
- Updated `calculateBlockedDates` and `calculatePartialAvailability` calls to pass `bookedDatesData`

#### CheckoutForm.tsx

- Updated to pass `null` for bookedDatesData (it doesn't fetch bookings directly)
- DateGuestsCard handles the actual booking data fetching

### 5. Other Files Updated

- `src/app/[locale]/(marketplace)/charters/[id]/page.tsx` - Wrapped array in legacy format
- `scripts/test-charter-unavailability.ts` - Changed to `null`
- `src/app/api/bookings/create/route.ts` - Changed to `null`

## Database Schema Reference

The `Booking` model stores time information:

```prisma
startTime String? // e.g., "08:00"
timeSlots Json?   // Array of time ranges per day
```

Example `timeSlots` JSON:

```json
[
  {
    "day": 1,
    "date": "2025-11-24",
    "startDateTime": "2025-11-24T08:00:00Z",
    "endDateTime": "2025-11-24T12:00:00Z"
  }
]
```

## Expected Behavior (After Fix)

### Calendar Picker

1. **Full-day booking (multi-day or no time info)**
   - ✅ Date shows **strikethrough** (fully blocked)
   - ✅ Date is **disabled/unselectable**

2. **Time-based booking (e.g., 08:00-12:00)**
   - ✅ Date shows **orange dot** (partial availability)
   - ✅ Date is **selectable**
   - ✅ Other time slots remain available

### Trip Selection Card

- Trips with start times conflicting with booked time ranges show "Unavailable" badge
- Non-conflicting trips remain bookable

## Testing Instructions

### 1. Create Test Booking

```bash
# In fishon-market, create a test booking with time-based data
# This would typically be done through the booking flow
```

### 2. Verify API Response

```bash
curl http://localhost:3000/api/charters/cmgf4czdp0006uys679s67w8g/booked-dates
```

Expected response:

```json
{
  "fullDayBlocks": ["2025-11-26"],
  "timeBasedBlocks": [
    {
      "date": "2025-11-24",
      "startTime": "08:00",
      "endTime": "12:00",
      "isFullDay": false
    }
  ]
}
```

### 3. Check Calendar

1. Navigate to: `http://localhost:3000/book/cmgf4czdp0006uys679s67w8g`
2. Open calendar for November 2025
3. Verify:
   - Dates with time-based bookings: **orange dot**
   - Dates with full-day bookings: **strikethrough**

### 4. Check Trip Availability

- Select date with time-based booking (orange dot)
- Verify conflicting trips show "Unavailable" badge
- Verify non-conflicting trips are selectable

## Backward Compatibility

The system maintains backward compatibility:

- **New API format:** `{ fullDayBlocks, timeBasedBlocks }`
- **Legacy format:** `{ bookedDates }` (treated as full-day blocks)
- **Null/undefined:** No bookings

Components automatically detect and handle both formats.

## Data Flow Summary

```
1. Database: Booking table with startTime + timeSlots
   ↓
2. API: /api/charters/[id]/booked-dates
   ↓ Analyzes bookings
   ↓ Separates full-day vs time-based
   ↓
3. Response: { fullDayBlocks, timeBasedBlocks }
   ↓
4. DateGuestsCard: Fetches and stores bookedDatesData
   ↓
5. calculateBlockedDates(): Adds only fullDayBlocks to blocked Set
   ↓
6. calculatePartialAvailability(): Merges timeBasedBlocks + unavailability
   ↓
7. CalendarPicker: Shows orange dots for partial availability
   ↓
8. TripSelectionCard: Filters trips by time conflicts
```

## Related Documentation

- **Phase 2 Implementation:** `docs/PHASE2_TIME_BASED_SCHEDULING_IMPLEMENTATION.md`
- **Unavailability Fix:** `docs/BUG_FIX_TIME_BASED_AVAILABILITY.md`
- **Booking System:** `docs/config/BOOKING_FLOW.md`

## Files Modified

### API Layer

- `src/app/api/charters/[id]/booked-dates/route.ts`

### Helper Functions

- `src/lib/helpers/availability-helpers.ts`

### Components

- `src/app/[locale]/(marketplace)/book/[charterId]/ui/DateGuestsCard.tsx`
- `src/app/[locale]/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`

### Other

- `src/app/[locale]/(marketplace)/charters/[id]/page.tsx`
- `scripts/test-charter-unavailability.ts`
- `src/app/api/bookings/create/route.ts`
