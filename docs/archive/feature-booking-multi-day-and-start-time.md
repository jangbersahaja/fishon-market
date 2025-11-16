---
type: feature
status: draft
updated: 2025-10-20
feature: booking
author: system
labels:
  - marketplace
  - prisma
  - nextjs
  - api
impact: medium
version-introduced: 0.2.0
---

# Booking System: Multi-day Trips and Start Time Selection

## Summary

Introduce an end-to-end booking flow on Fishon.my that supports:

- Creating bookings with a 12-hour hold (expiresAt)
- Multi-day trips (days > 1) with server-calculated totals
- Optional per-trip multiple start times; anglers must choose one when provided
- Basic availability guard to prevent overlapping bookings (same charter/date/start time) while status is active (PENDING/APPROVED/PAID)
- Confirmation page showing the booking snapshot including start time

## What's in this plan

- [x] Prisma schema: Booking model with startTime, expiresAt, enriched status enum
- [x] Migration applied and Prisma Client regenerated
- [x] API route POST /api/bookings/create with validation and conflict check
- [x] Checkout page wiring startTimes to client form
- [x] Client CheckoutForm requiring start time when applicable
- [x] Confirmation page shows start time
- [x] Advanced overlap: multi-day span conflicts (implemented in API create route)
- [x] Expiry job route: POST /api/bookings/expire (secured with x-expire-secret)
- [x] Captain approval webhook: POST /api/bookings/status-webhook (secured with x-captain-secret)
- [x] Outbound create webhook to captain app (non-blocking)
- [x] Minimal pay endpoint: POST /api/bookings/pay (owner-only; APPROVED → PAID)
- [ ] Full payment integration (WIP)

## Implementation Details

### 1) Data Model (Prisma)

- File: `prisma/schema.prisma`
- Added `Booking` model with fields:
  - `captainCharterId` (string id of the charter from captain backend), `charterName`, `location`
  - `tripName`, `unitPrice`, `totalPrice`
  - `date` (DateTime for start date), `days`, `adults`, `children`
  - `startTime?: string` for per-trip time selection
  - `status: BookingStatus` enum: PENDING | APPROVED | REJECTED | EXPIRED | PAID | CANCELLED
  - `expiresAt` 12-hour hold, `captainDecisionAt?`
- Added relation: `User.bookings`.
- Migration: `20251019180100_booking_and_start_time` created and applied.

### 2) API Route: Create Booking

- File: `src/app/api/bookings/create/route.ts`
- Input payload:
  - `charterId: string`, `tripIndex: number`, `date: YYYY-MM-DD`, `days: number`, `adults: number`, `children: number`, `startTime?: string`
- Behavior:

  - Auth required; fetch charter snapshot (`getCharterById`)
  - Select trip by index; if trip has `startTimes`, require valid `startTime`
  - Compute `totalPrice = unitPrice * days`
  - Set `expiresAt = now + 12h`
  - Conflict guard: Multi-day aware. Fetches candidate bookings for the same charter, then blocks if the date ranges overlap. If the trip uses startTimes, conflicts are per `startTime`; otherwise any overlap blocks. Active statuses: PENDING/APPROVED/PAID. Returns 409 on conflict.

  ### 3) API Route: Expire Bookings

  - File: `src/app/api/bookings/expire/route.ts`
  - Input: `POST` with header `x-expire-secret` matching `BOOKINGS_EXPIRE_SECRET` env.
  - Behavior: Sets `status = EXPIRED` for PENDING bookings with `expiresAt < now`. Returns `{ expired: count }`.
  - Persist booking and return `{ booking }`.

  ### 4) API Route: Captain Approval Webhook

  - File: `src/app/api/bookings/status-webhook/route.ts`
  - Input: `POST` with header `x-captain-secret` matching `CAPTAIN_WEBHOOK_SECRET`.
  - Behavior: Transitions `status: PENDING → APPROVED|REJECTED`, sets `captainDecisionAt`.

  ### 5) API Route: Pay

  - File: `src/app/api/bookings/pay/route.ts`
  - Input: `POST` with JSON `{ id }` by the authenticated booking owner.
  - Behavior: Transitions `status: APPROVED → PAID`.

### 6) Checkout Page

- File: `src/app/checkout/page.tsx`
- Server component fetches charter and selected trip, passes `startTimes` and `defaultStartTime` to client `CheckoutForm`.

### 7) Client Form

- File: `src/app/checkout/ui/CheckoutForm.tsx`
- Renders traveler inputs and a start time `<select>` when `startTimes` exist. The selection is required.
- Posts `startTime` with other booking info to the API.

### 8) Confirmation Page

- File: `src/app/checkout/confirmation/page.tsx`
- Retrieves booking by id and renders a summary including `startTime` when present.

## Completed Job Summary

- Implemented booking MVP with multi-day support and optional per-trip start times.
- Schema and migrations applied; API validation and conflict guard in place; UI wired end-to-end.
- Typecheck and production build pass.

## Future Plan

- Overlap across multi-day spans: extend conflict detection to check date ranges (`date`..`date + days - 1`) and time collisions.
- Hold expiry: scheduled job (cron/edge) to mark stale PENDING bookings EXPIRED, and to release slots.
- Captain approval: complete captain-side workflow and notifications.
- Payments: integrate payment intent/checkout, transition to PAID on success.
- Notifications: email confirmations/updates to anglers and captains; optional chat thread.
- Webhook integration: mirror reservation into captain app, signed payload with idempotency.

## Review Notes

- Ensure `.env` contains `DATABASE_URL`; verify migrations run in CI/CD.
- Add these envs: `BOOKINGS_EXPIRE_SECRET`, `CAPTAIN_WEBHOOK_SECRET`, `CAPTAIN_WEBHOOK_URL`.
- Verify `getCharterById` continues to set/forward `backendId` for `captainCharterId` stability.
- Security: API requires auth, consider rate limiting and audit logging in a later iteration.

## Archive / Legacy Notes

- Replaced previous UI-only booking CTA with real checkout + create booking flow.
- No legacy Booking model existed prior to this change in the marketplace app.
