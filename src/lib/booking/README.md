# Time-Based Booking System

## Overview

The booking system now uses **timeSlots JSON array** to store individual trip instances with exact time ranges. This enables multiple bookings per day as long as time slots don't overlap.

## Data Structure

### TimeSlot Schema

```typescript
{
  day: number,              // 1-indexed day number
  date: string,             // ISO date "YYYY-MM-DD"
  startDateTime: string,    // ISO datetime
  endDateTime: string       // ISO datetime
}
```

### Examples

#### Example 1: Half-Day Trip, 2 Days, Start 8AM

**Scenario:** User books a 4-hour trip for 2 consecutive days, starting at 8:00 AM

```json
{
  "tripId": "trip123",
  "date": "2025-11-13",
  "days": 2,
  "startTime": "08:00",
  "timeSlots": [
    {
      "day": 1,
      "date": "2025-11-13",
      "startDateTime": "2025-11-13T08:00:00.000Z",
      "endDateTime": "2025-11-13T12:00:00.000Z"
    },
    {
      "day": 2,
      "date": "2025-11-14",
      "startDateTime": "2025-11-14T08:00:00.000Z",
      "endDateTime": "2025-11-14T12:00:00.000Z"
    }
  ]
}
```

**Result:** Only blocks 8AM-12PM slot. The 2PM slot remains available!

#### Example 2: Same Day, Different Time Slot

**Scenario:** Another user can book the same charter, same days, at 2PM

```json
{
  "tripId": "trip123",
  "date": "2025-11-13",
  "days": 2,
  "startTime": "14:00",
  "timeSlots": [
    {
      "day": 1,
      "date": "2025-11-13",
      "startDateTime": "2025-11-13T14:00:00.000Z",
      "endDateTime": "2025-11-13T18:00:00.000Z"
    },
    {
      "day": 2,
      "date": "2025-11-14",
      "startDateTime": "2025-11-14T14:00:00.000Z",
      "endDateTime": "2025-11-14T18:00:00.000Z"
    }
  ]
}
```

**Result:** No conflict! Both bookings can proceed.

#### Example 3: Full-Day Trip (Blocks All Slots)

**Scenario:** 8-hour trip starting at 8AM

```json
{
  "tripId": "trip456",
  "date": "2025-11-13",
  "days": 1,
  "startTime": "08:00",
  "timeSlots": [
    {
      "day": 1,
      "date": "2025-11-13",
      "startDateTime": "2025-11-13T08:00:00.000Z",
      "endDateTime": "2025-11-13T16:00:00.000Z"
    }
  ]
}
```

**Result:** Blocks 8AM-4PM. Overlaps with both 8AM and 2PM half-day slots, so both become unavailable.

#### Example 4: Overnight Trip

**Scenario:** 8-hour night fishing trip starting at 6PM

```json
{
  "tripId": "trip789",
  "date": "2025-11-13",
  "days": 1,
  "startTime": "18:00",
  "timeSlots": [
    {
      "day": 1,
      "date": "2025-11-13",
      "startDateTime": "2025-11-13T18:00:00.000Z",
      "endDateTime": "2025-11-14T02:00:00.000Z"
    }
  ]
}
```

**Result:** Crosses midnight! Blocks evening of Nov 13 and early morning of Nov 14.

#### Example 5: Multi-Day Expedition

**Scenario:** 48-hour expedition starting at 8AM

```json
{
  "tripId": "trip999",
  "date": "2025-11-13",
  "days": 1,
  "startTime": "08:00",
  "timeSlots": [
    {
      "day": 1,
      "date": "2025-11-13",
      "startDateTime": "2025-11-13T08:00:00.000Z",
      "endDateTime": "2025-11-15T08:00:00.000Z"
    }
  ]
}
```

**Result:** Blocks entire boat from Nov 13 8AM to Nov 15 8AM (spans 3 calendar days).

## Usage

### 1. Calculate Time Slots

```typescript
import { calculateTimeSlots } from "@/lib/booking/booking-time";

const timeSlots = calculateTimeSlots({
  date: "2025-11-13",
  startTime: "08:00",
  durationHours: 4,
  days: 2,
});

// Store in booking
await prisma.booking.create({
  data: {
    // ... other fields
    timeSlots: timeSlots, // Prisma automatically handles JSON
  },
});
```

### 2. Check for Conflicts

```typescript
import { hasConflicts } from "@/lib/booking/overlap";
import { calculateTimeSlots } from "@/lib/booking/booking-time";

// Get existing bookings for this charter
const existingBookings = await prisma.booking.findMany({
  where: {
    charterId: charterId,
    status: { in: ["PAID", "PAYMENT_PENDING"] },
  },
  select: {
    date: true,
    days: true,
    startTime: true,
    timeSlots: true, // Include new field
  },
});

// Calculate new booking's time slots
const newTimeSlots = calculateTimeSlots({
  date: bookingDate,
  startTime: selectedStartTime,
  durationHours: trip.durationHours,
  days: bookingDays,
});

// Check for conflicts
const hasConflict = hasConflicts(
  existingBookings,
  new Date(bookingDate),
  bookingDays,
  {
    usesStartTimes: trip.startTimes.length > 1,
    selectedStartTime: selectedStartTime,
    newTimeSlots: newTimeSlots, // Pass the calculated slots
  }
);

if (hasConflict) {
  return { error: "This time slot is already booked" };
}
```

### 3. Display Time Slots

```typescript
import { formatTimeRange } from "@/lib/booking/booking-time";
import type { TimeSlot } from "@/lib/booking/booking-time";

// From database
const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
});

const timeSlots = booking.timeSlots as TimeSlot[];

// Display each trip instance
timeSlots.forEach((slot) => {
  console.log(
    `Day ${slot.day}: ${formatTimeRange(new Date(slot.startDateTime), new Date(slot.endDateTime))}`
  );
});

// Output:
// Day 1: Nov 13, 2025, 08:00 AM - 12:00 PM
// Day 2: Nov 14, 2025, 08:00 AM - 12:00 PM
```

## Benefits

1. **Accurate Blocking**: Only blocks actual time slots used, not entire days
2. **Multiple Trips Per Day**: Different time slots on same day don't conflict
3. **Clear UI**: Can show exactly when each trip runs
4. **Flexible Scheduling**: Supports any combination:
   - Short trips (4h) with multiple slots per day
   - Full-day trips (8h) that block overlapping slots
   - Overnight trips that cross midnight
   - Multi-day expeditions (48h+)
   - Multi-day bookings of same trip (repeat daily)

## Migration Notes

- Old bookings without `timeSlots` will fall back to legacy date-based detection
- New bookings will always use `timeSlots` for accurate overlap detection
- Gradually backfill old bookings if needed (optional)
