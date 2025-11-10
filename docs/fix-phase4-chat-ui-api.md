---
type: fix
status: in-progress
updated: 2025-11-10
feature: Chat/Message System Phase 4 Fixes
author: GitHub Copilot
tags:
  - chat
  - messages
  - phase4
  - fishon-market
impact: high
---

# Phase 4 Chat System Fixes - fishon-market

## Problem Summary

fishon-market chat implementation has critical issues preventing it from working:

### Issue 1: UI Not Symmetrical with fishon-captain

- ❌ No booking details card in chat header
- ❌ No booking actions (view booking button)
- ❌ Captain names not fetched (shows generic "Captain")
- ❌ Charter names not fetched
- ❌ Conversation list doesn't show trip name (e.g., "Half-Day Trip · Port Dickson Charter")

### Issue 2: Cannot Send Messages - API Errors

```
Failed to fetch conversation: Bad Request (400)
Failed to mark as read: Method Not Allowed (405)
Failed to fetch messages: Internal Server Error (500)
Chat is locked. Payment required to send messages.
```

**Root Causes**:

1. fishon-market missing API routes (`/api/conversations/[id]/route.ts` exists but likely incomplete)
2. fishon-market missing `message-service.ts` (only exists in fishon-captain)
3. fishon-market pages are client components (not Server Components like captain)
4. No data enrichment service for angler-side conversations

---

## Fix Plan

### ✅ Phase 4.1: Create Message Service for fishon-market (2 hours)

**Objective**: Build angler-side message service matching captain pattern

**Tasks**:

1. **Create `/src/lib/services/message-service.ts`** (90 mins)
   - [ ] `getAnglerConversations(userId)` - List all angler's conversations
   - [ ] `getAnglerConversationsEnriched(userId)` - With charter names, captain names, trip details
   - [ ] `getConversation(conversationId, userId)` - Fetch single conversation with permission check
   - [ ] `getConversationEnriched(conversationId, userId)` - Full context with booking, charter, captain data
   - [ ] `sendMessage(conversationId, userId, content)` - Create message + Pusher trigger
   - [ ] `markConversationAsRead(conversationId, userId)` - Update anglerUnreadCount
   - [ ] `getMessages(conversationId, userId, limit, cursor)` - Paginated messages with permission check

2. **Data Enrichment Logic** (30 mins)
   - [ ] Fetch captain name from `CaptainProfile` or `User` table
   - [ ] Fetch charter name from `Charter` table (via `Booking.charterId`)
   - [ ] Fetch trip details: `tripName`, `days`, `date`, `startTime` from `Booking`
   - [ ] Parse `guests` JSON for adults/children
   - [ ] Build conversation list item: `"{tripName} · {charterName}"`

**Deliverables**:

- ✅ `/src/lib/services/message-service.ts` (~400 lines)
- ✅ Type-safe, permission-checked data access
- ✅ Matches captain `message-service.ts` pattern

---

### ✅ Phase 4.2: Fix API Routes (1 hour)

**Objective**: Complete missing/broken API endpoints

**Tasks**:

1. **Fix GET `/api/conversations/[id]/route.ts`** (15 mins)
   - [ ] Update to use `getConversationEnriched(id, userId)` from service
   - [ ] Add proper error handling (404, 403, 500)
   - [ ] Return enriched conversation data

2. **Fix PATCH `/api/conversations/[id]/read/route.ts`** (15 mins)
   - [ ] Change to use `markConversationAsRead(id, userId)` from service
   - [ ] Return success response
   - [ ] Handle 404 gracefully

3. **Fix GET `/api/conversations/[id]/messages/route.ts`** (15 mins)
   - [ ] Use `getMessages(id, userId, limit, cursor)` from service
   - [ ] Add pagination support
   - [ ] Return `{ messages, hasMore, nextCursor }`

4. **Fix POST `/api/conversations/[id]/messages/route.ts`** (15 mins)
   - [ ] Use `sendMessage(id, userId, content)` from service
   - [ ] Check conversation status (allow if ACTIVE, block if LOCKED/CLOSED)
   - [ ] Trigger Pusher `message.new` event
   - [ ] Trigger `conversation.updated` event for sidebar updates
   - [ ] Add `revalidatePath('/account/messages')` for Server Component refresh

**Deliverables**:

- ✅ All API routes working correctly
- ✅ Proper error responses
- ✅ Pusher events triggered
- ✅ Path revalidation for real-time updates

---

### ✅ Phase 4.3: Convert to Server Component Pattern (1.5 hours)

**Objective**: Match fishon-captain architecture (Server Components + enriched data)

**Tasks**:

1. **Update `/app/(account)/account/messages/page.tsx`** (30 mins)
   - [ ] Convert to Server Component (remove `"use client"`)
   - [ ] Fetch conversations via `getAnglerConversationsEnriched(userId)`
   - [ ] Pass serialized data to `ConversationsClient` component
   - [ ] Add `export const dynamic = "force-dynamic"`

2. **Create `ConversationsClient.tsx`** (30 mins)
   - [ ] Client component for interactivity
   - [ ] Accepts `conversations` prop from Server Component
   - [ ] Subscribe to `private-user.${userId}` for `conversation.updated` events
   - [ ] Update local state on real-time events
   - [ ] Render conversation list with trip names

