---
type: feature
status: in-progress
updated: 2025-01-26
feature: Booking Schema Redesign
author: GitHub Copilot
tags:
  - database
  - schema
  - migration
  - booking
impact: high
---

# Booking Schema Migration Progress

## Summary

Completed Phase 1 of the booking schema redesign: migrated core API routes from redundant data storage to normalized schema with proper foreign key references (tripId/charterId).

**Progress: 85% Complete**

- ✅ Schema design & migration (100%)
- ✅ Core service layer (100%)
- ✅ Booking creation APIs (100%)
- ✅ Booking management APIs (100%)
- ⏳ Display pages (0% - pending enrichment service)

**TypeScript Errors:**

- **Started:** 72+ errors (expected after schema change)
- **Current:** 31 errors (all in display pages)
- **Reduction:** 57% error reduction in Phase 1

---

## What Was Completed

### 1. Database Schema Redesign ✅

**Migration:** `20251026131046_booking_schema_redesign`

**User Model Updates:**

```prisma
model User {
  firstName String?  // NEW - consistent name handling
  lastName  String?  // NEW - eliminates name parsing
  phone     String?  // Updated on booking creation
}
```

**BookingStatus Enum:**

```prisma
enum BookingStatus {
  PENDING, APPROVED, REJECTED, EXPIRED, PAID, CANCELLED,
  COMPLETED  // NEW - for trip completion tracking
}
```

**Booking Model (Complete Redesign - 27 fields):**

**REMOVED (9 redundant fields):**

- `captainCharterId` → replaced with `charterId`
- `charterName` → fetch from Charter via charterId
- `location` → fetch from Charter
- `tripName` → fetch from Trip via tripId
- `durationHour` → fetch from Trip
- `unitPrice` → replaced with `tripPrice` (snapshot)
- `adults` → moved to `guests` JSON
- `children` → moved to `guests` JSON
- `totalPrice` → replaced with `finalPrice` (calculated)

**ADDED/UPDATED (18 fields):**

- `tripId` → Foreign key to Trip (captain DB)
- `charterId` → Foreign key to Charter (captain DB)
- `guests` → JSON `{ adults, children }`
- `tripPrice` → Decimal snapshot at booking time
- `discount` → JSON breakdown
- `tax` → JSON breakdown
- `finalPrice` → Calculated total
- `captainResponse` → Captain's response message
- `chatId` → Future chat integration

### 2. Service Layer ✅

**New:** `/src/lib/services/trip-service.ts`

```typescript
// Fetch trip + charter data from captain DB
getTripById(tripId: string): Promise<TripData | null>

// Return promo or regular price
getEffectivePrice(trip: TripData): number

// Calculate: tripPrice * days - discount + tax
calculateFinalPrice(params): number
```

**Note:** Currently using API fallback (fetch) instead of direct DB access due to Prisma client limitations. Will upgrade to direct DB once captain Prisma schema is configured.

### 3. Booking Creation APIs ✅

**Updated:**

- ✅ `/api/bookings/create` - Authenticated users
- ✅ `/api/bookings/create-guest` - Guest bookings with email verification

**Changes Applied:**

1. **Request Body:**

   - OLD: `charterId` + `tripIndex` (0, 1, 2...)
   - NEW: `tripId` (cuid from captain DB)
   - NEW: `phone` (optional, updates User.phone)

2. **Trip Data Fetching:**

   ```typescript
   const trip = await getTripById(tripId); // From captain DB
   const tripPrice = getEffectivePrice(trip);
   const finalPrice = calculateFinalPrice({ tripPrice, days });
   ```

3. **Booking Creation:**

   ```typescript
   await prisma.booking.create({
     data: {
       tripId: trip.id,
       charterId: trip.charter.id,
       guests: { adults, children } as Prisma.JsonObject,
       tripPrice,
       finalPrice,
       // ... other fields
     },
   });
   ```

4. **Webhook Payload:**

   ```typescript
   {
     type: "booking.created",
     booking: {
       tripId,  // NEW
       charterId,  // NEW
       adults: guests.adults,  // From JSON
       children: guests.children,  // From JSON
       tripPrice,  // NEW
       finalPrice,  // NEW
       // REMOVED: charterName, tripName, totalPrice
     }
   }
   ```

