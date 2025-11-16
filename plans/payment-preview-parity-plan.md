## Plan: Payment Preview Parity & Mock Option

Align the payment preview experience with the booking confirmation UI, centralize summary formatting, and expose the mock payment method (dev-only) while keeping TDD coverage for layout and payment logic.

**Phases**

1. **Phase 1: Booking Summary Data Shaping**
   - **Objective:** Centralize formatting of decoded booking payloads so both preview and confirmation views render uniform charter, schedule, and participant details.
   - **Files/Functions to Modify/Create:** `src/app/(marketplace)/book/payment/preview/page.tsx`, new helper `src/lib/helpers/booking-preview-summary.ts`, related exports if required.
   - **Tests to Write:** `booking-preview-summary.test.ts` verifying helper outputs (charter info, trip schedule, guests, notes) for varied inputs.
   - **Steps:**
     1. Write failing helper tests covering base, multi-day, and participant scenarios plus optional note handling.
     2. Run the new test suite (red).
     3. Implement the helper to format sections (dates, times, guest counts, notes) mirroring `/book/confirm` standards.
     4. Refactor `PaymentPreviewPage` to consume the helper output for its summary card.
     5. Re-run tests and `npm run typecheck` (green).

2. **Phase 2: Payment Preview Layout Parity**
   - **Objective:** Update `PaymentPreviewPage` structure to match the booking confirmation layout, reusing existing components and adding cancellation-policy highlights.
   - **Files/Functions to Modify/Create:** `src/app/(marketplace)/book/payment/preview/page.tsx`, shared booking components under `src/components/booking/` if new presentational pieces emerge.
   - **Tests to Write:** `payment-preview-page.test.tsx` asserting headings (“Contact details”, “Emergency contact”, participants, cancellation policy) and pricing totals.
   - **Steps:**
     1. Author failing component tests that render the page (or extracted presentational component) and expect the new sections.
     2. Run the tests (red).
     3. Implement layout changes: adopt the confirmation grid, reuse summary components, add cancellation policy block, keep responsive ordering, and update styling.
     4. Re-run component tests plus `npm run typecheck` (green).

3. **Phase 3: Mock Payment Option Exposure**
   - **Objective:** Add a simple “Mock Payment (Dev Only)” radio option in `PaymentPreviewForm`, guard it via env checks, and update submission/tests for the `MOCK` method.
   - **Files/Functions to Modify/Create:** `src/components/payment/PaymentPreviewForm.tsx`, `src/lib/payments/gateway.ts` helpers (`isMockPaymentEnabled`, `isDirectPaymentMethod`, etc.).
   - **Tests to Write:** `PaymentPreviewForm.mock-option.test.tsx` (UI visibility & selection), `createBookingPayment.mock.test.ts` ensuring payload uses `MOCK` and bypasses gateway appropriately.
   - **Steps:**
     1. Write tests covering option visibility (dev-only), selection behavior (card fields disabled), and submission payloads for auth/guest flows.
     2. Run tests (red).
     3. Implement the mock option UI with simple labeling, tie it to env guards, and adjust submission helpers to honor `MOCK` routing.
     4. Re-run targeted tests and `npm run typecheck` (green).

**Open Questions**

1. Should additional cancellation or policy callouts mirror those on confirmation? → Yes, include them during layout parity.
2. Is mock label minimal or descriptive? → Minimal label is fine; it’s for internal use only.
3. Can we reuse confirmation components directly? → Yes, reuse wherever possible to keep parity.
