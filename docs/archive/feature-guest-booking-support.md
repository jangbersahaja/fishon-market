---
type: feature
status: in-progress
updated: 2025-01-24
feature: Guest Booking Support (Phase 2B)
author: GitHub Copilot
tags:
  - booking
  - authentication
  - email-verification
  - schema-migration
impact: high
---

# Guest Booking Support - Phase 2B

## Summary

Critical architectural fix to enable guest bookings with email verification. Currently, the booking creation flow requires authentication, preventing guests from making bookings. This phase adds support for guest bookings with email verification using the existing OTP/TAC system.

**Key Achievement**: Enable non-authenticated users to create bookings by verifying their email address, while maintaining data integrity and security.

## Problem Statement

### Current Issues

1. **Booking Schema Constraint**: `userId` is required (NOT NULL), preventing guest bookings
2. **API Authentication Gate**: `/api/bookings/create` returns 401 for non-authenticated users
3. **Frontend Disabled State**: Checkout form disables all fields when user not logged in
4. **Missing Guest Data Flow**: Guest fields (firstName, lastName, email, phone) exist in UI but not sent to API
5. **No Email Verification**: No mechanism to verify guest email addresses before booking creation
6. **Weak Sign-In Messaging**: Current encouragement doesn't explain benefits of creating an account

### User Story

```
As a guest angler,
I want to book a fishing charter without creating an account first,
So that I can complete my booking quickly and receive confirmation.

Acceptance Criteria:
- I can fill out booking form without logging in
- I must verify my email before booking is created
- I receive booking confirmation email
- I can access my booking later via email link
- I'm encouraged to create account with clear benefits explained
```

## Architecture Overview

### Current Flow (Broken)

```
User visits /book/[charterId]
  ↓
Not logged in? → Form disabled with "Please sign in" message
  ↓
User forced to sign in/register
  ↓
Form enabled
  ↓
Submit → /api/bookings/create (requires auth)
  ↓
Booking created with userId
```

### Target Flow (Phase 2B)

```
User visits /book/[charterId]
  ↓
Fills form (firstName, lastName, email, phone, booking details)
  ↓
Clicks "Request to Book"
  ↓
╔═══════════════════════════════════════╗
║ Is User Authenticated?                ║
╠═══════════════════════════════════════╣
║                                       ║
║  YES (Logged In)                      ║  NO (Guest)
║    ↓                                  ║    ↓
║    Submit directly                    ║    Show email verification modal
║    to /api/bookings/create            ║    ↓
║    ↓                                  ║    Send verification code
║    Booking created with userId        ║    POST /api/bookings/verify-guest
║    ↓                                  ║    ↓
║    Redirect to /book/confirm          ║    User enters 6-digit code
║                                       ║    ↓
║                                       ║    Verify code
║                                       ║    POST /api/bookings/create-guest
║                                       ║    ↓
║                                       ║    Booking created without userId
║                                       ║    (guestEmail, guestFirstName, etc.)
║                                       ║    ↓
║                                       ║    Redirect to /book/confirm
║                                       ║
╚═══════════════════════════════════════╝
```

## Database Schema Changes

### Current Booking Model

```prisma
model Booking {
  id     String @id @default(cuid())
  userId String  // ❌ REQUIRED - blocks guest bookings
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // ... rest of fields
}
```

### Target Booking Model

```prisma
model Booking {
  id     String  @id @default(cuid())
  userId String? // ✅ OPTIONAL - allows guest bookings
  user   User?   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Guest booking fields (mutually exclusive with userId)
  guestFirstName String? // Guest's first name
  guestLastName  String? // Guest's last name
  guestEmail     String? // Guest's email (verified)
  guestPhone     String? // Guest's phone number
  emailVerified  Boolean @default(false) // Email verification status

  // ... rest of existing fields

  @@index([guestEmail]) // Index for guest booking lookups
}
```

### Migration Strategy

**Migration Name**: `add-booking-note-rejection-reason` (existing task)

We'll piggyback on the existing migration task to add:

1. Make `userId` nullable
2. Add guest fields (guestFirstName, guestLastName, guestEmail, guestPhone)
3. Add `emailVerified` field
4. Add index on `guestEmail`
5. Add constraint: `userId` OR `guestEmail` must be present

### Validation Rules

