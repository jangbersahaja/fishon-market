# Dual Booking Flow Implementation Plan

## Overview

Implement two distinct booking flows that captains can choose between:

1. **Manual Approval Flow**: Captain reviews each request before payment
2. **Auto-Approval Flow**: Instant booking with payment, captain acknowledges after

This replaces the confusing hybrid PAYMENT_PENDING system with clearer, purposeful flows.

---

## Design Decisions (Confirmed)

1. ✅ **Manual flow approval time**: Options (12h/24h/48h/custom up to 7 days)
2. ✅ **Payment deadline (AWAITING_PAYMENT)**: Fixed 48 hours
3. ✅ **Acknowledgment time (Auto flow)**: Fixed 12 hours (creates urgency)
4. ✅ **Dispute handling**: Manual admin review via UNDER_REVIEW status (no automated system yet)
5. ❌ **Reschedule system**: Not implemented (future feature)
6. ❌ **Emergency cancellation**: Not implemented (future feature)

---

## Key Principles

### Manual Flow (Request & Approve)

- **No tokenization**: Direct payment only (simpler, captain pre-approved)
- **Captain control**: Review each booking before commitment
- **Lower conversion**: Some friction but higher quality bookings
- **Payment methods**: FPX, E-wallet, Card (all with immediate charge)

### Auto Flow (Instant Booking)

- **With tokenization**: Card authorized, charged on acknowledgment
- **Instant confirmation**: Higher conversion, less friction
- **Captain can reject**: But must do so within 12 hours
- **Payment methods**:
  - Card → TOKENIZED (authorize, charge later)
  - FPX/E-wallet → DIRECT (immediate payment)

### Captain Post-Payment Limitations

- ❌ **Cannot cancel PAID bookings**
- ✅ **Can request admin review**: Sets status to UNDER_REVIEW
- ✅ **Admin mediates**: Decides refund/reschedule/no-action
- 📝 **Audit trail**: All actions logged

---

## Status Flow Diagrams

### Manual Approval Flow

```
PENDING (Angler requests, no payment)
  ↓ [Captain approval deadline: configurable 12h-7d]
  ├─→ AWAITING_PAYMENT (Captain approved, 48h payment deadline)
  │       ↓ [Angler pays via FPX/E-wallet/Card - DIRECT payment]
  │   PAID (Payment received, trip confirmed)
  │       ↓ [After trip date]
  │   COMPLETED
  │
  ├─→ REJECTED (Captain declined)
  │
  └─→ EXPIRED (Captain didn't respond)
```

**Cancellation:**

- **PENDING**: Free (no payment)
- **AWAITING_PAYMENT**: Free (no payment yet)
- **PAID**: Time-based refund policy (>30d: 80%, 15-30d: 50%, <15d: 0%)

### Auto-Approval Flow

```
PAYMENT_AUTHORIZED (Payment secured, awaiting captain)
  ↓ [Captain acknowledgment deadline: 12h fixed]
  │
  ├─→ PAID (Captain acknowledged, trip confirmed)
  │       ↓ [Card charged if TOKENIZED]
  │       ↓ [After trip date]
  │   COMPLETED
  │
  ├─→ REJECTED (Captain declined, full refund)
  │
  └─→ EXPIRED (Captain didn't respond, full refund)
```

**Cancellation:**

- **PAYMENT_AUTHORIZED**: Full refund (100%)
- **PAID**: Time-based refund policy (same as Manual flow)

### Admin Review Flow (Common to Both)

```
PAID (Captain requests admin review)
  ↓
UNDER_REVIEW (Admin investigating)
  ↓
  ├─→ PAID (No issue found, booking continues)
  ├─→ CANCELLED (Admin approves full refund)
  └─→ PAID (Admin approves partial refund, booking continues)
```

---

## Status Definitions

