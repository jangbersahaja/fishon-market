## Phase 1 Complete: Booking Summary Data Shaping

Centralized booking summary formatting via a pure helper, exercised it with targeted Vitest coverage, and refactored the payment preview page to consume the shared data shape.

**Files created/changed:**

- `src/lib/helpers/booking-preview-summary.ts`
- `src/lib/helpers/__tests__/booking-preview-summary.test.ts`
- `src/app/(marketplace)/book/payment/preview/page.tsx`

**Functions created/changed:**

- `buildBookingPreviewSummary`
- `PaymentPreviewPage` (summary rendering portion)

**Tests created/changed:**

- `src/lib/helpers/__tests__/booking-preview-summary.test.ts`

**Review Status:** APPROVED

**Git Commit Message:**
feat: centralize payment preview summary

- add booking preview summary helper with formatting logic
- cover helper with vitest scenarios for dates, guests, participants
- refactor payment preview page to consume shared summary output
