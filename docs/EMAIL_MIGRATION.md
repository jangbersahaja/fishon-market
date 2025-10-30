---
type: guide
status: active
updated: 2025-01-28
feature: email-system
author: copilot
---

# Email System Migration Guide

**Migration Date:** October 28, 2025  
**New Package:** `@fishon/email` (git+https://github.com/jangbersahaja/fishon-email)

## Overview

The email system has been refactored from inline HTML string templates to a professional React Email component-based system. This migration provides:

- ✅ Beautiful, responsive email designs
- ✅ Live preview during development
- ✅ Type-safe email templates
- ✅ Shared components across all Fishon applications
- ✅ Easy maintenance and updates

## ⚠️ What Changed

### OLD System (DEPRECATED)

```typescript
// ❌ Don't use these anymore
import { sendMail, renderBookingCreatedEmail, renderStatusEmail } from '@/lib/helpers/email';

// Inline HTML string templates - hard to maintain
const html = renderBookingCreatedEmail({ ... });
await sendMail({ to, subject, html });
```

### NEW System (Current)

```typescript
// ✅ Use this instead
import { sendBookingCreatedEmail } from "@/lib/services/email-service";

// React Email components - professional design
await sendBookingCreatedEmail({
  to: user.email,
  userName: user.name,
  charterName: charter.name,
  tripDate: formatDate(booking.tripDate),
  tripDuration: `${trip.days} day(s)`,
  startTime: trip.startTime,
  totalPrice: formatCurrency(trip.totalPrice),
  confirmationUrl: `${baseUrl}/bookings/${booking.id}`,
});
```

## Migration Steps

### Step 1: Update Imports

**Before:**

```typescript
import { sendMail, renderBookingCreatedEmail } from "@/lib/helpers/email";
```

**After:**

```typescript
import { sendBookingCreatedEmail } from "@/lib/services/email-service";
```

### Step 2: Replace Email Functions

#### Booking Created Email

**Before:**

```typescript
const html = renderBookingCreatedEmail({
  toName: user.name,
  charterName: charter.name,
  date: tripDate,
  days: trip.days,
  total: trip.totalPrice,
  startTime: trip.startTime,
  confirmationUrl: url,
});
await sendMail({
  to: user.email,
  subject: `Booking Request Received - ${charter.name}`,
  html,
});
```

**After:**

```typescript
await sendBookingCreatedEmail({
  to: user.email,
  userName: user.name,
  charterName: charter.name,
  tripDate: formatDate(tripDate),
  tripDuration: `${trip.days} day(s)`,
  startTime: trip.startTime,
  totalPrice: formatCurrency(trip.totalPrice),
  confirmationUrl: url,
});
```

#### Booking Approved Email

**Before:**

```typescript
const html = renderStatusEmail({
  toName: user.name,
  charterName: charter.name,
  status: "APPROVED",
  paymentUrl: paymentUrl,
  confirmationUrl: url,
});
await sendMail({
  to: user.email,
  subject: `Booking Approved - ${charter.name}`,
  html,
});
```

**After:**

```typescript
await sendBookingApprovedEmail({
  to: user.email,
  userName: user.name,
  charterName: charter.name,
  tripDate: formatDate(tripDate),
  paymentUrl: paymentUrl,
  confirmationUrl: url,
});
```

#### Booking Rejected Email

**Before:**

```typescript
const html = renderStatusEmail({
  toName: user.name,
  charterName: charter.name,
  status: "REJECTED",
  confirmationUrl: url,
});
await sendMail({
  to: user.email,
  subject: `Booking Update - ${charter.name}`,
  html,
});
```

**After:**

```typescript
await sendBookingRejectedEmail({
  to: user.email,
  userName: user.name,
  charterName: charter.name,
  reason: "Captain is unavailable on this date",
  searchUrl: `${baseUrl}/search`,
});
```

#### Verification Code Email

**Before:**

```typescript
// No old function - this is new functionality
```

**After:**

```typescript
await sendVerificationCode({
  to: user.email,
  userName: user.name,
  code: "123456",
  purpose: "registration", // or "login", "forgot_password", "guest_booking"
  expiryMinutes: 2,
});
```

## Available Email Functions

All functions are exported from `@/lib/services/email-service`:

### Booking Emails

- `sendBookingCreatedEmail()` - Booking request received
- `sendBookingApprovedEmail()` - Booking approved, payment required
- `sendBookingRejectedEmail()` - Booking rejected with reason

### Auth & Verification Emails

- `sendVerificationCode()` - TAC codes for various purposes
- `sendWelcomeEmail()` - Welcome new anglers
- `sendPasswordChangedEmail()` - Password reset/change notifications

## Files Modified

- **New:** `src/lib/services/email-service.ts` - New email service layer
- **Deprecated:** `src/lib/helpers/email.ts` - Legacy email functions (kept for compatibility)

## API Routes to Update

The following API routes need to be updated to use the new email system:

### Booking Routes

- [ ] `/api/bookings` - POST (booking creation)
- [ ] `/api/bookings/[id]/approve` - POST (approval)
- [ ] `/api/bookings/[id]/reject` - POST (rejection)

### Auth Routes

- [ ] `/api/auth/register` - POST (registration TAC)
- [ ] `/api/auth/login` - POST (login TAC)
- [ ] `/api/auth/forgot-password` - POST (password reset TAC)
- [ ] `/api/auth/guest-booking` - POST (guest TAC)

## Testing

After migration:

1. **Test Email Rendering:**

   ```bash
   cd packages/fishon-email
   npm run dev
   ```

   Visit http://localhost:3000 to preview all email templates

2. **Test Email Sending:**
   - Create a test booking
   - Approve/reject bookings
   - Request verification codes
   - Verify emails are sent correctly

3. **Verify SMTP Configuration:**
   ```env
   SMTP_HOST=smtppro.zoho.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=no-reply@fishon.my
   SMTP_PASSWORD=your_zoho_password
   EMAIL_FROM=no-reply@fishon.my
   ```

## Rollback Plan

If issues occur, legacy functions are still available:

```typescript
import { sendMail, renderBookingCreatedEmail } from "@/lib/helpers/email";
// Legacy code still works - just deprecated
```

## Next Steps

1. Update all API routes to use new email service
2. Test thoroughly in development
3. Deploy to staging
4. Monitor email delivery
5. Remove legacy code after 30 days

## Support

- **Package Repo:** https://github.com/jangbersahaja/fishon-email
- **Issue Template:** Use `[EMAIL]` prefix for email-related issues
- **Contact:** @fishon-dev-team

---

**Last Updated:** October 28, 2025
