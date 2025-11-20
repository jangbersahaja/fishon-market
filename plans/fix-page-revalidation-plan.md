# Plan: Fix Page Revalidation for Booking & Message Transactions

After booking flow migration, critical pages are not refreshing when booking status changes or new transactions occur. This causes users to see stale data (booking status, calendar availability, message context) until manual page refresh. This plan implements comprehensive revalidation across all booking and message APIs in both fishon-market and fishon-captain.

**Phases: 8**

---

## Phase 1: Fix Booking Creation Routes - fishon-market

**Objective:** Add revalidation to all three booking creation endpoints so booking list, confirmation page, and message pages refresh immediately after booking creation.

**Files/Functions to Modify/Create:**

- `fishon-market/src/app/api/bookings/create/route.ts` - Add revalidation block before return
- `fishon-market/src/app/api/bookings/create-manual/route.ts` - Add revalidation block before return
- `fishon-market/src/app/api/bookings/create-guest/route.ts` - Add revalidation block before return

**Tests to Write:**

- None (manual verification via user journey testing)

**Steps:**

1. **Import revalidatePath** in all three create routes if not already imported
   - Add `import { revalidatePath } from "next/cache";` at top of each file

2. **Add conversationId fetch** in `create/route.ts` (line ~810, after booking creation)
   - Query database: `const conversation = await prisma.conversation.findUnique({ where: { bookingId: booking.id }, select: { id: true } })`
   - Add revalidation block before return statement

3. **Add revalidation block** in `create-manual/route.ts` (line ~425, before return)
   - Use existing `conversationId` variable (already available from createConversation call)
   - Add revalidatePath calls for `/account/bookings`, `/book/confirm`, and conditional message page

4. **Add conversationId fetch + revalidation** in `create-guest/route.ts` (line ~665, after booking creation)
   - Query database (same as create route)
   - Add revalidation block before return statement

5. **Verify paths match existing patterns** in each file
   - Check if file uses `"page"` type parameter or omits it
   - Apply consistent pattern within each file

---

## Phase 2: Fix Booking Acknowledge Route - fishon-market

**Objective:** Add message page revalidation to acknowledge endpoint so chat reflects PAID status after captain acknowledges payment.

**Files/Functions to Modify/Create:**

- `fishon-market/src/app/api/bookings/acknowledge/route.ts` - Add conversationId fetch and message page revalidation

**Tests to Write:**

- None (manual verification)

**Steps:**

1. **Add conversationId fetch** after existing revalidation block (line ~244, after existing revalidatePath calls)
   - Query database: `const conversation = await prisma.conversation.findUnique({ where: { bookingId: updated.id }, select: { id: true } })`

2. **Add conditional revalidation** for message page
   - `if (conversation) { revalidatePath(`/account/messages/${conversation.id}`); }`

3. **Verify placement** - Should be after all database updates complete but before return statement

---

## Phase 3: Fix Booking Status Change Routes - fishon-market

**Objective:** Add message page revalidation to cancel, approve, and reject endpoints so chat reflects updated booking status.

**Files/Functions to Modify/Create:**

- `fishon-market/src/app/api/bookings/cancel/route.ts` - Add conversationId fetch and message revalidation
- `fishon-market/src/app/api/bookings/approve/route.ts` - Add conversationId fetch and message revalidation
- `fishon-market/src/app/api/bookings/reject/route.ts` - Add conversationId fetch and message revalidation

**Tests to Write:**

- None (manual verification)

**Steps:**

1. **Add conversationId fetch** in `cancel/route.ts` (after line ~455, after existing revalidatePath calls)
   - Query database with bookingId from request
   - Add conditional message page revalidation

2. **Add conversationId fetch** in `approve/route.ts` (after line ~233, after existing revalidatePath calls)
   - Query database with bookingId from request
   - Add conditional message page revalidation

3. **Add conversationId fetch** in `reject/route.ts` (after line ~368, after existing revalidatePath calls)
   - Query database with bookingId from request
   - Add conditional message page revalidation

4. **Verify consistent pattern** across all three routes
   - Same query structure
   - Same conditional revalidation pattern

---

## Phase 4: Fix Booking Actions - fishon-captain

**Objective:** Add booking pages, dashboard, and calendar revalidation to approve/reject server actions so captain sees updated data immediately.

**Files/Functions to Modify/Create:**