```typescript
// At least one identity must be present
const hasUserIdentity = !!booking.userId;
const hasGuestIdentity = !!booking.guestEmail;

if (!hasUserIdentity && !hasGuestIdentity) {
  throw new Error("Booking must have either userId or guestEmail");
}

// Guest bookings require all guest fields
if (hasGuestIdentity && !hasUserIdentity) {
  if (
    !booking.guestFirstName ||
    !booking.guestLastName ||
    !booking.guestPhone
  ) {
    throw new Error("Guest bookings require all guest contact fields");
  }
  if (!booking.emailVerified) {
    throw new Error("Guest email must be verified before booking");
  }
}

// User bookings should not have guest fields
if (hasUserIdentity && hasGuestIdentity) {
  throw new Error("Booking cannot have both userId and guest fields");
}
```

## API Changes

### New Endpoints

#### 1. `POST /api/bookings/verify-guest`

**Purpose**: Send verification code to guest email

**Request**:

```typescript
{
  email: string; // Guest email to verify
  firstName: string; // For personalized email
}
```

**Response**:

```typescript
{
  success: true;
  sentAt: number; // Timestamp
  expiresAt: number; // Code expiry timestamp
}
```

**Logic**:

1. Validate email format
2. Generate 6-digit code (existing TAC system)
3. Store in `VerificationCode` table (type: "GUEST_BOOKING")
4. Send email with code
5. Return success with expiry info

#### 2. `POST /api/bookings/verify-code`

**Purpose**: Verify guest email code and return temporary token

**Request**:

```typescript
{
  email: string;
  code: string; // 6-digit code
}
```

**Response**:

```typescript
{
  valid: true;
  token: string; // Temporary JWT token (15 min expiry)
  email: string;
}
```

**Logic**:

1. Validate code against `VerificationCode` table
2. Mark code as used
3. Generate temporary JWT token with email
4. Return token for guest booking creation

#### 3. `POST /api/bookings/create-guest`

**Purpose**: Create booking for verified guest

**Request**:

```typescript
{
  // Verification
  verificationToken: string;  // From verify-code response

  // Guest details
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;

  // Booking details (same as existing)
  charterId: string;
  tripIndex: number;
  date: string;
  days: number;
  adults: number;
  children: number;
  startTime?: string;
  note?: string;
}
```

**Response**:

```typescript
{
  booking: {
    id: string;
    // ... booking details
  }
}
```

**Logic**:

1. Validate verification token
2. Extract email from token
3. Verify email matches guestEmail
4. Create booking with guest fields
5. Set `emailVerified: true`
6. Send confirmation email
7. Return booking details

### Modified Endpoints

#### `POST /api/bookings/create` (Existing)

**Changes**:

- Remove authentication requirement (keep optional)
- Add logic to handle both authenticated and guest flows
- If authenticated: use existing userId flow
- If not authenticated: redirect to guest verification flow

**Updated Logic**:

```typescript
export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();

  // Authenticated user flow (existing)
  if (session?.user?.id) {
    // ... existing logic
    return NextResponse.json({ booking }, { status: 201 });
  }

  // Guest flow - require verification first
  if (!body.verificationToken) {
    return NextResponse.json(
      {
        error: "Guest bookings require email verification",
        requireVerification: true,
      },
      { status: 400 }
    );
  }

  // Verify token and create guest booking
  // ... guest booking logic
}
```

## Frontend Changes

### 1. CheckoutForm Component

**File**: `src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`

**Changes**:

1. **Remove Authentication Gate**:

```typescript
// ❌ REMOVE
if (!isLoggedIn) {
  openModal("signin", undefined, { showHomeButton: true });
  return;
}

// ✅ ADD
// Allow both logged-in and guest flows
```

2. **Add Guest Verification Flow**:

```typescript
const [showVerification, setShowVerification] = useState(false);
const [verificationToken, setVerificationToken] = useState<string | null>(null);

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!canSubmit) return;

  // Authenticated user - direct booking
  if (isLoggedIn) {
    await createAuthenticatedBooking();
    return;
  }

  // Guest - show verification modal
  setShowVerification(true);
}

async function handleGuestVerificationComplete(token: string) {
  setVerificationToken(token);
  setShowVerification(false);
  await createGuestBooking(token);
}
```

3. **Update Form Field States**:

```typescript
// ❌ REMOVE
<YourDetailsCard
  disabled={!isLoggedIn}
  // ...
/>

// ✅ UPDATE
<YourDetailsCard
  disabled={false}  // Always enabled
  prefilled={isLoggedIn}  // Show prefill indicator
  // ...
/>
```

