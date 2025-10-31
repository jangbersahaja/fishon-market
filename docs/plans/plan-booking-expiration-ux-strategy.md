---
type: plan
status: proposed
updated: 2025-10-31
feature: booking-expiration-ux
author: copilot
---

# Booking Expiration & UX Strategy

## Executive Summary

This document outlines the expiration strategy and user experience flow for handling booking conflicts when multiple anglers compete for the same charter date.

## Current State Analysis

### Existing Expiration Logic

```
PENDING Status:
├─ Created at: Time T0
├─ expiresAt: T0 + 12 hours
└─ Cron job checks: expiresAt < now → status = EXPIRED

APPROVED Status:
├─ Currently: NO EXPIRATION SET
├─ expiresAt: Still contains PENDING expiration (T0 + 12 hours)
└─ Problem: Old expiration time doesn't make sense for APPROVED
```

**Code Reference:**

```typescript
// src/app/api/bookings/create/route.ts:180
const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

// src/app/api/bookings/expire/route.ts:26-31
const result = await prisma.booking.updateMany({
  where: {
    status: "PENDING", // ← Only expires PENDING bookings
    expiresAt: { lt: now },
  },
  data: { status: "EXPIRED" },
});
```

## The Core Question: Should APPROVED Bookings Expire?

### ❌ Option 1: NO Expiration for APPROVED (Current System)

**Pros:**

- ✅ Simpler logic - only track PENDING expiration
- ✅ Captain's approval signals strong commitment
- ✅ No arbitrary deadline pressure on anglers
- ✅ Captain made conscious decision to hold the date

**Cons:**

