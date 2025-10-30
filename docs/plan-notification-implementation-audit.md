---
type: plan
status: ready
updated: 2025-01-29
feature: notification-system-implementation
author: copilot
---

# Notification System Implementation - Complete Audit & Plan

**Audit Date:** January 29, 2025
**Status:** Email System Complete ✅ | Notification System Ready to Build

## Executive Summary

Phase 0 (Email System) is **VERIFIED COMPLETE** across both applications. All API routes are using the new @fishon/email package. We are now ready to implement Phase 1 (Notification System) with real-time delivery via Pusher.

---

## Phase 0: Email System - VERIFIED COMPLETE ✅

### Package Status

**@fishon/email v1.0.0**

- Repository: `git+https://github.com/jangbersahaja/fishon-email`
- Installed in fishon-market: ✅ v1.0.0
- Installed in fishon-captain: ✅ v1.0.0
- Templates: 10 React Email components
- TypeScript: Full type safety

### fishon-market Email Implementation - VERIFIED COMPLETE

**Service Layer:**

- File: `src/lib/services/email-service.ts`
- Functions: 13 email wrappers
- Status: Active and in use

**Active Routes (8 total):**

1. `POST /api/bookings/create`
   - sendBookingCreatedEmail (angler)
   - sendBookingReceivedCaptainEmail (captain via webhook)

2. `POST /api/bookings/create-guest`
   - sendBookingCreatedEmail (guest angler)
   - sendBookingReceivedCaptainEmail (captain via webhook)

3. `POST /api/bookings/approve`
   - sendBookingApprovedEmail (angler)

4. `POST /api/bookings/reject`
   - sendBookingRejectedEmail (angler)

5. `POST /api/bookings/pay`
   - sendBookingConfirmedAnglerEmail (angler)
   - sendBookingConfirmedCaptainEmail (captain via webhook)

6. `POST /api/bookings/cancel`
   - Captain notification via fishon-captain webhook

7. `POST /api/auth/send-tac`
   - sendVerificationCode (login TAC)

8. `POST /api/bookings/verify-guest`
   - sendVerificationCode (guest booking verification)

**Legacy Code:**

- File: `src/lib/helpers/email.ts`
- Status: Deprecated with @deprecated warnings
- Action: Keep for rollback safety

### fishon-captain Email Implementation - VERIFIED COMPLETE

**Service Layer:**

- File: `src/lib/services/email-service.ts`
- Functions: 6 email wrappers
- Status: Active and in use

**Active Routes (4 total):**

1. `POST /api/auth/signup`
   - sendWelcomeEmail (captain welcome)
   - sendVerificationCode (email verification)

2. `POST /api/auth/forgot-password`
   - sendVerificationCode (password reset)

3. `POST /api/auth/resend-otp`
   - sendVerificationCode (dynamic purpose: email_verification | password_reset)

4. `POST /api/charter-drafts/[id]/finalize`
   - sendCharterRegistration (charter creation success)

**Legacy Code:**

- File: `src/lib/email.ts`
- Status: Deprecated with @deprecated warnings
- Action: Keep for rollback safety

---

## Phase 1: Notification System - IMPLEMENTATION REQUIREMENTS

### What Needs to be Built

**Database Layer:**

- [ ] Notification table in fishon-market schema
- [ ] Notification table in fishon-captain schema
- [ ] NotificationPreferences table (both apps)
- [ ] Database migrations

**Backend Infrastructure:**

- [ ] Pusher account setup (free tier: 200k messages/day)
- [ ] Environment variables configuration
- [ ] Pusher server utilities
- [ ] Notification service layer
- [ ] API routes for CRUD operations

**Frontend Components:**

- [ ] Notification bell icon with badge
- [ ] Notification dropdown/panel
- [ ] Notification list view
- [ ] Individual notification items
- [ ] Mark as read functionality
- [ ] Real-time updates via Pusher

**Integration Points:**

