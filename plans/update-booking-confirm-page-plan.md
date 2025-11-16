## Plan: Update Book Confirm Page for Hybrid Booking Flow

Updates the booking confirmation page (`/book/confirm`) to fully support the new time-based booking system with hybrid payment flows (TOKENIZED and DIRECT).

**Phases: 5**

### Phase 1: Update BookingProgressTimeline Component

- **Objective**: Add PAYMENT_PENDING status support with payment flow awareness
- **Files/Functions to Modify/Create**:
  - `src/components/booking/BookingProgressTimeline.tsx` - Update timeline logic
- **Tests to Write**:
  - BookingProgressTimeline renders PAYMENT_PENDING state
  - Timeline shows correct steps for TOKENIZED vs DIRECT flows
  - Color coding matches payment flow type
- **Steps**:
  1. Add PAYMENT_PENDING to timeline step definitions
  2. Update step logic to handle "Payment Authorization" vs "Payment Received"
  3. Add payment flow badge indicators (💳 TOKENIZED / 🏦 DIRECT)
  4. Update color schemes: TOKENIZED (blue), DIRECT (green)
  5. Test with both payment flows

### Phase 2: Fix Payment Status Display Logic

- **Objective**: Show correct payment status messages for PAYMENT_PENDING bookings
- **Files/Functions to Modify/Create**:
  - `src/app/(marketplace)/book/confirm/page.tsx` - Update status notification rendering
- **Tests to Write**:
  - PAYMENT_PENDING displays correct authorization message
  - Payment flow type affects message content (TOKENIZED vs DIRECT)
  - Legacy PENDING status still works
- **Steps**:
  1. Update payment status check to include PAYMENT_PENDING
  2. Add conditional rendering based on paymentFlow field
  3. Show authorization details for TOKENIZED (card held, not charged)
  4. Show payment received message for DIRECT (full payment)
  5. Update countdown timer display for PAYMENT_PENDING

### Phase 3: Update BookingDetails Component

- **Objective**: Display time slots, emergency contact, participants, and proper pricing
- **Files/Functions to Modify/Create**:
  - `src/components/booking/BookingDetails.tsx` - Add new sections
  - `src/lib/services/booking-display-service.ts` - Parse JSON fields
- **Tests to Write**:
  - Time slots display correctly from timeSlots JSON
  - Emergency contact section renders when available
  - Participant list shows all participants with booker indicator
  - Pricing breakdown includes platform fee and gateway fee
- **Steps**:
  1. Update enrichBookingWithTripData to parse timeSlots, emergencyContact, participants from guests JSON
  2. Add TimeSlots section to replace simple date display
  3. Add EmergencyContact section
  4. Add ParticipantList section
  5. Update pricing section with platform fee (10%) and gateway fee (1.5%)
  6. Show captain earnings calculation for staff/captain view

### Phase 4: Enhance BookingActions Component

- **Objective**: Add captain contact options and proper cancellation for PAYMENT_PENDING
- **Files/Functions to Modify/Create**:
  - `src/components/booking/BookingActions.tsx` - Add PAYMENT_PENDING actions
  - `src/app/(marketplace)/book/confirm/BookingConfirmActions.tsx` - Pass conversation data
- **Tests to Write**:
  - Contact captain buttons show for PAYMENT_PENDING
  - Chat button opens conversation when unlocked
  - Cancel button checks cancellation policy
  - Actions hidden for non-cancellable bookings
- **Steps**:
  1. Add "Contact Captain" section for PAYMENT_PENDING status
  2. Add Call button (tel: link)
  3. Add Email button (mailto: link)
  4. Add Chat button with unlock check (conversation.status === 'ACTIVE')
  5. Update cancel button to check cancellation policy (refund calculation)
  6. Add refund preview modal before cancellation
  7. Hide contact buttons after trip date passes

### Phase 5: Remove Legacy Code and Add Migration Notes

- **Objective**: Clean up old booking flow code and document changes
- **Files/Functions to Modify/Create**:
  - `src/app/(marketplace)/book/confirm/page.tsx` - Add comments
  - `src/components/booking/BookingProgressTimeline.tsx` - Document legacy path
  - `src/lib/services/booking-display-service.ts` - Add field documentation
- **Tests to Write**:
  - Legacy PENDING bookings still display correctly
  - New PAYMENT_PENDING bookings show enhanced features
  - Backward compatibility maintained
- **Steps**:
  1. Add comments explaining PENDING (legacy) vs PAYMENT_PENDING (new)
  2. Document timeSlots JSON structure in code
  3. Document guests JSON structure (adults, children, participants, emergencyContact)
  4. Add migration guide comment at top of confirmation page
  5. Update error messages to be flow-aware
  6. Test with both legacy and new booking data

**Requirements Confirmed:**

1. ✅ Display payment authorization expiry date for TOKENIZED flow (7 days token expiry)
2. ✅ Auto-refresh status every 30 seconds for PAYMENT_PENDING bookings
3. ✅ Make emergency contact and participants editable after booking
4. ✅ Show estimated refund amount before cancellation confirmation
5. ✅ Use existing chat button (enable when conversation unlocked)