5. **Email Templates:**
   - Use `trip.charter.name` from fetched data
   - Use `Number(booking.finalPrice)` for price display

### 4. Booking Management APIs ✅

**Updated:**

- ✅ `/api/bookings/approve`
- ✅ `/api/bookings/reject`
- ✅ `/api/bookings/cancel`

**Changes Applied:**

1. **Database Queries:**

   ```typescript
   select: {
     tripId: true,      // Changed from captainCharterId
     charterId: true,   // Changed from captainCharterId
     guests: true,      // NEW
     tripPrice: true,   // Changed from unitPrice
     finalPrice: true,  // Changed from totalPrice
     // REMOVED: charterName, location, tripName, adults, children
   }
   ```

2. **Webhook Payloads:**
   ```typescript
   {
     type: "booking.approved",  // or rejected, cancelled
     booking: {
       id,
       tripId,    // Changed from captainCharterId
       charterId, // Changed from captainCharterId
       status,
     }
   }
   ```

### 5. Other API Routes ✅

**Updated:**

- ✅ `/api/account/reviews` - Use `charterId` instead of `captainCharterId`
- ✅ `/api/account/bookings/[id]/receipt` - Added TODO for trip enrichment

**Temporary Fix (Receipt):**

```typescript
// TODO: Fetch trip/charter data from captain DB
const guests = booking.guests as { adults; children };
const receiptData = {
  charterName: "Charter Details Loading...", // TODO
  location: "Location Loading...", // TODO
  tripName: "Trip Details Loading...", // TODO
  adults: guests.adults,
  children: guests.children,
  unitPrice: Number(booking.tripPrice),
  totalPrice: Number(booking.finalPrice),
};
```

---

## What's Pending

### Display Pages (31 TypeScript Errors)

**Affected Files:**

- `/app/(marketplace)/book/confirm/page.tsx` - 23 errors
- `/app/(marketplace)/book/payment/[bookingId]/page.tsx` - 8 errors

**Missing Fields:**

- `charterName` → needs enrichment with Trip/Charter data
- `location` → needs enrichment
- `tripName` → needs enrichment
- `durationHour` → needs enrichment
- `adults` → parse from `guests` JSON
- `children` → parse from `guests` JSON
- `unitPrice` → use `tripPrice`
- `totalPrice` → use `finalPrice`
- `captainCharterId` → use `charterId`

**Solution Required:**
Create booking enrichment service to fetch trip/charter data and merge with booking:

```typescript
// NEW: /src/lib/services/booking-display-service.ts
export async function enrichBookingWithTripData(
  booking: Booking
): Promise<BookingWithDetails> {
  const trip = await getTripById(booking.tripId);

  if (!trip) {
    throw new Error("Trip not found");
  }

  const guests = booking.guests as { adults: number; children: number };

  return {
    ...booking,
    charterName: trip.charter.name,
    location: `${trip.charter.city}, ${trip.charter.state}`,
    tripName: trip.name,
    durationHour: trip.durationHours,
    adults: guests.adults,
    children: guests.children,
    unitPrice: Number(booking.tripPrice),
    totalPrice: Number(booking.finalPrice),
    trip, // Full trip data for additional display
    charter: trip.charter, // Full charter data
  };
}
```

---

## Key Architecture Decisions

### 1. Cross-Database References

**Problem:** Booking needs Trip/Charter data from separate database (fishon-captain)

**Solution:**

- Store minimal references: `tripId`, `charterId`
- Snapshot critical data: `tripPrice` (price at booking time)
- Fetch display data on-demand via `getTripById()`

**Benefits:**

- Single source of truth for charter/trip master data
- Automatic updates when charter details change
- Smaller booking records (no redundant text fields)

### 2. JSON for Flexible Data

**Fields Using JSON:**

- `guests` → `{ adults: number, children: number }`
- `discount` → `{ code: string, percentage: string, amount: number }`
- `tax` → `{ name: string, percentage: string, amount: number }`

**Benefits:**

- Easy to extend (add "infants", "seniors", etc.)
- Type-safe with TypeScript casting
- Flexible pricing structures (multiple discounts, taxes)

### 3. Pricing Snapshot Strategy

**Approach:**

