# Booking System Flow Diagram

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FISHON BOOKING SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐     │
│  │   Angler     │         │   Captain    │        │   System     │     │
│  │  (Customer)  │────────▶│   Dashboard  │◀───────│  (Automated) │     │
│  └──────────────┘         └──────────────┘        └──────────────┘     │
│         │                         │                        │             │
│         │                         │                        │             │
│         ▼                         ▼                        ▼             │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │              FISHON-MARKET (Marketplace)                       │      │
│  │  - Browse charters                                             │      │
│  │  - Create bookings                                             │      │
│  │  - Payment processing                                          │      │
│  └──────────────────────────────────────────────────────────────┘      │
│         │                                                                 │
│         │ webhooks                                                        │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │              FISHON-CAPTAIN (Dashboard)                        │      │
│  │  - Register charters                                           │      │
│  │  - Manage trips                                                │      │
│  │  - Approve/reject bookings                                     │      │
│  │  - View analytics                                              │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Database Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE STRUCTURE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FISHON-CAPTAIN DB                    FISHON-MARKET DB           │
│  (PostgreSQL)                         (PostgreSQL)               │
│                                                                  │
│  ┌─────────────────┐                 ┌──────────────────┐        │
│  │    Charter      │                 │     Booking      │        │
│  ├─────────────────┤                 ├──────────────────┤        │
│  │ • id            │                 │ • id             │        │
│  │ • title         │                 │ • userId?        │        │
│  │ • description   │                 │ • guestEmail?    │        │
│  │ • isActive      │──────read───────│ • charterId      │        │
│  │ • schedule ─────┼────────┐        │ • tripId         │        │
│  │ • unavailability│        │        │ • date           │        │
│  └─────────────────┘        │        │ • days           │        │
│         │                   │        │ • startTime?     │        │
│         │ 1:N               │        │ • guests (JSON)  │        │
│         ▼                   │        │ • status         │        │
│  ┌─────────────────┐        │        │ • finalPrice      │        │
│  │      Trip       │        │        │ • expiresAt      │        │
│  ├─────────────────┤        │        │ • note?          │        │
│  │ • id            │◀───────┼────────│ • rejectionReason│        │
│  │ • charterId     │        │        │ • createdAt      │        │
│  │ • title         │        │        │ • updatedAt      │        │
│  │ • duration      │        │        └──────────────────┘        │
│  │ • price         │        │                 │                  │
│  │ • startTimes[]  │        │                 │                  │
│  │ • minGuests     │        │        ┌────────▼─────────┐        │
│  │ • maxGuests     │        │        │  User (Angler)   │        │
│  └─────────────────┘        │        ├──────────────────┤        │
│                             │        │ • id             │        │
│  ┌─────────────────┐        │        │ • name           │        │
│  │   Schedule      │◀───────┘        │ • email          │        │
│  ├─────────────────┤                 │ • role: ANGLER   │        │
│  │ • charterId     │                 └──────────────────┘        │
│  │ • type          │                                             │
│  │ • customDays    │         READ-ONLY ACCESS                    │
│  │ • isActive      │         via v_public_charters view          │
│  └─────────────────┘         (schedule + unavailability)         │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │ Unavailability  │                                             │
│  ├─────────────────┤                                             │
│  │ • charterId     │                                             │
│  │ • startDate     │                                             │
│  │ • endDate       │                                             │
│  │ • reason        │                                             │
│  └─────────────────┘                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Booking Status Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      BOOKING STATUS LIFECYCLE                      │
└────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ PENDING │ ◀─── Initial state when booking created
    └────┬────┘      (12-hour expiration timer starts)
         │
         ├─────────── Captain Actions ──────────┐
         │                                      │
         ▼                                      ▼
    ┌─────────┐                           ┌──────────┐
    │APPROVED │                           │ REJECTED │ ── End State
    └────┬────┘                           └──────────┘
         │                                      │
         │ Angler pays                     rejectionReason stored
         │
         ▼
    ┌─────────┐                           ┌──────────┐
    │  PAID   │ ◀── BLOCKS CALENDAR       │ EXPIRED  │ ── End State
    └────┬────┘     (confirmed booking)    └──────────┘
         │                                 (12 hours passed)
         │ After trip date                      ▲
         │                                      │
         ▼                                      │
    ┌──────────┐                                │
    │COMPLETED │ ── End State                   │
    └──────────┘                                │
         │                                      │
         │ Angler/Captain cancels ──────────────┘
         ▼
    ┌──────────┐
    │CANCELLED │ ── End State
    └──────────┘

