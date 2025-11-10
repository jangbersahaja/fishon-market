## Phase 6 Complete: Callback Webhook

Successfully implemented server-to-server payment callback webhook to receive authoritative payment confirmations from Senang Pay.

**Files created/changed:**

- src/app/api/payment/senangpay-callback/route.ts (new - 268 lines)

**Implementation Details:**

### Callback Webhook Handler (`/api/payment/senangpay-callback`)

**POST endpoint** that receives payment confirmations from Senang Pay's servers.

**Key Features:**

1. **Hash Verification**: Validates payment authenticity using `verifyReturnHash()`
2. **Idempotency**: Checks if payment already processed to prevent duplicates
3. **Status Updates**: Updates booking to PAID with transaction details
4. **Side Effects**: Triggers webhook to captain and notification to angler
5. **Audit Logging**: Comprehensive logs for debugging and audit trail
6. **Error Handling**: Graceful error handling with proper HTTP status codes

**Security Implementation:**

- ✅ Hash verification prevents fake payment notifications
- ✅ Required fields validation before processing
- ✅ Gateway configuration check
- ✅ Idempotency prevents duplicate processing
- ✅ All attempts logged with timestamps

**Payment Success Flow:**

1. Receive POST with form data (status_id, order_id, transaction_id, msg, hash)
2. Validate required fields
3. Verify hash to prevent tampering
4. Check booking exists
5. Check idempotency (already processed?)
6. Update booking: status=PAID, paidAt=now, paymentTransactionId, paymentMethod=SENANGPAY, paymentNote
7. Trigger side effects (async, non-blocking):
   - Send webhook to captain app (booking.paid event)
   - Create notification for angler (Payment Confirmed!)
8. Revalidate pages
9. Return "OK" to Senang Pay

**Payment Failure Flow:**

1. Validate and verify hash
2. Record failure note in paymentNote field
3. Log failure for investigation
4. Return "OK" to Senang Pay

**Idempotency Strategy:**

- Callback is authoritative (more reliable than return URL)
- Checks if booking already PAID before processing
- Returns "OK" for already-processed payments
- Prevents duplicate webhooks and notifications

**Side Effects (Non-Blocking):**

- **Captain Webhook**: Sends booking.paid event to `CAPTAIN_WEBHOOK_URL`
- **Angler Notification**: Creates in-app notification with booking details
- **Page Revalidation**: Ensures fresh data on confirmation and dashboard pages

**Error Handling:**

- Missing fields → 400 Bad Request
- Invalid hash → 400 Bad Request (logs tampering attempt)
- Booking not found → 404 Not Found
- Gateway not configured → 500 Internal Server Error
- Processing errors → 200 OK (prevents retry, logs for investigation)

**HTTP Status Codes:**

- `200 OK`: Payment processed successfully or already processed (idempotent)
- `400 Bad Request`: Missing fields or invalid hash
- `404 Not Found`: Booking doesn't exist
- `500 Internal Server Error`: Gateway misconfigured

**Logging:**

- All callbacks logged with timestamp
- Hash verification results logged
- Payment processing steps logged
- Side effect results logged (webhook, notification)
- Errors logged for investigation

**Critical Notes:**

1. **Authoritative Source**: This callback is more reliable than return URL (user may close browser)
2. **Must Return OK**: Senang Pay expects "OK" response to stop retrying
3. **Idempotent**: Can receive same callback multiple times, must handle gracefully
4. **Async Side Effects**: Webhook and notification run asynchronously to not delay response

**Review Status:** APPROVED - TypeScript compilation successful, proper idempotency, comprehensive logging

**Git Commit Message:**
feat: add Senang Pay callback webhook with idempotency

- Create POST endpoint for server-to-server payment confirmation
- Verify hash to prevent tampering and fake notifications
- Implement idempotency check (prevents duplicate processing)
- Update booking status to PAID with transaction details
- Trigger async side effects: captain webhook, angler notification
- Comprehensive logging for audit trail and debugging
- Proper HTTP status codes (200/400/404/500)
- Return "OK" to acknowledge receipt to Senang Pay
- TypeScript compilation successful
