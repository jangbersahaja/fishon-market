# Phase 1: Messaging API Testing Guide

## Overview

This document provides step-by-step instructions to test all Phase 1 messaging APIs. Both fishon-market and fishon-captain must be running on their respective ports.

## Prerequisites

### Servers Running

- **fishon-market**: http://localhost:3001
- **fishon-captain**: http://localhost:3000
- Both apps must have valid auth sessions

### Authentication Setup in Postman

1. **Create Test Bookings First**
   - Sign in to fishon-market as an angler
   - Create a booking to get `bookingId`
   - Note the `charterId` and `ownerId` (captain ID)

2. **Get Auth Tokens**
   - In Postman, use the application's cookies or manually extract JWT tokens
   - For testing, you may need to call auth endpoints first to establish sessions

## API Endpoints to Test

### Part 1: Fishon-Market Endpoints (Port 3001)

#### 1.1 GET /api/conversations - List User's Conversations

```
GET http://localhost:3001/api/conversations
Query Parameters:
- role: "angler" or "captain"
- limit: 20 (optional, 1-100)
- cursor: "" (optional, for pagination)

Expected Response (200):
{
  "conversations": [
    {
      "id": "conv-id",
      "bookingId": "booking-id",
      "anglerId": "angler-id",
      "captainId": "captain-id",
      "charterId": "charter-id",
      "status": "LOCKED|ACTIVE|RESTRICTED|CLOSING_SOON|CLOSED|ARCHIVED",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "lastMessagePreview": "Hi there...",
      "lastMessageBy": "CAPTAIN|ANGLER|SYSTEM",
      "anglerUnreadCount": 0,
      "captainUnreadCount": 2,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "totalUnread": 2
}

Error Cases:
- 401: Not authenticated
- 400: Invalid role parameter
```

#### 1.2 GET /api/conversations/:id - Get Single Conversation

```
GET http://localhost:3001/api/conversations/{conversationId}

Expected Response (200):
{
  "id": "conv-id",
  "bookingId": "booking-id",
  "anglerId": "angler-id",
  "captainId": "captain-id",
  "charterId": "charter-id",
  "status": "LOCKED",
  "createdAt": "2024-01-15T10:00:00Z",
  "angler": { "id": "angler-id", "name": "John Doe", "email": "john@example.com" },
  "captain": { "id": "captain-id", "name": "Captain Jack", "email": "jack@example.com" },
  "booking": { "id": "booking-id", "tripDate": "2024-02-01T08:00:00Z", "status": "PENDING" }
}

Error Cases:
- 401: Not authenticated
- 403: User is not a participant in conversation
- 404: Conversation not found
```

#### 1.3 GET /api/conversations/:id/messages - List Messages

```
GET http://localhost:3001/api/conversations/{conversationId}/messages
Query Parameters:
- limit: 50 (optional, 1-100)
- cursor: "" (optional, for pagination)

Expected Response (200):
{
  "messages": [
    {
      "id": "msg-id",
      "conversationId": "conv-id",
      "senderId": "user-id",
      "senderType": "CAPTAIN|ANGLER|SYSTEM",
      "content": "Hello!",
      "contentType": "text|system_message",
      "status": "SENT|DELIVERED|READ",
      "isQuickReply": false,
      "createdAt": "2024-01-15T10:05:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}

Error Cases:
- 401: Not authenticated
- 403: User not in conversation
- 404: Conversation not found
```

#### 1.4 POST /api/conversations/:id/messages - Send Message

```
POST http://localhost:3001/api/conversations/{conversationId}/messages
Headers:
  Content-Type: application/json

Body:
{
  "content": "Hi Captain, when should I arrive?",
  "contentType": "text" (optional, default "text")
  "isQuickReply": false (optional)
}

Expected Response (201):
{
  "success": true,
  "message": {
    "id": "msg-id",
    "conversationId": "conv-id",
    "senderId": "user-id",
    "senderType": "ANGLER|CAPTAIN",
    "content": "Hi Captain, when should I arrive?",
    "contentType": "text",
    "status": "SENT",
    "createdAt": "2024-01-15T10:05:00Z"
  }
}

Error Cases:
- 400: Invalid content (empty, too long)
- 401: Not authenticated
- 403: User not in conversation OR conversation is LOCKED and user is ANGLER
- 404: Conversation not found
```

#### 1.5 PATCH /api/conversations/:id/read - Mark as Read

```
PATCH http://localhost:3001/api/conversations/{conversationId}/read

Expected Response (200):
{
  "success": true,
  "message": "Conversation marked as read"
}

Error Cases:
- 401: Not authenticated
- 403: User not in conversation
- 404: Conversation not found
```

#### 1.6 PATCH /api/conversations/:id/close - Close Conversation

```
PATCH http://localhost:3001/api/conversations/{conversationId}/close

Expected Response (200):
{
  "success": true,
  "message": "Conversation closed"
}

Error Cases:
- 401: Not authenticated
- 403: User not authorized to close (only participants)
- 404: Conversation not found
```

### Part 2: Fishon-Captain Endpoints (Port 3000)

#### 2.1 GET /api/messages/conversations - List Captain's Conversations

```
GET http://localhost:3000/api/messages/conversations
Query Parameters:
- limit: 20 (optional, 1-100)
- cursor: "" (optional, for pagination)

Expected Response (200):
{
  "conversations": [
    {
      "id": "conv-id",
      "bookingId": "booking-id",
      "charterId": "charter-id",
      "ownerId": "captain-id",
      "anglerId": "angler-id",
      "status": "LOCKED",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "lastMessagePreview": "Thanks!",
      "lastMessageBy": "ANGLER",
      "captainUnreadCount": 1,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "totalUnread": 1
}

Error Cases:
- 401: Not authenticated
- 403: User is not a captain
```