KEY STATUS BEHAVIORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• PENDING   → Can be approved/rejected/expired/cancelled
• APPROVED  → Can be paid/cancelled/expired
• PAID      → ⚠️ ONLY STATUS THAT BLOCKS CALENDAR
• COMPLETED → Final state after trip completion
• REJECTED  → Final state, includes rejection reason
• CANCELLED → Final state, refund may be issued
• EXPIRED   → Final state, auto-cancelled after 12h
```

## 4. Complete Booking Flow (User Journey)

```
┌─────────────────────────────────────────────────────────────────────┐
│              ANGLER BOOKING JOURNEY (Happy Path)                    │
└─────────────────────────────────────────────────────────────────────┘

[1] DISCOVERY & SELECTION
    │
    ├─▶ Angler browses charters on fishon-market
    │   • Searches by location, type, technique
    │   • Views charter details, captain profile
    │   • Checks availability calendar
    │
    └─▶ Calendar shows blocked dates from:
        ✓ Schedule (non-operational days)
        ✓ Unavailability (captain-defined blocks)
        ✓ PAID bookings (confirmed bookings only)

[2] BOOKING CREATION
    │
    ├─▶ Angler selects date, trip, guests
    │   POST /api/bookings/create (authenticated)
    │   POST /api/bookings/create-guest (email-verified)
    │
    ├─▶ API validates inputs:
    │   • tripId exists
    │   • date format valid
    │   • guests within min/max
    │   • startTime if trip requires it
    │
    ├─▶ ⚠️ RACE CONDITION WINDOW STARTS ⚠️
    │
    ├─▶ Query existing bookings:
    │   WHERE charterId = X
    │     AND status = 'PAID'
    │     AND date overlaps with new booking
    │
    ├─▶ Check conflicts using hasConflicts():
    │   • Date range overlap check
    │   • StartTime match (if applicable)
    │
    ├─▶ IF conflicts found:
    │   └─▶ Return 409 Conflict
    │
    ├─▶ IF no conflicts:
    │   └─▶ Create booking with status: PENDING
    │       • expiresAt = now + 12 hours
    │       • finalPrice calculated
    │       • note stored if provided
    │
    └─▶ ⚠️ RACE CONDITION WINDOW ENDS ⚠️
        (Another request could have inserted between query and create!)

[3] NOTIFICATION PHASE
    │
    ├─▶ Send webhook to fishon-captain:
    │   POST {CAPTAIN_WEBHOOK_URL}/api/webhooks/bookings
    │   { type: "booking.created", booking: {...} }
    │
    ├─▶ Send email to angler:
    │   "Booking request received"
    │
    └─▶ Send email to captain:
        "New booking request for your charter"

[4] CAPTAIN REVIEW
    │
    ├─▶ Captain views booking in fishon-captain dashboard
    │   • Sees angler details
    │   • Reviews date, trip, guests
    │   • Checks calendar for conflicts
    │
    ├─▶ Captain decides:
    │   │
    │   ├─▶ APPROVE:
    │   │   PATCH /api/bookings/{id}
    │   │   { status: "APPROVED" }
    │   │   └─▶ Email sent to angler: "Approved, proceed to payment"
    │   │
    │   └─▶ REJECT:
    │       PATCH /api/bookings/{id}
    │       { status: "REJECTED", rejectionReason: "..." }
    │       └─▶ Email sent to angler: "Sorry, charter unavailable"

