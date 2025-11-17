# Page Revalidation Audit

**Date:** 2025-01-27
**Context:** After booking flow migration, verifying all APIs properly revalidate pages on booking and message transactions.

---

## Current Revalidation Coverage

### Fishon Captain

#### ✅ Message API: `/api/captain/conversations/[id]/messages`

**When:** Captain sends message
**Revalidates:**

- `/captain/messages`
- `/captain/messages/[id]`

**Status:** ✅ CORRECT

---

#### ⚠️ Booking Webhook: `/api/webhooks/booking`

**When:** Receives booking event from fishon-market
**Current Revalidation:**

- `/captain/bookings`
- `/captain/bookings/${bookingId}`
- `/captain/dashboard`

**Missing:**

- ❌ `/captain/calendar` - Booking affects calendar availability
- ❌ `/captain/messages/${conversationId}` - Booking status affects chat context

**Impact:** Calendar doesn't refresh when bookings created. Chat page doesn't show updated booking status until manual refresh.

---

#### ⚠️ Booking Actions: `src/app/actions/booking-actions.ts`

**When:** Captain approves/rejects booking
**Current Revalidation:**

- `/captain/messages`
- `/captain/messages/${conversationId}`

**Missing:**

- ❌ `/captain/bookings`
- ❌ `/captain/bookings/${bookingId}`
- ❌ `/captain/dashboard`
- ❌ `/captain/calendar`

**Impact:** Booking list and detail pages don't refresh after captain approves/rejects. Dashboard stats outdated. Calendar availability not updated.

---

### Fishon Market

#### ✅ Message API: `/api/conversations/[id]/messages`

**When:** Angler sends message
**Revalidates:**

- `/account/messages`
- `/account/messages/${id}`

**Status:** ✅ CORRECT

---

#### ✅ Payment Side Effects: `src/lib/payment/payment-side-effects.ts`

**When:** Payment status changes (authorized, captured, failed)
**Revalidates:**

- `/book/confirm`
- `/account/bookings`

**Status:** ✅ CORRECT

---

#### ⚠️ Booking Create: `/api/bookings/create`

**When:** Authenticated user creates booking (AUTO flow with immediate payment)
**Current Revalidation:** None

**Missing:**

- ❌ `/account/bookings` - User's booking list
- ❌ `/book/confirm` - Confirmation page
- ❌ `/account/messages/${conversationId}` - Associated chat (if conversation created)

**Impact:** After creating booking, user must refresh to see it in booking list.

---

#### ⚠️ Booking Create Manual: `/api/bookings/create-manual`

**When:** Authenticated user creates booking (MANUAL flow, requires approval)
**Current Revalidation:** None

**Missing:**

- ❌ `/account/bookings` - User's booking list
- ❌ `/book/confirm` - Confirmation page
- ❌ `/account/messages/${conversationId}` - Associated chat (conversation always created)

**Impact:** After creating booking, user must refresh to see it in booking list.

---

#### ⚠️ Booking Create Guest: `/api/bookings/create-guest`

**When:** Guest creates booking
**Current Revalidation:** None

**Missing:**

- ❌ `/book/confirm` - Confirmation page
- ❌ `/account/messages/${conversationId}` - Associated chat (if conversation created)

**Impact:** Guest confirmation page may show stale data.

---

#### ✅ Booking Acknowledge: `/api/bookings/acknowledge`

**When:** Captain acknowledges payment received (for DIRECT payment flow)
**Revalidates:**

- `/captain/bookings`
- `/captain/bookings/[id]`
- `/account/bookings`
- `/account/bookings/[id]`

**Status:** ✅ CORRECT (but missing message page - see below)

**Note:** Should also revalidate `/account/messages/${conversationId}` when conversation exists.

---

#### ⚠️ Booking Cancel: `/api/bookings/cancel`

**When:** User cancels booking
**Current Revalidation:**

- `/book/confirm`
- `/account/bookings`

**Missing:**

- ❌ `/account/messages/${conversationId}` - Chat should reflect cancelled status

**Impact:** Chat doesn't show cancelled status until refresh.

---

#### ⚠️ Booking Reject: `/api/bookings/reject`

**When:** Captain rejects booking (via admin)
**Current Revalidation:**

- `/book/confirm`
- `/account/bookings`

**Missing:**

- ❌ `/account/messages/${conversationId}` - Chat should reflect rejected status

**Impact:** Chat doesn't show rejected status until refresh.Chat should reflect approved status

**Impact:** Chat doesn't show approved status until refresh.