3. **Update `/app/(account)/account/messages/[conversationId]/page.tsx`** (30 mins)
   - [ ] Convert to Server Component wrapper
   - [ ] Fetch conversation via `getConversationEnriched(id, userId)`
   - [ ] Pass to `ChatDetail` client component
   - [ ] Verify charter ownership/access

**Deliverables**:

- ✅ Server Components for data fetching
- ✅ Client Components for interactivity
- ✅ Real-time updates via Pusher
- ✅ Matches captain pattern exactly

---

### ✅ Phase 4.4: Update Chat UI Components (1 hour)

**Objective**: Add booking details, captain info, trip context

**Tasks**:

1. **Update `ChatHeader.tsx`** (20 mins)
   - [ ] Accept `booking` prop (id, charterName, tripName, date, status)
   - [ ] Accept `captainContact` prop (name, email, phone)
   - [ ] Show collapsible `BookingDetailsCard`
   - [ ] Add "View Booking" button linking to `/account/bookings/[id]`
   - [ ] Show captain name instead of generic "Captain"

2. **Update `ConversationListItem.tsx`** (15 mins)
   - [ ] Show trip name: `"{tripName} · {charterName}"`
   - [ ] Show captain name below charter
   - [ ] Show booking status badge (PENDING, PAID, COMPLETED)
   - [ ] Format date nicely

3. **Update `ChatDetail.tsx` / `page.tsx`** (15 mins)
   - [ ] Pass booking and captain data to `ChatHeader`
   - [ ] Calculate `isChatLocked` based on booking status
   - [ ] Show appropriate placeholder messages

4. **Update `useConversation` hook** (10 mins)
   - [ ] Remove `fetchConversation()` calls (data from props now)
   - [ ] Keep only message fetching + real-time sync
   - [ ] Add `router.refresh()` on new messages (with debounce)

**Deliverables**:

- ✅ Rich UI matching captain app
- ✅ Booking context always visible
- ✅ Captain contact info displayed
- ✅ Trip names in conversation list

---

## Implementation Order

### Day 1 (3 hours)

1. **Phase 4.1**: Create message-service.ts (2 hours)
2. **Phase 4.2**: Fix API routes (1 hour)

### Day 2 (2.5 hours)

3. **Phase 4.3**: Server Component conversion (1.5 hours)
4. **Phase 4.4**: Update UI components (1 hour)

**Total Estimated Time**: 5.5 hours

---

## Testing Checklist

After fixes:

- [ ] Conversations list loads with trip names
- [ ] Click conversation → opens chat with booking details
- [ ] Captain name displays correctly
- [ ] Charter name displays correctly
- [ ] Can send messages (no API errors)
- [ ] Messages appear in real-time
- [ ] Sidebar updates when new message arrives
- [ ] Booking details card shows all info
- [ ] "View Booking" button works
- [ ] Chat locks for PENDING/APPROVED bookings
- [ ] Chat unlocks for PAID/COMPLETED bookings
- [ ] Unread count updates correctly
- [ ] TypeScript: 0 errors

---

## Key Differences: fishon-captain vs fishon-market

| Feature               | fishon-captain                     | fishon-market (current)      | fishon-market (after fix)             |
| --------------------- | ---------------------------------- | ---------------------------- | ------------------------------------- |
| **Data Fetching**     | Server Component → message-service | Client Component → API hooks | Server Component → message-service ✅ |
| **Conversation List** | Shows angler name                  | Shows "Captain"              | Shows trip name + charter ✅          |
| **Chat Header**       | Booking details + angler contact   | Generic header               | Booking details + captain contact ✅  |
| **Lock Logic**        | Booking status check               | Status check                 | Booking status check ✅               |
| **API Routes**        | Complete                           | Missing/broken               | Complete ✅                           |
| **Message Service**   | ✅ Exists                          | ❌ Missing                   | ✅ Created                            |
| **Real-time Updates** | ✅ Working                         | ❌ Broken                    | ✅ Working                            |

---

## Reference Files

**fishon-captain (working implementation)**:

- `/src/lib/message-service.ts` - Service layer
- `/src/app/(portal)/captain/messages/page.tsx` - List page (Server Component)
- `/src/app/(portal)/captain/messages/[id]/page.tsx` - Detail wrapper (Server Component)
- `/src/app/(portal)/captain/messages/[id]/chat-detail.tsx` - Chat UI (Client Component)
- `/src/app/(portal)/captain/messages/conversations-client.tsx` - List client
- `/src/app/api/captain/conversations/[id]/messages/route.ts` - Messages API
- `/src/hooks/useConversation.ts` - Real-time hook

**fishon-market (needs fixing)**:

- `/src/app/(account)/account/messages/page.tsx` - List page (Client, needs Server)
- `/src/app/(account)/account/messages/[conversationId]/page.tsx` - Detail (Client, needs Server)
- `/src/app/api/conversations/[id]/route.ts` - Conversation API (incomplete)
- `/src/app/api/conversations/[id]/messages/route.ts` - Messages API (incomplete)
- `/src/hooks/useConversation.ts` - Real-time hook (needs updates)

---

**Status**: Ready to implement  
**Priority**: High (blocking Phase 5+ testing)  
**Complexity**: Medium (mostly copying patterns from captain)
