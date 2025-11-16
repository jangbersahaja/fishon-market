# Timezone Fix - Complete

## Problem

Time slots in bookings were displaying incorrect times because they were being stored as UTC instead of Malaysia local time (UTC+8).

**Example Issue:**

- User selects: **08:00 AM** Malaysia time
- System stored: `2025-06-01T08:00:00.000Z` (08:00 UTC)
- Display showed: **04:00 PM** Malaysia time (wrong by 8 hours)

## Root Cause

The `calculateTimeSlots()` function was creating Date objects using UTC interpretation:

```typescript
// OLD (WRONG):
const tripStart = new Date(date + "T00:00:00.000Z");
tripStart.setUTCHours(hours, minutes, 0, 0);
// Result: Times interpreted as UTC
```

## Solution

Rewrote time slot calculation to use **ISO 8601 format with explicit timezone offset**:

```typescript
// NEW (CORRECT):
const tripStartMY = `${dateStr}T${startTime}:00+08:00`;
const tripStart = new Date(tripStartMY);
// Result: Times correctly represent Malaysia timezone
```

### How It Works

1. **Create ISO string with timezone**: `"2025-06-01T08:00:00+08:00"`
2. **Parse as Date**: JavaScript Date object correctly represents the moment in time
3. **Store as ISO**: `.toISOString()` converts to UTC (`2025-06-01T00:00:00.000Z`)
4. **Display with timezone**: `toLocaleString(..., { timeZone: "Asia/Kuala_Lumpur" })` shows correct Malaysia time

### Example Conversion

User input: **08:00 AM** on **June 1, 2025** (Malaysia)

| Step        | Value                         | Representation                     |
| ----------- | ----------------------------- | ---------------------------------- |
| Input       | `"2025-06-01"`, `"08:00"`     | Malaysia local date/time           |
| ISO String  | `"2025-06-01T08:00:00+08:00"` | Malaysia time with explicit offset |
| Date Object | `new Date(...)`               | JavaScript Date (internally UTC)   |
| Stored UTC  | `"2025-06-01T00:00:00.000Z"`  | 8 hours behind (+08:00 → UTC)      |
| Display     | `"8:00 AM"`                   | Formatted with Malaysia timezone   |

The key insight: **Store the UTC equivalent, but ensure it represents the correct Malaysia moment in time**.

## Files Modified

### 1. `src/lib/booking/booking-time.ts`

**Changes:**

- `calculateTimeSlots()`: Rewrote to use ISO 8601 with +08:00 timezone offset
- Fixed date arithmetic for multi-day bookings to avoid timezone bugs
- `formatTimeRange()`: Added Malaysia timezone to display formatting
- Date comparison logic now uses Malaysia timezone instead of UTC

**Key Functions:**

```typescript
// Calculate time slots with Malaysia timezone
export function calculateTimeSlots(params: {
  date: Date | string;
  startTime: string; // "08:00" format
  durationHours: number;
  days: number;
}): TimeSlot[];

// Format time range for display (now timezone-aware)
export function formatTimeRange(
  startDateTime: string,
  endDateTime: string
): string;
```

### 2. `src/lib/booking/__tests__/booking-time.test.ts`

**Changes:**

- Updated all test expectations to match Malaysia timezone storage
- Added comments explaining UTC ↔ Malaysia time conversions
- All 17 tests now pass

**Example Test Update:**

```typescript
// OLD (UTC assumption):
expect(slots[0].startDateTime).toBe("2025-06-01T08:00:00.000Z");

// NEW (Malaysia time stored as UTC):
expect(slots[0].startDateTime).toBe("2025-06-01T00:00:00.000Z"); // 08:00 Malaysia = 00:00 UTC
```

## Verification

✅ **All Unit Tests Pass**

```
✓ calculateTimeSlots (5 tests)
✓ timeRangesOverlap (5 tests)
✓ hasTimeConflict (4 tests)
✓ formatTimeRange (3 tests)
```

✅ **TypeScript Compilation Clean**

```bash
npm run typecheck  # No errors
```

## Next Steps

### 1. Test with Real Booking

Create a test booking and verify:

- Time slots display correct Malaysia times
- Database stores correct ISO timestamps
- Multi-day bookings span correct dates

### 2. Backward Compatibility

**Existing bookings with old UTC times:**

- Will still display (using `toLocaleString` with timezone)
- May show incorrect times until data migration
- Consider migration script if needed

### 3. Data Migration (Optional)

If old bookings need correction:

```sql
-- Identify bookings with old UTC times
SELECT id, "timeSlots"
FROM "Booking"
WHERE "timeSlots" IS NOT NULL;

-- Manual review and update if needed
```

## Technical Notes

### Timezone Handling in JavaScript

**Malaysia Timezone:** `Asia/Kuala_Lumpur` (UTC+8, no DST)

**Date Storage Philosophy:**

- Always store in UTC (ISO 8601 format)
- But ensure UTC value represents correct local moment
- Display with explicit timezone conversion

**Key APIs Used:**

```typescript
// Creating Malaysia time
const myTime = new Date("2025-06-01T08:00:00+08:00");

// Displaying Malaysia time
myTime.toLocaleString("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kuala_Lumpur",
});

// Comparing dates in Malaysia timezone
const myDateParts = myTime.toLocaleDateString("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kuala_Lumpur",
});
```

### Date Arithmetic Gotchas

**WRONG (timezone-sensitive):**

```typescript
const d = new Date("2025-06-01T00:00:00.000Z");
d.setDate(d.getDate() + 1); // May cross timezone boundaries
```

**RIGHT (timezone-safe):**

```typescript
const [year, month, day] = "2025-06-01".split("-").map(Number);
const nextDay = new Date(year, month - 1, day + 1);
const dateStr = nextDay.toISOString().split("T")[0];
```

## Summary

✅ Time slots now correctly stored with Malaysia timezone awareness  
✅ Display formatting uses Malaysia timezone  
✅ All unit tests updated and passing  
✅ TypeScript compilation clean  
✅ Multi-day booking logic preserved  
✅ Backward compatible with existing code

**Result:** When a user in Malaysia selects 08:00 AM, the system now correctly stores and displays 08:00 AM Malaysia time, not UTC.

---

**Fixed:** November 15, 2025  
**Developer:** Assistant (via Copilot)  
**Testing:** Unit tests, TypeScript, Manual verification pending