| Status                 | Description                       | Deadline              | Payment State                          | Who Acts |
| ---------------------- | --------------------------------- | --------------------- | -------------------------------------- | -------- |
| **PENDING**            | Awaiting captain approval         | Configurable (12h-7d) | None                                   | Captain  |
| **AWAITING_PAYMENT**   | Approved, awaiting payment        | 48h fixed             | None                                   | Angler   |
| **PAYMENT_AUTHORIZED** | Payment secured, awaiting ack     | 12h fixed             | Held (Card) or Captured (FPX/E-wallet) | Captain  |
| **PAID**               | Payment confirmed, trip confirmed | -                     | Captured                               | -        |
| **UNDER_REVIEW**       | Admin reviewing issue             | -                     | Held                                   | Admin    |
| **COMPLETED**          | Trip finished                     | -                     | Settled                                | -        |
| **REJECTED**           | Captain declined                  | -                     | Refunded (if paid)                     | -        |
| **CANCELLED**          | Angler cancelled                  | -                     | Refunded (per policy)                  | -        |
| **EXPIRED**            | Deadline passed                   | -                     | Refunded (if paid)                     | -        |

---

## Database Schema Changes

### Enums

```prisma
enum BookingStatus {
  // Manual flow
  PENDING                // Awaiting captain approval
  AWAITING_PAYMENT       // Approved, awaiting payment (48h)

  // Auto flow
  PAYMENT_AUTHORIZED     // Payment held, awaiting acknowledgment (12h)

  // Common
  PAID                   // Payment confirmed, trip confirmed
  UNDER_REVIEW           // Admin reviewing captain's request
  COMPLETED              // Trip finished
  REJECTED               // Captain rejected
  CANCELLED              // Angler cancelled
  EXPIRED                // Deadline expired
}

enum BookingFlowType {
  MANUAL      // Request → Approval → Payment → Paid
  AUTO        // Payment → Acknowledgment → Paid
}
```

### Charter Model Changes

```prisma
model Charter {
  // ... existing fields

  // Booking flow settings
  bookingFlowType       BookingFlowType @default(MANUAL)
  approvalTimeHours     Int             @default(24)    // For MANUAL flow: 12/24/48/custom (max 168 = 7 days)
  instantBookingEnabled Boolean         @default(false) // UI-friendly flag for AUTO flow

  // ... rest of fields
}
```

### Booking Model Changes

```prisma
model Booking {
  // ... existing fields

  // Flow tracking
  bookingFlowType        BookingFlowType  // Snapshot: which flow was used at booking time

  // Deadlines (computed at creation based on flow)
  approvalDeadline       DateTime?        // MANUAL: When captain must respond (PENDING)
  paymentDeadline        DateTime?        // MANUAL: When angler must pay (AWAITING_PAYMENT)
  acknowledgmentDeadline DateTime?        // AUTO: When captain must acknowledge (PAYMENT_AUTHORIZED)

  // Admin review tracking
  reviewRequestedBy      String?          // User ID (captain)
  reviewRequestedAt      DateTime?        // When review was requested
  reviewedBy             String?          // Staff user ID
  reviewedAt             DateTime?        // When review was completed
  reviewNotes            String?          @db.Text // Admin decision notes

  // ... rest of fields
}
```

---

## API Endpoints

### New/Modified Endpoints

#### 1. Charter Settings

- `PATCH /api/captain/charters/:id/booking-settings`
  - Update `bookingFlowType` and `approvalTimeHours`
  - Validation: `approvalTimeHours` must be 12, 24, 48, or 1-168 (max 7 days)

#### 2. Booking Creation

- `POST /api/bookings/create`
  - Read charter's `bookingFlowType`
  - **If MANUAL**:
    - Set status: `PENDING`
    - Set `approvalDeadline`: now + charter's `approvalTimeHours`
    - No payment yet
  - **If AUTO**:
    - Process payment immediately
    - Set status: `PAYMENT_AUTHORIZED`
    - Set `acknowledgmentDeadline`: now + 12 hours
    - **Card**: Create token (TOKENIZED flow)
    - **FPX/E-wallet**: Complete payment (DIRECT flow)

#### 3. Captain Actions

