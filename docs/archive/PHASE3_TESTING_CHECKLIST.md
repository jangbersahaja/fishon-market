---
type: feature
status: in-progress
updated: 2024-11-07
feature: Phase 3 Manual Testing
author: GitHub Copilot
---

# Phase 3 Manual Testing Checklist

## Quick Test Commands

```bash
# Run lightweight unit tests
npm test

# TypeScript check
npm run typecheck

# Build check
npm run build
```

## Manual Testing Scenarios

### 1. Basic Message Flow (5 min)

**Setup**:

- Open fishon-market in two browser windows
- Log in as angler in Window 1
- Log in as captain in Window 2 (different account)
- Navigate to a conversation

**Test**:

- [ ] Send message from angler → appears on captain side
- [ ] Send message from captain → appears on angler side
- [ ] Messages appear in correct order
- [ ] Timestamps display correctly

**Expected**: Real-time message delivery < 1 second

### 2. Read Receipts (3 min)

**Test**:

- [ ] Send message from angler
- [ ] Captain opens conversation
- [ ] Read receipt (✓✓) appears on angler's message
- [ ] Status changes from "sent" to "read"

**Expected**: Read receipts update in real-time

### 3. Typing Indicators (2 min)

**Test**:

- [ ] Angler starts typing → "Captain is typing..." appears
- [ ] Stop typing → indicator disappears after 3 seconds
- [ ] Type quickly → indicator stays visible
- [ ] Send message → indicator disappears immediately

**Expected**: Debounced indicator with 500ms delay

### 4. Conversation List (3 min)

**Test**:

- [ ] Navigate to /account/messages
- [ ] See list of conversations
- [ ] Unread count badge shows correct number
- [ ] Last message preview displays
- [ ] Time shows relative format (5m ago, 2h ago)
- [ ] Click conversation → navigates to chat detail

**Expected**: List loads in < 2 seconds

### 5. Mobile Experience (5 min)

**Test** (Chrome DevTools mobile mode):

- [ ] Chat UI is responsive
- [ ] Messages scroll smoothly
- [ ] Input field accessible
- [ ] Send button works
- [ ] Booking details collapsible

**Expected**: Same functionality on mobile

### 6. Error Handling (3 min)

**Test**:

- [ ] Disconnect network → error message appears
- [ ] Reconnect → chat resumes
- [ ] Send empty message → button disabled
- [ ] Type 1000+ characters → limited to 1000
- [ ] Try accessing non-existent conversation → 404

**Expected**: Graceful error handling

### 7. Performance (2 min)

**Test**:

- [ ] Load conversation with 50+ messages → smooth scroll
- [ ] Send 10 messages quickly → no lag
- [ ] Switch between conversations → fast navigation
- [ ] Open multiple tabs → state syncs

**Expected**: 60fps UI, no stuttering

## Quick Smoke Test (5 minutes)

For rapid verification after code changes:

```
1. ✅ npm run typecheck → 0 errors
2. ✅ npm test → all pass
3. ✅ Open /account/messages → list loads
4. ✅ Click conversation → chat opens
5. ✅ Send message → appears immediately
6. ✅ Refresh page → messages persist
```

## Results

**Date**: ******\_******
**Tester**: ******\_******

**Overall Status**: [ ] PASS [ ] FAIL [ ] NEEDS WORK

**Issues Found**:

-
-
-

**Notes**:

-
-