- ❌ Date held indefinitely if angler never pays
- ❌ Lost opportunity for captain (other anglers can't book)
- ❌ No urgency for angler to complete payment
- ❌ Captain must manually cancel if angler doesn't pay

**Real-world Scenario:**

```
Day 1 (Monday): Angler books charter for June 15
Day 1 (Monday): Captain approves within 2 hours
Day 2-7:        Angler doesn't pay... date still held
Week 2:         Captain realizes angler ghosted, manually cancels
Week 3:         Too late - other anglers already booked elsewhere
```

### ✅ Option 2: YES, APPROVED Should Expire (RECOMMENDED)

**Pros:**

- ✅ Creates healthy urgency for payment
- ✅ Protects captain's revenue opportunities
- ✅ Fair to other anglers waiting for same date
- ✅ Automatic cleanup - no manual intervention needed
- ✅ Industry standard (hotels, flights, concerts all do this)

**Cons:**

- ⚠️ Need to extend expiresAt when status changes to APPROVED
- ⚠️ Need to communicate clearly to anglers
- ⚠️ Need grace period calculation logic

**Real-world Scenario:**

```
Day 1 (Monday 10am):  Angler A books charter for June 15
Day 1 (Monday 12pm):  Captain approves → 48-hour payment window starts
Day 2 (Tuesday 10am): Angler A still hasn't paid, gets reminder email
Day 3 (Wednesday 12pm): Approval expires → status = EXPIRED
Day 3 (Wednesday 1pm):  Angler B books same date immediately
Day 3 (Wednesday 3pm):  Angler B pays → booking secured
```

## Recommended Expiration Strategy

### Tiered Expiration System

```typescript
┌──────────────────────────────────────────────────────────────────┐
│                    BOOKING EXPIRATION TIERS                      │
└──────────────────────────────────────────────────────────────────┘

STATUS: PENDING
├─ Duration: 12 hours from creation
├─ Rationale: Captain needs time to review and decide
├─ If captain doesn't respond: Auto-expire
└─ Notification: Email reminder at T+6 hours (to captain)

STATUS: APPROVED
├─ Duration: 48 hours from approval (RECOMMENDED)
├─ Rationale: Angler needs time to arrange payment
├─ If angler doesn't pay: Auto-expire
└─ Notifications:
   ├─ Immediate: "Approved! Complete payment within 48h"
   ├─ T+24h: "24 hours left to secure your booking"
   ├─ T+42h: "6 hours left! Don't lose your spot"
   └─ T+48h: "Booking expired, date released"

STATUS: PAID
├─ Duration: NEVER EXPIRES (until trip date)
├─ Rationale: Confirmed booking, payment received
├─ Date: BLOCKS CALENDAR (no other bookings allowed)
└─ Only cancellation can release the date

Urgency Levels:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Low:    > 24 hours remaining
🟡 Medium: 6-24 hours remaining
🔴 High:   < 6 hours remaining
⚫ Expired: Time's up
```

### Implementation Changes Required

```typescript
// 1. Update approve endpoint to extend expiresAt
// src/app/api/bookings/approve/route.ts

const APPROVED_EXPIRY_HOURS = 48; // 48 hours to pay after approval

const updated = await prisma.booking.update({
  where: { id },
  data: {
    status: "APPROVED",
    captainDecisionAt: new Date(),
    cancellationReason: null,
    // ✅ NEW: Extend expiration for APPROVED status
    expiresAt: new Date(Date.now() + APPROVED_EXPIRY_HOURS * 60 * 60 * 1000),
  },
});
```

```typescript
// 2. Update expiry cron to handle APPROVED bookings
// src/app/api/bookings/expire/route.ts

const result = await prisma.booking.updateMany({
  where: {
    // ✅ NEW: Expire both PENDING and APPROVED
    status: { in: ["PENDING", "APPROVED"] },
    expiresAt: { lt: now },
  },
  data: { status: "EXPIRED" },
});
```

```typescript
// 3. Add expiration time to booking response
// Include in all booking-related API responses

interface BookingResponse {
  id: string;
  status: BookingStatus;
  expiresAt: string | null; // ISO timestamp
  expiresIn: number | null; // Milliseconds remaining (for countdown)
  urgencyLevel: "low" | "medium" | "high" | "expired" | null;
}

function getUrgencyLevel(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const remaining = expiresAt.getTime() - Date.now();
  if (remaining <= 0) return "expired";
  if (remaining < 6 * 60 * 60 * 1000) return "high";
  if (remaining < 24 * 60 * 60 * 1000) return "medium";
  return "low";
}
```

## UX Strategy: Handling Booking Conflicts

### Scenario: Angler A's APPROVED booking gets sniped by Angler B

```
Timeline:
─────────────────────────────────────────────────────────────────
T=0h    Angler A: Books charter for June 15
T=1h    Captain:  Approves Angler A → 48h payment window
T=24h   Angler A: Ignores reminder email
T=47h   Angler A: Finally decides to pay...
T=47.5h Angler B: Books same date (A's approval about to expire)
T=48h   System:   Angler A's booking expires → EXPIRED
T=48.5h Captain:  Approves Angler B → 48h payment window
T=49h   Angler B: Pays immediately → booking PAID
T=50h   Angler A: Tries to pay but booking is EXPIRED 😱
```

### UX Flow for Angler A (Lost Their Spot)

#### 1. **Payment Page - Real-time Status Check**

```typescript
// Before showing payment form, check if booking still valid
// src/app/book/payment/[id]/page.tsx

export default async function PaymentPage({ params }: Props) {
  const booking = await getBookingById(params.id);

  // Real-time expiration check
  if (booking.status === "EXPIRED") {
    return <BookingExpiredScreen booking={booking} />;
  }

  // Check if date got booked by someone else
  const isDateStillAvailable = await checkDateAvailability(
    booking.charterId,
    booking.date,
    booking.startTime
  );

  if (!isDateStillAvailable) {
    return <DateNoLongerAvailableScreen booking={booking} />;
  }

  // Show countdown if expiring soon
  const expiresIn = booking.expiresAt
    ? booking.expiresAt.getTime() - Date.now()
    : null;

  return (
    <PaymentForm
      booking={booking}
      expiresIn={expiresIn}
      urgencyLevel={getUrgencyLevel(booking.expiresAt)}
    />
  );
}
```

#### 2. **Booking Expired Screen**

```tsx
// Component shown when booking has expired
// src/components/booking/BookingExpiredScreen.tsx

export function BookingExpiredScreen({ booking }: Props) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Empathetic messaging */}
      <div className="text-center mb-8">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          Your Booking Hold Has Expired
        </h1>
        <p className="text-gray-600 mb-4">
          We held this date for you, but didn't receive payment within the
          48-hour window. The date has been released and may now be available to
          other anglers.
        </p>
      </div>

      {/* Booking details summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-3">Booking Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Charter:</span>
            <span className="font-medium">{booking.charter.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{formatDate(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expired at:</span>
            <span className="text-red-600 font-medium">
              {formatDateTime(booking.expiresAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button onClick={handleCheckAvailability} className="w-full" size="lg">
          Check If This Date Is Still Available
        </Button>

        <Button
          variant="outline"
          onClick={handleBrowseSimilar}
          className="w-full"
        >
          Browse Similar Charters
        </Button>

        <Button
          variant="ghost"
          onClick={handleContactSupport}
          className="w-full"
        >
          Contact Support
        </Button>
      </div>

      {/* Educational content */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Why do bookings expire?
        </h4>
        <p className="text-sm text-blue-800">
          To be fair to all anglers and charter captains, we hold dates for a
          limited time. This ensures popular dates don't get locked up by unpaid
          bookings, giving everyone a fair chance to book their dream fishing
          trip.
        </p>
      </div>
    </div>
  );
}
```

#### 3. **Date No Longer Available Screen**

```tsx
// Component shown when someone else booked the date
// src/components/booking/DateNoLongerAvailableScreen.tsx

export function DateNoLongerAvailableScreen({ booking }: Props) {
  const [similarDates, setSimilarDates] = useState<Date[]>([]);

  useEffect(() => {
    // Fetch alternative available dates
    fetchSimilarAvailableDates(booking.charterId, booking.date).then(
      setSimilarDates
    );
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          This Date Is No Longer Available
        </h1>
        <p className="text-gray-600 mb-4">
          Another angler has just confirmed this date. But don't worry - there
          are other great dates available!
        </p>
      </div>

      {/* Original booking details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Your Original Selection</h3>
          <Badge variant="destructive">Unavailable</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="line-through text-gray-500">
              {formatDate(booking.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Alternative dates */}
      {similarDates.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">
            Available Dates for {booking.charter.name}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {similarDates.map((date) => (
              <Button
                key={date.toISOString()}
                variant="outline"
                onClick={() => handleSelectDate(date)}
                className="justify-start"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(date)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={handleViewCalendar} className="w-full" size="lg">
          <Calendar className="w-4 h-4 mr-2" />
          View Full Calendar
        </Button>

        <Button
          variant="outline"
          onClick={handleBrowseSimilar}
          className="w-full"
        >
          Browse Similar Charters
        </Button>
      </div>

      {/* Email notification opt-in */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">
          Get Notified of Cancellations
        </h4>
        <p className="text-sm text-blue-800 mb-3">
          We'll email you if {formatDate(booking.date)} becomes available due to
          a cancellation.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSetupWaitlist}
          className="bg-white"
        >
          Join Waitlist
        </Button>
      </div>
    </div>
  );
}
```

### Proactive Notifications Strategy

#### Email Notification Timeline

```typescript
┌──────────────────────────────────────────────────────────────────┐
│            EMAIL NOTIFICATION SEQUENCE (APPROVED)                │
└──────────────────────────────────────────────────────────────────┘

T=0h (Approval):
├─ Subject: "🎉 Your booking has been approved!"
├─ Content:
│  ├─ "Great news! The captain approved your booking"
│  ├─ "Complete payment within 48 hours to secure your spot"
│  ├─ Countdown timer: "47 hours, 59 minutes remaining"
│  └─ Big CTA: "Complete Payment Now"
└─ Urgency: 🟢 LOW

T=24h (Halfway reminder):
├─ Subject: "⏰ 24 hours left - Secure your fishing trip"
├─ Content:
│  ├─ "You're halfway through your booking window"
│  ├─ "Don't miss out - this date is in high demand"
│  ├─ Countdown timer: "23 hours, 59 minutes remaining"
│  └─ Big CTA: "Complete Payment Now"
└─ Urgency: 🟡 MEDIUM

T=42h (Final warning):
├─ Subject: "🚨 URGENT: 6 hours left on your booking"
├─ Content:
│  ├─ "Your booking expires in 6 hours!"
│  ├─ "After this, the date will be available to others"
│  ├─ Countdown timer: "5 hours, 59 minutes remaining"
│  ├─ "Quick payment options available"
│  └─ Big CTA: "Pay Now - Don't Lose Your Spot!"
└─ Urgency: 🔴 HIGH

T=48h (Expired):
├─ Subject: "Your booking has expired"
├─ Content:
│  ├─ Empathetic tone: "We're sorry your booking expired"
│  ├─ Explain why (fairness to all anglers)
│  ├─ Alternative dates available
│  ├─ CTA: "Check Availability" / "Browse Similar"
│  └─ Waitlist option: "Get notified if date opens up"
└─ Urgency: ⚫ EXPIRED
```

#### In-App Notifications

```typescript
// Real-time countdown in booking card
// src/components/booking/BookingCard.tsx

export function BookingCard({ booking }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!booking.expiresAt || booking.status === "PAID") return;

    const interval = setInterval(() => {
      const remaining = booking.expiresAt.getTime() - Date.now();
      setTimeRemaining(remaining > 0 ? remaining : 0);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [booking.expiresAt]);

  const urgency = getUrgencyLevel(booking.expiresAt);

  return (
    <Card className={cn(
      "relative",
      urgency === "high" && "ring-2 ring-red-500 animate-pulse-subtle"
    )}>
      {/* Urgency badge */}
      {urgency === "high" && (
        <div className="absolute top-2 right-2">
          <Badge variant="destructive" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon!
          </Badge>
        </div>
      )}

      {/* Booking details */}
      <CardContent>
        {/* ... charter name, date, etc ... */}

        {/* Countdown timer */}
        {booking.status === "APPROVED" && timeRemaining !== null && (
          <div className={cn(
            "mt-4 p-3 rounded-lg border",
            urgency === "high" && "bg-red-50 border-red-300",
            urgency === "medium" && "bg-amber-50 border-amber-300",
            urgency === "low" && "bg-blue-50 border-blue-300"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {urgency === "high" && "⚠️ Expires in:"}
                {urgency === "medium" && "⏰ Time left:"}
                {urgency === "low" && "✓ Approved until:"}
              </span>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                urgency === "high" && "text-red-600",
                urgency === "medium" && "text-amber-600",
                urgency === "low" && "text-blue-600"
              )}>
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>

            {urgency === "high" && (
              <Button
                className="w-full mt-2 bg-red-600 hover:bg-red-700"
                size="sm"
                onClick={handlePayNow}
              >
                Pay Now - Don't Lose Your Spot!
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
```

## Alternative Strategy: Encouragement Without Expiration

If you decide **NOT** to expire APPROVED bookings, here's how to encourage payment:

### Soft Encouragement Approach

```typescript
┌──────────────────────────────────────────────────────────────────┐
│       ENCOURAGEMENT STRATEGY (NO EXPIRATION FOR APPROVED)        │
└──────────────────────────────────────────────────────────────────┘

Visual Indicators:
├─ No countdown timer (less pressure)
├─ Green checkmark: "Captain Approved ✓"
├─ Soft CTA: "Complete Payment to Confirm"
└─ Educational note: "Your spot is held until you pay"

Email Sequence:
├─ T=0h:  "Approved! Complete payment when ready"
├─ T=24h: "Friendly reminder: Complete your booking"
├─ T=72h: "Still interested? Let us know!"
└─ T=7d:  Captain gets notification: "Payment pending for 7 days"

Manual Intervention:
├─ Captain can cancel if angler doesn't respond
├─ Support team can follow up with angler
├─ No automatic expiration
└─ Relies on human judgment

Pros:
✅ Less pressure on anglers
✅ Simpler system logic
✅ Good for low-demand charters

Cons:
❌ Dates held indefinitely
❌ Lost revenue for captains
❌ Manual work required
❌ Not scalable
```

## Recommendation & Implementation Priority

### ✅ RECOMMENDED: Tiered Expiration System

**Reasoning:**

1. **Fair to all parties**: Anglers get reasonable time, captains don't lose bookings
2. **Industry standard**: Hotels, flights, events all use expiration
3. **Automated**: No manual intervention needed
4. **Scalable**: Works at any booking volume
5. **Clear expectations**: Everyone knows the rules

**Implementation Priority:**

```
Phase 1 (Immediate - Critical):
├─ [ ] Update approve endpoint to extend expiresAt to 48h
├─ [ ] Update expire cron to handle APPROVED bookings
├─ [ ] Add expiresIn and urgencyLevel to API responses
└─ [ ] Test expiration flow end-to-end

Phase 2 (High - UX):
├─ [ ] Build BookingExpiredScreen component
├─ [ ] Build DateNoLongerAvailableScreen component
├─ [ ] Add real-time status checks in payment page
├─ [ ] Add countdown timer to booking cards
└─ [ ] Add urgency badges and animations

Phase 3 (High - Notifications):
├─ [ ] Email: Approval confirmation with 48h notice
├─ [ ] Email: 24-hour reminder
├─ [ ] Email: 6-hour final warning
├─ [ ] Email: Expiration notification
└─ [ ] In-app notification banner

Phase 4 (Medium - Enhancements):
├─ [ ] Waitlist feature for fully booked dates
├─ [ ] Alternative date suggestions
├─ [ ] "Quick pay" one-click payment option
└─ [ ] Analytics dashboard for expiration rates

Phase 5 (Low - Polish):
├─ [ ] Animated countdown timers
├─ [ ] SMS notifications (optional)
├─ [ ] Push notifications (optional)
└─ [ ] A/B test different expiration windows
```

## Monitoring & Analytics

Track these metrics to optimize the system:

```
Key Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Expiration rate: % of APPROVED bookings that expire
• Time to payment: Average hours between approval and payment
• Recovery rate: % of expired anglers who rebook
• Lost revenue: Value of expired bookings
• Email effectiveness: Open/click rates for reminder emails
• Optimal window: Is 48h too long/short? Analyze payment patterns

Target Goals:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Expiration rate < 15%
• Time to payment < 12 hours
• Recovery rate > 40%
• Email open rate > 60%
• Payment completion rate > 85%
```

---

**Status:** Proposed  
**Decision Required:** Choose between tiered expiration vs. encouragement-only  
**Recommended:** Tiered expiration (48h for APPROVED)  
**Next Step:** Implement Phase 1 (expiration logic updates)