- `POST /api/bookings/approve` (MANUAL flow)
  - Validate status: must be `PENDING`
  - Update status: `AWAITING_PAYMENT`
  - Set `paymentDeadline`: now + 48 hours
  - Send payment link to angler

- `POST /api/bookings/acknowledge` (AUTO flow)
  - Validate status: must be `PAYMENT_AUTHORIZED`
  - **If TOKENIZED**: Charge card via `capturePayment()`
  - **If DIRECT**: Confirm (already paid)
  - Update status: `PAID`
  - Send confirmation to angler

- `POST /api/bookings/reject`
  - **MANUAL (PENDING)**: Just update status, no refund
  - **AUTO (PAYMENT_AUTHORIZED)**:
    - **TOKENIZED**: Release token via `releasePayment()`
    - **DIRECT**: Initiate full refund via `initiateRefund()`
  - Update status: `REJECTED`

- `POST /api/bookings/request-review` (NEW)
  - Validate status: must be `PAID`
  - Update status: `UNDER_REVIEW`
  - Set `reviewRequestedBy`, `reviewRequestedAt`
  - Notify admin team
  - Captain provides reason + description

#### 4. Angler Actions

- `POST /api/bookings/pay` (MANUAL flow)
  - Validate status: must be `AWAITING_PAYMENT`
  - Check `paymentDeadline` not expired
  - Process payment (FPX/E-wallet/Card - all DIRECT)
  - Update status: `PAID`
  - Send confirmation

- `POST /api/bookings/cancel`
  - **PENDING/AWAITING_PAYMENT**: Free cancellation, status → CANCELLED
  - **PAYMENT_AUTHORIZED**: Full refund, status → CANCELLED
  - **PAID**: Time-based refund policy, status → CANCELLED

#### 5. Admin Actions (NEW)

- `GET /api/admin/bookings/under-review`
  - List all bookings with status `UNDER_REVIEW`
  - Include captain's request details

- `POST /api/admin/bookings/:id/resolve-review`
  - Decision options:
    - `CONTINUE`: Status → PAID (no issue found)
    - `FULL_REFUND`: Status → CANCELLED, initiate full refund
    - `PARTIAL_REFUND`: Status → PAID, initiate partial refund
  - Set `reviewedBy`, `reviewedAt`, `reviewNotes`
  - Notify both captain and angler

#### 6. Cron Jobs

- `POST /api/cron/expire-bookings`
  - Find bookings with deadline passed:
    - `PENDING` + `approvalDeadline < NOW()` → EXPIRED
    - `AWAITING_PAYMENT` + `paymentDeadline < NOW()` → EXPIRED
    - `PAYMENT_AUTHORIZED` + `acknowledgmentDeadline < NOW()` → EXPIRED + full refund
  - Batch process, send notifications

---

## Implementation Phases

### Phase 1: Schema & Database (Week 1)

**Goal**: Update database schema and run migrations

**Tasks**:

1. Update `prisma/schema.prisma` (fishon-market):
   - Add `BookingFlowType` enum
   - Add `AWAITING_PAYMENT`, `PAYMENT_AUTHORIZED`, `UNDER_REVIEW` to `BookingStatus`
   - Add flow fields to `Charter` model
   - Add deadline fields to `Booking` model
   - Add admin review fields to `Booking` model

2. Update `prisma/schema.prisma` (fishon-captain):
   - Sync `BookingStatus` enum (read-only view)
   - Add flow settings to charter management

3. Create migration:

   ```bash
   npm run db:migrate:safe add-dual-booking-flow
   ```

4. Update Prisma clients:
   ```bash
   npm run prisma:generate
   ```

**Acceptance Criteria**:

- ✅ All enums updated
- ✅ Migrations run successfully
- ✅ TypeScript types generated
- ✅ No data loss from existing bookings

---

### Phase 2: Manual Flow Implementation (Week 2-3)

**Goal**: Implement PENDING → AWAITING_PAYMENT → PAID flow

**Tasks**:

#### 2.1 Charter Settings

