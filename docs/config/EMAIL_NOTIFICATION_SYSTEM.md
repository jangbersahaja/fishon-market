# Email Notification System Configuration

**Last Updated**: 25 November 2025  
**Status**: Production Ready ✅  
**Transport**: Zoho SMTP  
**Templates**: @fishon/email (React Email)  
**Applies To**: fishon-market, fishon-captain

---

## System Overview

The Fishon platform uses a dual-channel communication system combining email and real-time notifications for booking lifecycle events.

### Key Features

- ✅ Flow-aware messaging (MANUAL vs AUTO)
- ✅ Payment-aware content (TOKENIZED vs DIRECT)
- ✅ Refund transparency
- ✅ Real-time Pusher notifications
- ✅ User preference controls
- ✅ Cross-app webhooks

---

## Architecture

```
┌────────────────────────────────────────────────┐
│            Communication Stack                  │
├────────────────────────────────────────────────┤
│  @fishon/email    │    Pusher Real-time        │
│  (Templates)      │    (Websockets)             │
│        ↓          │         ↓                   │
│  Email Service    │   Notification Service     │
│        ↓          │         ↓                   │
│  Zoho SMTP        │   PostgreSQL + Pusher      │
│        ↓          │         ↓                   │
│     User          │      User                   │
└────────────────────────────────────────────────┘
```

---

## Email Templates

### Booking Lifecycle

| Template | Recipient | Flow | Purpose |
|----------|-----------|------|---------|
| `booking-created` | Angler | Both | Booking confirmation |
| `booking-approved` | Angler | MANUAL | Approval + payment link |
| `booking-rejected` | Angler | Both | Rejection + refund info |
| `booking-confirmed-angler` | Angler | Both | Payment confirmed |
| `booking-confirmed-captain` | Captain | Both | Booking confirmed |
| `booking-received-captain` | Captain | Both | New booking alert |
| `booking-cancelled` | Captain | Both | Cancellation notice |
| `booking-payment-reminder` | Angler | MANUAL | Payment deadline |

### Flow-Aware Content

**TOKENIZED (Card)**:
```
💳 Your card has been authorized (not charged yet).
We'll only charge your card if the captain approves.
```

**DIRECT (FPX/E-wallet)**:
```
✅ Payment received! Your payment has been received 
and is being held securely.
```

**Rejection - TOKENIZED**:
```
💳 Good news: Your card was only authorized, not charged.
The authorization has been released.
```

**Rejection - DIRECT**:
```
💰 Refund initiated: We've started processing your 
refund. Funds will appear in 3-5 business days.
```

---

## Notification Types

### fishon-market (Angler)

```typescript
enum NotificationType {
  // Booking lifecycle
  BOOKING_CREATED
  PAYMENT_AUTHORIZED      // AUTO flow
  BOOKING_APPROVED        // MANUAL flow
  PAYMENT_CAPTURED        // AUTO flow
  BOOKING_CONFIRMED       // DIRECT flow
  BOOKING_REJECTED
  PAYMENT_RELEASED        // TOKENIZED
  BOOKING_PAID
  BOOKING_CANCELLED
  PAYMENT_REFUNDED
  
  // Reviews
  REVIEW_SUBMITTED
  REVIEW_APPROVED
  REVIEW_REJECTED
  
  // Account
  ACCOUNT_VERIFIED
  PAYMENT_FAILED
  SYSTEM_ANNOUNCEMENT
}
```

### fishon-captain (Captain)

```typescript
enum NotificationType {
  BOOKING_RECEIVED
  PAYMENT_PENDING
  BOOKING_APPROVED
  BOOKING_PAID
  BOOKING_CANCELLED
  BOOKING_CONFIRMED
  CHARTER_PUBLISHED
  CHARTER_SUSPENDED
  SYSTEM_ANNOUNCEMENT
}
```

---

## Environment Configuration

### fishon-market

