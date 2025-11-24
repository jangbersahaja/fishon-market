# SMS Test Interface Guide

## Overview

The SMS Test Interface (`/dev/s(my)-test`) is a development tool for testing SMS notifications during deployment. It allows you to send test SMS messages with various notification templates to verify the Exabytes integration is working correctly.

## Access

**URL:** `http://localhost:3001/dev/s(my)-test` (development)  
**URL:** `https://fishon.my/dev/s(my)-test` (preview/staging only)

## Features

### 1. Phone Number Input

- Enter any Malaysian phone number
- Accepts formats:
  - `60105581238` (standard)
  - `0105581238` (with leading 0)
  - `+60105581238` (with country code)
- Phone is automatically normalized before sending

### 2. Notification Type Selection

Choose from 10 pre-configured SMS templates:

| Template              | Message                           |
| --------------------- | --------------------------------- |
| **Booking Created**   | Confirmation of booking received  |
| **Booking Approved**  | Captain approved the booking      |
| **Booking Rejected**  | Captain rejected the booking      |
| **Booking Paid**      | Payment received and confirmed    |
| **Booking Cancelled** | Booking cancellation notice       |
| **Payment Refunded**  | Refund processed notification     |
| **Payment Failed**    | Payment failure alert             |
| **Review Submitted**  | Review submission acknowledgment  |
| **Review Approved**   | Review published notification     |
| **Account Verified**  | Account verification confirmation |

### 3. Template Variables

Each template has customizable fields:

**Booking Created:**

- Charter Name
- Trip Date
- Total Price

**Booking Approved:**

- Charter Name
- Trip Date

**Booking Rejected:**

- Charter Name
- Rejection Reason

**Booking Paid:**

- Charter Name
- Trip Date

**Booking Cancelled:**

- Charter Name
- Trip Date
- Refund Amount

**Payment Refunded:**

- Refund Amount

**Payment Failed:**

- Booking ID

**Review Approved:**

- Charter Name

### 4. Custom Message

Override the default template with your own custom message:

- Leave empty to use the template
- Custom messages are truncated to 160 characters automatically

### 5. Message Preview

Real-time preview showing:

- Full message text
- Character count (160 max)
- Truncation warning if over limit
- Recipient phone number

### 6. Send Button

- Disabled if phone number is empty
- Shows loading state while sending
- Displays success/failure result

## Usage Example

### Test Booking Created Notification

1. Navigate to `/dev/s(my)-test`
2. Enter phone number: `60105581238`
3. Select template: "Booking Created"
4. Customize template data:
   - Charter Name: "Blue Marlin Fishing Adventure"
   - Trip Date: "2025-12-01"
   - Total Price: "450.00"
5. Click "Send SMS"
6. Check your phone for incoming SMS

**Expected SMS:**

```
Fishon: Your booking for Blue Marlin Fishing Adventure on 2025-12-01
has been received. Total: RM450.00. We will notify you once the captain approves.
```

### Send Custom Message

1. Navigate to `/dev/s(my)-test`
2. Enter phone number
3. Type custom message in "Custom Message" field
4. Click "Send SMS"

**Note:** Custom messages automatically truncate to 160 characters with "..." suffix

## Response Handling

### Success Response

- ✅ Green card with "Success" message
- Displays Message ID from Exabytes
- Toast notification confir(my) delivery

### Failure Response

- ❌ Red card with error message
- Common errors:
  - **IP NOT ALLOWED** (-1003): Account IP whitelist issue. SMS will work in production.
  - **INVALID DESTINATION** (-1009): Invalid phone number format
  - **Missing credentials**: EXABYTES_SMS_USERNAME or EXABYTES_SMS_PASSWORD not set

## Environment Variables Required

```env
EXABYTES_SMS_USERNAME=FISHON
EXABYTES_SMS_PASSWORD=DrNJb6UM6L
```

These are configured in `.env.local` and automatically loaded in development.

## API Endpoint

**POST** `/api/dev/s(my)-test`

```json
{
  "phone": "60105581238",
  "notificationType": "BOOKING_CREATED",
  "customMessage": "",
  "templateData": {
    "charterName": "Deep Sea Fishing",
    "tripDate": "2025-11-25",
    "totalPrice": "299.00"
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "SMS sent successfully",
  "messageId": "12345678",
  "details": {
    "phone": "60105581238",
    "messageLength": 120,
    "truncated": false
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "-1003 = IP NOT ALLOWED",
  "details": "Failed to send SMS via Exabytes"
}
```

## Availability

### Development (Local)

- ✅ Available
- Uses development environment variables

### Preview/Staging

- ✅ Available
- Uses staging environment variables

### Production

- ❌ **NOT Available** - Endpoint returns 403 Forbidden
- SMS testing removed in production for security

## Security

1. **Development Only:** Endpoint returns 403 if not in development/preview mode
2. **No User Data Logging:** SMS messages are only logged in server console for debugging
3. **Rate Limiting:** No rate limiting on this endpoint (it's for testing)
4. **Phone Validation:** Malaysian format only to prevent abuse

## Troubleshooting

### "IP NOT ALLOWED" Error

**Cause:** Exabytes account has IP whitelisting enabled

**Solution:**

- Normal in local development
- SMS will work in production once deployed to Vercel
- Can whitelist development IP in Exabytes dashboard (optional)

### "INVALID DESTINATION NUMBER" Error

**Cause:** Phone number format is incorrect

**Solution:**

- Use Malaysian format: 60XXXXXXXXX
- Try: 60105581238

### "SMS credentials not configured" Error

**Cause:** Environment variables not set

**Solution:**

1. Check `.env.local` has:
   - EXABYTES_SMS_USERNAME
   - EXABYTES_SMS_PASSWORD
2. Restart dev server

### Message Not Received

**Possible causes:**

1. **Wrong phone number** - Check format (60XXXXXXXXX)
2. **SMS filtered** - Check spam/junk folder
3. **Exabytes quota** - Account may have insufficient balance
4. **Network issue** - Try again

## Testing Checklist

- [ ] SMS received for Booking Created
- [ ] SMS received for Booking Approved
- [ ] SMS received for Payment notification
- [ ] Message text is correct
- [ ] Phone number normalized correctly
- [ ] Long messages truncated with "..."
- [ ] Custom messages work
- [ ] Error handling displays properly

## Integration with Production

Once deployed to production:

1. SMS test endpoint is disabled (403 response)
2. Actual booking notifications trigger SMS automatically
3. User SMS preferences are respected
4. All 10 notification types supported

## Related Documentation

- `/docs/SMS_INTEGRATION_COMPLETE.md` - Complete SMS integration overview
- `/src/lib/services/s(my)-service.ts` - SMS service implementation
- `/src/lib/services/notification-service.ts` - Notification service integration
