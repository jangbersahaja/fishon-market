---
type: feature
status: complete
updated: 2024-01-17
feature: "Booking Lifecycle - Auto-Closure Cron Job"
author: "GitHub Copilot"
---

# Phase 2.3: Auto-Closure Cron Job - Implementation Summary

## Overview

Implemented automated conversation closure 24 hours after trip completion. Completes the booking lifecycle automation for Phase 2.

## What Was Built

### 1. Close-Conversations Job (`/src/lib/jobs/close-conversations-job.ts`)

**Responsibilities:**

- Finds all ACTIVE conversations for PAID bookings
- Filters to conversations where trip ended > 24 hours ago
- Trip end calculated as: `booking.date + booking.days`
- Closes each conversation with closure system message
- Handles errors gracefully - one failure doesn't stop entire job

**Key Logic:**

```text
For each ACTIVE conversation of PAID booking:
  Calculate trip end: booking.date + booking.days
  If (tripEnd + 24h) < now():
    - Call closeConversation()
    - Send "🔒 Conversation Closed" system message
    - Track result (success/error)
```

**Error Handling:**

- Continues processing other conversations if one fails
- Tracks failures in `errorDetails` array
- Returns statistics: `{ processed, closed, errors, errorDetails }`

### 2. Cron Endpoint (`/src/app/api/cron/close-conversations/route.ts`)

**Endpoints:**

- `GET /api/cron/close-conversations` - Manual trigger/testing
- `POST /api/cron/close-conversations` - Scheduled trigger

**Security:**

- Requires `CRON_SECRET` in Authorization header (production only)
- Format: `Authorization: Bearer <CRON_SECRET>`
- Development mode bypasses auth check

**Response Structure:**

```json
{
  "success": true,
  "timestamp": "2024-01-17T12:34:56.789Z",
  "duration": 1234,
  "results": {
    "processed": 5,
    "closed": 4,
    "errors": 1,
    "errorDetails": [...]
  }
}
```

**Runtime Config:**

- `runtime = "nodejs"`
- `dynamic = "force-dynamic"`
- `maxDuration = 60` seconds

## Integration Points

### Conversation Lifecycle

```text
LOCKED (booking created/approved)
  ↓ [on payment]
ACTIVE (chat enabled)
  ↓ [trip completes, wait 24h]
CLOSED (auto-closed by cron job)
```

### Booking Status Requirements

Closes conversations only for bookings with status: `PAID`

This ensures only completed/paid bookings transition to closure.

### System Message

Sends automated closure message:

> 🔒 **Conversation Closed**
> This conversation has been closed after your trip completed. You can still view the message history. To contact the captain, visit their charter listing.

## Usage

### Manual Trigger (Dev/Testing)

```bash
# GET request
curl -X GET http://localhost:3000/api/cron/close-conversations

# POST request
curl -X POST http://localhost:3000/api/cron/close-conversations
```

### Production Scheduling

Configure via Vercel Cron or external service:

**Vercel Cron** (in `vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/close-conversations",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**QStash/n8n/External Service:**

```bash
curl -X POST https://your-domain.com/api/cron/close-conversations \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Type Safety

✅ All code passes `npm run typecheck`

**Imports:**

- `conversationClosedMessage()` from `message-templates.ts`
- `closeConversation()`, `sendMessage()` from `message-service.ts`
- `prisma` database client
- `NextRequest`, `NextResponse` from Next.js

## Error Scenarios Handled

1. **Conversation not found** - Logged, job continues
2. **Send message fails** - Logged as error, counted in statistics
3. **Database errors** - Thrown, cron returns 500 with error details
4. **Missing CRON_SECRET** - Returns 500 in production
5. **Invalid auth header** - Returns 401 in production

## Testing Recommendations

### Local Testing

1. Create a booking and mark it PAID
2. Set booking date to past (e.g., yesterday - 1 day)
3. Call `GET /api/cron/close-conversations`
4. Verify:
   - Conversation status changed to CLOSED
   - System message added to conversation
   - Job response shows success

### Production Monitoring

Monitor via logs:

```text
cron_close_conversations_start
close_conversations_query_result: found X conversations
close_conversations_eligible: Y conversations ready to close
conversation_closed: [conversationId] for booking [bookingId]
cron_close_conversations_success: {...}
```

## Completion Status

✅ **Phase 2.3 Complete**

All components:

- ✅ Job function implemented
- ✅ Cron endpoint created
- ✅ Type checking passes
- ✅ Error handling comprehensive
- ✅ Authorization implemented
- ✅ Integration with existing message service

**Phase 2 Summary:**

- Phase 2.1 ✅: Auto-create conversations on booking
- Phase 2.2 ✅: Booking status integration with system messages & payment unlock
- Phase 2.3 ✅: Auto-close conversations 24h after trip

**Next Phase:** Phase 3 - Real-time Pusher integration (optional future work)