---

#### ⚠️ Booking Reject: `/api/bookings/reject`

**When:** Captain rejects booking (via admin)
**Current Revalidation:** None

**Missing:**

- ❌ `/account/bookings`
- ❌ `/book/confirm`
- ❌ `/account/messages/${conversationId}` - Chat should reflect rejected status

**Impact:** Pages show stale booking status.

---

## Required Fixes

### Priority 1: Critical Missing Revalidations

#### 1. Booking Webhook (fishon-captain)

**File:** `fishon-captain/src/app/api/webhooks/booking/route.ts`

Add to existing revalidation:

```typescript
revalidatePath(`/captain/calendar`);
if (conversationId) {
  revalidatePath(`/captain/messages/${conversationId}`);
}
```

---

#### 2. Booking Actions (fishon-captain)

**File:** `fishon-captain/src/app/actions/booking-actions.ts`

Add to approve/reject actions:

```typescript
revalidatePath("/captain/bookings");
revalidatePath(`/captain/bookings/${bookingId}`);
revalidatePath("/captain/dashboard");
revalidatePath("/captain/calendar");
```

---

#### 3. Booking Create Routes (fishon-market)

**Files:**

- `fishon-market/src/app/api/bookings/create/route.ts`
- `fishon-market/src/app/api/bookings/create-manual/route.ts`
- `fishon-market/src/app/api/bookings/create-guest/route.ts`

Add after booking creation (all three routes):

```typescript
revalidatePath("/account/bookings");
revalidatePath("/book/confirm");
if (conversationId) {
  revalidatePath(`/account/messages/${conversationId}`);
}
```

**Note:** `create-manual` always creates conversation, others conditionally.

---

#### 4. Booking Acknowledge (fishon-market)

**File:** `fishon-market/src/app/api/bookings/acknowledge/route.ts`

Add to existing revalidation:

```typescript
if (conversationId) {
  revalidatePath(`/account/messages/${conversationId}`);
}
```

---

#### 5. Booking Cancel (fishon-market)

**File:** `fishon-market/src/app/api/bookings/cancel/route.ts`

Add to existing revalidation:

```typescript
if (conversationId) {
  revalidatePath(`/account/messages/${conversationId}`);
}
```

---

#### 6. Booking Approve/Reject (fishon-market)

**Files:**

- `fishon-market/src/app/api/bookings/approve/route.ts`
- `fishon-market/src/app/api/bookings/reject/route.ts`

Add to both:

```typescript
if (conversationId) {
  revalidatePath(`/account/messages/${conversationId}`);
}
```

---

## Testing Checklist

### Fishon Captain Pages

- [ ] `/captain/bookings` - Refreshes when webhook receives new booking
- [ ] `/captain/bookings/[id]` - Refreshes when booking status changes
- [ ] `/captain/calendar` - Refreshes when new booking created or cancelled
- [ ] `/captain/dashboard` - Refreshes when booking status changes
- [ ] `/captain/messages` - Refreshes when captain sends message
- [ ] `/captain/messages/[id]` - Refreshes when:
  - Captain sends message
  - Booking status changes (webhook)
  - Angler sends message (Pusher real-time)

### Fishon Market Pages

- [ ] `/account/bookings` - Refreshes when:
  - User creates booking
  - User cancels booking
  - Booking approved/rejected
  - Payment status changes
- [ ] `/book/confirm` - Refreshes when:
  - Booking created
  - Payment status changes
  - Booking approved/rejected
- [ ] `/account/messages` - Refreshes when user sends message
- [ ] `/account/messages/[id]` - Refreshes when:
  - User sends message
  - Booking created with conversation
  - Booking status changes
  - Booking cancelled

---

## Implementation Notes

### Conversation ID Availability

Some APIs may need to fetch conversationId from booking:

```typescript
const booking = await db.booking.findUnique({
  where: { id: bookingId },
  select: { conversationId: true },
});

if (booking?.conversationId) {
  revalidatePath(`/account/messages/${booking.conversationId}`);
}
```

### Dynamic Route Revalidation

Next.js revalidates:

- `/path/[param]` → Revalidates specific instance only
- `/path` → Revalidates list page only

Need both for complete refresh!

---

## Related Documentation

- [Pusher Channel Fix](./PUSHER_CHANNEL_FIX.md)
- [Booking Notification Auto Flow Fix](./BOOKING_NOTIFICATION_AUTO_FLOW_FIX.md)
- [Next.js Revalidation Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#on-demand-revalidation)