```bash
# Zoho SMTP
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="465"
SMTP_USER="your-email@fishon.my"
SMTP_PASSWORD="your-smtp-password"
SMTP_SECURE="true"

# Pusher
NEXT_PUBLIC_PUSHER_APP_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="ap1"

# Webhooks
CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"
CAPTAIN_API_SECRET="shared-secret"

# App URLs
NEXT_PUBLIC_APP_URL="https://fishon.my"
```

### fishon-captain

```bash
# Same SMTP config
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
# ... etc

# Webhook security
CAPTAIN_API_SECRET="shared-secret"

# Cross-DB access
MARKET_DATABASE_URL="postgresql://.../fishon-market"
```

---

## User Preferences

### Angler Preferences (Granular)

```typescript
{
  // Email per event type
  emailBookingCreated: boolean;
  emailBookingApproved: boolean;
  emailBookingRejected: boolean;
  emailBookingPaid: boolean;
  emailBookingCancelled: boolean;
  // ... more types
  
  // Push per event type
  pushBookingCreated: boolean;
  pushBookingApproved: boolean;
  // ... more types
}
```

### Captain Preferences (Basic)

```typescript
{
  inAppEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdates: boolean;
  charterUpdates: boolean;
  systemUpdates: boolean;
}
```

---

## Webhook System

### fishon-market → fishon-captain

**Endpoint**: `POST /api/webhooks/booking`  
**Auth**: `x-captain-secret` header

**Events**:

| Event | Source Status | Captain Action |
|-------|---------------|----------------|
| `booking.created` | PENDING / PAYMENT_AUTHORIZED | Notification |
| `booking.approved` | AWAITING_PAYMENT | None |
| `booking.acknowledged` | PAID | Notification |
| `booking.paid` | PAID | Notification |
| `booking.rejected` | REJECTED | None |
| `booking.cancelled` | CANCELLED | Notification |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/email-service.ts` | Email sending wrapper |
| `src/lib/services/notification-service.ts` | Notification creation |
| `src/lib/webhooks/webhook.ts` | Webhook sender |
| `src/app/api/webhooks/booking/route.ts` | Webhook receiver (captain) |

### Email Functions

```typescript
import {
  sendBookingCreatedEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendBookingConfirmedAnglerEmail,
  sendBookingConfirmedCaptainEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
```

### Notification Creation

```typescript
import { createNotification } from "@/lib/services/notification-service";

await createNotification({
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,
  bookingId?: string,
  charterId?: string,
  metadata?: Record<string, any>,
});
```

---

## Real-time Notifications

### Pusher Events

| Event | Channel | Payload |
|-------|---------|---------|
| `notification:new` | `private-user-{userId}` | Notification object |
| `notification:count` | `private-user-{userId}` | Unread count |

### Client Hook

```typescript
import { useNotifications } from "@/hooks/useNotifications";

const { notifications, unreadCount, markAsRead } = useNotifications();
```

---

## Testing

### Email Testing

```bash
# Use Mailtrap for development
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_SECURE="false"
```

### Pusher Debug

Visit Pusher dashboard → Debug Console

### Webhook Testing

```bash
# With ngrok for local development
ngrok http 3000

# Update fishon-market .env
CAPTAIN_WEBHOOK_URL="https://xxx.ngrok.io/api/webhooks/booking"
```

---

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials
2. Verify Zoho SMTP status
3. Check firewall (port 465)
4. Review email service logs

### Notifications Not Appearing

1. Check Pusher connection (browser console)
2. Verify user preferences
3. Check channel subscription
4. Verify database record created

### Webhook Failures

1. Check `CAPTAIN_WEBHOOK_URL` configured
2. Verify `CAPTAIN_API_SECRET` matches both apps
3. Check network connectivity
4. Review webhook logs

---

## Migration Notes

### Adding New Email Template

1. Create template in `fishon-email/src/emails/`
2. Export from `fishon-email/src/index.ts`
3. Add render function to email service
4. Update this documentation

### Adding New Notification Type

1. Add enum value to Prisma schema
2. Run migration
3. Update notification service
4. Add handling in API endpoints
5. Update this documentation

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Owner**: Engineering Team
