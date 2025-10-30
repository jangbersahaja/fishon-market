---
type: plan
status: planning
updated: 2025-10-27
feature: Notification & Chat System
author: GitHub Copilot
tags:
  - notifications
  - chat
  - real-time
  - websocket
  - pusher
impact: high
---

# Notification & Chat System - Implementation Plan

## Executive Summary

Implement a comprehensive notification and real-time chat system for both fishon-captain and fishon-market applications to enable:

1. **Real-time booking notifications** for captains
2. **Status update notifications** for anglers
3. **Direct messaging** between anglers and captains
4. **In-app notification center** with read/unread tracking
5. **Email notifications** as fallback
6. **Push notifications** (future enhancement)

---

## Architecture Overview

### Technology Stack Decision

**Option 1: Pusher (Recommended for MVP)**

- ✅ Managed service, no infrastructure maintenance
- ✅ WebSocket + HTTP fallback built-in
- ✅ 200k messages/day on free tier
- ✅ Easy integration with Next.js
- ✅ Built-in presence channels for online status
- ✅ Message history via webhooks
- ❌ Cost scales with connections (~$49/mo for 100 concurrent)

**Option 2: Socket.io + Redis**

- ✅ Full control over infrastructure
- ✅ No per-connection costs
- ✅ Better for high-scale future
- ❌ Requires WebSocket infrastructure (not serverless-friendly)
- ❌ Need Redis for pub/sub
- ❌ More complex deployment on Vercel

**Option 3: Server-Sent Events (SSE)**

- ✅ Simple HTTP-based, no WebSocket needed
- ✅ Works with serverless
- ❌ One-way only (server → client)
- ❌ No bidirectional chat
- ❌ Poor mobile support

**Decision: Use Pusher for MVP, migrate to Socket.io later if needed**

---

## Phase 1: Database Schema

### Notification System

```prisma
enum NotificationType {
  BOOKING_CREATED      // Captain: New booking request
  BOOKING_APPROVED     // Angler: Booking approved
  BOOKING_REJECTED     // Angler: Booking rejected
  BOOKING_CANCELLED    // Captain: Angler cancelled
  BOOKING_EXPIRED      // Both: Booking expired
  PAYMENT_RECEIVED     // Captain: Payment confirmed
  PAYMENT_DUE          // Angler: Payment reminder
  TRIP_REMINDER        // Angler: Trip starting soon
  TRIP_COMPLETED       // Angler: Leave a review
  REVIEW_RECEIVED      // Captain: New review
  MESSAGE_RECEIVED     // Both: New chat message
  SYSTEM_ANNOUNCEMENT  // Both: Platform updates
}

enum NotificationChannel {
  IN_APP    // Show in notification center
  EMAIL     // Send email
  PUSH      // Push notification (future)
  SMS       // SMS notification (future)
}

model Notification {
  id        String           @id @default(cuid())
  userId    String           // Recipient user ID
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      NotificationType
  title     String
  message   String

  // Contextual data
  bookingId String?
  charterId String?
  messageId String?
  metadata  Json?            // Additional context

  // Delivery tracking
  channels  NotificationChannel[] // Which channels to use
  readAt    DateTime?
  sentAt    DateTime         @default(now())

  // Actions
  actionUrl String?          // Where to navigate on click
  actionLabel String?        // CTA button text

  createdAt DateTime         @default(now())
  expiresAt DateTime?        // Auto-delete after X days

  @@index([userId, readAt])
  @@index([userId, sentAt])
  @@index([type])
  @@index([createdAt])
}
```

### Chat System

```prisma
enum MessageStatus {
  SENT
  DELIVERED
  READ
}

model Conversation {
  id         String   @id @default(cuid())
  bookingId  String   @unique // One conversation per booking
  charterId  String   // For quick captain lookups

  // Participants
  anglerId   String   // Angler user ID
  captainId  String   // Captain user ID (from captain DB)

  // Last message tracking
  lastMessageAt      DateTime?
  lastMessagePreview String?   // First 100 chars
  lastMessageBy      String?   // userId who sent last message

  // Unread counts
  anglerUnreadCount  Int @default(0)
  captainUnreadCount Int @default(0)

  // Status
  archived      Boolean @default(false)
  archivedBy    String? // userId who archived
  archivedAt    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages Message[]

  @@index([anglerId, lastMessageAt])
  @@index([bookingId])
  @@index([charterId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // Sender info
  senderId   String   // User ID from either app
  senderType String   // "angler" | "captain"
  senderName String   // Display name snapshot

  // Content
  content   String
  contentType String @default("text") // "text" | "image" | "file"

  // Attachments (future)
  attachments Json?   // Array of { url, type, size, name }

  // Status tracking
  status       MessageStatus @default(SENT)
  deliveredAt  DateTime?
  readAt       DateTime?

  // Metadata
  metadata     Json?   // For rich content, reactions, etc.

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([conversationId, createdAt])
  @@index([senderId])
}
```

