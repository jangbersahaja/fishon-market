## Phase 7 Complete: Pre-Submission Validation

**TL;DR:** Implemented complete validation chain for payment preview page including centralized helper functions, API endpoint, and form integration to prevent payment with stale data.

**Files created/changed:**

- `/lib/helpers/payment-validation.ts` (created)
- `/components/payment/PaymentPreviewForm.tsx` (updated)
- `/app/api/bookings/validate-session/route.ts` (created)

**Functions created/changed:**

- `validateSessionAndAvailability(data)` - Core validation logic with 3 checks (session timeout, availability, pricing)
- `formatTimeRemaining(ms)` - Helper for countdown display formatting
- `POST /api/bookings/validate-session` - API endpoint handler with authentication

**Validation Checks Implemented:**

1. **Session Timeout**: Enforces 30-minute limit from sessionStart timestamp
2. **Date Availability**: Real-time check via checkDateAvailability to prevent race conditions
3. **Price Accuracy**: Recalculates pricing and compares with ±0.01 tolerance for floating point differences

**Error Codes:**

- `SESSION_EXPIRED` - Session exceeded 30 minutes (redirects to booking form with error)
- `DATE_UNAVAILABLE` - Date no longer available (redirects to booking form)
- `PRICE_CHANGED` - Price increased/decreased (shows new price, redirects to booking form)
- `TRIP_NOT_FOUND` - Trip data fetch failed (shows error)
- `AVAILABILITY_CHECK_FAILED` - Availability service error (shows error)

**Validation Flow:**

```
User clicks "Proceed to Payment"
→ PaymentPreviewForm.handleSubmit()
→ POST to /api/bookings/validate-session
→ validateSessionAndAvailability() checks:
   - Session timeout (now > sessionStart + 30min)
   - Date availability (checkDateAvailability)
   - Price accuracy (recalculate vs finalPrice with ±0.01 tolerance)
→ Returns { valid, error?, code?, newPrice? }
→ Form handles errors with toasts + redirects
→ If valid, proceeds to /api/bookings/create for payment
```

**Security Features:**

- Authentication required (only logged-in users can validate)
- Server-side validation (client cannot bypass checks)
- Timestamp validation prevents replay attacks
- Real-time data fetching (no cached/stale data)

**Review Status:** APPROVED

**Git Commit Message:**

```
feat: Add pre-submission validation for payment preview

- Create payment-validation helper with session/availability/pricing checks
- Implement /api/bookings/validate-session API endpoint
- Update PaymentPreviewForm to validate before payment processing
- Handle 5 error codes with specific user actions
- Enforce 30-min session timeout server-side
- Prevent double-booking with real-time availability check
- Prevent payment with stale pricing via recalculation
```