- `fishon-captain/src/app/actions/booking-actions.ts` - Add missing revalidation paths to `approveBooking` and `rejectBooking` functions

**Tests to Write:**

- None (manual verification)

**Steps:**

1. **Locate existing revalidation** in `approveBooking` function (around line 100-120)
   - Currently revalidates: `/captain/messages`, `/captain/messages/${conversationId}`

2. **Add missing paths** to `approveBooking` revalidation block
   - Add `/captain/bookings`
   - Add `/captain/bookings/${bookingId}`
   - Add `/captain/dashboard`
   - Add `/captain/calendar`
   - Keep existing message paths

3. **Apply same changes** to `rejectBooking` function
   - Find existing revalidation block
   - Add same 4 missing paths

4. **Verify bookingId availability** in both functions
   - Already available as function parameter
   - No database fetch needed

---

## Phase 5: Fix Booking Webhook - fishon-captain

**Objective:** Add calendar and message page revalidation to webhook handler so captain dashboard, calendar, and chat all reflect new bookings from fishon-market.

**Files/Functions to Modify/Create:**

- `fishon-captain/src/app/api/webhooks/booking/route.ts` - Add conversationId fetch, calendar revalidation, and message page revalidation

**Tests to Write:**

- None (manual verification)

**Steps:**

1. **Locate existing revalidation block** (around line 242-244)
   - Currently revalidates: `/captain/bookings`, `/captain/bookings/${bookingId}`, `/captain/dashboard`

2. **Add calendar revalidation** immediately after existing paths
   - Add `revalidatePath("/captain/calendar");`

3. **Add conversationId fetch** after calendar revalidation
   - Query: `const conversation = await prisma.conversation.findUnique({ where: { bookingId: booking.id }, select: { id: true } })`

4. **Add conditional message page revalidation**
   - `if (conversation) { revalidatePath(`/captain/messages/${conversation.id}`); }`

5. **Consider webhook performance** - Single extra query adds ~5-15ms, acceptable for webhook processing

---

## Phase 6: Manual Testing - Booking Creation Flow

**Objective:** Verify all booking creation routes properly refresh pages for both authenticated users and guests.

**Files/Functions to Modify/Create:**

- None (testing phase)

**Tests to Write:**

- Manual user journey testing with browser DevTools Network panel

**Steps:**

1. **Test authenticated user booking (AUTO flow)**
   - Submit booking at `/book` page
   - Verify `/account/bookings` shows new booking without refresh
   - Verify `/book/confirm` shows correct status
   - Verify `/account/messages/${conversationId}` accessible

2. **Test authenticated user booking (MANUAL flow)**
   - Submit booking via `/api/bookings/create-manual`
   - Verify same pages refresh as AUTO flow
   - Verify conversation always created

3. **Test guest booking**
   - Submit booking as guest
   - Verify `/book/confirm` shows correct status
   - Verify email sent with booking details

4. **Monitor browser Network panel**
   - Look for `/_next/data/` requests (indicates revalidation working)
   - Verify no full page reload required

5. **Check server logs** for any revalidation errors (silent failures)

---

## Phase 7: Manual Testing - Status Change Flow

**Objective:** Verify booking status changes (approve, reject, cancel, acknowledge) properly refresh all relevant pages.

**Files/Functions to Modify/Create:**

- None (testing phase)

**Tests to Write:**

- Manual captain workflow testing

**Steps:**

1. **Test captain approval (via fishon-captain server action)**
   - Captain approves PENDING booking
   - Verify `/captain/bookings` shows AWAITING_PAYMENT status
   - Verify `/captain/calendar` blocks dates
   - Verify `/captain/messages/${conversationId}` reflects status
   - Verify `/captain/dashboard` updates stats

2. **Test captain rejection**
   - Captain rejects booking
   - Verify same pages update as approval
   - Verify message page shows REJECTED status

3. **Test booking cancellation (angler side)**
   - Angler cancels booking via `/account/bookings`
   - Verify `/account/bookings` shows CANCELLED
   - Verify `/account/messages/${conversationId}` reflects cancellation
   - Verify captain side updates via webhook

4. **Test payment acknowledgment (captain side)**
   - Captain acknowledges DIRECT payment
   - Verify `/captain/bookings` shows PAID
   - Verify `/account/bookings` shows PAID
   - Verify `/account/messages/${conversationId}` reflects status

