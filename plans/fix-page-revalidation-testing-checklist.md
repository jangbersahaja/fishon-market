# Page Revalidation Testing Checklist

**Purpose:** Verify all booking and message pages refresh automatically after transactions without requiring manual page reload.

**Test Environment:**

- fishon-market: http://localhost:3000
- fishon-captain: http://localhost:3001 (or appropriate port)
- Use browser DevTools Network tab to monitor `_next/data/` requests (indicates revalidation)

---

## Phase 6: Booking Creation Flow Testing

### Test 6.1: Authenticated User Booking (AUTO Flow)

**Setup:**

- Log in as registered user (angler)
- Select a charter with AUTO booking flow
- Have fishon-captain open in another browser window (logged in as captain)

**Steps:**

1. Submit booking at `/book` page
2. ✅ **Verify**: `/account/bookings` shows new booking **without refresh**
3. ✅ **Verify**: `/book/confirm` shows correct status (PAYMENT_AUTHORIZED)
4. ✅ **Verify**: `/account/messages/${conversationId}` is accessible
5. ✅ **Verify**: Browser Network tab shows `_next/data/` requests (revalidation)
6. Switch to fishon-captain window
7. ✅ **Verify**: `/captain/bookings` shows new booking **within 2 seconds**
8. ✅ **Verify**: `/captain/calendar` shows dates blocked
9. ✅ **Verify**: `/captain/dashboard` shows updated stats

**Expected Behavior:**

- Angler sees booking immediately in list
- Captain receives webhook and pages update automatically
- No full page reload required on either side

---

### Test 6.2: Authenticated User Booking (MANUAL Flow)

**Setup:**

- Log in as registered user
- Select a charter with MANUAL booking flow (requires approval)

**Steps:**

1. Submit booking via form
2. ✅ **Verify**: `/account/bookings` shows PENDING status **without refresh**
3. ✅ **Verify**: `/book/confirm` shows "Awaiting captain approval" message
4. ✅ **Verify**: Conversation is created (`/account/messages/${conversationId}` accessible)
5. ✅ **Verify**: Message page shows booking card with PENDING status
6. Switch to fishon-captain
7. ✅ **Verify**: `/captain/bookings` shows new booking request
8. ✅ **Verify**: `/captain/messages/${conversationId}` shows booking context

**Expected Behavior:**

- MANUAL flow always creates conversation
- Both apps reflect PENDING status immediately
- Message pages accessible on both sides

---

### Test 6.3: Guest Booking

**Setup:**

- Log out or use incognito window
- Select any charter

**Steps:**

1. Submit booking as guest (enter email, phone)
2. ✅ **Verify**: `/book/confirm` shows booking confirmation **without refresh**
3. ✅ **Verify**: Confirmation page displays guest booking ID
4. ✅ **Verify**: Email sent to guest (check email or logs)
5. Switch to fishon-captain
6. ✅ **Verify**: `/captain/bookings` shows new guest booking
7. ✅ **Verify**: If conversation created, `/captain/messages/${conversationId}` accessible

**Expected Behavior:**

- Guest confirmation page refreshes automatically
- Captain sees guest booking via webhook
- Email notification sent successfully

---

### Test 6.4: Browser DevTools Verification

**Steps:**

1. Open DevTools → Network tab
2. Filter by "data" or "\_next"
3. Create a booking
4. ✅ **Verify**: See requests like:
   - `/_next/data/.../account/bookings.json`
   - `/_next/data/.../book/confirm.json`
   - `/_next/data/.../account/messages/[id].json`
5. ✅ **Verify**: Status codes are 200 (successful revalidation)
6. ✅ **Verify**: NO full page reload (document request)

**Expected Behavior:**

- Data fetches triggered automatically (Next.js revalidation)
- Page content updates without full reload
- Smooth UX without flashing/loading indicators

---

## Phase 7: Status Change Flow Testing

### Test 7.1: Captain Approval (Server Action)

**Setup:**

- Have a PENDING booking (MANUAL flow)
- Log in as captain in fishon-captain
- Log in as angler in fishon-market (different browser/window)

**Steps:**

