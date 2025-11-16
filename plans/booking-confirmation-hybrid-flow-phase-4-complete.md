## Phase 4 Complete: Enhance BookingActions for PAYMENT_PENDING

Added captain contact functionality and refund preview for PAYMENT_PENDING bookings, enabling anglers to communicate with captains and see refund estimates before cancellation.

**Files created/changed:**

- src/components/booking/BookingActions.tsx
- src/app/(marketplace)/book/confirm/BookingConfirmActions.tsx
- src/app/(marketplace)/book/confirm/page.tsx

**Functions created/changed:**

- BookingActions component:
  - Added captain contact props (name, phone, email)
  - Added conversation props (id, status)
  - Added trip date and final price for refund calculation
  - Added `calculateRefund()` function with cancellation policy logic
  - Added `isChatAvailable` check based on conversation status
  - Added `handleRefundPreviewContinue()` for refund preview flow
  - Updated `handleCancelClick()` to show refund preview first
  - Updated `handleEmailVerify()` to integrate refund preview
  - Added PAYMENT_PENDING contact section with call, email, chat buttons
  - Added refund preview modal with policy explanation

- BookingConfirmActions wrapper:
  - Extended props to accept captain contact info
  - Extended props to accept conversation data
  - Extended props to accept trip date and final price
  - Pass all data to BookingActions

- Confirmation page:
  - Added conversation query to fetch chat availability
  - Pass captain contact data from enriched booking
  - Pass conversation data to actions component
  - Pass trip date and final price for refund calculation

**UI Components Added:**

1. **Contact Captain Section** (PAYMENT_PENDING status):
   - Grid layout with three action buttons
   - Call button: Opens phone dialer with captain's phone
   - Email button: Opens mail client with captain's email
   - Chat button: Navigates to conversation (disabled with 🔒 icon until unlocked)
   - Chat availability check: `conversation.status === "ACTIVE"`

2. **Refund Preview Modal**:
   - Shows estimated refund amount in green highlight
   - Displays cancellation policy rules:
     - More than 30 days: 80% refund
     - 15-30 days: 50% refund
     - Less than 15 days: No refund
   - Amber warning for no-refund cases
   - "Continue to Cancel" and "Nevermind" buttons
   - Integrated into cancellation flow before reason dialog

**Business Logic:**

- Refund Calculation:

  ```typescript
  const calculateRefund = () => {
    if (!tripDate || !finalPrice) return 0;
    const daysUntilTrip = Math.ceil(
      (trip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilTrip > 30) return finalPrice * 0.8;
    else if (daysUntilTrip >= 15) return finalPrice * 0.5;
    else return 0;
  };
  ```

- Chat Availability:

  ```typescript
  const isChatAvailable = conversationStatus === "ACTIVE";
  ```

**Data Flow:**

1. Confirmation page queries conversation from database
2. Page passes captain data from `enrichedBooking.charter.captain`
3. Page passes conversation data and booking details to wrapper
4. Wrapper forwards all props to BookingActions
5. BookingActions uses data for contact buttons and refund calculation

**Review Status:** APPROVED

**Git Commit Message:**
feat: add captain contact and refund preview for PAYMENT_PENDING bookings

- Add contact captain section with call, email, and chat buttons
- Implement refund calculation based on cancellation policy (>30d: 80%, 15-30d: 50%, <15d: 0%)
- Add refund preview modal showing estimated refund before cancellation
- Check conversation status for chat availability (disabled until unlocked)
- Fetch conversation data in confirmation page
- Pass captain contact info and trip details to actions component
- Integrate refund preview into cancellation flow
