---
type: feature
status: in-progress
updated: 2024-11-07
feature: Phase 3 - Manual Testing Guide
author: GitHub Copilot
---

# Phase 3 Manual Testing Guide

**Purpose**: Comprehensive manual testing checklist for Phase 3 real-time chat functionality
**Duration**: ~30-45 minutes per tester
**Browsers**: Chrome, Safari, Firefox
**Devices**: Desktop, Tablet, Mobile
**Network Conditions**: Fast, Throttled (3G), Offline

## Pre-Testing Setup

### Environment Check

- [ ] All environment variables set correctly
  ```bash
  NEXT_PUBLIC_PUSHER_APP_KEY=<key>
  NEXT_PUBLIC_PUSHER_CLUSTER=<cluster>
  PUSHER_APP_ID=<id>
  PUSHER_SECRET=<secret>
  NEXTAUTH_URL=localhost:3000
  NEXTAUTH_SECRET=<secret>
  DATABASE_URL=<postgresql-url>
  ```

- [ ] Application running locally
  ```bash
  npm run dev
  ```

- [ ] Database contains test data
  - [ ] Test user account (angler)
  - [ ] Test captain account
  - [ ] Test booking linking both users
  - [ ] Test conversation between users

### Browser DevTools Setup

- [ ] Open DevTools (F12)
- [ ] Network tab open to monitor requests
- [ ] Console tab open for errors
- [ ] Application tab for session storage

## Test Scenarios

### Scenario 1: Basic Message Send/Receive

**Objective**: Verify message delivery between angler and captain

**Steps**:
1. [ ] Login as angler on Browser A
2. [ ] Navigate to `/account/messages`
3. [ ] Click on conversation with captain
4. [ ] Type message: "Hello captain, how are you?"
5. [ ] Press Enter or click Send button
6. [ ] In Browser B (captain login):
   - [ ] Navigate to conversations page
   - [ ] Open same conversation
   - [ ] Verify message appears in real-time
7. [ ] Verify message shows "sent" status (single checkmark)
8. [ ] Verify message timestamp is correct

**Expected Results**:
- ✅ Message appears immediately in sender's chat (< 100ms)
- ✅ Message appears in real-time on receiver's chat (< 500ms)
- ✅ Message shows "sent" status initially
- ✅ Message shows correct timestamp
- ✅ Network tab shows POST to `/api/conversations/[id]/messages`

**Fail Criteria**:
- ❌ Message doesn't appear on receiver's side
- ❌ Message appears with significant delay (> 2s)
- ❌ Error message displayed
- ❌ Duplicate messages sent

---

### Scenario 2: Read Receipts

**Objective**: Verify read receipt updates when messages are marked as read

**Steps**:
1. [ ] In Browser A (angler), send message: "Can you confirm receipt?"
2. [ ] Verify message shows in Browser B (captain) with "delivered" status
3. [ ] In Browser B, click on the conversation to open chat
4. [ ] Verify Browser A shows message status changed to "read" (double checkmark)
5. [ ] Send response: "Received and read!"
6. [ ] Verify Browser A shows captain's message with "delivered" status initially
7. [ ] Go back to conversations list in Browser A, then return to chat
8. [ ] Verify status updated to "read"

**Expected Results**:
- ✅ Messages show "delivered" when opponent loads chat
- ✅ Messages show "read" within 2 seconds
- ✅ Read status updates in real-time
- ✅ Checkmarks display correctly (✓ sent, ✓✓ read)
- ✅ Network tab shows PATCH to `/api/conversations/[id]/read`

**Fail Criteria**:
- ❌ Status never updates to "read"
- ❌ Checkmarks don't display correctly
- ❌ Read status updates slowly (> 3s)
- ❌ Read receipt shows in wrong chat

---

### Scenario 3: Typing Indicators

**Objective**: Verify typing indicators appear when user is typing