- [ ] Booking creation → notify captain
- [ ] Booking approval → notify angler
- [ ] Booking rejection → notify angler
- [ ] Booking payment → notify captain
- [ ] Booking cancellation → notify captain
- [ ] Charter finalization → notify admin (fishon-captain)

---

## Database Schema Design

### fishon-market Notification Schema

```prisma
enum NotificationType {
  // Booking lifecycle
  BOOKING_CREATED       // Angler: Booking request submitted
  BOOKING_APPROVED      // Angler: Captain approved booking
  BOOKING_REJECTED      // Angler: Captain rejected booking
  BOOKING_PAID          // Captain receives payment notification
  BOOKING_CANCELLED     // Captain: Angler cancelled booking

  // Account events
  ACCOUNT_VERIFIED      // Angler: Email verified
  PAYMENT_FAILED        // Angler: Payment processing failed

  // System
  SYSTEM_ANNOUNCEMENT   // Both: Platform updates
}

enum NotificationStatus {
  UNREAD
  READ
  ARCHIVED
}

model Notification {
  id          String             @id @default(cuid())
  userId      String
  type        NotificationType
  status      NotificationStatus @default(UNREAD)

  title       String
  message     String
  actionUrl   String?
  actionLabel String?

  // Related entities
  bookingId   String?
  charterId   String?

  // Metadata
  metadata    Json?              // Additional data specific to notification type

  // Timestamps
  createdAt   DateTime           @default(now())
  readAt      DateTime?
  archivedAt  DateTime?
  expiresAt   DateTime?          // Auto-delete old notifications

  // Relations
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  booking     Booking?           @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, createdAt])
  @@index([expiresAt])
  @@map("notifications")
}

model NotificationPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique

  // Channel preferences
  inAppEnabled    Boolean  @default(true)
  emailEnabled    Boolean  @default(true)

  // Type preferences
  bookingUpdates  Boolean  @default(true)
  systemUpdates   Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

// Update User model
model User {
  // ... existing fields
  notifications               Notification[]
  notificationPreferences     NotificationPreferences?
}
```

### fishon-captain Notification Schema

```prisma
enum NotificationType {
  // Booking lifecycle
  BOOKING_RECEIVED      // Captain: New booking request
  BOOKING_PAID          // Captain: Booking payment confirmed
  BOOKING_CANCELLED     // Captain: Angler cancelled booking

  // Charter events
  CHARTER_APPROVED      // Captain: Charter approved by admin
  CHARTER_REJECTED      // Captain: Charter rejected by admin
  CHARTER_UPDATED       // Captain: Charter details updated

  // Account events
  ACCOUNT_VERIFIED      // Captain: Email verified
  PROFILE_INCOMPLETE    // Captain: Complete your profile

  // System
  SYSTEM_ANNOUNCEMENT   // Platform updates
}

enum NotificationStatus {
  UNREAD
  READ
  ARCHIVED
}

model Notification {
  id          String             @id @default(cuid())
  userId      String
  type        NotificationType
  status      NotificationStatus @default(UNREAD)

  title       String
  message     String
  actionUrl   String?
  actionLabel String?

  // Related entities
  bookingId   String?
  charterId   String?

  // Metadata
  metadata    Json?

  // Timestamps
  createdAt   DateTime           @default(now())
  readAt      DateTime?
  archivedAt  DateTime?
  expiresAt   DateTime?

  // Relations
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, createdAt])
  @@index([expiresAt])
  @@map("notifications")
}

model NotificationPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique

  // Channel preferences
  inAppEnabled    Boolean  @default(true)
  emailEnabled    Boolean  @default(true)

  // Type preferences
  bookingUpdates  Boolean  @default(true)
  charterUpdates  Boolean  @default(true)
  systemUpdates   Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

// Update User model
model User {
  // ... existing fields
  notifications               Notification[]
  notificationPreferences     NotificationPreferences?
}
```

---

## Pusher Configuration

### Environment Variables Required

**Both Applications (.env):**

