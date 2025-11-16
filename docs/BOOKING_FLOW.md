````markdown
# Booking Flow (Dual Flow + Guest Support)

> 📦 **Current state (Nov 2025):** Dual booking flows are live (MANUAL + AUTO), SenangPay powers real payments, and guest checkout is supported for both flows. Legacy single-flow docs now live in `docs/archive/BOOKING_FLOW_LEGACY.md`.

---

## 1. Flow Types at a Glance

| Flow       | Trigger                           | Captain Action                                                    | Payment Moment                                            | Guest Eligibility                 |
| ---------- | --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| **MANUAL** | Angler (or guest) submits request | Captain approves/rejects within `approvalTimeHours` (default 24h) | After approval (CARD capture or FPX/E-Wallet redirect)    | ✅ Yes, handled by `create-guest` |
| **AUTO**   | Angler/guest confirms booking     | Captain receives notification + conversation unlocked immediately | Immediately (CARD tokenized + held, FPX/E-Wallet charged) | ✅ Yes, same guest checkout       |

- Flow configuration lives on the captain side (Prisma `Charter.bookingFlowType`).
- Market reads the flow via `getCharterFlowType(charterId)`, which prioritizes the public DB view (`v_public_charters`) and falls back to the public v1 API.
- If both data sources are missing, we log a guest-safe warning and default to MANUAL to prevent instant payments without explicit consent.

### Helper functions

- `getCharterFlowType(charterId)` — decides MANUAL vs AUTO with DB→API fallback and emits guest fallback warning when data is missing.
- `getCharterApprovalTimeHours(charterId)` — fetches charter-specific approval SLA (defaults to 24h). Used for countdowns + expiry job messaging.

---

## 2. Guest Checkout Lifecycle

1. **Email verification** — `POST /api/bookings/verify-guest` stores a TAC (`type: "TAC"`) and emails the guest via `sendVerificationCode()`.
2. **Code confirmation** — `POST /api/bookings/verify-code` validates the TAC, creates/fetches a `User` with role `GUEST`, and returns `verifiedUserId` + `verifiedEmail`.
3. **Booking submission** — `POST /api/bookings/create-guest` mirrors the signed-in flow:
   - Reads `bookingFlowType` via `getCharterFlowType`.
   - Manual flow ⇒ booking status `PENDING`, no payment required up front.
   - Auto flow ⇒ payment intent is created immediately (CARD tokenization or FPX/E-Wallet redirect) and booking enters the paid path.
4. **Notifications** — guests receive Zoho SMTP emails, captains receive webhooks + emails (same payloads as signed-in bookings).

Guest users can later upgrade to ANGLER via `/api/auth/register`; OAuth login also auto-upgrades via `upgradeGuestToAngler()`.

---

## 3. Payment Options

| Method    | Flow                              | Notes                                                                                                                   | Required env vars                                                 |
| --------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `CARD`    | Tokenized (charge after approval) | Stores SenangPay token; charged only if captain approves (manual) or immediately recorded (auto).                       | `SENANGPAY_MERCHANT_ID`, `SENANGPAY_SECRET_KEY`, `SENANGPAY_MODE` |
| `FPX`     | Direct                            | Bank redirect, funds captured instantly. AUTO flow is the default entry point; manual flow charges only after approval. | Same as above + `NEXT_PUBLIC_BASE_URL` for return URLs            |
| `EWALLET` | Direct                            | Same handling as FPX; determined by `paymentMethod` payload.                                                            | Same as above                                                     |
| `MOCK`    | Direct (dev only)                 | Development fallback; blocked in production and can be forced via `SENANGPAY_FORCE_MOCK="true"`.                        | `SENANGPAY_FORCE_MOCK`                                            |

Supporting modules:

- `src/lib/payment/payment-gateway.ts` — intent creation, capture, release, refund helpers.
- `src/lib/payment/payment-side-effects.ts` — ensures guest bookings skip duplicate notifications.
- `src/app/api/payment/senangpay-callback/route.ts` — handles FPX/E-Wallet callbacks and transitions bookings to `PAID`.

---

## 4. Data Sources & Logging