1. In fishon-captain, go to `/captain/bookings`
2. Click "Approve" on a PENDING booking
3. ✅ **Verify**: `/captain/bookings` updates status **without refresh**
4. ✅ **Verify**: `/captain/bookings/${bookingId}` shows AWAITING_PAYMENT
5. ✅ **Verify**: `/captain/calendar` blocks booking dates
6. ✅ **Verify**: `/captain/dashboard` stats update
7. ✅ **Verify**: `/captain/messages/${conversationId}` shows updated booking card
8. Switch to fishon-market window
9. Wait 2-3 seconds (webhook propagation)
10. ✅ **Verify**: `/account/bookings` shows AWAITING_PAYMENT **without refresh**
11. ✅ **Verify**: `/account/messages/${conversationId}` reflects approval

**Expected Behavior:**

- Captain side updates instantly (server action)
- Angler side updates via webhook within 2 seconds
- All pages synchronized across both apps

---

### Test 7.2: Captain Rejection

**Setup:**

- Same as Test 7.1

**Steps:**

1. Captain clicks "Reject" on a booking
2. ✅ **Verify**: All captain pages update (bookings, calendar, dashboard, messages)
3. ✅ **Verify**: Angler pages update via webhook (bookings list, message page)
4. ✅ **Verify**: Rejection reason visible in booking details
5. ✅ **Verify**: Calendar dates released (no longer blocked)

**Expected Behavior:**

- REJECTED status propagates to all pages
- Calendar availability restored
- Both apps synchronized

---

### Test 7.3: Booking Cancellation (Angler Side)

**Setup:**

- Have an active booking (AWAITING_PAYMENT or PAID)
- Log in as angler

**Steps:**

1. Go to `/account/bookings`
2. Click "Cancel" on a booking
3. ✅ **Verify**: `/account/bookings` shows CANCELLED **without refresh**
4. ✅ **Verify**: `/book/confirm` reflects cancellation
5. ✅ **Verify**: `/account/messages/${conversationId}` shows cancelled status
6. Switch to fishon-captain
7. ✅ **Verify**: `/captain/bookings` shows CANCELLED (via webhook)
8. ✅ **Verify**: `/captain/calendar` dates released
9. ✅ **Verify**: `/captain/messages/${conversationId}` shows cancellation

**Expected Behavior:**

- Cancellation propagates from market → captain
- Calendar automatically updates
- Refund process triggered (if applicable)

---

### Test 7.4: Payment Acknowledgment (Captain)

**Setup:**

- Have booking with PAYMENT_AUTHORIZED status (DIRECT payment flow)
- Log in as captain

**Steps:**

1. Captain goes to `/captain/bookings`
2. Click "Acknowledge Payment" on DIRECT payment booking
3. ✅ **Verify**: `/captain/bookings` shows PAID **without refresh**
4. ✅ **Verify**: `/account/bookings` shows PAID (via webhook)
5. ✅ **Verify**: `/account/messages/${conversationId}` shows PAID status
6. ✅ **Verify**: Conversation unlocked for messaging

**Expected Behavior:**

- PAID status visible immediately on captain side
- Angler sees update via webhook
- Chat unlocked for communication

---

### Test 7.5: Webhook Propagation Timing

**Setup:**

- Browser windows open for both apps

**Steps:**

1. Perform any status change in fishon-captain
2. Start timer
3. ✅ **Verify**: fishon-market pages update within **2-3 seconds max**
4. Check server logs for webhook delivery confirmation
5. ✅ **Verify**: No error logs for revalidation failures

**Expected Behavior:**

- Webhook reaches fishon-market within 1-2 seconds
- Revalidation completes quickly (< 100ms)
- Total propagation time < 3 seconds

---

## Phase 8: Calendar & Message Integration Testing

### Test 8.1: Calendar Date Blocking

**Setup:**

- Log in as captain
- Select charter with available dates

**Steps:**

1. Create booking for specific dates (e.g., Dec 20-22)
2. ✅ **Verify**: `/captain/calendar` shows Dec 20-22 **blocked immediately**
3. Approve the booking (if MANUAL)
4. ✅ **Verify**: Calendar still shows dates blocked
5. Cancel the booking
6. ✅ **Verify**: `/captain/calendar` shows dates **available again**
7. ✅ **Verify**: No refresh required for any step

**Expected Behavior:**

- Calendar reflects booking status in real-time
- Date blocking/unblocking happens automatically
- Visual indicators update without page reload

---

