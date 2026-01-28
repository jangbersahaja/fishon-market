# SenangPay Payment Return Handler

## Problem

SenangPay is configured to redirect customers to:
```
https://www.fishon.my/book/payment/return
```

However, the Fishon Market app uses internationalization with **required locale prefixes** (`localePrefix: "always"`), meaning all routes must include a locale like `/ms/` or `/en/`:
```
https://www.fishon.my/ms/book/payment/return
https://www.fishon.my/en/book/payment/return
```

When SenangPay redirects to `/book/payment/return`, Next.js returns a 404 error because the route doesn't match the expected locale pattern.

## Solution

Created an API route handler at `/api/payment/return` that:
1. Receives the SenangPay callback with query parameters
2. Detects the user's locale from cookies (defaults to `ms`)
3. Redirects to the localized payment return page with all parameters preserved

## Implementation

**File**: `src/app/api/payment/return/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Extract SenangPay parameters
  const status_id = searchParams.get("status_id");
  const order_id = searchParams.get("order_id");
  const transaction_id = searchParams.get("transaction_id");
  const msg = searchParams.get("msg");
  const hash = searchParams.get("hash");

  // Detect locale
  const localeCookie = request.cookies.get("NEXT_LOCALE");
  const locale = localeCookie?.value || "ms";

  // Redirect to localized route
  return NextResponse.redirect(`/${locale}/book/payment/return?...`);
}
```

## SenangPay Configuration

Update the return URL in SenangPay dashboard to:
```
https://www.fishon.my/api/payment/return
```

This ensures customers are redirected to the correct locale-aware page after payment.

## Flow Diagram

```
Customer completes payment on SenangPay
    ↓
SenangPay redirects to:
https://www.fishon.my/api/payment/return?status_id=1&order_id=...&hash=...
    ↓
API route detects locale (from cookie or defaults to 'ms')
    ↓
Redirects to:
https://www.fishon.my/ms/book/payment/return?status_id=1&order_id=...&hash=...
    ↓
Payment return page processes the payment
```

## Additional Changes

### Structured Logging

Replaced all `console.log` and `console.error` statements with structured logger in:
- `src/app/[locale]/(marketplace)/book/payment/return/page.tsx`
- `src/app/api/payment/callback/route.ts`
- `src/app/api/payment/senangpay-callback/route.ts`

Benefits:
- Production: Single-line JSON logs for log aggregation tools
- Development: Colorized output with timestamps
- Consistent logging format with metadata

Example:
```typescript
// Before
console.log("✅ [PAYMENT RETURN] Hash verified successfully");

// After
logger.info("Hash verified successfully", { 
  component: "payment-return" 
});
```

## Testing

1. **Unit Tests**: Payment utilities tests pass ✅
2. **Integration**: Should test with SenangPay sandbox:
   - Configure return URL in SenangPay dashboard
   - Complete a test payment
   - Verify redirect works correctly
   - Check payment status is updated

## Related Files

- `/api/payment/return/route.ts` - New redirect handler
- `/[locale]/book/payment/return/page.tsx` - Payment return page
- `/api/payment/senangpay-callback/route.ts` - Server-to-server callback
- `proxy.ts` - Middleware configuration
- `src/i18n/navigation.ts` - Locale routing configuration