5. **Test webhook propagation**
   - Create booking in fishon-market
   - Verify webhook reaches fishon-captain (check logs)
   - Verify captain pages update within 1-2 seconds

---

## Phase 8: Manual Testing - Calendar & Message Integration

**Objective:** Verify calendar availability and message page booking cards update correctly after all transaction types.

**Files/Functions to Modify/Create:**

- None (testing phase)

**Tests to Write:**

- Calendar date blocking verification
- Message page booking card status verification

**Steps:**

1. **Test calendar date blocking**
   - Create booking for specific dates
   - Verify `/captain/calendar` shows dates blocked
   - Approve booking → verify calendar updates
   - Cancel booking → verify calendar clears dates

2. **Test message page booking context**
   - Create booking with conversation
   - Open `/account/messages/${conversationId}` (angler side)
   - Verify booking card shows correct status (PENDING)
   - Captain approves → refresh page → verify status changes
   - Compare with Pusher real-time updates (should NOT update booking card, only messages)

3. **Test cross-app synchronization**
   - Create booking in fishon-market
   - Verify appears in fishon-captain within seconds
   - Change status in fishon-captain
   - Verify appears in fishon-market after webhook

4. **Test edge case: No conversation**
   - Some bookings may not have conversation (edge case)
   - Verify revalidation doesn't break when conversationId is null
   - Check server logs for errors

5. **Document any issues found** in `plans/fix-page-revalidation-issues.md` for post-implementation fixes

---

## Implementation Notes

### conversationId Availability Pattern

**When to fetch from database:**

- ✅ Booking creation routes (async conversation creation)
- ✅ Webhook handler (conversationId not in payload)
- ✅ Status change routes (conversationId not in request)

**When conversationId already available:**

- ✅ `create-manual` route (stored in variable after createConversation)
- ✅ Captain booking actions (included in booking.conversation relation)

**Query pattern to use:**

```typescript
const conversation = await prisma.conversation.findUnique({
  where: { bookingId: booking.id },
  select: { id: true },
});

if (conversation) {
  revalidatePath(`/account/messages/${conversation.id}`);
  // or /captain/messages/${conversation.id} for captain routes
}
```

### Revalidation Pattern Consistency

**Match existing pattern per file:**

- If file uses `"page"` type parameter → continue using it
- If file omits type parameter → continue omitting
- Do NOT mix patterns within same file

**Example:**

```typescript
// If existing code has:
revalidatePath("/account/bookings", "page");

// Then add:
revalidatePath("/book/confirm", "page");
revalidatePath(`/account/messages/${conversationId}`, "page");

// If existing code has:
revalidatePath("/captain/bookings");

// Then add:
revalidatePath("/captain/calendar");
```

### Error Handling

**Do NOT add try-catch around revalidatePath:**

- Next.js handles failures internally (silent, logged)
- Revalidation is best-effort, non-blocking
- App continues working even if revalidation fails

### Transaction Boundaries

**Always revalidate AFTER database commits:**

```typescript
// ✅ Good: After transaction completes
const booking = await prisma.booking.create({ ... });
await prisma.$transaction([...]); // if using transactions
revalidatePath("/account/bookings");

// ❌ Wrong: Inside transaction
await prisma.$transaction([
  prisma.booking.create({ ... }),
  revalidatePath("/account/bookings") // NOT a Prisma operation!
]);
```

---

## Open Questions

**None** - All implementation paths are clear from research phase.

---

## Success Criteria

After all phases complete:

1. ✅ Creating booking → booking list refreshes without manual reload
2. ✅ Approving booking → captain dashboard, calendar, and chat update immediately
3. ✅ Cancelling booking → status reflects on both apps within seconds
4. ✅ Acknowledging payment → message page shows PAID status
5. ✅ All manual tests pass (Phases 6-8)
6. ✅ No server errors in logs related to revalidation
7. ✅ Pusher still works for message updates (independent from revalidation)

---

## Related Documentation

- [Revalidation Audit](../docs/REVALIDATION_AUDIT.md) - Complete gap analysis
- [Pusher Channel Fix](../docs/PUSHER_CHANNEL_FIX.md) - Prior notification fix
- [Booking Notification Auto Flow Fix](../docs/BOOKING_NOTIFICATION_AUTO_FLOW_FIX.md) - Prior webhook fix
