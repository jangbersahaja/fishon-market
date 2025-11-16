## Phase 2 Complete: Manual Flow Verification

Manual booking submissions (authenticated + guest) now have end-to-end coverage, ensuring they stay PENDING, respect approval deadlines, skip payment intents, and trigger the expected notifications.

**Files created/changed:**

- `src/app/api/bookings/create/route.ts`
- `src/app/api/bookings/create-guest/route.ts`
- `src/app/api/bookings/__tests__/manual-flow.test.ts`
- `src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`
- `docs/BOOKING_FLOW.md`

**Functions created/changed:**

- `createAuthenticatedBooking` (manual-flow branch)
- `POST /api/bookings/create-guest`

**Tests created/changed:**

- `src/app/api/bookings/__tests__/manual-flow.test.ts`

**Review Status:** APPROVED

**Git Commit Message:**
man booking: cover manual flow paths

- Add authenticated + guest manual-flow API tests and logging
- Ensure manual submissions stay pending and block conflicting slots
- Update checkout copy + docs to call out captain approval timing