### Update Existing Schema

```prisma
// Add to User model
model User {
  // ... existing fields

  // Notification preferences (Phase 2)
  notificationPreferences Json? // { inApp: true, email: true, push: false }

  // Chat settings
  lastSeenAt DateTime?
  isOnline   Boolean @default(false)

  notifications Notification[]
  // Note: Conversations linked via anglerId/captainId, not direct relation
}

// Update Booking model
model Booking {
  // ... existing fields

  chatId String? // Link to Conversation.id

  conversation Conversation?
}
```

---

## Phase 2: Backend API Routes

### Notification API (`fishon-market`)

```
POST   /api/notifications/send
  - Create and send notifications
  - Body: { userId, type, title, message, channels, metadata }
  - Returns: { id, sentAt }

GET    /api/notifications
  - List user's notifications (paginated)
  - Query: ?unread=true&limit=20&cursor=...
  - Returns: { notifications[], nextCursor, unreadCount }

PATCH  /api/notifications/:id/read
  - Mark notification as read
  - Returns: { success: true }

PATCH  /api/notifications/read-all
  - Mark all notifications as read
  - Returns: { success: true, count }

DELETE /api/notifications/:id
  - Delete notification
  - Returns: { success: true }

GET    /api/notifications/unread-count
  - Get unread notification count
  - Returns: { count }
```

### Chat API (`fishon-market`)

```
POST   /api/conversations
  - Create conversation from booking
  - Body: { bookingId, charterId, anglerId, captainId }
  - Returns: Conversation object

GET    /api/conversations
  - List user's conversations
  - Query: ?limit=20&cursor=...
  - Returns: { conversations[], nextCursor }

GET    /api/conversations/:id
  - Get conversation details
  - Returns: Conversation with last 50 messages

GET    /api/conversations/:id/messages
  - Get conversation messages (paginated)
  - Query: ?limit=50&cursor=...&before=timestamp
  - Returns: { messages[], nextCursor, hasMore }

POST   /api/conversations/:id/messages
  - Send message
  - Body: { content, contentType, attachments }
  - Returns: Message object

PATCH  /api/conversations/:id/read
  - Mark all messages as read
  - Returns: { success: true }

PATCH  /api/conversations/:id/archive
  - Archive conversation
  - Returns: { success: true }
```

### Webhook API (Cross-App Communication)

```
POST   /api/webhooks/captain/booking-status
  - Receive booking status updates from fishon-captain
  - Triggers notification to angler

POST   /api/webhooks/captain/message
  - Receive messages from captain (fishon-captain)
  - Forwards to Pusher + creates notification
```

---

## Phase 3: Real-time Integration (Pusher)

### Pusher Setup

```typescript
// src/lib/pusher/server.ts
import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Trigger notification
export async function triggerNotification(userId: string, notification: any) {
  await pusherServer.trigger(
    `private-user-${userId}`,
    "notification",
    notification
  );
}

// Trigger message
export async function triggerMessage(conversationId: string, message: any) {
  await pusherServer.trigger(
    `private-conversation-${conversationId}`,
    "message",
    message
  );
}
```

```typescript
// src/lib/pusher/client.ts
import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/pusher/auth",
  }
);

// Subscribe to user notifications
export function subscribeToNotifications(
  userId: string,
  onNotification: (data: any) => void
) {
  const channel = pusherClient.subscribe(`private-user-${userId}`);
  channel.bind("notification", onNotification);
  return () => channel.unsubscribe();
}

// Subscribe to conversation messages
export function subscribeToConversation(
  conversationId: string,
  onMessage: (data: any) => void
) {
  const channel = pusherClient.subscribe(
    `private-conversation-${conversationId}`
  );
  channel.bind("message", onMessage);
  return () => channel.unsubscribe();
}
```

### Pusher Auth Endpoint

```typescript
// src/app/api/pusher/auth/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return new Response("Bad Request", { status: 400 });
  }

  // Verify user has access to this channel
  const userId = session.user.id;

  // User notifications channel
  if (channelName === `private-user-${userId}`) {
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return Response.json(authResponse);
  }

  // Conversation channel (verify user is participant)
  if (channelName.startsWith("private-conversation-")) {
    const conversationId = channelName.replace("private-conversation-", "");

    // TODO: Verify user is participant in conversation
    const hasAccess = await verifyConversationAccess(userId, conversationId);

    if (hasAccess) {
      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return Response.json(authResponse);
    }
  }

  return new Response("Forbidden", { status: 403 });
}
```