4. **Improve Sign-In Messaging**:

```typescript
// ❌ CURRENT
{
  !isLoggedIn && (
    <p className="text-sm text-gray-700">
      Please sign in or create an account to continue.
    </p>
  );
}

// ✅ NEW
{
  !isLoggedIn && (
    <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
      <p className="mb-2 text-sm font-semibold text-blue-900">
        💡 Booking as a guest?
      </p>
      <p className="mb-3 text-sm text-blue-800">
        You can complete this booking without an account. We'll verify your
        email to send you confirmation details.
      </p>
      <p className="mb-2 text-sm font-semibold text-blue-900">
        Why create an account?
      </p>
      <ul className="mb-3 space-y-1 text-sm text-blue-800">
        <li>✓ View all your bookings in one place</li>
        <li>✓ Save favorite charters for later</li>
        <li>✓ Faster checkout on future bookings</li>
        <li>✓ Leave reviews and earn badges</li>
        <li>✓ Get personalized charter recommendations</li>
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 underline"
          onClick={() => openModal("signin")}
        >
          Sign In
        </button>
        <span className="text-sm text-blue-600">or</span>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 underline"
          onClick={() => openModal("register")}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
```

### 2. GuestBookingVerificationModal Component

**New File**: `src/components/booking/GuestBookingVerificationModal.tsx`

**Purpose**: Handle email verification for guest bookings

**Features**:

- Two-step flow: Send code → Verify code
- 6-digit code input with auto-format
- Resend code functionality (60s cooldown)
- Error handling with retry
- Loading states
- Accessibility (keyboard navigation, ARIA labels)

**Similar to**: Existing `EmailVerificationModal.tsx` (reuse pattern)

### 3. YourDetailsCard Component

**File**: `src/app/(marketplace)/book/[charterId]/ui/YourDetailsCard.tsx`

**Changes**:

1. **Update Disabled Logic**:

```typescript
// ❌ REMOVE
disabled={!isLoggedIn}

// ✅ UPDATE
disabled={false}
prefilled={isLoggedIn}  // Visual indicator only
```

2. **Add Prefill Indicator**:

```typescript
{
  prefilled && (
    <div className="flex items-center gap-2 p-2 text-sm border rounded bg-green-50 border-green-200 text-green-800">
      <CheckCircle className="w-4 h-4" />
      <span>Your account details have been filled in</span>
    </div>
  );
}
```

## Email Templates

### 1. Guest Verification Email

**Subject**: "Verify your email - Fishon Booking"

**Template**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #ec2227;">Complete Your Booking</h2>
  <p>Hi {{firstName}},</p>
  <p>
    You're almost done booking your fishing charter! Use this code to verify
    your email:
  </p>
  <div
    style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;"
  >
    {{code}}
  </div>
  <p style="color: #666; font-size: 14px;">
    This code will expire in 10 minutes.
  </p>
  <p style="color: #666; font-size: 14px;">
    If you didn't request this code, please ignore this email.
  </p>

  <div
    style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #ec2227;"
  >
    <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">
      💡 Pro Tip
    </p>
    <p style="margin: 0; color: #666; font-size: 14px;">
      Create a Fishon account to track all your bookings, save favorites, and
      leave reviews!
    </p>
  </div>
</div>
```

### 2. Guest Booking Confirmation Email

**Subject**: "Booking Request Received - {{charterName}}"

**Template** (similar to existing, with guest-specific content):

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #ec2227;">Booking Request Received!</h2>
  <p>Hi {{guestFirstName}},</p>
  <p>
    We've received your booking request for <strong>{{charterName}}</strong>.
  </p>

  <!-- Booking Details -->
  <div
    style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px;"
  >
    <h3 style="margin-top: 0;">Trip Details</h3>
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 5px 0; color: #666;">Charter:</td>
        <td style="padding: 5px 0; font-weight: bold;">{{charterName}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #666;">Date:</td>
        <td style="padding: 5px 0; font-weight: bold;">{{date}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #666;">Duration:</td>
        <td style="padding: 5px 0; font-weight: bold;">{{days}} day(s)</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #666;">Total:</td>
        <td style="padding: 5px 0; font-weight: bold; color: #ec2227;">
          RM {{total}}
        </td>
      </tr>
    </table>
  </div>

  <!-- Access Link -->
  <div style="margin: 30px 0; text-align: center;">
    <a
      href="{{confirmationUrl}}"
      style="display: inline-block; background: #ec2227; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;"
    >
      View Booking Details
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    <strong>Important:</strong> Save this email! You'll need the link above to
    access your booking details.
  </p>

  <!-- Account Creation Prompt -->
  <div
    style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-left: 4px solid #0ea5e9;"
  >
    <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">
      Create an Account for Easy Access
    </p>
    <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 14px;">
      Manage your bookings, save favorites, and more by creating a free account.
    </p>
    <a
      href="{{registerUrl}}?email={{guestEmail}}"
      style="display: inline-block; background: #0ea5e9; color: white; padding: 8px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;"
    >
      Create Account
    </a>
  </div>
</div>
```