**Steps**:
1. [ ] In Browser A, open conversation chat
2. [ ] In Browser B, open same conversation
3. [ ] In Browser A, start typing message (don't send yet)
4. [ ] In Browser B, observe typing indicator should appear
   - [ ] Shows: "{User} is typing..."
   - [ ] Animated dots visible
5. [ ] In Browser A, continue typing (30+ seconds)
6. [ ] In Browser B, typing indicator should still show
7. [ ] In Browser A, wait 3+ seconds without typing
8. [ ] In Browser B, typing indicator should disappear
9. [ ] In Browser A, send message
10. [ ] In Browser B, typing indicator should disappear

**Expected Results**:
- ✅ Typing indicator appears within 500-700ms
- ✅ Shows animated dots
- ✅ Displays correct user name
- ✅ Disappears after 3 seconds of inactivity
- ✅ Disappears when message sent
- ✅ Network tab shows POST to `/api/conversations/[id]/typing`

**Fail Criteria**:
- ❌ Typing indicator never appears
- ❌ Typing indicator shows wrong user
- ❌ Typing indicator doesn't disappear
- ❌ False positive indicators (show when not typing)

---

### Scenario 4: Character Limit & Input Validation

**Objective**: Verify message input validation works correctly

**Steps**:
1. [ ] Open conversation chat
2. [ ] Type single character in input field
   - [ ] Counter shows "1 / 1000"
3. [ ] Type 500 characters
   - [ ] Counter shows "500 / 1000"
4. [ ] Copy-paste 1500 character text into input
   - [ ] Counter shows "1000 / 1000"
   - [ ] Text truncated to 1000 chars (no overflow)
5. [ ] Clear input completely
   - [ ] Send button disabled (grayed out)
6. [ ] Type space character
   - [ ] Send button still disabled (only whitespace)
7. [ ] Type valid message "Testing input validation"
   - [ ] Send button enabled (highlighted)

**Expected Results**:
- ✅ Character counter displays correctly
- ✅ Cannot exceed 1000 character limit
- ✅ Send button disabled when empty
- ✅ Send button disabled when only whitespace
- ✅ Send button enabled with valid text

**Fail Criteria**:
- ❌ Can type more than 1000 characters
- ❌ Counter shows wrong numbers
- ❌ Send button state incorrect
- ❌ Whitespace messages are sent

---

### Scenario 5: Mobile Responsiveness

**Objective**: Verify chat interface works well on mobile devices

**Steps**:
1. [ ] Open DevTools and set to Mobile device size (375x667)
2. [ ] Navigate to `/account/messages` (conversations list)
3. [ ] Verify layout:
   - [ ] Conversations list fills screen width
   - [ ] Each item readable and clickable
   - [ ] No horizontal scroll needed
4. [ ] Click conversation to open chat
5. [ ] Verify chat interface:
   - [ ] Header visible and readable
   - [ ] Messages scroll vertically (no horizontal)
   - [ ] Input field at bottom
   - [ ] Full screen chat view
6. [ ] Send message and verify:
   - [ ] Input field clears
   - [ ] New message appears
   - [ ] Auto-scroll to latest message
7. [ ] Booking details sidebar:
   - [ ] Not visible by default on mobile
   - [ ] Tap info button (ℹ️) to show/hide
   - [ ] Collapsible without breaking layout

**Expected Results**:
- ✅ All elements fit within 375px width
- ✅ No horizontal scrolling needed
- ✅ Touch targets at least 44x44px
- ✅ Responsive layout adjusts properly
- ✅ Input field always accessible

**Fail Criteria**:
- ❌ Content requires horizontal scroll
- ❌ Text too small to read
- ❌ Touch targets too small
- ❌ Layout breaks on mobile

---

### Scenario 6: Network Disconnection & Reconnection

**Objective**: Verify app handles network failures gracefully

**Setup**:
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"

**Steps**:
1. [ ] Load conversation chat successfully
2. [ ] Set network to "Offline"
3. [ ] Try to send message: "Test offline"
4. [ ] Verify:
   - [ ] Error message appears
   - [ ] Message stays in input (not cleared)
   - [ ] Connection status shows "offline"
5. [ ] Set network back to "Online"
6. [ ] Verify:
   - [ ] Connection status updates to "online"
   - [ ] Error message clears
   - [ ] Can resend message
7. [ ] Message sends successfully

**Expected Results**:
- ✅ Error message clear and actionable
- ✅ Input preserved on error
- ✅ Connection status displays correctly
- ✅ Can retry after reconnection
- ✅ No zombie messages

**Fail Criteria**:
- ❌ App crashes
- ❌ Input cleared on error
- ❌ Connection status not shown
- ❌ Cannot recover after reconnection

---

### Scenario 7: Throttled Network (3G)

**Objective**: Verify app works with slow network

**Setup**:
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Slow 3G"

**Steps**:
1. [ ] Load conversation chat
2. [ ] Send message: "Testing on 3G"
3. [ ] Observe message delivery timing:
   - [ ] Message appears locally immediately
   - [ ] Shows "sending..." status
   - [ ] Updates to "sent" when confirmed (5-10s)
4. [ ] Wait for other user to receive (may take 10-15s)
5. [ ] Other user marks as read
6. [ ] Verify read receipt updates (may take 10-15s)
7. [ ] Type and observe typing indicator latency

**Expected Results**:
- ✅ App remains responsive
- ✅ UI shows appropriate status (sending/sent/read)
- ✅ No timeouts
- ✅ Messages eventually deliver
- ✅ Can interact while waiting

**Fail Criteria**:
- ❌ App becomes unresponsive
- ❌ Messages never deliver
- ❌ Errors with slow network
- ❌ UI freezes during sends

---

### Scenario 8: Multiple Tabs/Windows

**Objective**: Verify sync across browser tabs

**Steps**:
1. [ ] Open conversation in Tab A
2. [ ] Open SAME conversation in Tab B
3. [ ] In Tab A, type message: "Message from Tab A"
4. [ ] Send from Tab A
5. [ ] Verify Tab B:
   - [ ] Message appears automatically
   - [ ] No refresh needed
6. [ ] In Tab B, send response: "Reply from Tab B"
7. [ ] Verify Tab A:
   - [ ] Response appears automatically
   - [ ] Unread count updates
8. [ ] In Tab A, go to conversations list
9. [ ] Verify Tab B shows same unread count

**Expected Results**:
- ✅ Messages sync across tabs in real-time
- ✅ No manual refresh needed
- ✅ Unread counts consistent
- ✅ Read status syncs
- ✅ Typing indicators show across tabs

**Fail Criteria**:
- ❌ Messages don't sync between tabs
- ❌ Unread counts diverge
- ❌ Different states in different tabs
- ❌ Duplicate notifications

---

### Scenario 9: Long Running Session

**Objective**: Verify app stability over extended use

**Duration**: 10-15 minutes

**Steps**:
1. [ ] Open conversation chat
2. [ ] Exchange messages periodically:
   - [ ] Send 3-5 messages per minute
   - [ ] Read messages from other user
   - [ ] Type/stop typing randomly
3. [ ] During session:
   - [ ] Monitor memory usage (DevTools)
   - [ ] Check console for errors
   - [ ] Watch for UI slowdowns
4. [ ] Verify connection stays stable:
   - [ ] Network tab shows no 5xx errors
   - [ ] All messages eventually deliver
   - [ ] No console errors
5. [ ] Refresh page and verify:
   - [ ] Message history intact
   - [ ] Can continue messaging

**Expected Results**:
- ✅ No memory leaks (stable usage)
- ✅ No console errors
- ✅ Connection remains stable
- ✅ UI stays responsive
- ✅ All messages delivered

**Fail Criteria**:
- ❌ Memory usage increases constantly
- ❌ Console errors appear
- ❌ UI becomes sluggish
- ❌ Connection drops
- ❌ Missing messages

---

### Scenario 10: Database Consistency

**Objective**: Verify messages persisted correctly in database

**Steps**:
1. [ ] Send 5-10 messages from different users
2. [ ] Refresh page and verify all messages still there
3. [ ] Access via API: `GET /api/conversations/{id}/messages`
4. [ ] Verify JSON response includes:
   - [ ] All sent messages
   - [ ] Correct sender information
   - [ ] Correct timestamps
   - [ ] Read status information
5. [ ] Check database directly:
   ```sql
   SELECT * FROM "Message" WHERE "conversationId" = 'conv-id' ORDER BY "createdAt";
   ```
6. [ ] Verify:
   - [ ] All messages present
   - [ ] Correct content
   - [ ] Correct createdAt times
   - [ ] readAt filled when read

**Expected Results**:
- ✅ All messages persisted
- ✅ API returns complete data
- ✅ Database has correct records
- ✅ No data loss on refresh
- ✅ Timestamps accurate

**Fail Criteria**:
- ❌ Messages disappear after refresh
- ❌ API returns incomplete data
- ❌ Database inconsistencies
- ❌ Timestamps wrong
- ❌ Read status lost

---

## Performance Metrics

### Acceptable Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Initial Page Load | < 2 seconds | ⏳ Test |
| Message Delivery | < 100ms | ⏳ Test |
| Read Receipt Update | < 2 seconds | ⏳ Test |
| Typing Indicator | 500-700ms | ⏳ Test |
| UI Responsiveness | 60 fps | ⏳ Test |
| Memory Usage | < 100MB | ⏳ Test |
| Network Requests | Minimal/optimized | ⏳ Test |

---

## Browser Compatibility Matrix

| Browser | Version | Desktop | Tablet | Mobile | Status |
|---------|---------|---------|--------|--------|--------|
| Chrome | Latest | ⏳ | ⏳ | ⏳ | Test |
| Safari | Latest | ⏳ | ⏳ | ⏳ | Test |
| Firefox | Latest | ⏳ | ⏳ | ⏳ | Test |
| Edge | Latest | ⏳ | ⏳ | ⏳ | Test |

---

## Bug Reporting Template

If you find an issue, report it with this format:

```markdown
### Bug Report

**Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Environment**:
- Browser: [Browser name and version]
- Device: [Device type - Desktop/Tablet/Mobile]
- Network: [Fast/3G/Offline]
- URL: [Full URL where bug occurred]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Video**:
[Attach if applicable]

**Console Errors**:
[Paste any console errors]

**Network Errors**:
[Paste any network tab errors]
```

---

## Sign-Off Checklist

**Tester Name**: ___________________
**Test Date**: ___________________
**Browser**: ___________________
**Device**: ___________________

### All Scenarios Completed

- [ ] Scenario 1: Basic Message Send/Receive ✅ / ❌
- [ ] Scenario 2: Read Receipts ✅ / ❌
- [ ] Scenario 3: Typing Indicators ✅ / ❌
- [ ] Scenario 4: Character Limit ✅ / ❌
- [ ] Scenario 5: Mobile Responsiveness ✅ / ❌
- [ ] Scenario 6: Network Disconnection ✅ / ❌
- [ ] Scenario 7: Throttled Network ✅ / ❌
- [ ] Scenario 8: Multiple Tabs ✅ / ❌
- [ ] Scenario 9: Long Session ✅ / ❌
- [ ] Scenario 10: Database Consistency ✅ / ❌

### Issues Found

**Total Issues**: ___
- Critical: ___
- High: ___
- Medium: ___
- Low: ___

**Issue IDs**: ___________________

### Overall Assessment

- [ ] ✅ PASS - All scenarios passed, no blockers
- [ ] ⚠️ PASS WITH ISSUES - Passed with minor issues logged
- [ ] ❌ FAIL - Blockers found, needs fixes

### Sign-Off

I certify that I have completed all manual testing scenarios and the results above are accurate.

**Tester Signature**: ___________________

**Date**: ___________________

---

## Continuous Testing

### Regression Testing

After any code changes, re-run:
- [ ] Scenario 1: Basic Message Send/Receive
- [ ] Scenario 3: Typing Indicators
- [ ] Scenario 5: Mobile Responsiveness
- [ ] Scenario 9: Long Running Session

### Weekly Smoke Tests

Every week, perform quick sanity checks:
- [ ] Can send and receive messages
- [ ] Typing indicators work
- [ ] Read receipts update
- [ ] Mobile view works
- [ ] No console errors

---

**Created**: 2024-11-07
**Last Updated**: 2024-11-07
**Version**: 1.0
