## Phase 1 Complete: Configuration & Data Source Audit

Updated charter flow detection, documentation, and environment guidance to reflect the current dual-flow + guest setup, backed by new coverage tests.

**Files created/changed:**

- `src/lib/services/charter-service.ts`
- `src/lib/services/__tests__/charter-service-flow-type.test.ts`
- `docs/BOOKING_FLOW.md`
- `docs/archive/BOOKING_FLOW_LEGACY.md`
- `.env.example`

**Functions created/changed:**

- `getCharterFlowType`

**Tests created/changed:**

- `src/lib/services/__tests__/charter-service-flow-type.test.ts`

**Review Status:** APPROVED

**Git Commit Message:**
chore: document booking flow configuration updates

- Add charter-service flow type coverage and fallback logging
- Rewrite booking flow guide and archive legacy reference
- Expand env sample with booking + payment requirements