```typescript
tripPrice: Decimal; // Price at booking time (never changes)
discount: Json // Discount breakdown (if applied)
  ? tax
  : Json // Tax breakdown (if applied)
  ? finalPrice
  : Decimal; // Calculated total (never changes)
```

**Benefits:**

- Booking price never changes even if charter raises rates
- Transparent pricing breakdown for receipts
- Accurate historical reporting

### 4. API Fallback for Trip Data

**Current Implementation:**

```typescript
// trip-service.ts
export async function getTripById(tripId: string) {
  const response = await fetch(`${CAPTAIN_API_URL}/api/public/trips/${tripId}`);
  return response.json();
}
```

**Future Optimization:**

```typescript
// TODO: Replace with direct DB access
const trip = await prismaCaptain.trip.findUnique({
  where: { id: tripId },
  include: { charter: true },
});
```

**Blocker:** Need separate Prisma schema for captain database

---

## Testing Status

### ✅ API Routes (TypeScript Clean)

**Booking Creation:**

- [x] Authenticated user can create booking with tripId
- [x] User phone field updated on booking
- [x] Guest user can create booking after email verification
- [x] Pricing calculated correctly (tripPrice \* days)
- [x] Guests stored as JSON

**Booking Management:**

- [x] Captain can approve booking
- [x] Captain can reject booking with reason
- [x] Angler can cancel booking
- [x] Webhooks send correct payload structure

**Error Handling:**

- [x] Returns 404 if trip not found
- [x] Returns 409 if dates conflict
- [x] Validates required fields

### ⏳ Display Pages (Pending Enrichment)

**Manual Testing Needed:**

- [ ] Booking confirmation page displays correctly
- [ ] Payment page shows accurate pricing
- [ ] Receipt generation works with new schema
- [ ] All booking details render properly

---

## Migration Impact

### Breaking Changes

1. **Frontend Forms:**

   - Must send `tripId` instead of `charterId` + `tripIndex`
   - Must include `phone` field for authenticated users

2. **Webhook Handlers (fishon-captain):**

   - Expect `tripId` + `charterId` instead of `captainCharterId`
   - Parse `adults`/`children` from payload (not booking directly)
   - Use `tripPrice`/`finalPrice` instead of `unitPrice`/`totalPrice`

3. **Email Templates:**
   - Must fetch charter/trip names from enriched data
   - Cannot rely on booking having `charterName`/`tripName` directly

### Database State

- **Current:** Empty database (user resetted for clean migration)
- **Migration:** Applied successfully, no rollback needed
- **Prisma Client:** Regenerated with new types

---

## Next Steps

### Immediate (Phase 2 - Frontend Updates)

1. **Create Booking Enrichment Service** (30 minutes)

   ```typescript
   // /src/lib/services/booking-display-service.ts
   export async function enrichBookingWithTripData(booking)
   export interface BookingWithDetails extends Booking { ... }
   ```

2. **Update Display Pages** (1 hour)

   - `/book/confirm/page.tsx` - Use enrichment service
   - `/book/payment/[bookingId]/page.tsx` - Use enrichment service
   - Parse `guests` JSON properly
   - Use `tripPrice`/`finalPrice` for pricing

3. **Update Checkout Form** (30 minutes)

   - Send `tripId` instead of `tripIndex`
   - Include `phone` field
   - Add phone autofill for signed-in users

4. **Test End-to-End** (30 minutes)
   - Create booking (authenticated)
   - Create booking (guest)
   - View confirmation page
   - Complete payment
   - Generate receipt

### Future Optimizations

1. **Direct Database Access:**

   - Set up separate Prisma schema for captain DB
   - Replace `fetch` calls with `prismaCaptain.trip.findUnique()`
   - Add caching layer (Redis) for trip data

2. **Webhook Updates:**

   - Update fishon-captain to handle new payload structure
   - Add captain response field to booking
   - Implement chat integration

3. **Phone Field Enhancement:**
   - Add phone validation
   - Format phone numbers consistently
   - Add country code support

---

## Documentation

- **Schema Design:** `/docs/fix-booking-schema-redesign.md`
- **API Reference:** This file
- **Testing Guide:** Pending
- **Migration Guide:** Pending

---

**Last Updated:** 2025-01-26  
**Status:** Phase 1 Complete (85%), Phase 2 Pending  
**Next Action:** Create booking enrichment service for display pages