- Create `/api/captain/charters/:id/booking-settings` endpoint
- Add UI toggle: "Enable Instant Booking" (sets `bookingFlowType`)
- Add approval time selector: 12h/24h/48h/custom (1-168 hours)
- Validation: Ensure valid ranges

#### 2.2 Booking Creation (Manual Flow)

- Update `POST /api/bookings/create`:
  - Check charter's `bookingFlowType`
  - If `MANUAL`: Set status `PENDING`, calculate `approvalDeadline`
  - No payment processing
  - Send notification to captain

#### 2.3 Captain Approval

- Update `POST /api/bookings/approve`:
  - Add flow check: only handle `PENDING` status
  - Update status to `AWAITING_PAYMENT`
  - Set `paymentDeadline` (now + 48h)
  - Send payment link to angler

#### 2.4 Angler Payment

- Create `POST /api/bookings/pay`:
  - Validate status `AWAITING_PAYMENT`
  - Check deadline not expired
  - Process DIRECT payment (FPX/E-wallet/Card)
  - Update status to `PAID`
  - Send confirmation

#### 2.5 Captain Rejection

- Update `POST /api/bookings/reject`:
  - Handle `PENDING` status (no refund needed)
  - Update status to `REJECTED`
  - Send notification to angler

#### 2.6 Expiration Handling

- Update `/api/cron/expire-bookings`:
  - Handle `PENDING` with expired `approvalDeadline`
  - Handle `AWAITING_PAYMENT` with expired `paymentDeadline`
  - Update status to `EXPIRED`
  - Send notifications

#### 2.7 UI Updates (Angler Side)

- Payment link page for `AWAITING_PAYMENT` bookings
- Status badges: "Awaiting Approval", "Payment Due", "Paid"
- Countdown timers for deadlines

#### 2.8 UI Updates (Captain Side)

- Booking flow settings in charter edit
- Approval button for `PENDING` bookings
- Status filters: Pending / Awaiting Payment / Paid

**Acceptance Criteria**:

- ✅ Captain can choose Manual flow
- ✅ PENDING → AWAITING_PAYMENT → PAID flow works end-to-end
- ✅ Deadlines enforced and expired bookings handled
- ✅ All notifications sent correctly
- ✅ UI reflects status accurately

---

### Phase 3: Auto-Approval Flow Implementation (Week 4-5)

**Goal**: Implement PAYMENT_AUTHORIZED → PAID flow with tokenization

**Tasks**:

#### 3.1 Booking Creation (Auto Flow)

- Update `POST /api/bookings/create`:
  - Check charter's `bookingFlowType`
  - If `AUTO`: Process payment immediately
  - **Card**: Create token via `createPaymentIntent()` (TOKENIZED)
  - **FPX/E-wallet**: Complete payment via `createPaymentIntent()` (DIRECT)
  - Set status `PAYMENT_AUTHORIZED`
  - Set `acknowledgmentDeadline` (now + 12h)
  - Send notification to captain

#### 3.2 Captain Acknowledgment

- Create `POST /api/bookings/acknowledge`:
  - Validate status `PAYMENT_AUTHORIZED`
  - Check deadline not expired
  - **If TOKENIZED**: Charge card via `capturePayment()`
  - **If DIRECT**: Confirm only (already paid)
  - Update status to `PAID`
  - Send confirmation to angler

#### 3.3 Captain Rejection (Auto Flow)

- Update `POST /api/bookings/reject`:
  - Handle `PAYMENT_AUTHORIZED` status
  - **TOKENIZED**: Release token via `releasePayment()`
  - **DIRECT**: Initiate full refund via `initiateRefund()`
  - Update status to `REJECTED`
  - Send notification with refund info

#### 3.4 Expiration Handling (Auto Flow)

- Update `/api/cron/expire-bookings`:
  - Handle `PAYMENT_AUTHORIZED` with expired `acknowledgmentDeadline`
  - Release token or refund payment
  - Update status to `EXPIRED`
  - Full refund policy

#### 3.5 UI Updates (Angler Side)

- Instant booking confirmation page
- Payment method selection with flow badges:
  - Card: "Authorization only, charged when captain confirms"
  - FPX/E-wallet: "Immediate payment, refunded if captain rejects"
