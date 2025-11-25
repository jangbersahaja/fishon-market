# Time-Based Scheduling System Configuration

**Last Updated**: 25 November 2025  
**Status**: Production Ready ✅  
**Applies To**: fishon-market (booking), fishon-captain (unavailability)

---

## System Overview

Time-based scheduling enables captains to set partial-day unavailability and provides better booking advance notice requirements.

### Key Features

- ✅ Time-based unavailability (e.g., 08:00-12:00 blocks morning only)
- ✅ PAYMENT_AUTHORIZED bookings block dates during 12h acknowledgment window
- ✅ 48h advance notice for standard charters (increased from 24h)
- ✅ 72h advance notice for offshore charters (increased from 36h)
- ✅ Partial availability indicators in calendar (orange badges)

---

## Architecture

### Data Flow

```
fishon-captain                    fishon-market
     │                                 │
Unavailability                   Availability API
(isAllDay, startTime,     →      /api/charters/[id]/booked-dates
 endTime)                              │
     │                                 │
     └── v_public_charters ──────────► Calendar UI
         (SQL view)                    (blocked/partial dates)
```

---

## Unavailability Configuration

### Database Fields

```prisma
// In fishon-captain
model Unavailability {
  startDate   DateTime
  endDate     DateTime
  reason      String?
  isAllDay    Boolean   @default(true)
  startTime   String?   // HH:MM format
  endTime     String?   // HH:MM format
}
```

### Types

| Type | isAllDay | Effect |
|------|----------|--------|
| Full Day Block | `true` | Date completely unavailable |
| Time-Based | `false` | Only specified hours blocked |

### Example

```json
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-01",
  "isAllDay": false,
  "startTime": "08:00",
  "endTime": "12:00",
  "reason": "Morning maintenance"
}
```

This blocks only 08:00-12:00 on Dec 1, leaving afternoon available.

---

## Booking Advance Notice

### Requirements

| Charter Type | Notice Required | Rationale |
|--------------|-----------------|-----------|
| Standard | 48 hours (2 days) | Preparation time |
| Offshore | 72 hours (3 days) | Weather planning |

### Implementation

```typescript
// src/lib/helpers/booking-helpers.ts
function getMinimumBookableDate(charterType: string) {
  let hoursRequired = 48;  // Default: standard charters
  if (charterType === "OFFSHORE") {
    hoursRequired = 72;    // Offshore: 3 days
  }
  
  const now = new Date();
  now.setHours(now.getHours() + hoursRequired);
  return now;
}
```

---

## AUTO Flow Date Blocking

### PAYMENT_AUTHORIZED Blocking

When a booking enters PAYMENT_AUTHORIZED status:
- Date is blocked during 12h acknowledgment window
- Prevents double-booking during captain review
- Releases if booking expires or is rejected

### API Response

```typescript
// GET /api/charters/[id]/booked-dates
{
  bookedDates: [
    {
      date: "2025-12-15",
      startTime: "08:00",
      timeSlots: [...],
      status: "PAID"  // or "PAYMENT_AUTHORIZED"
    }
  ]
}
```

---

## Availability Helpers

### Key Functions

```typescript
// src/lib/helpers/availability-helpers.ts

// Calculate fully blocked dates
calculateBlockedDates(unavailability) 
// → Date[] (only isAllDay=true periods)

// Calculate partial availability
calculatePartialAvailability(unavailability)
// → Map<string, PartialAvailability>
```

### PartialAvailability Structure

```typescript
interface PartialAvailability {
  date: string;  // YYYY-MM-DD
  unavailableTimeRanges: {
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM
  }[];
}
```

---

## Calendar UI

### Date States

| State | Visual | Meaning |
|-------|--------|---------|
| Available | Normal | Can book any time |
| Blocked | Red/Disabled | Fully unavailable |
| Partial | Orange badge | Some time slots unavailable |

### Implementation

```tsx
// Calendar component
const partialDates = useMemo(() => 
  calculatePartialAvailability(charter.unavailability),
  [charter.unavailability]
);

// In day cell
{partialDates.has(dateString) && (
  <span className="partial-badge">⚠️</span>
)}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/helpers/availability-helpers.ts` | Availability calculation |
| `src/lib/helpers/booking-helpers.ts` | Booking notice rules |
| `src/app/api/charters/[id]/booked-dates/route.ts` | Booked dates API |
| `src/app/api/bookings/expire/route.ts` | Expiry including PAYMENT_AUTHORIZED |

### fishon-captain Files

| File | Purpose |
|------|---------|
| `migration_add_time_based_unavailability_to_view.sql` | SQL view update |
| `prisma/schema.prisma` | Unavailability model |

---

## Testing

### Manual Tests

1. **Time-based unavailability**: Set 08:00-12:00 block, verify afternoon bookable
2. **PAYMENT_AUTHORIZED blocking**: Create AUTO booking, verify date blocked
3. **Expiry release**: Wait for 12h, verify date becomes available
4. **Advance notice**: Try to book within 48h/72h, verify rejection

### API Tests

```bash
# Check booked dates
curl /api/charters/{id}/booked-dates

# Verify PAYMENT_AUTHORIZED included
# Response should include status field
```

---

## Timezone Handling

All times stored and compared in Malaysia timezone (UTC+8):

```typescript
const MY_TIMEZONE = "Asia/Kuala_Lumpur";

// Use date-fns-tz for conversions
import { format, utcToZonedTime } from "date-fns-tz";
```

---

## Error Messages

```typescript
// Booking notice error
"Standard charters require booking at least 48 hours (2 days) in advance"
"Offshore charters require booking at least 72 hours (3 days) in advance"

// Unavailable date error
"Selected date is unavailable"
"Selected time slot is unavailable"
```

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Owner**: Engineering Team