[5] PAYMENT PROCESSING
    │
    ├─▶ Angler proceeds to payment (external gateway)
    │   • Stripe/PayPal/etc integration
    │
    ├─▶ Payment webhook received:
    │   PATCH /api/bookings/{id}
    │   { status: "PAID" }
    │
    ├─▶ ✅ DATE NOW BLOCKED IN CALENDAR
    │   (Other anglers can't book this date anymore)
    │
    └─▶ Confirmation emails sent:
        • Angler: "Payment confirmed, booking secured"
        • Captain: "Booking paid, prepare for trip"

[6] TRIP COMPLETION
    │
    ├─▶ After trip date passes:
    │   • Automated job checks for completed trips
    │   • Updates status: PAID → COMPLETED
    │
    └─▶ Post-trip actions:
        • Request review from angler
        • Release any holds
        • Update analytics

[7] ERROR PATHS
    │
    ├─▶ EXPIRATION (12 hours):
    │   • Cron job checks expiresAt
    │   • Status: PENDING → EXPIRED
    │   • Email sent: "Booking expired"
    │
    ├─▶ CANCELLATION (anytime before trip):
    │   • Angler/Captain cancels
    │   • Status: * → CANCELLED
    │   • Refund processed if PAID
    │   • Calendar date unblocked
    │
    └─▶ DOUBLE BOOKING ⚠️:
        • Race condition allows duplicate bookings
        • Both could become PAID
        • Manual intervention required
        • ❌ NO AUTOMATIC PREVENTION CURRENTLY
```

## 5. Calendar Availability Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│              HOW CALENDAR BLOCKING WORKS                            │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND (BookingWidget / DateGuestsCard):
┌─────────────────────────────────────────────────────────────────┐
│  1. Fetch charter data (includes schedule + unavailability)     │
│     GET /api/charters/{id} or direct DB via v_public_charters   │
│                                                                 │
│  2. Fetch booked dates                                          │
│     GET /api/charters/{id}/booked-dates                         │
│     Returns: ["2025-11-15", "2025-11-16", ...] (PAID only)      │
│                                                                 │
│  3. Calculate all blocked dates                                 │
│     calculateBlockedDates(                                      │
│       schedule,        // From charter.schedule                 │
│       unavailability,  // From charter.unavailability           │
│       bookedDates,     // From API (PAID bookings)              │
│       startDate,       // Calendar view start                   │
│       endDate          // Calendar view end                     │
│     )                                                           │
│                                                                 │
│  4. Combine all blocks:                                         │
│     blockedDates = [                                            │
│       ...scheduleBlocks,      // Non-operational days           │
│       ...unavailabilityBlocks, // Captain-defined blocks         │
│       ...bookedDates           // Confirmed PAID bookings        │
│     ]                                                           │
│                                                                 │
│  5. Disable dates in calendar picker                            │
│     <Calendar disabledDates={blockedDates} />                   │
└─────────────────────────────────────────────────────────────────┘

SCHEDULE TYPES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• EVERYDAY   → No dates blocked from schedule
• WEEKDAYS   → Block Saturdays & Sundays
• WEEKENDS   → Block Monday-Friday
• CUSTOM     → Block based on customDays array (e.g., [0,1,6])

UNAVAILABILITY PERIODS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Captain manually sets date ranges
• Reasons: maintenance, vacation, weather, etc.
• Example: { startDate: "2025-12-20", endDate: "2025-12-31" }

BOOKED DATES (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ⚠️ ONLY "PAID" STATUS BLOCKS CALENDAR
• Why? Unconfirmed bookings (PENDING/APPROVED) might not happen
• If PENDING/APPROVED blocked dates:
  → Other anglers can't book
  → If original booking expires/cancels, dates stuck blocked
  → Creates false scarcity
```

## 6. Race Condition Vulnerability (CRITICAL)

```
┌────────────────────────────────────────────────────────────────────┐
│              THE DOUBLE BOOKING PROBLEM                            │
└────────────────────────────────────────────────────────────────────┘

SCENARIO: Two anglers (A and B) try to book same date simultaneously

TIME    ANGLER A                      ANGLER B                  DATABASE
════════════════════════════════════════════════════════════════════════
T=0ms   POST /api/bookings/create
        Check for PAID bookings ────▶
T=1ms                                                           Query: 0 results
T=2ms   ◀──── No conflicts found

T=5ms                                 POST /api/bookings/create
T=6ms                                 Check for PAID bookings ────▶
T=7ms                                                           Query: 0 results
                                                                (A not inserted yet!)
T=8ms                                 ◀──── No conflicts found

T=10ms  Create booking A ───────────▶                         INSERT booking A
T=11ms  ◀──── Success (id: bk-123)                            (status: PENDING)

T=15ms                                Create booking B ───────▶
T=16ms                                                          INSERT booking B
T=17ms                                ◀──── Success (id: bk-456) (status: PENDING)

        🚨 BOTH BOOKINGS CREATED FOR SAME DATE! 🚨

T=1hr   Captain approves A ────────▶                          UPDATE: APPROVED
T=2hr                                Captain approves B ─────▶ UPDATE: APPROVED

T=3hr   Angler A pays ─────────────▶                          UPDATE: PAID ✓
T=4hr                                Angler B pays ──────────▶ UPDATE: PAID ✓

        ❌ DOUBLE BOOKING CONFIRMED ❌
        Both bookings are PAID for same charter + date!

ROOT CAUSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NO TRANSACTION wrapping conflict check + insert
2. NO UNIQUE CONSTRAINT at database level
3. Race window: ~10-20ms between check and insert
4. Application-level checking only (not atomic)
```

## 7. Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                   DATA FLOW ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────┘

READ OPERATIONS (Charter Data):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fishon-market                    fishon-captain DB
     │                                  │
     │  1. Direct DB read               │
     │     (if USE_CAPTAIN_DB=1)        │
     ├─────────────────────────────────▶│
     │                                  │
     │  SELECT * FROM v_public_charters │
     │  WHERE id = ?                    │
     │                                  │
     │◀─────────────────────────────────┤
     │  { id, charter (jsonb) }         │
     │  • schedule included             │
     │  • unavailability included       │
     │                                  │
     │  2. Fallback: API call           │
     │     (if DB connection fails)     │
     │                                  │
     ├─────────────────────────────────▶│
     │  GET /api/public/charters/{id}   │
     │                                  │
     │◀─────────────────────────────────┤
     │  { charter object }              │
     │                                  │

WRITE OPERATIONS (Bookings):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fishon-market DB                 fishon-captain Dashboard
     │                                  │
     │  Booking created                 │
     ├─────────────────────────────────▶│
     │  Webhook: booking.created        │
     │                                  │
     │                                  │ Captain views in UI
     │                                  │
     │  Booking status changed          │
     │◀─────────────────────────────────┤
     │  Webhook: booking.updated        │
     │  { status: "APPROVED" }          │
     │                                  │
     │  UPDATE booking SET              │
     │  status = 'APPROVED'             │
     │                                  │

CROSS-DATABASE SYNC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Charter/Trip data: fishon-captain → fishon-market (read-only)
• Booking data: fishon-market → fishon-captain (webhooks)
• No direct writes from market to captain DB
• Eventual consistency via webhooks
```

## 8. API Endpoints Map

```
FISHON-MARKET API ROUTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOKING CREATION:
POST   /api/bookings/create            → Create authenticated booking
POST   /api/bookings/create-guest      → Create guest booking (email-verified)

BOOKING MANAGEMENT:
GET    /api/bookings                   → List user's bookings
GET    /api/bookings/:id               → Get booking details
PATCH  /api/bookings/:id               → Update booking status
DELETE /api/bookings/:id               → Cancel booking

CHARTER DATA:
GET    /api/charters/:id/booked-dates  → Get PAID booking dates
                                          Returns: ["YYYY-MM-DD", ...]

FISHON-CAPTAIN API ROUTES (called by market):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PUBLIC API:
GET    /api/public/charters            → List all active charters
GET    /api/public/charters/:id        → Get charter with trips

WEBHOOKS (incoming from market):
POST   /api/webhooks/bookings          → Receive booking events
                                          Types: created, updated, cancelled
```

## 9. Key Components Overview

```
FRONTEND COMPONENTS (fishon-market):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/components/charter/
  ├─ BookingWidget.tsx           → Main booking interface
  │  • Fetches booked dates
  │  • Displays calendar
  │  • Handles date/guest selection
  │  • Calculates pricing
  │  • Submits booking
  │
  └─ DateGuestsCard.tsx          → Date/guest selection component
     • Similar to BookingWidget
     • Used in charter detail page

src/lib/helpers/
  └─ availability-helpers.ts     → Calendar blocking logic
     • calculateBlockedDates()
     • Combines schedule + unavailability + bookings

src/lib/booking/
  └─ overlap.ts                  → Conflict detection
     • hasConflicts()
     • rangesOverlap()
     • Checks date range + startTime overlaps

API ROUTES (fishon-market):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/app/api/bookings/
  ├─ create/route.ts             → Authenticated booking creation
  │  ⚠️ RACE CONDITION VULNERABLE
  │
  ├─ create-guest/route.ts       → Guest booking creation
  │  ⚠️ RACE CONDITION VULNERABLE
  │
  └─ [id]/route.ts               → Booking CRUD operations

src/app/api/charters/
  └─ [id]/booked-dates/route.ts  → Returns PAID booking dates

DATABASE SERVICES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/lib/services/
  └─ charter-service.ts          → Charter data fetching
     • getCharters()
     • getCharterById()
     • Uses direct DB or API fallback
```

## 10. Summary of Issues & Risks

```
CURRENT SYSTEM STRENGTHS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Comprehensive calendar blocking (schedule + unavailability + bookings)
✅ Clear status flow with expiration handling
✅ Webhook integration for cross-system sync
✅ Guest booking support (email verification)
✅ Only PAID bookings block dates (prevents false scarcity)
✅ Proper separation of concerns (market vs captain)

CRITICAL VULNERABILITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Race condition in booking creation (no transactions)
❌ No unique constraints at database level
❌ ~10-20ms window for double bookings
❌ No pessimistic locking during conflict check
❌ High risk under moderate to high booking volume

RECOMMENDED FIXES (in order of priority):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 🔴 CRITICAL: Add database transaction with serializable isolation
2. 🔴 CRITICAL: Add unique constraint (charterId + date + startTime + status)
3. 🟡 HIGH: Implement retry logic for transient conflicts
4. 🟢 MEDIUM: Add monitoring for P2002 errors
5. 🟢 LOW: Consider Redis locks for distributed deployments
```

---

**Generated:** 31 October 2025  
**System:** Fishon Booking System v1.0  
**Status:** ⚠️ Race condition vulnerability identified