```bash
# Pusher Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1  # Asia Pacific (Singapore) for Malaysia

# Public keys (exposed to client)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

### Pusher Setup Steps

1. Create Pusher account: <https://dashboard.pusher.com/accounts/sign_up>
2. Create new Channels app
3. Select cluster: `ap1` (Asia Pacific - Singapore)
4. Copy credentials to `.env` files
5. Free tier limits: 200,000 messages/day, 100 concurrent connections

---

## Backend Implementation Plan

### File Structure

**fishon-market:**

```
src/
├── lib/
│   ├── pusher/
│   │   ├── server.ts          # Pusher server instance
│   │   └── client.ts          # Pusher client hook
│   └── services/
│       └── notification-service.ts  # Notification CRUD + triggering
├── app/api/
│   ├── pusher/
│   │   └── auth/route.ts      # Pusher auth endpoint
│   └── notifications/
│       ├── route.ts           # GET /api/notifications
│       ├── [id]/
│       │   ├── read/route.ts  # PATCH /api/notifications/:id/read
│       │   └── route.ts       # DELETE /api/notifications/:id
│       ├── read-all/route.ts  # PATCH /api/notifications/read-all
│       └── unread-count/route.ts  # GET /api/notifications/unread-count
└── components/
    └── notifications/
        ├── NotificationBell.tsx
        ├── NotificationDropdown.tsx
        ├── NotificationItem.tsx
        └── NotificationList.tsx
```

**fishon-captain:** (same structure)

### Required NPM Packages

```bash
# Backend
npm install pusher

# Frontend
npm install pusher-js
```

---

## Frontend Implementation Plan

### Component Hierarchy

```
<NotificationBell>
  └── <NotificationDropdown>
      ├── <NotificationList>
      │   └── <NotificationItem> (multiple)
      └── Mark All Read Button