- Status: "Awaiting Captain Confirmation"

#### 3.6 UI Updates (Captain Side)

- Acknowledge button for `PAYMENT_AUTHORIZED` bookings
- Payment flow badges: "Card Held" vs "Already Paid"
- Urgency indicator: "12 hours to respond"

**Acceptance Criteria**:

- ✅ Captain can enable Auto flow
- ✅ PAYMENT_AUTHORIZED → PAID flow works end-to-end
- ✅ Tokenized (Card) and Direct (FPX/E-wallet) payments handled correctly
- ✅ 12-hour deadline enforced
- ✅ Expired bookings get full refunds
- ✅ UI shows payment flow badges

---

### Phase 4: Admin Review System (Week 6)

**Goal**: Allow captains to request admin review for PAID bookings

**Tasks**:

#### 4.1 Captain Request Review

- Create `POST /api/bookings/request-review`:
  - Validate status `PAID`
  - Require reason + description
  - Update status to `UNDER_REVIEW`
  - Set `reviewRequestedBy`, `reviewRequestedAt`
  - Notify admin team

#### 4.2 Admin Dashboard

- Create `/staff/bookings/under-review` page:
  - List all `UNDER_REVIEW` bookings
  - Show captain's reason + description
  - Show booking details, payment info
  - Show conversation history (if any)

#### 4.3 Admin Resolution

- Create `POST /api/admin/bookings/:id/resolve-review`:
  - Decision options:
    - Continue (no issue)
    - Full refund
    - Partial refund
  - Set `reviewedBy`, `reviewedAt`, `reviewNotes`
  - Process refund if applicable
  - Update status accordingly
  - Notify both parties

#### 4.4 UI Updates (Captain Side)

- "Request Admin Review" button on PAID bookings
- Modal with reason selection + description
- Status badge: "Under Review"

#### 4.5 UI Updates (Angler Side)

- Status badge: "Under Review"
- Info message: "Admin is reviewing this booking"

**Acceptance Criteria**:

- ✅ Captain can request review for PAID bookings
- ✅ Admin dashboard shows pending reviews
- ✅ Admin can resolve with continue/full refund/partial refund
- ✅ Both parties notified of decision
- ✅ Refunds processed correctly

---

### Phase 5: Testing & Edge Cases (Week 7)

**Goal**: Comprehensive testing and edge case handling

**Tasks**:

#### 5.1 Unit Tests

- Test status transitions for both flows
- Test deadline calculations
- Test payment processing (mock gateway)
- Test refund calculations
- Test expiration cron logic

#### 5.2 Integration Tests

- Test full Manual flow end-to-end
- Test full Auto flow end-to-end
- Test admin review flow
- Test concurrent operations
- Test expiration race conditions

#### 5.3 Edge Cases

- Double approval attempts
- Payment during expiration
- Captain acknowledges expired booking
- Admin review on cancelled booking
- Duplicate payment attempts
- Gateway failures and retries

#### 5.4 Data Migration

- Migrate existing `PENDING` bookings (keep as-is)
- Migrate existing `APPROVED` bookings → `AWAITING_PAYMENT`
- Migrate existing `PAYMENT_PENDING` bookings → `PAYMENT_AUTHORIZED`
- Set `bookingFlowType` on existing charters (default: MANUAL)

#### 5.5 Performance Testing

- Load test booking creation
- Load test expiration cron
- Load test admin review queries
- Optimize database indexes

**Acceptance Criteria**:

- ✅ 90%+ test coverage
- ✅ All edge cases handled gracefully
- ✅ Data migration successful
- ✅ Performance benchmarks met
- ✅ No regressions in existing features

---

### Phase 6: Documentation & Rollout (Week 8)

**Goal**: Document system and roll out to production

**Tasks**:

#### 6.1 Documentation

- Update API documentation
- Create captain onboarding guide
- Create admin operations manual
- Update refund policy page
- Create troubleshooting guide

#### 6.2 Monitoring

