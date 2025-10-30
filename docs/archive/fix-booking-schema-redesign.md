---
type: fix
status: in-progress
updated: 2025-10-26
feature: Booking System Schema Redesign
author: GitHub Copilot
tags:
  - database
  - schema
  - booking
  - refactor
impact: critical
---

# Booking Schema Redesign - Removing Redundancy

## Problem Statement

The current Booking model stores redundant data that can be retrieved from the Trip and Charter tables in fishon-captain database. This violates database normalization principles and creates maintenance issues:

### Current Redundant Fields

1. `charterName` - Can get from Charter table via `charterId`
2. `location` - Can get from Charter table (state, city, startingPoint)
3. `tripName` - Can get from Trip table via `tripId`
4. `durationHour` - Can get from Trip table (`durationHours`)
5. Missing critical relations: No `tripId`, `charterId` is just a string

### Additional Issues

1. **User model missing firstName/lastName** - Forces concatenation logic everywhere
2. **No pricing breakdown** - Single `totalPrice` doesn't support discounts, promos, tax
3. **Missing COMPLETED status** - Can't track completed trips
4. **No captain response field** - Only has `rejectionReason`, but captain may want to respond to accepted bookings
5. **No chat integration** - Future feature planned but no schema support

## Proposed Schema (Aligned with User Requirements)

```prisma
enum BookingStatus {
  PENDING    // awaiting captain approval
  APPROVED   // captain approved, awaiting payment
  REJECTED   // captain rejected
  EXPIRED    // hold expired
  PAID       // payment completed, confirmed
  CANCELLED  // cancelled by angler
  COMPLETED  // trip completed (auto-updated by cron)
}

model Booking {
  // === MAIN DETAIL ===
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime // hold expiration

  // === ANGLER'S DETAIL ===
  userId         String? // Optional - for signed-in users
  user           User?   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Guest booking fields (when userId is null)
  guestEmail     String?
  emailVerified  Boolean @default(false)
  guestFirstName String?
  guestLastName  String?
  guestPhone     String?

  // === BOOKING DETAIL ===
  tripId    String // References Trip.id in fishon-captain DB
  charterId String // References Charter.id in fishon-captain DB (can get from Trip, but stored for faster queries)

  date      DateTime
  days      Int      // Number of days booked (not trip duration)
  startTime String?  // e.g., "07:00" when trip has multiple start times

  // Guest counts stored as JSON for flexibility
  guests Json // { "adults": 2, "children": 1 }

  // === PRICING BREAKDOWN ===
  tripPrice   Decimal  @db.Decimal(10, 2) // Snapshot of trip price at booking time (normal or promo)
  discount    Json?    // { "code": "SUMMER10", "percentage": "10%", "amount": 50.00 }
  tax         Json?    // { "name": "SST", "percentage": "6%", "amount": 30.00 } (future)
  finalPrice  Decimal  @db.Decimal(10, 2) // Calculated: tripPrice * days * (1 - discount) * (1 + tax)

  // === BOOKING STATUS ===
  status            BookingStatus @default(PENDING)
  cancellationReason String?
  rejectionReason    String?
  captainDecisionAt  DateTime?
  paidAt             DateTime?

  // === CONVERSATION ===
  note             String? // Angler's initial note
  captainResponse  String? // Captain's response (acceptance message, instructions, etc.)
  chatId           String? // Future: Link to chat conversation

  @@index([userId])
  @@index([guestEmail])
  @@index([tripId])
  @@index([charterId])
  @@index([status])
  @@index([date])
  @@index([createdAt])
}
```

## User Model Update

Add firstName and lastName fields to make user handling consistent:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?   // Keep for NextAuth compatibility
  firstName     String?   // NEW
  lastName      String?   // NEW
  phone         String?
  // ... rest of fields
}
```

## Migration Strategy

### Phase 1: Preparation (This PR)

1. ✅ Add `firstName`, `lastName` to User model
2. ✅ Add new Booking schema with all fields
3. ✅ Create migration that:
   - Adds new fields to Booking
   - Keeps old fields temporarily (for safety)
   - Adds COMPLETED to BookingStatus enum

### Phase 2: Data Migration Script

1. Create migration script to:
   - Parse existing `name` field → `firstName`, `lastName` for Users
   - Map old Booking data to new structure:
     - Lookup tripId from captain DB using charterName + tripName
     - Store guests as JSON: `{ "adults": booking.adults, "children": booking.children }`
     - Convert unitPrice \* days to finalPrice
     - Set tripPrice from current unitPrice

### Phase 3: Code Updates

1. Update booking creation APIs:

   - Accept tripId instead of tripIndex
   - Store guests as JSON
   - Calculate and store pricing breakdown
   - Fetch trip/charter data from captain DB for display (not storage)

2. Update booking display logic:

   - Join with captain DB to get Trip/Charter details
   - Parse guests JSON
   - Display pricing breakdown

3. Update fishon-captain booking views:
   - Query market DB using tripId/charterId
   - Display booking details with proper joins

### Phase 4: Cleanup (Future PR)

1. Remove redundant fields from Booking:

   - charterName
   - location
   - tripName
   - durationHour
   - unitPrice
   - adults
   - children
   - totalPrice

2. Add foreign key constraints (if cross-DB constraints supported)

## Benefits

1. **Single Source of Truth**: Trip/Charter data lives only in captain DB
2. **No Data Staleness**: Charter updates reflect immediately in booking displays
3. **Easier Pricing Logic**: Proper breakdown supports promos, discounts, dynamic pricing
4. **Future-Proof**: Chat integration ready, cron job support via COMPLETED status
5. **Better UX**: Captain can respond to bookings, not just reject

## Risks & Mitigations

**Risk**: Cross-database queries may be slower
**Mitigation**:

- Cache Trip/Charter data in Redis for booking displays
- Keep charterId indexed for fast filtering
- Use connection pooling

**Risk**: Breaking changes for existing bookings
**Mitigation**:

- Two-phase migration keeps old fields temporarily
- Gradual rollout with feature flags
- Extensive testing on staging with real data

**Risk**: Trip/Charter deletion breaks booking history
**Mitigation**:

- Soft deletes in captain DB (isActive flag)
- Booking display falls back to "Charter no longer available" if missing
- Consider storing minimal snapshot (name only) for historical display

## Implementation Checklist

- [ ] Update User schema (add firstName, lastName)
- [ ] Update Booking schema (add new fields, keep old ones)
- [ ] Add COMPLETED to BookingStatus enum
- [ ] Create migration
- [ ] Update booking creation APIs
- [ ] Update booking query logic with joins
- [ ] Update UI components
- [ ] Write data migration script
- [ ] Test end-to-end
- [ ] Deploy to staging
- [ ] Run data migration
- [ ] Monitor for issues
- [ ] Remove old fields (Phase 4)

## Next Steps

Awaiting user approval to proceed with:

1. User model update (firstName/lastName)
2. Booking schema redesign
3. Migration creation

---

**Last Updated**: 2025-10-26  
**Status**: 🟡 Awaiting Approval  
**Estimated Effort**: 2-3 days for full implementation
