# SMS Notification System Configuration

**Last Updated**: 25 November 2025  
**Status**: Production Ready ✅  
**Provider**: Exabytes Bulk SMS  
**Applies To**: fishon-market

---

## System Overview

SMS notifications keep anglers informed of critical booking events via text message. The system integrates with Exabytes SMS Gateway for Malaysian phone numbers.

### Supported Notification Types

| Type | SMS Sent | Description |
|------|----------|-------------|
| `BOOKING_CREATED` | ✅ | Booking confirmation |
| `BOOKING_APPROVED` | ✅ | Captain approval |
| `BOOKING_REJECTED` | ✅ | Rejection notification |
| `BOOKING_PAID` | ✅ | Payment confirmation |
| `BOOKING_CANCELLED` | ✅ | Cancellation notice |
| `PAYMENT_FAILED` | ✅ | Payment failure alert |
| `PAYMENT_REFUNDED` | ✅ | Refund confirmation |
| `REVIEW_SUBMITTED` | ✅ | Review received |
| `REVIEW_APPROVED` | ✅ | Review published |
| `ACCOUNT_VERIFIED` | ✅ | Account verification |

---

## Architecture

```
Notification Service
        ↓
Check User SMS Preferences
        ↓
If Enabled → SMS Service
        ↓
Exabytes API → User Phone
```

---

## Configuration

### Environment Variables

```bash
EXABYTES_SMS_USERNAME="FISHON"
EXABYTES_SMS_PASSWORD="your-password"
```

### API Integration

- **Provider**: Exabytes Bulk SMS
- **Endpoint**: `https://smsportal.exabytes.my/isms_send.php`
- **Parameters**:
  - `un` - Username
  - `pwd` - Password
  - `dstno` - Destination (60XXXXXXXXX format)
  - `msg` - Message (max 160 chars)
  - `type` - "1" for ASCII
  - `agreedterm` - "YES" (required)

---

## SMS Templates

### Message Format

- **Max Length**: 160 characters (single SMS)
- **Longer messages**: Truncated with "..." suffix
- **Region**: Malaysia only (60XXXXXXXXX)

### Sample Messages

```
BOOKING_CREATED:
"Your booking for {charter} on {date} has been received. Total: RM{price}"

BOOKING_APPROVED:
"Great news! Your booking for {charter} on {date} has been approved"

BOOKING_PAID:
"Payment received! Your booking for {charter} is confirmed"

BOOKING_REJECTED:
"Unfortunately, your booking for {charter} was rejected"
```

---

## Database Schema

### User Preferences

```prisma
model NotificationPreferences {
  smsBookingCreated      Boolean @default(true)
  smsBookingApproved     Boolean @default(true)
  smsBookingRejected     Boolean @default(true)
  smsBookingPaid         Boolean @default(true)
  smsBookingCancelled    Boolean @default(true)
  smsReviewSubmitted     Boolean @default(true)
  smsReviewApproved      Boolean @default(true)
  smsReviewRejected      Boolean @default(true)
  smsAccountVerified     Boolean @default(true)
  smsPaymentFailed       Boolean @default(true)
  smsSystemAnnouncement  Boolean @default(true)
  smsPaymentRefunded     Boolean @default(true)
  smsPaymentAuthorized   Boolean @default(true)
  smsPaymentCaptured     Boolean @default(true)
  smsPaymentDeclined     Boolean @default(true)
}
```

---

## Service Layer

### SMS Service (`src/lib/services/sms-service.ts`)

```typescript
// Core functions
normalizePhoneNumber(phone)     // 0xxxxxxxxx → 60xxxxxxxxx
isValidMalaysianPhone(phone)    // Validates format
truncateMessage(msg, max=160)   // Fits single SMS
sendSMSViaExabytes(phone, msg)  // API call

// Template functions
sendBookingCreatedSMS(phone, charter, date, price)
sendBookingApprovedSMS(phone, charter, date)
sendBookingRejectedSMS(phone, charter)
sendBookingPaidSMS(phone, charter)
sendBookingCancelledSMS(phone, charter, date)
sendPaymentRefundedSMS(phone, amount)
sendPaymentFailedSMS(phone)
sendReviewSubmittedSMS(phone)
sendReviewApprovedSMS(phone)
sendAccountVerifiedSMS(phone)
```

### Response Format

```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
}
```

---

## Integration Flow

1. Event triggered (e.g., booking created)
2. `createNotification()` called
3. Check user SMS preference for event type
4. If enabled: `sendNotificationSMS(userId, notification)`
5. `sendSMSViaExabytes()` sends via API
6. SMS delivered to angler phone

---

## UI Configuration

### Notification Settings Component

**File**: `src/components/account/NotificationSettings.tsx`

Features:
- Toggle switches for each SMS type
- "Enable All SMS" button
- "Disable All SMS" button
- Matches email/push notification UI

---

## Phone Number Validation

### Supported Formats

| Input | Normalized |
|-------|------------|
| `0123456789` | `60123456789` |
| `+60123456789` | `60123456789` |
| `60123456789` | `60123456789` |

### Validation Rules

- Malaysian mobile prefixes: 01X
- Length: 10-11 digits
- Must start with valid prefix

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/sms-service.ts` | SMS sending & templates |
| `src/lib/services/notification-service.ts` | SMS integration |
| `src/components/account/NotificationSettings.tsx` | User preferences UI |
| `prisma/schema.prisma` | SMS preference fields |

---

## Testing

### Configuration Test

```bash
EXABYTES_SMS_USERNAME="FISHON" \
EXABYTES_SMS_PASSWORD="password" \
DATABASE_URL="postgresql://..." \
node scripts/test-sms-setup.js
```

### Delivery Test

```bash
EXABYTES_SMS_USERNAME="FISHON" \
EXABYTES_SMS_PASSWORD="password" \
node scripts/test-sms-delivery.js
```

---

## Troubleshooting

### IP Not Allowed (-1003)

**Cause**: Exabytes has IP whitelisting enabled.

**Solution**:
1. Deploy to Vercel (production IPs whitelisted)
2. Or add dev IP to Exabytes whitelist

### Message Too Long

**Cause**: Message exceeds 160 characters.

**Solution**: `truncateMessage()` auto-handles this.

### Invalid Phone Number

**Cause**: Non-Malaysian or invalid format.

**Solution**: `normalizePhoneNumber()` handles common formats.

---

## Security

- ✅ Credentials in environment variables only
- ✅ No phone numbers logged
- ✅ User preference checks before sending
- ✅ Rate limiting on notification creation

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Owner**: Engineering Team