1. **Captain DB view** — requires `CAPTAIN_DATABASE_URL` + `USE_CAPTAIN_DB=1`.
   - `prismaCaptain.$queryRaw` reads `public.v_public_charters` (or `mv_public_charters_*`).
   - Includes `bookingFlowType`, `approvalTimeHours`, `instantBookingEnabled` (legacy flag for AUTO fallback).
2. **Fishon Captain API** — fallback when DB is unavailable or missing fields.
   - Configure `FISHON_CAPTAIN_API_URL` (+ optional `FISHON_CAPTAIN_API_KEY`).
3. **Fallback logging** — when both sources lack flow data, we emit:
   ```
   [CharterService] Could not determine flow type for charter <id>; guest checkout fallback to MANUAL is active...
   ```
   Tests in `src/lib/services/__tests__/charter-service-flow-type.test.ts` enforce this behavior.

---

## 5. Key Endpoints & Workers

- `POST /api/bookings/create` — Authenticated anglers; enforces guest redirect if no session.
- `POST /api/bookings/create-guest` — Guest bookings (requires verified TAC). Handles both flows, payment intents, and webhooks.
- `POST /api/bookings/verify-guest` — Issues TAC codes via Zoho SMTP (purpose `guest_booking`).
- `POST /api/bookings/verify-code` — Validates TAC + upserts GUEST user.
- `POST /api/payment/senangpay-callback` — Finalizes direct payments (FPX/E-Wallet) and reconciles booking state.
- `POST /api/bookings/status-webhook` — Captain app sends approvals/rejections; manual flow relies on this.
- `POST /api/bookings/expire` — Cron-driven endpoint guarded by `BOOKINGS_EXPIRE_SECRET` to auto-expire pending/manual bookings.

Client components:

- `src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx` — surfaces both flows, toggles payment UI, and shows guest verification modal.
- `src/components/booking/GuestBookingVerificationModal.tsx` — email verification UX.

---

## 6. Environment Checklist

```dotenv
# Captain data sources
CAPTAIN_DATABASE_URL="postgresql://.../fishon_captain"
USE_CAPTAIN_DB="1"          # Prefer DB view when true
FISHON_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
FISHON_CAPTAIN_API_KEY="<optional>"

# Booking + guest security
BOOKINGS_EXPIRE_SECRET="expire-cron-secret"
CRON_SECRET="queue-cron-secret"
CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"
CAPTAIN_API_SECRET="shared-service-secret"
TAC_SECRET="guest-verification-secret"  # fallback to NEXTAUTH_SECRET if omitted

# Payments
SENANGPAY_MERCHANT_ID="merchant"
SENANGPAY_SECRET_KEY="secret"
SENANGPAY_MODE="sandbox"   # or production
SENANGPAY_FORCE_MOCK="false" # set true for local-only mock
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # used for SenangPay return/callback URLs

# Optional guest UX helpers
NEXT_PUBLIC_CAPTAIN_URL="https://fishon-captain.vercel.app"
EMAIL_TEST_SECRET="local-email-check"
```

Use `npm run check:env` to validate required values and ensure secrets are not accidentally exposed as `NEXT_PUBLIC_*`.

---

## 7. Testing & Monitoring

- **Unit**: `npm run test -- charter-service-flow-type` covers DB-first, API fallback, and MANUAL default logging.
- **API suites** (Vitest + Prisma mocks) remain under `src/app/api/bookings/__tests__/` for create/expire/webhook flows.
- **Manual verification**:
  1. Configure one MANUAL and one AUTO charter in fishon-captain.
  2. Run guest checkout for both flows (verify TAC email + SenangPay redirect/tokenization).
  3. Approve/reject via captain portal and confirm booking + payment transitions.
- **Logging**: Search for `[CharterService]` + `[Payment Gateway]` in logs to confirm fallback paths; guest-specific warnings should be rare in production.

---

## 8. Reference Material

- Legacy single-flow write-up → `docs/archive/BOOKING_FLOW_LEGACY.md`
- Dual flow migration notes → `docs/DUAL_BOOKING_FLOW_PHASE1_COMPLETE.md`
- Payment deep dives → `docs/HYBRID_PAYMENT_SYSTEM_SUMMARY.md`, `docs/SENANGPAY_TESTING_QUICKSTART.md`

Need more details? Ping #booking-flow or see `plans/booking-flow-verification-plan.md` for future work tracking.
````