#### 2.2 POST /api/messages/send - Captain Sends Message

```
POST http://localhost:3000/api/messages/send
Headers:
  Content-Type: application/json

Body:
{
  "conversationId": "conv-id",
  "content": "See you at 6 AM tomorrow!"
}

Expected Response (200):
{
  "success": true,
  "message": {
    "id": "msg-id",
    "conversationId": "conv-id",
    "senderId": "captain-id",
    "senderType": "CAPTAIN",
    "content": "See you at 6 AM tomorrow!",
    "status": "SENT",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}

Error Cases:
- 400: Missing conversationId, empty content, content > 10000 chars
- 401: Not authenticated
- 429: Rate limit exceeded (30/min)
- 500: Internal error calling fishon-market API
```

## Testing Workflow

### Step 1: Create Test Data

1. Sign in to fishon-market as an **angler**
2. Browse charters and create a test booking
3. Note: `bookingId`, `charterId`, `bookingStatus`
4. Sign in as the **captain** who owns that charter
5. Verify you can see the booking in your dashboard

### Step 2: Test Angler-Side Endpoints (fishon-market)

```
1. List conversations as angler
   GET /api/conversations?role=angler

2. Get single conversation
   GET /api/conversations/{conversationId}

3. Send message (should succeed - conversation is LOCKED but angler can see it)
   POST /api/conversations/{conversationId}/messages
   Body: { "content": "Hi Captain! Ready for the trip!" }

4. Verify message appears
   GET /api/conversations/{conversationId}/messages

5. Mark as read
   PATCH /api/conversations/{conversationId}/read

6. List again and verify unread count is 0
   GET /api/conversations?role=angler
```

### Step 3: Test Captain-Side Endpoints (fishon-captain)

```
1. List conversations as captain
   GET /api/messages/conversations

2. Send message from captain
   POST /api/messages/send
   Body: { "conversationId": "{conversationId}", "content": "Great! See you at 6 AM." }

3. Verify message appears in fishon-market
   GET http://localhost:3001/api/conversations/{conversationId}/messages
```

### Step 4: Verify Permissions

```
1. Try to access conversation as different angler (should fail 403)
   GET /api/conversations/{conversationId}

2. Try to send message with empty content (should fail 400)
   POST /api/conversations/{conversationId}/messages
   Body: { "content": "" }

3. Try to access captain conversations without being captain (should fail 403)
   GET http://localhost:3000/api/messages/conversations
```

### Step 5: Verify Rate Limits

```
1. Send 31 messages rapidly (should fail on 31st with 429)
   for i in {1..31}; do
     curl -X POST http://localhost:3001/api/conversations/{conversationId}/messages \
       -H "Content-Type: application/json" \
       -d "{\"content\": \"Message $i\"}"
   done

2. Wait 60 seconds and try again (should succeed)
```

## Expected Behaviors

### Locked Conversations

- ✅ Angler CAN view messages but cannot send (unless unlocked)
- ✅ Captain CAN always send messages
- ✅ System messages created when conversation starts (LOCKED status)
- ✅ Conversation unlocks when payment is complete (Phase 2)

### Unread Counts

- ✅ Incremented when message is received by non-sender
- ✅ Reset when user calls PATCH /conversations/:id/read
- ✅ Returned in GET /conversations list

### Pagination

- ✅ nextCursor returned if hasMore=true
- ✅ Use cursor in next request to get next page
- ✅ Default limit is 20, max is 100

### Cross-App Communication

- ✅ Captain sending via POST /api/messages/send should appear in fishon-market GET /api/conversations/:id/messages
- ✅ Angler message in fishon-market should be readable by captain via prisma-market mirror

## Troubleshooting

### 401 Unauthorized on all endpoints

- Verify you're authenticated in the browser
- Check auth cookies are sent with requests
- Try signing out and back in

### 403 Forbidden on captain endpoints

- Verify user has CAPTAIN or ADMIN role
- Check user owns the charter for the conversation

### Message not appearing

- Verify conversation exists and user is participant
- Check message content is not empty
- Check conversation status (LOCKED/ACTIVE/etc.)

### Rate limit errors

- Wait 60 seconds and retry
- Rate limit is per-user per-minute
- Limits: 30 messages/min per user, 60 requests/min for conversation list

### Cross-app message not syncing

- Verify prisma-market in fishon-captain is configured correctly
- Check CAPTAIN_DATABASE_URL environment variable
- Run `npx prisma generate --schema=prisma/schema-market.prisma` in fishon-captain

## Success Criteria for Phase 1 Completion

✅ All 5 fishon-market endpoints respond 200 with correct data
✅ All 2 fishon-captain endpoints respond 200 with correct data
✅ Permission checks work (403 on unauthorized access)
✅ Validation works (400 on invalid input)
✅ Rate limits work (429 on excess requests)
✅ Messages sync between apps (captain sees angler messages and vice versa)
✅ Unread counts track correctly
✅ Pagination works (cursor-based)
✅ Conversation status affects message sending (LOCKED blocks angler)

## Next Steps (Phase 2)

Once Phase 1 is fully tested:

1. Create conversations automatically on booking
2. Send system messages on booking status changes
3. Unlock conversation on payment
4. Implement auto-closure cron job
