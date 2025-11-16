## Phase 3 Complete: AUTO Flow Verification

AUTO booking paths (auth + guest) now enforce payment selection, gate mock mode behind `SENANGPAY_FORCE_MOCK`, and carry payment metadata through the SenangPay callback, with docs covering the new Vitest suite.

**Files created/changed:**

- `src/app/api/bookings/__tests__/auto-flow.test.ts`
- `src/app/api/bookings/create/route.ts`
- `docs/BOOKING_FLOW.md`

**Functions created/changed:**

- `createAuthenticatedBooking` (AUTO/payment branch)
- `POST /api/payment/senangpay-callback` (covered via tests/mocks)

**Tests created/changed:**

- `src/app/api/bookings/__tests__/auto-flow.test.ts`

**Review Status:** APPROVED

**Git Commit Message:**
feat: cover auto booking payments

- Add AUTO booking + SenangPay callback Vitest coverage
- Enforce SENANGPAY_FORCE_MOCK for mock method usage
- Document auto-flow test workflow in BOOKING_FLOW.md