---

## Phase 4: Frontend Components

### Notification Center Component

```tsx
// src/components/notifications/NotificationCenter.tsx
"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { pusherClient, subscribeToNotifications } from "@/lib/pusher/client";
import { NotificationList } from "./NotificationList";
import { Button } from "@/components/ui/button";

export function NotificationCenter({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch initial notifications
    fetch("/api/notifications?limit=20")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      });

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/icon-192.png",
        });
      }
    });

    return unsubscribe;
  }, [userId]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationList
          notifications={notifications}
          onClose={() => setIsOpen(false)}
          onMarkAllRead={() => {
            fetch("/api/notifications/read-all", { method: "PATCH" });
            setUnreadCount(0);
          }}
        />
      )}
    </>
  );
}
```

### Chat Interface Component

```tsx
// src/components/chat/ChatInterface.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToConversation } from "@/lib/pusher/client";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function ChatInterface({
  conversationId,
  userId,
  initialMessages = [],
}: {
  conversationId: string;
  userId: string;
  initialMessages: any[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to real-time messages
    const unsubscribe = subscribeToConversation(conversationId, (message) => {
      setMessages((prev) => [...prev, message]);

      // Mark as delivered if not from current user
      if (message.senderId !== userId) {
        fetch(
          `/api/conversations/${conversationId}/messages/${message.id}/delivered`,
          {
            method: "PATCH",
          }
        );
      }
    });

    // Mark conversation as read
    fetch(`/api/conversations/${conversationId}/read`, {
      method: "PATCH",
    });

    return unsubscribe;
  }, [conversationId, userId]);

  useEffect(() => {
    // Auto-scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    const message = await response.json();
    setMessages((prev) => [...prev, message]);
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} userId={userId} />
      <div ref={messagesEndRef} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

---

## Phase 5: Integration Points

### Booking Flow Integration

```typescript
// When booking is created (fishon-market)
async function createBooking(bookingData: any) {
  // 1. Create booking
  const booking = await prisma.booking.create({ data: bookingData });

  // 2. Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      bookingId: booking.id,
      charterId: booking.charterId,
      anglerId: booking.userId!,
      captainId: await getCaptainIdForCharter(booking.charterId),
    },
  });

  // 3. Send notification to captain (via webhook to fishon-captain)
  await fetch(`${CAPTAIN_API_URL}/api/webhooks/booking-created`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId: booking.id }),
  });

  // 4. Send welcome message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: "system",
      senderType: "system",
      senderName: "Fishon",
      content:
        "Your booking request has been sent to the captain. They'll respond within 24 hours.",
    },
  });

  return { booking, conversation };
}
```

### Status Update Integration

```typescript
// When captain approves/rejects (fishon-captain sends webhook to fishon-market)
export async function POST(req: NextRequest) {
  const { bookingId, status, message } = await req.json();

  // 1. Update booking status
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status, captainResponse: message },
  });

  // 2. Send notification to angler
  const notification = await prisma.notification.create({
    data: {
      userId: booking.userId!,
      type: status === "APPROVED" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
      title: status === "APPROVED" ? "Booking Approved!" : "Booking Update",
      message: message || "Your booking status has been updated.",
      bookingId: booking.id,
      channels: ["IN_APP", "EMAIL"],
      actionUrl: `/book/confirm?id=${booking.id}`,
      actionLabel: "View Booking",
    },
  });

  // 3. Trigger real-time notification
  await triggerNotification(booking.userId!, notification);

  // 4. Send email
  await sendEmail({
    to: booking.user?.email || booking.guestEmail!,
    subject: notification.title,
    template: "booking-status-update",
    data: { booking, message },
  });

  // 5. Add message to conversation
  const conversation = await prisma.conversation.findUnique({
    where: { bookingId },
  });

  if (conversation) {
    const chatMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: conversation.captainId,
        senderType: "captain",
        senderName: "Captain",
        content: message || "Status updated",
      },
    });

    await triggerMessage(conversation.id, chatMessage);
  }

  return Response.json({ success: true });
}
```

---

## Phase 6: fishon-captain Integration

### Mirror Schema in fishon-captain

```prisma
// Add to fishon-captain/prisma/schema.prisma

model Notification {
  // Same schema as fishon-market
  // Tracks notifications sent to captains
}

model Conversation {
  // Same schema as fishon-market
  // Captains can access conversations for their charters
}

model Message {
  // Same schema as fishon-market
  // Messages sent/received by captains
}
```

### Captain Dashboard Components

```tsx
// fishon-captain/src/components/notifications/NotificationBell.tsx
// Similar to angler notification center

// fishon-captain/src/app/(portal)/captain/messages/page.tsx
// List of conversations for captain's charters

