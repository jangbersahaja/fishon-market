---
type: feature
status: testing
updated: 2025-10-29
feature: notification-system
phase: 1E
author: GitHub Copilot
---

# Phase 1E Testing Guide: Real-Time Notifications

## Overview

This guide will help you test the complete notification system end-to-end, including real-time updates via Pusher.

---

## Prerequisites

✅ **Dev server running**: `npm run dev` in fishon-market  
✅ **Pusher configured**: Check `.env` has `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`  
✅ **User logged in**: Create account or sign in to test

---

## Test 1: Notification Bell Visibility

### Steps:

1. Navigate to homepage: `http://localhost:3001`
2. Sign in to your account
3. Check navbar - you should see a **bell icon** (🔔) next to "Account" link

### Expected Results:

- ✅ Bell icon visible for authenticated users
- ✅ Bell icon NOT visible for guests
- ✅ Badge shows unread count (may be 0 initially)

---

## Test 2: Create Booking → Receive Notification

### Steps:

1. **Browse charters**: Go to `/charters` or use search
2. **Select a charter** and view details
3. **Book a trip**:
   - Choose date, guests, trip type
   - Submit booking request
4. **Watch for real-time update**:
   - Bell icon badge should increment immediately
   - No page refresh needed!

### Expected Results:

- ✅ Booking created successfully
- ✅ Bell badge shows `+1` unread notification
- ✅ Terminal shows: `🔔 Creating notification for user: {userId}`
- ✅ Terminal shows: `✅ Notification created: {notificationId}`
- ✅ Terminal shows: `[Pusher] Notification sent to user ...`

### Debug Commands:

```bash
# Check notifications in database
npx tsx scripts/check-notifications.ts

# Should show:
# - BOOKING_CREATED notification
# - Status: UNREAD
# - User matches your account
```

---

## Test 3: Notification Dropdown

### Steps:

1. **Click the bell icon** in navbar
2. Dropdown should open with:
   - "Notifications" header
   - "Mark all as read" button (if unread > 0)
   - List of recent notifications (max 5)
   - "View all notifications" link at bottom

### Expected Results:

- ✅ Dropdown opens smoothly
- ✅ Shows your BOOKING_CREATED notification:
  - Title: "Booking Request Submitted! 🎣"
  - Message: "Your booking request for {charter} has been sent..."
  - Timestamp: "Just now" or relative time
  - "View Booking" button
- ✅ Blue dot on left indicates unread

---

## Test 4: Mark Notification as Read

### Steps:

1. **Click notification** in dropdown
2. Should:
   - Navigate to booking confirmation page
   - Mark notification as read
   - Update badge count

### Expected Results:

- ✅ Badge count decreases by 1
- ✅ Notification no longer shows blue dot
- ✅ Redirected to `/book/confirm?id={bookingId}`

---

## Test 5: Full Notifications Page

### Steps:

1. Navigate to `/account/notifications`
2. Or click "View all notifications" in dropdown
3. Should show:
   - Full page with all notifications
   - "All" and "Unread" tabs
   - "Mark all as read" button
   - Pagination ("Load more" if >20)

### Expected Results:

- ✅ All notifications visible
- ✅ Can filter by "Unread"
- ✅ Can mark all as read
- ✅ Each notification clickable

---

## Test 6: Booking Approval Flow (Captain Side)

### Setup:

You need access to fishon-captain dashboard to approve booking.

### Steps:

1. **In fishon-captain**:
   - Go to `/captain/bookings`
   - Find your booking request
   - Click "Approve"

2. **In fishon-market (your angler account)**:
   - Watch bell icon - should update in real-time!
   - New notification: "Booking Approved! 🎉"
   - Badge increments

### Expected Results:

- ✅ Real-time notification arrives (no refresh!)
- ✅ Badge shows correct unread count
- ✅ Notification has payment link
- ✅ Captain webhook triggered successfully

---

## Test 7: Real-Time Pusher Events

### Debug Mode:

Open browser console and watch for Pusher debug logs:

1. **In browser console**:

```javascript
// Enable Pusher logging
window.localStorage.setItem("pusherDebug", "true");

// Reload page and create booking
// Watch console for:
// - "Pusher: Connection established"
// - "Pusher: Event received: notification"
// - "Pusher: Event received: notification-count"
```

### Expected Console Output:

```
[Pusher] Connection established
[Pusher] Subscribed to private-user-{userId}
[Pusher] Event received: notification
{
  id: "cm...",
  type: "BOOKING_CREATED",
  title: "Booking Request Submitted! 🎣",
  ...
}
[Pusher] Event received: notification-count
{ count: 1 }
```

---

## Test 8: Multiple Notifications

### Steps:

1. Create 3-5 bookings (different charters)
2. Watch badge count increment
3. Open dropdown - should show recent 5
4. Go to `/account/notifications` - should show all

### Expected Results:

- ✅ Badge shows correct total
- ✅ Dropdown shows max 5 most recent
- ✅ Full page shows all notifications
- ✅ Can mark all as read at once

---

## Test 9: Notification Persistence

### Steps:

1. Create notification (book a charter)
2. **Refresh the page** (hard refresh)
3. Bell badge should persist
4. Notifications should still be there

### Expected Results:

- ✅ Notifications survive page refresh
- ✅ Unread count accurate after refresh
- ✅ Pusher reconnects automatically

---

## Test 10: Guest Users (No Notifications)

### Steps:

1. **Sign out**
2. Navigate to homepage
3. Check navbar

### Expected Results:

- ✅ Bell icon NOT visible
- ✅ No errors in console
- ✅ Navbar shows "Sign in" / "Register" instead

---

## Common Issues & Solutions

### Issue: Bell icon doesn't show

**Solution**:

- Ensure you're signed in
- Check `useSession()` returns valid user
- Verify NavBar imports NotificationBell

### Issue: Badge doesn't update in real-time

**Solution**:

- Check `.env` has Pusher credentials
- Open browser console → Network tab → WS tab
- Should see WebSocket connection to `ws-ap1.pusher.com`
- If not connecting, check Pusher credentials

### Issue: No notifications in database

**Solution**:

```bash
# Test notification creation directly
npx tsx scripts/test-notification.ts

# Should create notification successfully
# If error: check Pusher env vars in .env (not just .env.local)
```

### Issue: Pusher connection fails

**Solution**:

- Verify Pusher credentials at: https://dashboard.pusher.com/apps/2070010
- Check cluster is "ap1"
- Ensure `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are set
- Restart dev server after env changes

### Issue: "Missing Pusher environment variables" error

**Solution**:

- Add Pusher vars to `.env` file (not just `.env.local`)
- Required in `.env`:
  ```bash
  PUSHER_APP_ID="2070010"
  PUSHER_KEY="7e24c5ec91fc7e504c49"
  PUSHER_SECRET="2688225df8d51f748cba"
  PUSHER_CLUSTER="ap1"
  NEXT_PUBLIC_PUSHER_KEY="7e24c5ec91fc7e504c49"
  NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
  ```

---

## Verification Checklist

After completing all tests, verify:

- [ ] Bell icon visible for authenticated users
- [ ] Badge shows correct unread count
- [ ] Notifications update in real-time (no refresh needed)
- [ ] Dropdown opens and shows recent notifications
- [ ] Can mark notifications as read (individually and all)
- [ ] Full notifications page works with tabs and pagination
- [ ] Booking approval triggers notification
- [ ] Pusher WebSocket connected (check browser console)
- [ ] Notifications persist after page refresh
- [ ] No errors in browser console
- [ ] No errors in terminal

---

## Performance Metrics

Expected performance:

- **Notification creation**: < 200ms
- **Pusher delivery**: < 500ms (real-time)
- **Badge update**: Instant (via Pusher)
- **Dropdown load**: < 100ms (cached in hook)
- **Full page load**: < 500ms (API + render)

---

## Next Steps After Testing

If all tests pass:

1. ✅ Mark Phase 1E complete
2. Move to Phase 1F: Testing & Polish
3. Consider Phase 2: Email notifications
4. Consider Phase 3: Notification preferences UI
5. Consider Phase 4: Sound/toast notifications

---

## Useful Commands

```bash
# Check notifications in DB
npx tsx scripts/check-notifications.ts

# Test notification creation
npx tsx scripts/test-notification.ts

# Watch dev server logs
npm run dev

# TypeScript check
npm run typecheck

# Check Pusher events (browser console)
window.localStorage.setItem('pusherDebug', 'true');
```

---

**Happy Testing! 🎉**

If you encounter issues, check terminal logs, browser console, and the Common Issues section above.
