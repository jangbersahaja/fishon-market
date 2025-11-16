# Fishon.my Booking Flow (Market)

This document describes the booking flow implemented in Fishon.my (marketplace), including endpoints, availability logic, status lifecycle, email notifications, environment variables, and testing.

Last updated: 2025-10-20

---

## Overview

- Anglers create bookings from charter pages via the Checkout flow
- A 12-hour hold is placed (status PENDING) while the captain decides
- Captains approve/reject via a webhook (from the Captain app)
- If approved, the angler completes payment (mock flow for now) → status PAID
- Holds can expire → status EXPIRED

Data model: Prisma `Booking` (see `prisma/schema.prisma`) with fields like `userId`, `captainCharterId`, `tripName`, `startTime`, `date`, `days`, `status`, `expiresAt`.

---

## Endpoints and Pages

All endpoints are App Router handlers under `src/app/api/bookings/*`.

- POST `/api/bookings/create`

  - Auth required
  - Body: `{ charterId: string, tripIndex: number, date: 'YYYY-MM-DD', days: number, adults: number, children: number, startTime?: string }`
  - Validations:
    - Requires `startTime` if the selected trip defines start times
    - Availability guard (multi-day + start-time aware; see Availability)
  - Side effects:
    - Creates Booking with 12-hour hold (`expiresAt = now + 12h`)
    - Sends outbound webhook to Captain app (`CAPTAIN_WEBHOOK_URL`) with retry
    - Sends confirmation email to angler
  - Response: `{ booking }` (201) or 409 on conflict

- POST `/api/bookings/status-webhook`

  - Security: header `x-captain-secret = CAPTAIN_WEBHOOK_SECRET`
  - Body: `{ id: string, status: 'APPROVED' | 'REJECTED' }`
  - Transitions booking from PENDING → APPROVED/REJECTED and sets `captainDecisionAt`
  - Sends angler email (if APPROVED, includes payment link)

- POST `/api/bookings/expire`

  - Security: header `x-expire-secret = BOOKINGS_EXPIRE_SECRET`
  - Marks all `PENDING` bookings with `expiresAt < now` as `EXPIRED`
  - Response: `{ expired: number }`

- POST `/api/bookings/pay`

  - Auth required; only the booking owner can pay
  - Transition: `APPROVED` → `PAID`
  - Mock payment logic (no real PSP integration yet)

- Page `/checkout/confirmation?id=...`

  - Displays booking summary and next steps
  - If `APPROVED`, shows a link to the mock payment UI

- Page `/pay/[id]`
  - Mock payment UI (server component)
  - Calls `/api/bookings/pay` and redirects back to confirmation

---

## Availability and Overlap Logic

Implemented in `src/lib/booking/overlap.ts` and used by the create endpoint.

- New bookings are ranges `[date .. date + (days-1)]` (UTC midnight semantics)
- Existing candidate bookings are fetched for the same `captainCharterId` with statuses blocking the calendar (`PENDING`, `APPROVED`, `PAID`)
- Overlap predicate:
  - If trips do NOT define start times: any range overlap blocks
  - If trips DO define start times: only overlapping ranges with the SAME `startTime` block

Helpers:

- `addDaysUTC(date, n)` — date math pinned to UTC midnight
- `rangesOverlap(aStart, aDays, bStart, bDays)`
- `hasConflicts(candidates, newStart, newDays, { usesStartTimes, selectedStartTime })`

Edge cases:

- Multi-day trips (e.g., existing 3-day trip covering 20–22 conflicts with a 2-day trip starting on 22)
- Start-time-aware conflicts allow two trips on the same day at different times when supported by the charter

---

## Status Lifecycle

`PENDING` → `APPROVED` or `REJECTED` (via captain webhook)

`APPROVED` → `PAID` (via angler payment)

`PENDING` → `EXPIRED` (via expiry job)

Possible future: `CANCELLED` (by angler) path.

---

## Webhooks and Reliability

Outbound `booking.created` is sent to the Captain app from the create endpoint.

Implementation:

- `src/lib/webhook.ts` → `sendWithRetry(url, body, { headers, attempts, baseDelayMs })`
- Default: 3 attempts, exponential backoff (300ms, 600ms, 1200ms)
- Best effort (non-blocking) with console warning in non-production on repeated failure

Payload example:

```json
{
  "type": "booking.created",
  "booking": {
    "id": "...",
    "captainCharterId": "...",
    "charterName": "...",
    "tripName": "...",
    "startTime": "07:00",
    "date": "2025-10-20T00:00:00.000Z",
    "days": 2,
    "adults": 2,
    "children": 0,
    "totalPrice": 1200,
    "expiresAt": "2025-10-20T12:00:00.000Z",
    "status": "PENDING"
  }
}
```

---

## Email Notifications (Zoho SMTP)

Implemented in `src/lib/email.ts` using Nodemailer. Best-effort (non-blocking) sends.

Events:

- On booking created (to angler): summary, total, and confirmation link
- On status update (APPROVED/REJECTED): result; if APPROVED, includes payment link

Templates:

- `renderBookingCreatedEmail({...})`
- `renderStatusEmail({...})`

Environment (see below) must be configured for SMTP.

---

## Environment Variables

Add to `.env.local`:

```bash
# Database
DATABASE_URL=

# Public base URL (for links in emails)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Captain webhook (outbound and inbound security)
CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"
CAPTAIN_WEBHOOK_SECRET="change-me-captain"

# Expiry job security
BOOKINGS_EXPIRE_SECRET="change-me-expire"

# Zoho SMTP (Nodemailer)
SMTP_HOST="smtp.zoho.com"
SMTP_PORT="465" # or 587 for STARTTLS
SMTP_SECURE="true" # true for 465, false for 587
SMTP_USER="no-reply@fishon.my"
SMTP_PASS="your-zoho-app-password"
```

Notes:

- For paid Zoho org accounts with a custom domain, use `smtppro.zoho.com`. For personal/free, use `smtp.zoho.com`.
- We support both `SMTP_PASS` and `SMTP_PASSWORD` environment names.
- In dev, absolute links in emails will fall back to `NEXTAUTH_URL` when `NEXT_PUBLIC_BASE_URL` is not set.
- Optional: set `EMAIL_TEST_SECRET` and use POST `/api/dev/email-test` with header `x-email-test-secret` to validate SMTP quickly.

---

## Testing

We use Vitest. Relevant tests live under `src/app/api/bookings/__tests__/`.

Unit tests:

- Overlap logic — `create-route.test.ts` (now delegates to `hasConflicts`)

API tests:

- Create route — `create-api.test.ts`
- Expire route — `expire-api.test.ts`
- Webhook & pay — `webhook-and-pay.test.ts`

Run tests:

```bash
npm test
```

---

## Implementation Pointers

- Server files:

  - `src/app/api/bookings/create/route.ts`
  - `src/app/api/bookings/status-webhook/route.ts`
  - `src/app/api/bookings/expire/route.ts`
  - `src/app/api/bookings/pay/route.ts`
  - `src/lib/booking/overlap.ts`
  - `src/lib/webhook.ts`
  - `src/lib/email.ts`

- UI files:
  - `src/app/checkout/confirmation/page.tsx`
  - `src/app/pay/[id]/page.tsx`

---

## Future Work

- Replace mock payment with real PSP integration (e.g., SenangPay)
- Add cancellation flows and policies
- Improve email templating and add localization
- Add retry/backoff and dead-letter handling for emails (currently best-effort)