- Add logging for status transitions
- Add alerts for failed payments
- Add metrics for flow adoption (Manual vs Auto)
- Add dashboard for admin review queue

#### 6.3 Gradual Rollout

- Enable for test captains first
- Monitor for issues
- Gradually enable for all captains
- Provide support during transition

#### 6.4 Training

- Train support staff on new flows
- Train admin staff on review system
- Create FAQ for common issues
- Create video tutorial for captains

**Acceptance Criteria**:

- ✅ Complete documentation
- ✅ Monitoring in place
- ✅ Successful rollout to 100% of captains
- ✅ Support staff trained
- ✅ No critical issues

---

## Success Metrics

### Technical Metrics

- Zero data loss during migration
- <1% payment gateway failures
- <5min average admin review resolution time
- 100% notification delivery rate

### Business Metrics

- Manual flow: Track approval rate, payment completion rate
- Auto flow: Track acknowledgment rate, rejection rate
- Overall: Track conversion rate improvement
- Customer support: Track dispute volume (should decrease)

### User Experience Metrics

- Captain satisfaction with flow choice
- Angler satisfaction with booking clarity
- Time to booking confirmation (should decrease for Auto)
- Cancellation/dispute rate (should decrease)

---

## Risk Mitigation

### Payment Processing Risks

- **Risk**: Card charge fails after acknowledgment
- **Mitigation**: Return 402 error, keep status `PAYMENT_AUTHORIZED`, allow retry

### Deadline Expiration Risks

- **Risk**: Booking expires while captain is approving
- **Mitigation**: Check deadline in transaction, return 409 conflict

### Refund Processing Risks

- **Risk**: Refund fails during rejection/cancellation
- **Mitigation**: Mark refund as FAILED, add to retry queue, notify admin

### Data Migration Risks

- **Risk**: Existing bookings in unknown state
- **Mitigation**: Backup database, dry-run migration, rollback plan

### Admin Review Risks

- **Risk**: Admin backlog grows too large
- **Mitigation**: Add SLA alerts, escalation to senior staff, hire more moderators

---

## Rollback Plan

If critical issues arise:

1. **Disable new bookings**: Set maintenance mode
2. **Revert schema changes**: Use backup and restore
3. **Restore previous booking endpoint**: Deploy previous version
4. **Process stuck bookings**: Manually via admin dashboard
5. **Refund affected users**: Full refunds for impacted bookings
6. **Post-mortem**: Analyze what went wrong, fix before re-deploy

---

## Future Enhancements (Not in Scope)

- ❌ Reschedule system (Phase 7+)
- ❌ Emergency cancellation with auto-verification (Phase 7+)
- ❌ Automated dispute resolution (Phase 8+)
- ❌ Multi-day booking optimization (Phase 9+)
- ❌ Dynamic pricing based on demand (Phase 10+)

---

## Questions & Assumptions

### Confirmed

- ✅ Manual flow: Configurable approval time (12h-7d)
- ✅ Payment deadline: Fixed 48 hours
- ✅ Acknowledgment deadline: Fixed 12 hours
- ✅ Dispute: Admin-only via UNDER_REVIEW status

### Assumptions

- Captain earns same % regardless of flow (90% after fees)
- Platform fee remains 10% of trip price
- Refund policy applies equally to both flows
- Admin review SLA: 24 hours (business hours)

### To Clarify

- Should we allow captains to switch flow types on existing charters?
- Should we show flow adoption metrics in captain dashboard?
- Should we A/B test flow performance before full rollout?

---

## Conclusion

This plan provides a clear, implementable path from the current confusing system to a dual-flow architecture that gives captains choice and anglers clarity. The phased approach ensures safe rollout with comprehensive testing and rollback options.

**Timeline**: 8 weeks (2 months)  
**Phases**: 6 implementation + 1 rollout + 1 buffer  
**Team Size**: 2-3 developers + 1 QA + 1 admin support

**Next Steps**:

1. Review and approve this plan
2. Create Phase 1 schema changes
3. Begin implementation
