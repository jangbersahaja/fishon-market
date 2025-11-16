## Plan: Booking Flow Verification & Hardening

Ensure both MANUAL and AUTO booking flows operate for authenticated and guest users with the expected payment options, driven by correct configuration sources and up-to-date documentation.

**Phases 3**

1. **Phase 1: Configuration & Data Source Audit**
   - **Objective:** Confirm booking flow data (captain DB view, API fallback, env vars) exposes bookingFlowType/approvalTimeHours, supports guests, and that documentation reflects the current system.
   - **Files/Functions to Modify/Create:** `src/lib/services/charter-service.ts`, `.env.example`, `docs/BOOKING_FLOW.md`, archive legacy docs in `docs/archive/`.
   - **Tests to Write:** `src/lib/services/__tests__/charter-service-flow-type.test.ts` covering DB-first, API-fallback, and default MANUAL detection.
   - **Steps:**
     1. Inspect current configuration sources and logs to ensure bookingFlowType, approvalTimeHours, and payment method settings populate from DB/API.
     2. Archive outdated booking-flow documentation and author a single authoritative doc detailing guest support and payment options (Card, FPX & E-Wallet, Mock).
     3. Write failing charter-service tests for each data source path, update implementation/documentation as needed, and rerun tests until green.

2. **Phase 2: MANUAL Flow Verification**
   - **Objective:** Validate MANUAL flow (auth + guest) from checkout submission through approval/payment, ensuring statuses, deadlines, and notifications behave as expected without payment collection upfront.
   - **Files/Functions to Modify/Create:** `src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`, `src/app/api/bookings/create-manual/route.ts`, `src/app/api/bookings/create-guest/route.ts`, related docs/tests.
   - **Tests to Write:** `src/app/api/bookings/__tests__/create-manual.test.ts`, `create-guest-manual.test.ts`, plus a UI test confirming manual submissions allow guests without payment fields.
   - **Steps:**
     1. Author failing API/UI tests covering guest/auth manual submissions, verifying status transitions, approval deadlines, and notification triggers.
     2. Reconcile implementation with tests (schema validation, rate limits, messaging) to guarantee manual flow parity across user types.
     3. Execute the test suite and document manual flow verification steps in `docs/BOOKING_FLOW.md`.

3. **Phase 3: AUTO Flow Verification**
   - **Objective:** Ensure AUTO flow (auth + guest) enforces payment requirements with Card, FPX & E-Wallet, and Mock options, handling payment preview, callbacks, and status transitions through PAYMENT_AUTHORIZED → PAID.
   - **Files/Functions to Modify/Create:** Checkout/payment preview components, `src/app/api/bookings/create-auto/route.ts`, `src/app/api/bookings/create-guest/route.ts`, `src/app/api/payment/callback/route.ts`, payment helpers.
   - **Tests to Write:** `src/app/api/bookings/__tests__/create-auto.test.ts`, `create-guest-auto.test.ts`, `payment-callback-auto.test.ts`, plus a UI test ensuring AUTO requires auth/payment selection.
   - **Steps:**
     1. Implement failing tests covering guest/auth AUTO bookings for each payment option, including SenangPay mock mode and callback handling.
     2. Adjust implementation to satisfy tests (guest enablement, payment option rendering, timeout enforcement).
     3. Rerun tests, manually sanity-check payment preview, and update documentation with AUTO flow behavior and payment option matrix.

**Open Questions**

1. None at this time.