// fishon-captain/src/app/(portal)/captain/messages/[id]/page.tsx
// Chat interface for specific booking
```

---

## Phase 7: Email Notification Templates

### Template System

```typescript
// src/lib/email/templates.ts
export const emailTemplates = {
  "booking-created": {
    subject: "New Booking Request",
    html: (data) => `
      <h1>New Booking Request</h1>
      <p>You have a new booking request from ${data.anglerName}.</p>
      <p><strong>Trip:</strong> ${data.tripName}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <a href="${data.actionUrl}">Review Booking</a>
    `,
  },
  "booking-approved": {
    subject: "Booking Approved!",
    html: (data) => `
      <h1>Your Booking is Approved!</h1>
      <p>Great news! Captain ${data.captainName} has approved your booking.</p>
      <p><strong>Next Step:</strong> Complete payment to confirm.</p>
      <a href="${data.actionUrl}">Complete Payment</a>
    `,
  },
  // ... more templates
};
```

---

## Implementation Timeline

### Week 1: Database & Backend

- [ ] Add Notification, Conversation, Message models to schema
- [ ] Run migrations on both apps
- [ ] Implement notification API routes
- [ ] Implement chat API routes
- [ ] Set up Pusher account and configuration

### Week 2: Real-time Integration

- [ ] Implement Pusher server utilities
- [ ] Implement Pusher client hooks
- [ ] Create auth endpoint for Pusher
- [ ] Test real-time message delivery
- [ ] Test notification delivery

### Week 3: Frontend Components

- [ ] Build NotificationCenter component
- [ ] Build NotificationList component
- [ ] Build ChatInterface component
- [ ] Build ConversationList component
- [ ] Add notification bell to navbar

### Week 4: Integration & Testing

- [ ] Integrate notifications into booking flow
- [ ] Integrate chat into booking confirmation
- [ ] Add webhook handlers for cross-app communication
- [ ] Test email notifications
- [ ] Test real-time updates
- [ ] UAT with test bookings

---

## Environment Variables

```env
# fishon-market
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# Email (existing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fishon.my
SMTP_PASS=your_password

# fishon-captain (same Pusher config)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

---

## Cost Estimation

### Pusher Pricing

- **Free Tier**: 200k messages/day, 100 concurrent connections
- **Startup Plan**: $49/mo - 1M messages/day, 500 concurrent connections
- **Professional Plan**: $299/mo - 10M messages/day, 2000 concurrent connections

### Expected Usage (Year 1)

- **Bookings/month**: ~500
- **Messages/booking**: ~10
- **Notifications/booking**: ~5
- **Total messages/month**: ~7,500
- **Concurrent connections**: <50
- **Verdict**: Free tier sufficient for MVP

---

## Future Enhancements (Phase 8+)

### Advanced Features

- [ ] Push notifications (Web Push API + FCM)
- [ ] SMS notifications via Twilio
- [ ] Message reactions and replies
- [ ] File/image sharing in chat
- [ ] Voice messages
- [ ] Video call integration
- [ ] Chatbot for FAQ
- [ ] Message translation
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message search
- [ ] Notification preferences per type

### Analytics

- [ ] Notification open rates
- [ ] Message response times
- [ ] Conversation resolution rates
- [ ] Most common inquiry types

---

## Success Metrics

### KPIs to Track

- **Notification delivery rate**: >99%
- **Email open rate**: >40%
- **Message response time**: <2 hours
- **Conversation resolution**: >90% within 24h
- **User satisfaction**: >4.5/5 stars

### Monitoring

- Pusher dashboard for connection metrics
- Custom logging for notification delivery
- Email delivery tracking via SMTP logs
- User feedback surveys

---

## Risk Mitigation

### Potential Issues & Solutions

**Risk**: Pusher downtime  
**Mitigation**: Implement graceful degradation, show "Connecting..." state, queue failed messages

**Risk**: High message volume exceeds free tier  
**Mitigation**: Implement message rate limiting, upgrade to paid plan if needed

**Risk**: Cross-database consistency  
**Mitigation**: Use idempotent webhooks with retry logic, add correlation IDs

**Risk**: SPAM or abuse  
**Mitigation**: Rate limit messages per user, implement reporting/blocking

**Risk**: Privacy concerns  
**Mitigation**: End-to-end encryption for sensitive data, GDPR compliance

---

## Next Steps

1. **Review and approve plan** with stakeholders
2. **Set up Pusher account** and get credentials
3. **Create feature branch**: `feat/notification-chat-system`
4. **Start with Phase 1**: Database schema updates
5. **Iterate in 1-week sprints**

---

**Last Updated:** 2025-10-27  
**Status:** 📋 Planning  
**Next Review:** After stakeholder approval