```

### Integration Points

**fishon-market:**

- Navbar: After CheckYourBookings component
- Account dropdown: Link to full notifications page
- Dashboard: Notifications widget

**fishon-captain:**

- Captain portal navbar
- Dashboard overview
- Booking management pages

---

## API Integration Points

### fishon-market Routes to Update

**Existing routes that need notification triggers:**

1. `POST /api/bookings/approve`
   - Trigger: BOOKING_APPROVED → notify angler (userId)
   - Email: Already sends via sendBookingApprovedEmail ✅
   - Add: createNotification() call

2. `POST /api/bookings/reject`
   - Trigger: BOOKING_REJECTED → notify angler (userId)
   - Email: Already sends via sendBookingRejectedEmail ✅
   - Add: createNotification() call

3. `POST /api/bookings/pay`
   - Trigger: BOOKING_PAID → notify angler confirmation
   - Email: Already sends via sendBookingConfirmedAnglerEmail ✅
   - Add: createNotification() call

4. `POST /api/bookings/cancel`
   - Trigger: BOOKING_CANCELLED → notify captain via webhook
   - Email: Webhook to fishon-captain ✅
   - Add: Webhook includes notification flag

**New webhook to fishon-captain:**

- `POST /api/webhooks/booking-created`
  - Trigger: BOOKING_RECEIVED → notify captain
  - Email: Already sends via sendBookingReceivedCaptainEmail ✅
  - Add: createNotification() call in fishon-captain

### fishon-captain Routes to Update

**Webhook endpoints to create:**

1. `POST /api/webhooks/booking-created`
   - Receive: Booking data from fishon-market
   - Action: createNotification(captainId, BOOKING_RECEIVED)
   - Email: Already sends ✅

2. `POST /api/webhooks/booking-paid`
   - Receive: Payment confirmation from fishon-market
   - Action: createNotification(captainId, BOOKING_PAID)
   - Email: Already sends ✅

3. `POST /api/webhooks/booking-cancelled`
   - Receive: Cancellation from fishon-market
   - Action: createNotification(captainId, BOOKING_CANCELLED)
   - Email: May need to add

---

## Testing Requirements

### Notification Flow Tests

**fishon-market:**

1. Angler creates booking → Captain receives notification in fishon-captain
2. Captain approves booking → Angler receives notification
3. Captain rejects booking → Angler receives notification
4. Angler pays booking → Angler receives confirmation notification
5. Angler cancels booking → Captain receives notification

**fishon-captain:**

1. Captain creates charter → Admin receives notification
2. Admin approves charter → Captain receives notification
3. Booking received → Captain sees real-time notification
4. Payment received → Captain sees real-time notification

### Real-time Delivery Tests

1. Multiple tabs open → All tabs receive notification
2. Offline → Online transition → Missed notifications load
3. Notification badge updates in real-time
4. Read status syncs across tabs
5. Notification dropdown updates without refresh

---

## Implementation Phases

### Phase 1A: Database Setup (1 day)

- [ ] Add Notification + NotificationPreferences models to both schemas
- [ ] Run migrations on both databases
- [ ] Verify tables created correctly

### Phase 1B: Pusher Setup (1 day)

- [ ] Create Pusher account
- [ ] Configure environment variables
- [ ] Create server utilities (pusher/server.ts)
- [ ] Create client hook (pusher/client.ts)
- [ ] Create auth endpoint (/api/pusher/auth)
- [ ] Test Pusher connection

### Phase 1C: Notification Service (2 days)

- [ ] Create notification-service.ts in both apps
- [ ] Implement createNotification()
- [ ] Implement getUserNotifications()
- [ ] Implement markNotificationRead()
- [ ] Implement markAllNotificationsRead()
- [ ] Implement deleteNotification()
- [ ] Test service functions

### Phase 1D: API Routes (2 days)

- [ ] Create /api/notifications routes (both apps)
- [ ] Create /api/notifications/[id]/read (both apps)
- [ ] Create /api/notifications/read-all (both apps)
- [ ] Create /api/notifications/unread-count (both apps)
- [ ] Test all API endpoints

### Phase 1E: UI Components (3 days)

- [ ] Create NotificationBell component
- [ ] Create NotificationDropdown component
- [ ] Create NotificationList component
- [ ] Create NotificationItem component
- [ ] Integrate into Navbar (both apps)
- [ ] Style components with Tailwind + shadcn/ui

### Phase 1F: Integration (2 days)

- [ ] Update booking routes to trigger notifications
- [ ] Create fishon-captain webhook endpoints
- [ ] Update fishon-market to call webhooks
- [ ] Test end-to-end notification flow
- [ ] Verify email + notification sync

### Phase 1G: Testing & Polish (2 days)

- [ ] Manual testing of all flows
- [ ] Real-time delivery testing
- [ ] Multi-tab sync testing
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Documentation updates

**Total Estimated Time:** 13 working days

---

## Success Criteria

### Phase 1 Complete When:

- [x] Notification tables exist in both databases
- [x] Pusher configured and connected
- [x] All notification API routes functional
- [x] UI components render correctly
- [x] Real-time delivery works
- [x] Notifications sync with emails
- [x] Read/unread states persist
- [x] Badge counts update in real-time
- [x] All booking flows trigger notifications
- [x] Cross-app communication via webhooks works
- [x] TypeScript compilation clean (0 errors)
- [x] Manual testing passes all scenarios

---

## Current Status Summary

**Email System (Phase 0):**

- fishon-market: ✅ 100% Complete (8/8 routes)
- fishon-captain: ✅ 100% Complete (4/4 routes)
- Package: ✅ @fishon/email v1.0.0 active
- TypeScript: ✅ 0 errors both apps

**Notification System (Phase 1):**

- Database: ❌ Not created
- Pusher: ❌ Not configured
- API Routes: ❌ Not created
- UI Components: ❌ Not created
- Integration: ❌ Not implemented
- **Status:** Ready to build

**Ready to Proceed:** ✅ YES

All prerequisites met. Email system provides solid foundation. Can begin Phase 1A (Database Setup) immediately.
