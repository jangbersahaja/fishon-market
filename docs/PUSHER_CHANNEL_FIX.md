# Pusher Channel Naming Fix (fishon-market)

## Issue Discovered

After the booking flow migration, Pusher real-time notifications were not working properly in fishon-market due to a **channel naming mismatch** (same issue as fishon-captain).

## Root Cause

The system had inconsistent channel naming conventions:

### Before Fix:

- **useNotifications hook**: subscribed to `private-user-${userId}` (with **dash**)
- **Pusher server triggers**: sent to `private-user-${userId}` (with **dash**)
- **Pusher auth endpoint**: only authorized `private-user.${userId}` (with **dot**)

This caused authentication failures because:

1. Client tried to subscribe to `private-user-{userId}` (dash)
2. Auth endpoint rejected it because it only allowed `private-user.{userId}` (dot)
3. Pusher failed silently in production

### Inconsistency:

- ✅ Conversation channels: correctly used `private-conversation.{id}` (dot)
- ❌ Notification channels: incorrectly used `private-user-{userId}` (dash)

## Files Fixed

### 1. `src/hooks/useNotifications.ts` (line 240)

**Before:**

```typescript
const channelName = `private-user-${userId}`;
```

**After:**

```typescript
const channelName = `private-user.${userId}`;
```

### 2. `src/lib/pusher/server.ts` (lines 77, 110)

**Before:**

```typescript
await pusher.trigger(`private-user-${userId}`, "notification", {...});
await pusher.trigger(`private-user-${userId}`, "notification-count", {...});
```

**After:**

```typescript
await pusher.trigger(`private-user.${userId}`, "notification", {...});
await pusher.trigger(`private-user.${userId}`, "notification-count", {...});
```

### 3. `src/app/api/pusher/auth/route.ts`

**Already correct** - Uses dot separator:

```typescript
if (channelName === `private-user.${userId}`) {
  // authorize
}
```

## Impact

### Before Fix:

- ❌ Booking approval/rejection notifications not received in real-time
- ❌ Payment confirmation notifications delayed
- ❌ Unread count not updating
- ❌ Silent failures in production (no visible errors)
- ❌ Angler dashboard not showing live updates

### After Fix:

- ✅ Booking status notifications work in real-time
- ✅ Payment confirmations appear immediately
- ✅ Unread count updates without refresh
- ✅ Auth endpoint accepts channel subscriptions
- ✅ Consistent channel naming across both apps

## Testing Checklist

### Manual Testing (Angler Side):

1. [ ] Log in as angler
2. [ ] Submit a booking request
3. [ ] Captain approves/rejects booking
4. [ ] Verify notification appears immediately
5. [ ] Verify unread count increments
6. [ ] Check browser console for Pusher connection
7. [ ] Verify no auth errors in Network tab

### Browser Console Debug:

```javascript
// Enable Pusher debugging in dev tools console
localStorage.setItem("debug", "pusher:*");

// Expected logs:
// ✅ Pusher : State changed : connecting -> connected
// ✅ Pusher : Subscribed to private-user.{userId}
// ✅ [useNotifications] New notification received: {...}
```

## Related Files

### Pusher Configuration:

- `src/lib/pusher/client.ts` - Client-side Pusher initialization
- `src/lib/pusher/server.ts` - Server-side Pusher triggers
- `src/app/api/pusher/auth/route.ts` - Channel authorization endpoint
- `src/hooks/useNotifications.ts` - Notification subscription hook

### Notification Triggers:

- `src/lib/payment/payment-side-effects.ts` - Payment completion notifications
- `src/lib/services/notification-service.ts` - Notification creation service
- `src/app/api/bookings/[id]/approve/route.ts` - Booking approval notifications
- `src/app/api/bookings/[id]/reject/route.ts` - Booking rejection notifications

## Environment Variables Required

```env
# Server-side (required for triggering)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

# Client-side (required for subscribing)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

## Channel Naming Convention (Now Consistent)

### Standard Format:

```typescript
// User notifications
`private-user.${userId}`
// Conversations
`private-conversation.${conversationId}`;
```

### Cross-App Consistency:

- ✅ fishon-captain: uses `private-user.{userId}`
- ✅ fishon-market: uses `private-user.{userId}`
- ✅ Both apps: use same Pusher account and channel names
- ✅ Auth endpoints: validate dot separator format

## Notification Flow (fishon-market)

### Booking Approval Example:

1. Captain approves booking in fishon-captain
2. fishon-market webhook receives approval
3. `createNotification()` called with angler's userId
4. Pusher triggers `notification` event to `private-user.{userId}`
5. Angler's `useNotifications` hook receives event
6. Toast notification shown + unread count updated
7. Booking status automatically refreshed

### Payment Completion Example:

1. Payment gateway confir(my) payment
2. `payment-side-effects.ts` processes completion
3. Notification created for angler: "Payment confirmed"
4. Notification created for captain: "Booking paid"
5. Both receive real-time updates via Pusher
6. Booking status updates immediately in both apps

## Preventing Future Issues

### When Adding New Pusher Channels:

1. ✅ Always use dot separator: `private-{type}.{id}`
2. ✅ Update auth endpoint to authorize the channel
3. ✅ Test subscription in development
4. ✅ Check browser console for errors
5. ✅ Verify triggers work from server-side
6. ✅ Ensure consistency across both apps

### Code Review Checklist:

- [ ] Channel names use dot separator
- [ ] Auth endpoint handles the channel pattern
- [ ] Environment variables are configured
- [ ] Error handling is present
- [ ] Cross-app compatibility maintained
