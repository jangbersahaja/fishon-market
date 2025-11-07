---
type: plan
status: in-progress
updated: 2025-11-07
feature: Chat/Message System - Phase 3 Real-time Implementation
author: GitHub Copilot
tags:
  - phase-3
  - real-time
  - pusher
  - websockets
impact: high
---

# Phase 3 Implementation Progress: Real-time with Pusher

## Overview

Phase 3 brings real-time message delivery, read receipts, and typing indicators to the chat system using Pusher Channels. This document tracks the implementation progress for the angler-facing chat UI in fishon-market.

**Status**: In Progress (Day 1 complete)  
**Completion**: ~50% (Tasks 1-4 of 8 complete)

---

## Completed Tasks ✅

### Task 1: Update Pusher Auth for Conversation Channels ✅

**File**: `/src/app/api/pusher/auth/route.ts`

**Changes**:

- ✅ Added support for `private-conversation.{id}` channel pattern
- ✅ Added participant verification: user must be in conversation (anglerId or ownerId)
- ✅ Maintained backward compatibility with existing `private-user-*` notification channels
- ✅ Proper error handling (401 Unauthorized, 403 Forbidden, 404 Not Found)

**How It Works**:

```
Client requests auth for private-conversation.{conversationId}
  ↓
Server verifies user is in conversation (database lookup)
  ↓
Pusher authorizes subscription if permission granted
```

---

### Task 2: Add Pusher Event Triggers to Message Service ✅

**File**: `/src/lib/pusher/server.ts` (added functions)  
**File**: `/src/lib/services/message-service.ts` (integrated triggers)

**New Pusher Functions**:

- `triggerMessageNew()` - Fires when message sent (channel: `private-conversation.{id}`, event: `message.new`)
- `triggerMessageRead()` - Fires when messages marked as read (event: `message.read`)
- `triggerTyping()` - Fires when user typing/not typing (event: `typing`)

**Integration Points**:

- ✅ `sendMessage()` - Triggers `message.new` after message created
- ✅ `markAsRead()` - Triggers `message.read` after read update
- ✅ `sendTypingIndicator()` - New function for typing events

**Key Features**:

- Non-blocking: Pusher triggers fire async (don't block message delivery)
- Graceful degradation: All triggers skip silently if Pusher not configured
- Proper data serialization: ISO date strings, complete message payloads

---

### Task 3: Create useConversation Hook ✅

**File**: `/src/hooks/useConversation.ts`

**Exports**:

- `useConversation(conversationId, userId)` - Main hook
- `Message` - TypeScript interface for message data
- `Conversation` - TypeScript interface for conversation data

**Features**:
✅ Real-time Pusher subscription on mount
✅ Automatic message fetching (initial load + pagination ready)
✅ Conversation details fetching
✅ Auto-mark as read on mount
✅ Typing indicator debounce (500ms)
✅ Typing timeout auto-clear (3s)
✅ Error handling for all operations
✅ Cleanup on unmount

**Hook API**:

```typescript
const {
  // Data
  messages,                    // Message[]
  isLoadingMessages,          // boolean
  messagesError,              // string | null
  conversation,               // Conversation | null
  isLoadingConversation,      // boolean
  typingUsers,                // string[] (user IDs)
  isConnected,                // boolean

  // Actions
  sendMessage(content, opts), // Promise<void>
  markAsRead(),               // Promise<void>
  sendTypingIndicator(bool),  // Promise<void>
  refetch(),                  // Promise<void>
} = useConversation(conversationId, userId)
```

---

### Task 4: Create Chat UI Components ✅

**Location**: `/src/components/chat/`

**Components Created**:

#### 1. `ChatHeader.tsx`

- Back button (returns to conversations list)
- Other user's name + online status
- Menu button (for future: block, report, etc.)

#### 2. `MessageBubble.tsx`

- Displays individual messages with:
  - Sender avatar (first letter)
  - Sender name (for received messages)
  - Message content
  - Timestamp
  - Read receipts (check marks for sent/delivered/read)
- System message styling (centered, gray background)
- Message alignment (own: right/blue, received: left/gray)

#### 3. `MessageList.tsx`

- Scrollable message container
- Auto-scroll on new messages
- Typing indicators
- Loading state
- Empty state
- Pagination ready (`onEndReached` callback)

#### 4. `ChatInput.tsx`

- Single-line input field
- Character counter (1000 char limit)
- Debounced typing indicator
- Send button (disabled when empty/sending)
- Emoji picker button (UI only, backend ready)
- Locked state: Shows "🔒 Chat unlocks after payment"
- Enter key to send (Shift+Enter for multiline not needed for now)

#### 5. `BookingDetailsCard.tsx`

- Collapsible booking information card
- Shows charter name, date, duration, guest count, total price
- Captain/Angler contact info (name, phone, email)
- View Full Details button
- Blue theme for prominence

#### 6. `TypingIndicator.tsx`

- Shows "{name} is typing" with animated dots
- Auto-hides after 3 seconds of no update
- Avatar support

#### 7. `QuickReplies.tsx`

- Pre-defined quick reply buttons
- Default replies: "Thank you!", "Got it, thanks", "Can you provide more details?", etc.
- Customizable reply list
- Loading state support

**Barrel Export**: `/src/components/chat/index.ts`

**TypeScript Status**: ✅ All components type-safe, 0 production errors

---

## In Progress

### Task 5: Create Conversations List Page

**Next Steps**:

- [ ] Create `/src/app/(dashboard)/account/messages/page.tsx`
- [ ] Build `ConversationListSidebar` component
- [ ] Build `ConversationListItem` with:
  - Captain/Charter name
  - Last message preview
  - Unread count badge
  - Last message time
  - Online status indicator
- [ ] Implement infinite scroll pagination
- [ ] Add empty state
- [ ] Add loading skeletons

**Estimated**: 2 hours

---

## Not Started

### Task 6: Create Chat Interface Page

**Scope**:

- Create `/src/app/(dashboard)/account/messages/[conversationId]/page.tsx`
- Integrate all components from Task 4
- Wire up `useConversation` hook
- Handle locked/closed conversation states
- Responsive layout

**Estimated**: 3-4 hours

### Task 7: End-to-End Testing

**Coverage**:

- Real-time message delivery (< 1 second)
- Read receipts updating correctly
- Typing indicators appearing/disappearing
- Connection drop recovery
- Multiple users chatting simultaneously

**Estimated**: 2 hours

### Task 8: Create Phase 3 Completion Documentation

**Deliverables**:

- `/docs/PHASE3-COMPLETION.md`
- Test results
- Performance metrics
- Known issues
- API reference updates

**Estimated**: 1 hour

---

## Architecture Overview

### Real-time Data Flow

```
┌─────────────┐                           ┌─────────────┐
│  Angler UI  │                           │ Captain UI  │
│ (fishon-    │                           │ (fishon-    │
│  market)    │                           │  captain)   │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │ sendMessage(content)                   │
       ├──────────────────────┐                 │
       │                      ▼                 │
       │          /api/conversations/
       │          {id}/messages
       │          (POST)
       │                      │
       │                      ▼
       │          ┌─────────────────────┐
       │          │   message-service   │
       │          │  sendMessage()      │
       │          └────────┬────────────┘
       │                   │
       │     ┌─────────────┼─────────────┐
       │     │             │             │
       │     ▼             ▼             ▼
       │   Store in    Update conv   Trigger Pusher
       │   Database    last_msg_at   event:
       │                             message.new
       │                                 │
       │                  ┌──────────────┴──────────────┐
       │                  │ Pusher: message.new event │
       │                  └──────┬───────────┬──────────┘
       │                         │           │
       │                    (sent to)   (sent to)
       │                    private-    private-
       │                    conv.1      conv.1
       │                         │           │
       ▼                         ▼           ▼
    useConversation            Angler        Captain
    receives event             receives      receives
    (real-time update)         message       message
```

### Pusher Channels

**Private Conversation Channel**: `private-conversation.{conversationId}`

- Auth required: Yes (participant check)
- Permission: Must be anglerId or ownerId
- Events:
  - `message.new` - New message received
  - `message.read` - User marked messages as read
  - `typing` - User typing/not typing

**Example Event Payload**:

```typescript
// message.new event
{
  id: "msg_123",
  senderId: "user_456",
  senderType: "angler",
  senderName: "John Smith",
  content: "Hi, do you have availability?",
  contentType: "text",
  createdAt: "2025-11-07T18:30:00Z",
  status: "DELIVERED"
}

// message.read event
{
  userId: "user_456",
  readAt: "2025-11-07T18:31:00Z"
}

// typing event
{
  userId: "user_456",
  isTyping: true
}
```

---

## Key Implementation Decisions

### 1. Message Status Flow

```
SENT → DELIVERED (immediately) → READ (when recipient marks as read)
```

**Note**: In Phase 3, we assume messages are delivered immediately (sent to Pusher). Real delivery confirmation would require additional client-server handshake.

### 2. Typing Indicator Debounce

- **Client-side debounce**: 500ms
- **Server timeout**: 3s (auto-clear if no update)
- **Rationale**: Reduce Pusher events, but auto-clear for disconnections

### 3. Conversation Status Handling

- `LOCKED` → Chat input shows: "🔒 Chat unlocks after payment"
- `ACTIVE` → Full chat available
- `CLOSED` → Chat input disabled, messages read-only
- `CLOSING_SOON` → Shows countdown to closure (Day 6 feature)

### 4. Auto-scroll Behavior

- Auto-scroll to bottom on new messages
- Smooth scroll animation
- User can scroll up to see history (no auto-jump)

### 5. Empty States

- No conversations: "Start booking to begin chatting"
- No messages: "No messages yet. Start the conversation by typing below"
- No typing users: Nothing shown (clean UI)

---

## Files Modified/Created

### New Files

- `/src/app/api/pusher/auth/route.ts` - Updated with conversation channel support
- `/src/lib/pusher/client.ts` - Client-side Pusher initialization
- `/src/hooks/useConversation.ts` - Main hook for chat logic
- `/src/app/api/conversations/[id]/typing/route.ts` - Typing indicator endpoint
- `/src/components/chat/ChatHeader.tsx`
- `/src/components/chat/MessageBubble.tsx`
- `/src/components/chat/MessageList.tsx`
- `/src/components/chat/ChatInput.tsx`
- `/src/components/chat/BookingDetailsCard.tsx`
- `/src/components/chat/TypingIndicator.tsx`
- `/src/components/chat/QuickReplies.tsx`
- `/src/components/chat/index.ts` - Barrel export

### Updated Files

- `/src/lib/pusher/server.ts` - Added 3 new trigger functions
- `/src/lib/services/message-service.ts` - Added Pusher triggers, sendTypingIndicator()

### Total New Lines of Code

- Approximately 1,200 lines (well-structured, documented)
- 100% TypeScript with strict mode
- All components are client-side ('use client')

---

## Testing Checklist (Pending)

- [ ] Pusher auth endpoint accepts conversation channels
- [ ] Participant verification works (non-participants get 403)
- [ ] Message triggers fire and reach subscribers
- [ ] Read receipt events update message status
- [ ] Typing indicator appears/disappears correctly
- [ ] Multiple users can chat simultaneously
- [ ] Connection drops recover gracefully
- [ ] Messages persist after page refresh
- [ ] Typing timeouts prevent stale indicators
- [ ] Character limit enforced (1000 chars)
- [ ] Locked conversation disables input
- [ ] Auto-scroll works on mobile

---

## Performance Considerations

### Message Delivery Latency

- Target: < 1 second (Pusher average: 100-300ms)
- Network condition: Should handle 2G/3G (200ms latency)

### Bundle Size Impact

- pusher-js: ~30KB (gzipped)
- New components: ~15KB
- Total Phase 3 impact: ~45KB additional

### Optimization Opportunities (Post-MVP)

1. Lazy load pusher-js (only subscribe when opening chat)
2. Message deduplication (prevent double-rendering)
3. Virtual scrolling (for conversations with 1000+ messages)
4. IndexedDB caching (offline message draft support)

---

## Known Limitations (Phase 3)

1. **No offline support**: Messages not queued if offline
2. **No end-to-end encryption**: Messages readable by server
3. **No rich media**: Text only (Phase 4 adds images)
4. **No message editing**: Once sent, cannot edit
5. **No message deletion**: Soft-delete only (visible to user)
6. **No search**: Cannot search messages within conversation
7. **No file attachments**: Text only
8. **No voice messages**: Phase 5+ feature

---

## Environment Variables Required

All already set in `.env`:

```bash
# Existing Pusher vars (from notifications system)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

---

## API Endpoint Summary

### Message Sending & Reading

- `POST   /api/conversations/{id}/messages` - Send message
- `GET    /api/conversations/{id}/messages` - Get paginated messages
- `PATCH  /api/conversations/{id}/read` - Mark all as read

### New in Phase 3

- `POST   /api/conversations/{id}/typing` - Send typing indicator
- `POST   /api/pusher/auth` - Pusher channel authentication (updated)

### Existing (from Phase 1-2)

- `GET    /api/conversations` - List user's conversations
- `GET    /api/conversations/{id}` - Get conversation details
- `PATCH  /api/conversations/{id}/close` - Close conversation

---

## Next Steps (Recommended Order)

1. **Complete Task 5** (1-2 hours)
   - Conversations list page
   - `ConversationListItem` component with unread badges
   - Pagination if needed

2. **Complete Task 6** (2-3 hours)
   - Chat interface page
   - Component integration
   - Responsive layout

3. **Manual Testing** (2 hours)
   - Test real-time message delivery
   - Test read receipts
   - Test typing indicators
   - Test on mobile

4. **Documentation** (1 hour)
   - Update plan document
   - Create completion summary
   - Document any issues

---

## Success Metrics

**Phase 3 Complete When**:

- ✅ All 8 tasks finished
- ✅ TypeScript: 0 production errors
- ✅ All components render without errors
- ✅ Real-time messages deliver < 1 second
- ✅ Read receipts working correctly
- ✅ Typing indicators visible
- ✅ Mobile responsive
- ✅ All edge cases handled (locked, closed states)

---

**Estimated Completion**: Today (6-8 more hours)  
**Status**: On track 🟢
