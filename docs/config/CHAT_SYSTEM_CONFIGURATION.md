# Chat System Configuration Documentation

**Version**: 1.2  
**Last Updated**: 2025-11-17  
**Status**: Active  
**Primary Location**: fishon-market (chat data stored in market DB)  
**Applies To**: fishon-market, fishon-captain

---

## Purpose

This document provides a comprehensive overview of the chat/messaging system configuration across the Fishon platform, identifies known issues with the AUTO booking flow integration, and provides recommendations for fixes.

## Table of Contents

- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Conversation Lifecycle](#conversation-lifecycle)
- [System Messages](#system-messages)
- [API Endpoints](#api-endpoints)
- [UI Components](#ui-components)
- [Real-time Communication](#real-time-communication)
- [Known Issues](#known-issues)
- [Recommendations](#recommendations)
- [Cron Jobs](#cron-jobs)

---

## System Architecture

### Data Storage

- **Primary Database**: fishon-market (PostgreSQL)
- **Tables**: `Conversation`, `Message`
- **Cross-App Access**: fishon-captain reads via `prisma-market` client (read-only)

### Communication Pattern

- **Angler → Captain**: Direct database writes in fishon-market
- **Captain → Angler**: fishon-captain calls fishon-market API (`POST /api/conversations/:id/messages`)
- **Real-time**: Pusher websockets for instant delivery

### Access Control

- **Anglers**: Can only access conversations where `anglerId = userId`
- **Captains**: Can only access conversations where `ownerId = userId` (captain who owns the charter)
- **Permission Check**: Both roles verified on every API call

---

## Database Schema

### Conversation Model

```prisma
model Conversation {
  id                  String              @id @default(cuid())
  bookingId           String              @unique
  anglerId            String              // User who made booking
  ownerId             String              // Captain who owns the charter
  charterId           String              // Charter reference
  status              ConversationStatus  @default(LOCKED)

  // Message tracking
  lastMessageAt       DateTime?
  lastMessagePreview  String?
  lastMessageBy       String?            // "angler" | "captain" | "system"

  // Unread counts (separate for each role)
  anglerUnreadCount   Int                 @default(0)
  captainUnreadCount  Int                 @default(0)

  // Timestamps
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  closedAt            DateTime?
  closedBy            String?             // userId or "system"

  // Relations
  booking             Booking             @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  angler              User                @relation("AnglerConversations", fields: [anglerId], references: [id], onDelete: Cascade)
  owner               User                @relation("CaptainConversations", fields: [ownerId], references: [id])
  charter             Charter             @relation(fields: [charterId], references: [id], onDelete: Cascade)
  messages            Message[]

  @@index([bookingId])
  @@index([anglerId])
  @@index([ownerId])
  @@index([charterId])
  @@index([status])
  @@index([lastMessageAt])
}

enum ConversationStatus {
  LOCKED           // Chat disabled (before payment)
  ACTIVE           // Chat enabled (after payment)
  RESTRICTED       // Limited chat (after cancellation)
  CLOSING_SOON     // Warning (trip ending in 24h)
  CLOSED           // Chat disabled (after trip completion + 24h)
}
```

### Message Model

```prisma
model Message {
  id              String      @id @default(cuid())
  conversationId  String
  senderId        String
  senderType      String      // "angler" | "captain" | "system"
  content         String      @db.Text
  contentType     String      @default("text") // "text" | "system" | "booking_card"
  status          String      @default("SENT") // "SENT" | "DELIVERED" | "READ"

  // System message metadata
  systemType      String?     // "booking_created" | "booking_approved" | etc.
  bookingSnapshot Json?       // Booking state at message time

  // Quick reply flag
  isQuickReply    Boolean     @default(false)

  // Timestamps
  createdAt       DateTime    @default(now())
  deliveredAt     DateTime?
  readAt          DateTime?
  deletedAt       DateTime?
  deletedBy       String?

  // Relations
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender          User         @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([senderId])
  @@index([status])
  @@index([createdAt])
}
```

---

## Conversation Lifecycle

### Flow Diagram

```
BOOKING CREATED
    ↓
LOCKED (chat disabled)
    ↓
PAYMENT RECEIVED
    ↓
ACTIVE (chat enabled)
    ↓
TRIP ENDS
    ↓
CLOSING_SOON (24h grace period)
    ↓
CLOSED (chat disabled permanently)
```

### Status Definitions

| Status           | Description      | Chat Access                          | When Applied                              |
| ---------------- | ---------------- | ------------------------------------ | ----------------------------------------- |
| **LOCKED**       | Before payment   | ❌ Disabled (except system messages) | On booking creation                       |
| **ACTIVE**       | Normal operation | ✅ Full access                       | After payment confirmed (PAID status)     |
| **RESTRICTED**   | Limited chat     | ⚠️ Read-only or limited              | After cancellation (future feature)       |
| **CLOSING_SOON** | Warning period   | ✅ Full access                       | Trip ends, 24h before auto-close (future) |
| **CLOSED**       | Archived         | ❌ Read-only                         | 24h after trip completion                 |

### Unlock Triggers

#### MANUAL Booking Flow

```

PENDING → AWAITING_PAYMENT → PAID
                               ↓
                          Unlock chat
```

- **Trigger**: `/api/bookings/pay` route (line 63)
- **Condition**: `booking.status === "PAID"`
- **Action**: `unlockConversation(conversation.id)`

#### AUTO Booking Flow

```
PAYMENT_AUTHORIZED → PAID
         ↓             ↓
    Unlock chat   (already unlocked)
```

- **Trigger 1**: `/api/bookings/create` route (line 714-718) for `PAYMENT_AUTHORIZED`
- **Trigger 2**: `/api/bookings/acknowledge` route (line 115) when transitioning to `PAID`
- **Condition**: `booking.status === "PAYMENT_AUTHORIZED"` OR `booking.status === "PAID"`
- **Action**: `unlockConversation(conversation.id)`

### Close Triggers

1. **Automatic Closure** (via cron job):
   - **Condition**: `booking.date + booking.days + 24 hours < now()`
   - **Job**: `closeExpiredConversations()` in `/lib/jobs/close-conversations-job.ts`
   - **Status**: ✅ Implemented but **NOT configured in vercel.json**

2. **Manual Closure** (future):
   - User-initiated close
   - Admin moderation

---

## System Messages

### Implementation

**Location**: `/src/lib/services/message-templates.ts`

System messages are automatically sent when booking events occur. They use `contentType: "system"` and have a `systemType` field.

### Available Templates

| Template Function              | System Type            | Trigger Event                       | Status                    |
| ------------------------------ | ---------------------- | ----------------------------------- | ------------------------- |
| `bookingCreatedMessage()`      | `booking_created`      | Booking created (both flows)        | ✅ Implemented            |
| `bookingApprovedMessage()`     | `booking_approved`     | Captain approves (MANUAL flow only) | ✅ Implemented            |
| `bookingRejectedMessage()`     | `booking_rejected`     | Captain rejects                     | ✅ Implemented            |
| `paymentConfirmedMessage()`    | `payment_confirmed`    | Payment received (MANUAL flow)      | ✅ Implemented            |
| `bookingCancelledMessage()`    | `booking_cancelled`    | Booking cancelled                   | ✅ Implemented            |
| `bookingExpiredMessage()`      | `booking_expired`      | Booking expires without action      | ✅ Implemented            |
| `tripCompletedMessage()`       | `trip_completed`       | Trip ends                           | ✅ Implemented            |
| `conversationClosingMessage()` | `conversation_closing` | 24h warning before close            | ✅ Implemented (not used) |
| `conversationClosedMessage()`  | `conversation_closed`  | Conversation closed                 | ✅ Implemented            |
| `reviewThanksMessage()`        | `review_thanks`        | After review submission             | ✅ Implemented (not used) |

### Usage Example

```typescript
import { bookingCreatedMessage } from "@/lib/services/message-templates";
import { sendSystemMessage } from "@/lib/services/message-service";

// Get template
const template = bookingCreatedMessage();

// Send system message
await sendSystemMessage(
  conversationId,
  template.systemType, // "booking_created"
  template.content, // Message text
  bookingSnapshot // Optional: booking state
);
```

### AUTO Flow Gap

**ISSUE**: `bookingApprovedMessage()` is only called in `/api/bookings/approve` (MANUAL flow). AUTO flow bookings skip the approval step entirely:

```
MANUAL: PENDING → AWAITING_PAYMENT → PAID
                    ↑
            bookingApprovedMessage()

AUTO: PAYMENT_AUTHORIZED → PAID
              ↑
        NO system message!
```

**Expected**: A system message should be sent when AUTO flow bookings are created or acknowledged, informing both parties that payment was received and captain acknowledgment is pending.

---

## API Endpoints

### fishon-market (Primary)

All conversation data stored here. Anglers and system write directly.

| Method | Endpoint                          | Purpose                               | Auth        | Status         |
| ------ | --------------------------------- | ------------------------------------- | ----------- | -------------- |
| POST   | `/api/conversations`              | Create conversation (auto on booking) | ✅ Required | ✅ Implemented |
| GET    | `/api/conversations`              | List user's conversations             | ✅ Required | ✅ Implemented |
| GET    | `/api/conversations/:id`          | Get conversation details              | ✅ Required | ✅ Implemented |
| GET    | `/api/conversations/:id/messages` | List messages (paginated)             | ✅ Required | ✅ Implemented |
| POST   | `/api/conversations/:id/messages` | Send message                          | ✅ Required | ✅ Implemented |
| PATCH  | `/api/conversations/:id/read`     | Mark messages as read                 | ✅ Required | ✅ Implemented |
| PATCH  | `/api/conversations/:id/close`    | Close conversation                    | ✅ Required | ✅ Implemented |
| POST   | `/api/conversations/:id/typing`   | Send typing indicator                 | ✅ Required | ✅ Implemented |

### fishon-captain (Proxy)

Captains read from market DB, write via market API.

| Method | Endpoint                      | Purpose                      | Implementation            |
| ------ | ----------------------------- | ---------------------------- | ------------------------- |
| GET    | `/api/messages/conversations` | List captain's conversations | Read from `prisma-market` |
| POST   | `/api/messages/send`          | Send message                 | Calls fishon-market API   |

### Mark as Read Endpoint

**Endpoint**: `PATCH /api/conversations/:id/read`

**Location**: `/src/app/api/conversations/[id]/read/route.ts`

**Logic** (from `markAsRead()` in `message-service.ts`):

1. Verify user is conversation participant (angler or owner)

2. Update all messages where `senderId !== userId` to `status: "READ"`
3. Set `readAt` timestamp on updated messages
4. Reset unread count (`anglerUnreadCount` or `captainUnreadCount`) to 0
5. Trigger Pusher event `message:read` for real-time sync

**Expected Behavior**: When user opens a conversation, frontend should call this endpoint to clear their unread count.

**Current Implementation**:

- ✅ Backend endpoint exists and works correctly
- ✅ `useConversation` hook has `markAsRead()` function

- ⚠️ **ISSUE**: Frontend chat UI is not fully implemented, so `markAsRead()` may not be called automatically

---

## UI Components

### fishon-market (Angler View)

#### Conversation List

**Component**: `/src/app/(account)/account/messages/conversations-client.tsx`

**Features**:

- Lists all conversations sorted by `lastMessageAt`
- Shows unread count badge per conversation
- Displays total unread count at top
- Real-time updates via Pusher

**Status Display**: ✅ Shows conversation status (LOCKED, ACTIVE, CLOSED)

#### Booking Card

**Component**: `/src/components/account/BookingCard.tsx`

**Status Display** (lines 160-170):

```tsx
{
  booking.status === "PAID" || booking.status === "COMPLETED" ? (
    <span className="px-3 text-sm text-gray-500 bg-emerald-100">PAID</span>
  ) : booking.status === "PAYMENT_AUTHORIZED" ? (
    <span className="px-3 text-sm text-blue-700 bg-blue-100">
      PAYMENT RECEIVED
    </span>
  ) : (
    <span className="text-sm text-gray-500">UNPAID</span>
  );
}
```

**Countdown Timer** (lines 177-200):

- Shows countdown for `PENDING`, `PAYMENT_AUTHORIZED`, `AWAITING_PAYMENT`
- Different helper text for each status:
  - `AWAITING_PAYMENT`: "Complete payment to secure your booking"
  - `PAYMENT_AUTHORIZED`: "Awaiting captain acknowledgment."

**Status**: ✅ Both `PAYMENT_AUTHORIZED` and `AWAITING_PAYMENT` have proper UI display

#### Chat Interface

**Component**: `/src/components/messages/ChatInterface.tsx`

**Status**: ⚠️ **PLACEHOLDER ONLY** - Shows "Implementation in progress..." message

**Missing Features**:

- Message list display
- Send message input
- Read receipt handling (auto-call `markAsRead()`)
- Typing indicators
- Quick replies
- System message rendering

#### Booking Timeline

**Component**: `/src/components/booking/BookingTimeline.tsx`

**Payment Step Logic** (lines 27-28, 42-43, 53):

```tsx
const isPaymentPending =
  status === "PENDING" ||
  status === "AWAITING_PAYMENT" ||
  status === "PAYMENT_AUTHORIZED" ||
  status === "PAID";

const isPaymentComplete = status === "PAID" || status === "PAYMENT_AUTHORIZED";
```

**Status**: ✅ Timeline correctly handles both statuses

### fishon-captain (Captain View)

**Location**: `/src/app/captain/bookings/*`

**Implementation**: Captain chat UI not yet implemented. Uses API proxy pattern for sending messages.

---

## Real-time Communication

### Pusher Integration

**Client**: `/src/lib/pusher/client.ts`

**Server**: `/src/lib/pusher/server.ts`

### Event Types

| Event                  | Channel             | Trigger              | Payload                 |
| ---------------------- | ------------------- | -------------------- | ----------------------- |
| `message:new`          | `conversation-{id}` | New message sent     | `{ message }`           |
| `message:read`         | `conversation-{id}` | Messages marked read | `{ userId, readAt }`    |
| `typing:start`         | `conversation-{id}` | User starts typing   | `{ userId, timestamp }` |
| `typing:stop`          | `conversation-{id}` | User stops typing    | `{ userId, timestamp }` |
| `conversation:updated` | `conversation-{id}` | Status change        | `{ status, closedAt? }` |
| `notification:count`   | `user-{userId}`     | Unread count change  | `{ count }`             |

### Frontend Hook

**Hook**: `src/hooks/useConversation.ts`

**Features**:

- Subscribes o Pusher events for real-time updates

- Manages messages array and conversation metadata
- Provides `sendMessage()`, `markAsRead()`, `sendTypingIndicator()` functions
- Auto-syncs with backend state

**Status**: ✅ Fully implemented, ready for use in chat UI

---

## Known Issues

### 1. ✅ FIXED: Missing System Message for AUTO Flow

**Description**: AUTO flow bookings (`PAYMENT_AUTHORIZED`) now receive a system message explaining that payment was received and captain acknowledgment is pending.

**Status**: ✅ **FIXED** (2025-11-17)

**Implementation**:

- Added `paymentReceivedMessage()` template in `/src/lib/services/message-templates.ts`
- System message sent after unlocking conversation in `/src/app/api/bookings/create/route.ts`
- Message: "💳 Payment Received! Your booking is confirmed. Payment has been received and the captain will acknowledge your booking shortly. You can now chat with the captain to discuss trip details."

---

### 2. ✅ FIXED: Booking Expiration System Message Not Sent

**Description**: The `bookingExpiredMessage()` template is now called when bookings expire.

**Status**: ✅ **FIXED** (2025-11-17)

**Implementation**:

- Added `sendSystemMessage()` call in `/src/app/api/cron/expire-bookings/route.ts`
- System message sent after updating booking status to `REJECTED`
- Non-blocking async operation with error handling
- Message includes booking context (bookingId, reason, paymentAction)

**Current Behavior**:

- Cron job updates booking status to `REJECTED` ✅
- Sends in-app notification to angler ✅
- Sends system message in conversation chat ✅

---

### 3. ✅ FIXED: Conversation Closing Cron Not Configured

**Description**: The cron job to automatically close conversations 24h after trip completion is now configured.

**Status**: ✅ **FIXED** (2025-11-17)

**Implementation**:

- Job logic: `/src/lib/jobs/close-conversations-job.ts` ✅ Implemented
- API route: `/src/app/api/cron/close-conversations/route.ts` ✅ Implemented
- Vercel config: `/vercel.json` ✅ **CONFIGURED**

**Schedule**: Every 6 hours (`0 */6 * * *`)

**Updated `vercel.json`**:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-booking-status",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/close-conversations",
      "schedule": "0 */6 * * *" // ✅ CONFIGURED
    }
  ]
}
```

---

### 4. ✅ FIXED: Chat Status Notice Component Added

**Description**: Created `ChatStatusNotice` component to display user-friendly explanations when chat is restricted.

**Status**: ✅ **IMPLEMENTED** (2025-11-17)

**Locations**:

- **Fishon Market**: `/src/components/messages/ChatStatusNotice.tsx`
- **Fishon Captain**: `/src/components/captain/chat/ChatStatusNotice.tsx`

**Features**:

- Shows appropriate icon and message for LOCKED, CLOSED, or RESTRICTED status
- Non-intrusive small display near chat box
- Includes link to contact support
- Color-coded by status (amber for LOCKED, gray for CLOSED, red for RESTRICTED)
- Integrated into chat UI in both apps

**Usage**:

```tsx
<ChatStatusNotice status="LOCKED" />
<ChatStatusNotice status="CLOSED" />
<ChatStatusNotice status="RESTRICTED" reason="Custom reason" />
```

**Integration**:

- **Fishon Market**: Displays above chat input when `isChatLocked`
- **Fishon Captain**: Displays above chat input in messages page when `isChatLocked`
- Shows contextual messages based on booking status (PENDING, AWAITING_PAYMENT, etc.)

---

### 5. ⚠️ Chat UI Not Fully Implemented

**Description**: The main chat interface component (`ChatInterface.tsx`) is a placeholder with no real functionality.

**Location**: `/src/components/messages/ChatInterface.tsx`

**Current State**:

- ✅ Fetches conversation metadata

- ❌ Does not display messages
- ❌ Does not have message input
- ❌ Does not call `markAsRead()` on open
- ❌ No typing indicators
- ❌ No quick replies
- ❌ No system message rendering

**Impact**:

- Users cannot actually chat
- Unread counts may not reset when conversation is opened
- System messages not visible to users

**Recommendation**: Implement full chat UI using:

- `useConversation()` hook (already available)
- Message list with virtualization (for performance)
- Auto-scroll to bottom on new messages
- Call `markAsRead()` on component mount and when new messages arrive from other user

- Render system messages with special styling
- Quick reply buttons for common responses

---

### 6. ✅ FIXED: Unread Count Not Cleared on Conversation View (Captain App)

**Description**: Captain app was missing the mark-as-read functionality, causing unread counts to persist even after viewing messages.

**Status**: ✅ **FIXED** (2025-11-17)

**Root Cause**:

1. ❌ No API endpoint for captain to mark conversations as read
2. ❌ `useConversation().markAsRead()` was a no-op function
3. ❌ Captain's unread count never updated in database

**Implementation**:

1. **Created API Endpoint**: `/api/captain/conversations/[id]/read`
   - Verifies captain owns the conversation
   - Updates `captainUnreadCount = 0` in database
   - Marks received messages as `READ`
   - Triggers Pusher event for real-time sync
   - Rate limited: 30 requests/minute

2. **Updated Hook**: `useConversation.ts`
   - Replaced no-op `markAsRead()` with actual API call
   - Called automatically when conversation opens
   - Triggers router refresh to update UI

3. **Flow**:

```typescript
// useConversation hook (line 223-244)
const markAsRead = useCallback(async () => {
  const response = await fetch(
    `/api/captain/conversations/${conversationId}/read`,
    { method: "PATCH" }
  );
  // Triggers router.refresh() to update sidebar counts
}, [conversationId, router]);

// Called on mount (line 315)
useEffect(() => {
  markAsRead(); // Clears unread count immediately
}, [conversationId, markAsRead]);
```

**Current Behavior**:

- ✅ Captain opens conversation → unread count clears immediately
- ✅ Unread count persists as 0 after page refresh
- ✅ Real-time sync via Pusher works correctly
- ✅ Security: Only captain can mark their own conversations as read

**Files Modified**:

- `/src/app/api/captain/conversations/[id]/read/route.ts` (created)
- `/src/hooks/useConversation.ts` (updated markAsRead function)
- `/docs/CHAT_UNREAD_COUNT_FIX.md` (analysis document)

---

### 7. ⚠️ Status Mismatch Between Booking and Chat Syste(my)

**Description**: Booking status changes (e.g., PENDING → AWAITING_PAYMENT → PAID) should be reflected in chat conversation state, but synchronization may be inconsistent.

**Expected Behavior**:

| Booking Status     | Conversation Status | Chat Access  |
| ------------------ | ------------------- | ------------ |
| PENDING            | LOCKED              | ❌ Disabled  |
| AWAITING_PAYMENT   | LOCKED              | ❌ Disabled  |
| PAYMENT_AUTHORIZED | ACTIVE              | ✅ Enabled   |
| PAID               | ACTIVE              | ✅ Enabled   |
| CANCELLED          | RESTRICTED (future) | ⚠️ Read-only |

| COMPLETED | ACTIVE → CLOSED (after 24h) | ✅ → ❌ |
| REJECTED | LOCKED | ❌ Disabled |

**Current Implementation**:

- ✅ `unlockConversation()` called in pay/acknowledge routes
- ✅ Conversation status checked in `sendMessage()` (blocks user messages when LOCKED)
- ⚠️ **ISSUE**: No reverse check—conversation status doesn't prevent booking actions

**Example Problem**:

- User pays for booking (status → PAID, conversation → ACTIVE)
- User cancels booking (status → CANCELLED)

- **BUG**: Conversation remains ACTIVE, chat still works

**Recommendation**:

1. Add `RESTRICTED` status to `ConversationStatus` enum (already exists)
2. Update conversation status when booking is cancelled:

   ```typescript
   await prisma.conversation.update({
     where: { bookingId },
     data: { status: "RESTRICTED" },
   });
   ```

3. Block message sending in RESTRICTED conversations (keep read access)

---

## Recommendations

### Priority 1: Complete Chat UI (Critical)

**Files to Implement**:

- `/src/components/messages/ChatInterface.tsx` (full implementation)
- `/src/components/messages/MessageList.tsx` (new)
- `/src/components/messages/MessageInput.tsx` (new)
- `/src/components/messages/SystemMessage.tsx` (new)
- `/src/components/messages/QuickReplies.tsx` (new)

**Key Features**:

1. Auto-call `markAsRead()` on mount and when receiving messages
2. Render system messages with distinct styling (e.g., centered, gray background)
3. Show booking card when `contentType: "booking_card"`
4. Display typing indicators
5. Auto-scroll to bottom on new messages
6. Message input with validation (1-1000 chars)
7. Quick reply buttons for common responses

---

### Priority 2: Add AUTO Flow System Message (High)

**Files to Modify**:

1. `/src/lib/services/message-templates.ts`
   - Add `paymentReceivedMessage()` template

2. `/src/app/api/bookings/create/route.ts` (line ~720)
   - Send system message after unlocking conversation for `PAYMENT_AUTHORIZED`

**Template**:

```typescript
export const paymentReceivedMessage = (): MessageTemplate => ({
  systemType: "payment_received_auto",
  content:
    "💳 Payment received! Your booking is confirmed. The captain will acknowledge your booking shortly. You can now chat with the captain to discuss trip details.",
});
```

---

### Priority 3: Configure Conversation Closing Cron (Medium)

**File to Modify**: `/vercel.json`

**Change**:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-booking-status",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/close-conversations",
      "schedule": "0 */6 * * *" // Every 6 hours
    }
  ]
}
```

**Testing**: After deployment, manually trigger via:

```bash
curl -X POST https://fishon-market.vercel.app/api/cron/close-conversations \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### Priority 4: Send System Message on Booking Expiration (Medium)

**File to Modify**: `/src/app/api/cron/expire-bookings/route.ts`

**Location**: After updating booking status to `REJECTED` (around line 181), add:

```typescript
// Send system message to conversation
try {
  const conversation = await prisma.conversation.findUnique({
    where: { bookingId: booking.id },
  });

  if (conversation) {
    const template = bookingExpiredMessage();
    await sendSystemMessage(
      conversation.id,
      template.systemType,
      template.content,
      {
        bookingId: booking.id,
        reason: "expired",
        paymentAction,
      }
    );
  }
} catch (err) {
  console.error(
    `[EXPIRE_CRON] Failed to send system message for ${booking.id}:`,
    err
  );
}
```

---

### Priority 5: Implement Conversation Status Sync (Low)

**Goal**: Keep conversation status in sync with booking status changes.

**Files to Modify**:

1. `/src/app/api/bookings/cancel/route.ts`
   - Set conversation to `RESTRICTED` when booking cancelled

2. `/src/lib/services/message-service.ts`
   - Update `sendMessage()` to block user messages in `RESTRICTED` status
   - Allow read access to RESTRICTED conversations

**Example**:

```typescript
// In cancel route, after updating booking
await prisma.conversation.update({
  where: { bookingId: booking.id },
  data: {
    status: "RESTRICTED",
    closedAt: new Date(),
    closedBy: userId,
  },
});

// Send system message about cancellation
const template = bookingCancelledMessage();
await sendSystemMessage(
  conversation.id,
  template.systemType,
  template.content,
  { bookingId: booking.id, cancelledBy: "angler" }
);
```

---

## Cron Jobs

### Configured (in vercel.json)

| Path                              | Schedule      | Purpose                                        | Status    |
| --------------------------------- | ------------- | ---------------------------------------------- | --------- |
| `/api/cron/update-booking-status` | Every 15 min  | Update booking statuses based on time          | ✅ Active |
| `/api/cron/expire-bookings`       | Every 15 min  | Expire `PAYMENT_AUTHORIZED` bookings after 12h | ✅ Active |
| `/api/cron/close-conversations`   | Every 6 hours | Close conversations 24h after trip completion  | ✅ Active |

### Future Cron Jobs (Recommended)

| Path                              | Schedule      | Purpose                                                   |
| --------------------------------- | ------------- | --------------------------------------------------------- |
| `/api/cron/send-closing-warnings` | Every 6 hours | Send `conversationClosingMessage()` 24h before auto-close |
| `/api/cron/cleanup-old-messages`  | Daily         | Archive messages from CLOSED conversations (performance)  |

---

## Testing Checklist

### Manual Testing Flow

#### 1. MANUAL Booking Flow (Angler)

- [ ] Create booking (chat should be LOCKED)
- [ ] Check conversation list (should show LOCKED status)
- [ ] Try to send message (should fail with error)
- [ ] Captain approves booking (system message appears)
- [ ] Complete payment (chat unlocks to ACTIVE)
- [ ] Send message (should succeed)
- [ ] Open conversation (unread count clears)

#### 2. AUTO Booking Flow (Angler)

- [ ] Create booking with payment (status: PAYMENT_AUTHORIZED)
- [ ] Verify conversation unlocked immediately
- [ ] ✅ Check for system message ("💳 Payment Received! Your booking is confirmed...")
- [ ] Captain acknowledges (status: PAID)
- [ ] Send message and verify delivery
- [ ] Open conversation (unread count clears)

#### 3. Captain Flow

- [ ] Receive new booking notification
- [ ] Open conversation list (see angler's conversation)
- [ ] Try to send message before payment (should fail if LOCKED)
- [ ] Send message after payment (should succeed)
- [ ] Check unread count increments for angler

#### 4. Expiration Flow

- [ ] Create PAYMENT_AUTHORIZED booking
- [ ] Wait 12 hours (or manually trigger cron)
- [ ] Verify booking status → REJECTED
- [ ] ✅ Check for expiration system message in chat
- [ ] Verify in-app notification sent

#### 5. Conversation Closing

- [ ] Complete a paid booking
- [ ] Trip end date passes
- [ ] ✅ Wait 24 hours (cron runs every 6 hours)
- [ ] ✅ Verify conversation status → CLOSED
- [ ] ✅ Check for closing system message

#### 6. Chat Status Notice (UI)

- [ ] ✅ Open locked conversation (before payment)
- [ ] ✅ Verify ChatStatusNotice displays with LOCKED status (amber)
- [ ] ✅ See contextual message based on booking status
- [ ] ✅ Verify "Contact support" link present
- [ ] Complete booking and wait 24h after trip
- [ ] ✅ Verify ChatStatusNotice displays with CLOSED status (gray)
- [ ] Cancel booking
- [ ] ✅ Verify ChatStatusNotice displays with RESTRICTED status (red)

---

## Related Documentation

- **Email/Notification System**: `EMAIL_NOTIFICATION_SYSTEM.md`
- **Booking System**: `BOOKING_SYSTEM_CONFIGURATION.md`
- **Chat System Plan**: `docs/plan-chat-message-system.md` (archived)
- **API Testing Guide**: `docs/archive/PHASE1-API-TESTING-GUIDE.md`
- **Message Templates**: `src/lib/services/message-templates.ts`

---

## Change Log

| Date       | Version | Changes                                                                                                                                                                   | Author |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2025-11-17 | 1.2     | Fixed captain unread count issue: Created mark-as-read API endpoint and updated useConversation hook. Captain conversations now properly clear unread counts when opened. | System |
| 2025-11-17 | 1.1     | Fixed 4 critical issues: AUTO flow system message, expiration system message, conversation closing cron configuration, and added ChatStatusNotice component to both apps  | System |
| 2025-01-15 | 1.0     | Initial documentation covering system architecture, known issues, and recommendations                                                                                     | System |

---

## Notes

This document is the **single source of truth** for chat system configuration. When making changes to the chat system:

1. Update this document first
2. Implement the changes
3. Update the change log
4. Notify team members of breaking changes

For questions or clarifications, refer to:

- Code: `/src/lib/services/message-service.ts`, `/src/app/api/conversations/*`
- Tests: `/src/app/api/bookings/__tests__/auto-flow.test.ts`
- Docs: This file