### Test 8.2: Message Page Booking Context Card

**Setup:**

- Create booking with conversation
- Open message page on both sides

**Steps:**

1. Angler: Open `/account/messages/${conversationId}`
2. ✅ **Verify**: Booking card shows current status (e.g., PENDING)
3. Captain: Approve booking
4. Angler: Refresh message page manually (for baseline)
5. ✅ **Verify**: Booking card now shows AWAITING_PAYMENT
6. Angler: Send a message
7. ✅ **Verify**: Pusher delivers message in real-time (NOT via revalidation)
8. Captain: Send message back
9. ✅ **Verify**: Angler sees message via Pusher
10. Change booking status again
11. ✅ **Verify**: Booking card updates but messages use Pusher

**Expected Behavior:**

- Booking status card updates via revalidation
- Messages update via Pusher (real-time)
- Two independent update mechanisms working together

---

### Test 8.3: Cross-App Synchronization

**Setup:**

- Both apps open side-by-side

**Steps:**

1. fishon-market: Create booking
2. ✅ **Verify**: Appears in fishon-captain within 1-2 seconds
3. fishon-captain: Change status (approve/reject)
4. ✅ **Verify**: Updates in fishon-market within 1-2 seconds
5. fishon-market: Cancel booking
6. ✅ **Verify**: Updates in fishon-captain within 1-2 seconds
7. ✅ **Verify**: All pages synchronized (bookings, calendar, messages, dashboard)

**Expected Behavior:**

- Bi-directional synchronization works reliably
- No data inconsistencies between apps
- Webhook system functioning correctly

---

### Test 8.4: Edge Case - No Conversation

**Setup:**

- Create booking that doesn't create conversation (AUTO flow, specific conditions)

**Steps:**

1. Submit booking
2. ✅ **Verify**: Booking list and confirmation page still refresh
3. ✅ **Verify**: No errors in browser console
4. ✅ **Verify**: No errors in server logs (revalidation handles null conversationId)
5. ✅ **Verify**: Pages remain functional

**Expected Behavior:**

- Revalidation gracefully handles missing conversations
- Conditional checks prevent errors
- Core functionality unaffected

---

### Test 8.5: Pusher vs Revalidation Independence

**Setup:**

- Temporarily disable Pusher (comment out Pusher initialization)

**Steps:**

1. Create booking
2. ✅ **Verify**: Booking pages still refresh (revalidation working)
3. Change booking status
4. ✅ **Verify**: Status updates propagate (via revalidation, not Pusher)
5. ✅ **Verify**: Message count badges DON'T update (Pusher disabled)
6. Re-enable Pusher
7. ✅ **Verify**: Message notifications work again
8. ✅ **Verify**: Booking updates still work (revalidation independent)

**Expected Behavior:**

- Revalidation works independently of Pusher
- Pusher handles message notifications only
- Booking data updates via revalidation only

---

## Post-Testing: Issue Documentation

If any test fails, document in `plans/fix-page-revalidation-issues.md`:

```markdown
## Issue: [Brief Description]

**Test:** [Test number and name]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Browser:** [Chrome/Safari/Firefox + version]
**Environment:** [Development/Production]

**Steps to Reproduce:**

1. ...
2. ...

**Console Errors:** [Copy paste any errors]
**Server Logs:** [Copy paste relevant logs]

**Potential Fix:** [Your hypothesis]
```

---

## Success Criteria

✅ All tests in Phase 6 pass (booking creation)  
✅ All tests in Phase 7 pass (status changes)  
✅ All tests in Phase 8 pass (calendar & messages)  
✅ No console errors during testing  
✅ No server errors in logs  
✅ Webhook propagation < 3 seconds  
✅ Pusher real-time updates still working  
✅ No breaking changes to existing functionality

**If all tests pass:** Implementation is production-ready ✅  
**If any test fails:** Document issue and create follow-up fix

---

## Notes

- Use **multiple browser windows** to test cross-app synchronization
- Monitor **server logs** for revalidation errors (should be none)
- Check **Network tab** to verify data fetches (not full page reloads)
- Test with **different booking flows** (AUTO, MANUAL, DIRECT, TOKENIZED)
- Verify **edge cases** (no conversation, guest bookings, cancelled bookings)

**Estimated Testing Time:** 45-60 minutes for complete verification