## Security Considerations

### 1. Email Verification

- Use existing `VerificationCode` model with type `"GUEST_BOOKING"`
- 6-digit codes (100,000 to 999,999 range)
- 10-minute expiration window
- Single-use codes (marked `usedAt` after verification)
- Rate limiting: Max 3 verification attempts per email per 15 minutes

### 2. Temporary Tokens

- JWT tokens for verified guest emails
- 15-minute expiration
- Used only for booking creation
- Contains: email, timestamp, expiry
- Signed with `NEXTAUTH_SECRET`

### 3. Data Validation

```typescript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(guestEmail)) {
  throw new Error("Invalid email format");
}

// Phone validation (Malaysian format preferred)
const phoneRegex = /^(\+?60|0)[1-9][0-9]{7,9}$/;
if (!phoneRegex.test(guestPhone)) {
  // Allow international formats as fallback
}

// Name validation (prevent injection)
const nameRegex = /^[a-zA-Z\s'-]+$/;
if (!nameRegex.test(guestFirstName) || !nameRegex.test(guestLastName)) {
  throw new Error("Invalid name format");
}
```

### 4. Rate Limiting

```typescript
// Per email limits
const limits = {
  verificationRequests: { max: 3, window: 15 * 60 * 1000 }, // 3 per 15 min
  verificationAttempts: { max: 5, window: 15 * 60 * 1000 }, // 5 per 15 min
  bookingCreation: { max: 2, window: 60 * 60 * 1000 }, // 2 per hour
};
```

### 5. Spam Prevention

- Email verification required before booking
- Cooldown between verification code sends (60 seconds)
- Limit guest bookings per email per day (5 max)
- Log all verification attempts for monitoring

## Testing Plan

### Unit Tests

1. **Schema Validation**

   - `userId` is optional
   - Guest fields validation
   - Mutual exclusivity (userId OR guestEmail)
   - Email verified requirement for guests

2. **API Endpoints**

   - `/api/bookings/verify-guest`: Code generation, email sending
   - `/api/bookings/verify-code`: Code validation, token generation
   - `/api/bookings/create-guest`: Guest booking creation
   - `/api/bookings/create`: Dual flow (auth + guest)

3. **Frontend Components**
   - `GuestBookingVerificationModal`: Code input, resend, error handling
   - `CheckoutForm`: Guest flow, auth flow, form validation
   - `YourDetailsCard`: Prefill logic, field states

### Integration Tests

1. **Guest Booking Flow (Happy Path)**

   - Fill booking form as guest
   - Request verification code
   - Receive email with code
   - Enter code and verify
   - Booking created successfully
   - Confirmation email received
   - Access booking via link

2. **Authenticated Booking Flow (Existing)**

   - Sign in
   - Fill booking form (prefilled)
   - Submit directly (no verification)
   - Booking created with userId

3. **Error Scenarios**
   - Invalid email format
   - Expired verification code
   - Used verification code
   - Network errors
   - Rate limiting

### Manual Testing Checklist

- [ ] Guest can book without account
- [ ] Email verification works
- [ ] Code resend works (60s cooldown)
- [ ] Confirmation email received
- [ ] Booking accessible via link
- [ ] Authenticated users skip verification
- [ ] Prefill works for logged-in users
- [ ] Sign-in encouragement displays benefits
- [ ] Mobile responsive
- [ ] Accessibility (keyboard, screen readers)

## Implementation Steps

### Phase 2B.1: Database Migration ✅

**Task**: Update Booking schema

- [x] Make `userId` nullable
- [x] Add `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone` fields
- [x] Add `emailVerified` field
- [x] Add `note` and `rejectionReason` fields (existing task)
- [x] Add index on `guestEmail`
- [x] Run migration: `npx prisma migrate dev --name add-booking-guest-support`

**Files**:

- `prisma/schema.prisma`
- `prisma/migrations/XXX_add_booking_guest_support/migration.sql`

### Phase 2B.2: API Endpoints

**Task**: Create guest verification and booking endpoints

- [ ] Create `/api/bookings/verify-guest/route.ts`

  - Generate verification code
  - Store in VerificationCode table
  - Send email with code
  - Return success response

- [ ] Create `/api/bookings/verify-code/route.ts`

  - Validate code
  - Mark as used
  - Generate temporary JWT token
  - Return token

- [ ] Create `/api/bookings/create-guest/route.ts`

  - Validate verification token
  - Create guest booking
  - Send confirmation email
  - Return booking details

- [ ] Update `/api/bookings/create/route.ts`
  - Remove auth requirement (make optional)
  - Add guest flow detection
  - Keep existing auth flow intact
  - Add proper error responses

**Files**:

- `src/app/api/bookings/verify-guest/route.ts` (NEW)
- `src/app/api/bookings/verify-code/route.ts` (NEW)
- `src/app/api/bookings/create-guest/route.ts` (NEW)
- `src/app/api/bookings/create/route.ts` (UPDATE)

### Phase 2B.3: Email Templates

**Task**: Create guest booking email templates

- [ ] Create `renderGuestVerificationEmail()` helper
- [ ] Create `renderGuestBookingConfirmationEmail()` helper
- [ ] Update email service to handle guest bookings

**Files**:

- `src/lib/helpers/email.ts` (UPDATE)

### Phase 2B.4: Frontend Components

**Task**: Update booking form for guest support

- [ ] Create `GuestBookingVerificationModal.tsx`

  - Two-step flow UI
  - Code input with validation
  - Resend functionality
  - Error handling

- [ ] Update `CheckoutForm.tsx`

  - Remove auth gate
  - Add guest verification flow
  - Integrate verification modal
  - Update submit logic
  - Improve sign-in messaging

- [ ] Update `YourDetailsCard.tsx`
  - Remove disabled state logic
  - Add prefill indicator
  - Keep all fields enabled

**Files**:

- `src/components/booking/GuestBookingVerificationModal.tsx` (NEW)
- `src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx` (UPDATE)
- `src/app/(marketplace)/book/[charterId]/ui/YourDetailsCard.tsx` (UPDATE)

### Phase 2B.5: Testing

**Task**: Comprehensive testing

- [ ] Write unit tests for API endpoints
- [ ] Write component tests
- [ ] Manual testing (guest flow)
- [ ] Manual testing (auth flow)
- [ ] Manual testing (error scenarios)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Accessibility testing

**Files**:

- `src/app/api/bookings/__tests__/verify-guest.test.ts` (NEW)
- `src/app/api/bookings/__tests__/verify-code.test.ts` (NEW)
- `src/app/api/bookings/__tests__/create-guest.test.ts` (NEW)
- `src/components/booking/__tests__/GuestBookingVerificationModal.test.tsx` (NEW)

### Phase 2B.6: Documentation

**Task**: Update documentation

- [ ] Update API documentation
- [ ] Update booking flow documentation
- [ ] Update README with guest booking info
- [ ] Add migration notes

**Files**:

- `docs/BOOKING_FLOW.md` (UPDATE)
- `docs/API_BOOKING_ROUTES.md` (NEW or UPDATE)
- `README.md` (UPDATE)

## Success Metrics

### Technical Metrics

- [ ] Schema migration successful (0 errors)
- [ ] All tests passing (100% coverage for new code)
- [ ] TypeScript compilation successful (0 errors)
- [ ] No runtime errors in dev
- [ ] API response times < 500ms (p95)

### User Experience Metrics

- [ ] Guest booking completion rate > 80%
- [ ] Email verification success rate > 95%
- [ ] Average booking time < 3 minutes
- [ ] Zero booking data loss incidents
- [ ] Support ticket reduction (less confusion about auth)

### Business Metrics

- [ ] Increase in total bookings (auth + guest)
- [ ] Guest-to-account conversion rate tracked
- [ ] Email verification spam rate < 1%
- [ ] Zero security incidents

## Rollout Plan

### Stage 1: Development (Current)

- Implement all Phase 2B changes
- Local testing
- Unit tests passing
- Integration tests passing

### Stage 2: Staging

- Deploy to staging environment
- Full QA testing
- Security review
- Performance testing
- Load testing (simulated guest bookings)

### Stage 3: Production (Soft Launch)

