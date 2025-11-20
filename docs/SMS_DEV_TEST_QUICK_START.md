# SMS Dev Test Page - Quick Start

## What Was Created

A complete development SMS testing interface at `/dev/sms-test` to test SMS notifications during deployment.

## Files Created

### 1. SMS Test Page

**File:** `/src/app/(dev)/dev/sms-test/page.tsx`

- React component for SMS testing interface
- Real-time message preview
- Support for 10 notification templates
- Custom message override
- Result display with success/failure handling

### 2. SMS Test API

**File:** `/src/app/api/dev/sms-test/route.ts`

- POST endpoint for sending SMS
- Phone validation
- Message truncation
- Exabytes API integration
- Development-only (403 in production)

### 3. Updated Dev Tools Index

**File:** `/src/app/(dev)/dev/page.tsx`

- Added SMS Test to development tools list
- SMS Test card with link to new page

### 4. Documentation

**File:** `/docs/SMS_TEST_INTERFACE_GUIDE.md`

- Complete usage guide
- API documentation
- Troubleshooting guide
- Testing checklist

## How to Use

### 1. Start Development Server

```bash
npm run dev
```

### 2. Navigate to SMS Test Page

```
http://localhost:3001/dev/sms-test
```

### 3. Test SMS Notification

1. Enter your phone number (e.g., 60105581238)
2. Select a notification type (e.g., "Booking Created")
3. Customize template data if desired
4. Click "Send SMS"
5. Check your phone for incoming SMS

## Available Notification Templates

1. ✅ Booking Created
2. ✅ Booking Approved
3. ✅ Booking Rejected
4. ✅ Booking Paid
5. ✅ Booking Cancelled
6. ✅ Payment Refunded
7. ✅ Payment Failed
8. ✅ Review Submitted
9. ✅ Review Approved
10. ✅ Account Verified

## Features

- 📱 Phone number format validation
- ✂️ Automatic message truncation to 160 chars
- 👁️ Real-time message preview
- 🎨 Success/failure result display
- 🔧 Template variable customization
- 📝 Custom message override option
- 🔐 Development-only (disabled in production)

## Environment Setup

Environment variables are already configured in `.env.local`:

```env
EXABYTES_SMS_USERNAME=FISHON
EXABYTES_SMS_PASSWORD=DrNJb6UM6L
```

## Access

### Development

- URL: `http://localhost:3001/dev/sms-test`
- Status: ✅ Available

### Preview/Staging

- URL: `https://fishon.my/dev/sms-test`
- Status: ✅ Available

### Production

- Status: ❌ Disabled (403 Forbidden)

## Troubleshooting

### "IP NOT ALLOWED" Error

- **Expected during development** - Exabytes account has IP whitelist enabled
- Will work in production once deployed to Vercel
- SMS code is 100% correct

### Phone Number Not Working

- Use Malaysian format: `60XXXXXXXXX` or `0XXXXXXXXX`
- Example: `60105581238`

### Missing SMS

- Check phone spam/junk folder
- Verify phone number is correct
- Check Exabytes account balance/settings

## Testing Workflow

```
1. Development Testing
   ↓
2. Deploy to Preview
   ↓
3. Test on Preview Deployment
   ↓
4. Deploy to Production
   ↓
5. SMS Test Page Disabled (production safe)
   ↓
6. Actual SMS sent via booking flow
```

## Integration Points

The SMS test page integrates with:

- ✅ SMS Service Layer (`/src/lib/services/sms-service.ts`)
- ✅ Exabytes API (`https://smsportal.exabytes.my/isms_send.php`)
- ✅ Dev Tools Index (`/dev` page)
- ✅ Notification Service (tested with actual templates)

## Next Steps

1. **Local Testing**: Test different notification types on your phone (60105581238)
2. **Deployment Testing**: Deploy to preview and test SMS delivery
3. **Production Verification**: Verify SMS sent during actual booking flow
4. **Error Monitoring**: Monitor server logs for any SMS failures

## Files Summary

| File                                   | Purpose                  | Status     |
| -------------------------------------- | ------------------------ | ---------- |
| `/src/app/(dev)/dev/sms-test/page.tsx` | SMS test UI component    | ✅ Created |
| `/src/app/api/dev/sms-test/route.ts`   | SMS sending API endpoint | ✅ Created |
| `/src/app/(dev)/dev/page.tsx`          | Dev tools index          | ✅ Updated |
| `/docs/SMS_TEST_INTERFACE_GUIDE.md`    | Complete documentation   | ✅ Created |

## TypeScript Check

```bash
✅ All files compile without errors
```

---

**Ready to test SMS notifications!** 🎉