- Deploy to production
- Enable feature flag (if available)
- Monitor error rates
- Monitor conversion rates
- Collect user feedback

### Stage 4: Full Launch

- Remove feature flag
- Update marketing materials
- Announce guest booking feature
- Monitor metrics
- Iterate based on feedback

## Rollback Plan

If critical issues arise:

1. **Database**: Schema changes are backward compatible

   - `userId` nullable allows existing bookings to work
   - New fields are optional

2. **API**: Keep old `/api/bookings/create` logic working

   - Auth flow unchanged
   - Guest flow isolated

3. **Frontend**: Feature flag to disable guest flow
   - Fall back to auth-required mode
   - Show "sign in required" message

## Known Limitations

1. **Guest Booking Management**: Guests can only access bookings via email link
   - Solution: Encourage account creation post-booking
2. **No Guest Dashboard**: Guests can't see all their bookings in one place

   - Solution: Account creation flow in confirmation email

3. **Limited Guest History**: No booking history for unregistered guests

   - Solution: Track guest bookings by email, offer migration on signup

4. **Email Dependency**: Guest bookings rely on email access
   - Mitigation: Clear email verification step, confirmation email with link

## Future Enhancements

### Post-Phase 2B

1. **Guest Account Migration**

   - When guest creates account, migrate their bookings
   - Match by email address
   - Prompt on signup if guest bookings found

2. **SMS Verification Option**

   - Alternative to email verification
   - Better for users with limited email access

3. **Social Sign-In for Guests**

   - "Continue with Google" for quick booking
   - Auto-create account in background

4. **Guest Booking Dashboard**

   - Magic link access to view all bookings by email
   - No password required
   - Time-limited session

5. **Progressive Account Creation**
   - Collect minimal info upfront (email + name)
   - Prompt for password after booking confirmation
   - Frictionless upgrade to full account

## Dependencies

### Internal

- Existing `VerificationCode` model (already in schema)
- Existing TAC generation system (`src/lib/auth/tac.ts`)
- Existing email service (`src/lib/helpers/email.ts`)
- Existing `EmailVerificationModal` pattern (for guest modal)

### External

- Email service (Resend or configured provider)
- Database (PostgreSQL)
- JWT library (jose or jsonwebtoken)

## Risk Assessment

| Risk                             | Impact | Probability | Mitigation                                               |
| -------------------------------- | ------ | ----------- | -------------------------------------------------------- |
| Email delivery failure           | High   | Medium      | Retry logic, fallback email provider, show resend option |
| Spam bookings                    | Medium | Medium      | Rate limiting, email verification, monitoring            |
| Data integrity (userId vs guest) | High   | Low         | Schema constraints, API validation, tests                |
| Security (token leaks)           | High   | Low         | Short expiry, HTTPS only, signed tokens                  |
| User confusion (guest vs auth)   | Medium | Medium      | Clear UI messaging, help text, FAQs                      |

## Acceptance Criteria

### Must Have ✅

- [ ] Guest can complete booking without account
- [ ] Email verification required for guests
- [ ] Booking data saved correctly (guest fields)
- [ ] Confirmation email sent to guest
- [ ] Guest can access booking via email link
- [ ] Authenticated users skip verification (existing flow)
- [ ] Sign-in benefits clearly explained
- [ ] Mobile responsive
- [ ] Accessibility compliant (WCAG 2.1 AA)

### Should Have 🎯

- [ ] Guest-to-account conversion tracking
- [ ] Email verification success rate tracking
- [ ] Booking funnel analytics
- [ ] Error monitoring and alerts
- [ ] Performance metrics (API response times)

### Nice to Have 💡

- [ ] Social sign-in for guests
- [ ] SMS verification option
- [ ] Guest booking migration on signup
- [ ] Progressive account creation

## Related Documentation

- [Booking Route Divergence Analysis](./feature-booking-route-divergence.md)
- [Phase 1: Account Layout Redesign](./feature-booking-route-divergence.md#phase-1)
- [Phase 2: Enhanced /book/confirm](./feature-booking-route-divergence.md#phase-2)
- [Booking Flow Documentation](./BOOKING_FLOW.md)
- [Email Verification Modal](../src/components/booking/EmailVerificationModal.tsx)

---

**Status**: 🚧 In Progress  
**Priority**: 🔴 Critical (Blocking Phase 3)  
**Assigned**: GitHub Copilot  
**Started**: 2025-01-24  
**Target Completion**: TBD
