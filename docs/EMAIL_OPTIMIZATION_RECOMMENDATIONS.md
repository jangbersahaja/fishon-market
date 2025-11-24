# Email Verification Code Optimization

## Current Issues Identified

### 1. **Synchronous Email Sending (BLOCKING)**

The current implementation uses a "fire-and-forget" pattern but still has some synchronous operations:

- Template rendering with `await renderVerificationCodeEmail()`
- SMTP connection establishment
- Even with `.catch()`, the email service setup happens before returning response

### 2. **SMTP Connection Pooling**

Current config:

```typescript
pool: true,
maxConnections: 5,
maxMessages: 100,
connectionTimeout: 10000, // 10s
greetingTimeout: 5000, // 5s
```

**Issue**: First connection can take 3-10 seconds to establish with Zoho SMTP.

### 3. **No Background Job Queue**

Emails are sent directly in the API route handler, which can:

- Block response if SMTP server is slow
- Fail silently if server crashes before email is sent
- No retry mechanism for transient failures

### 4. **No Monitoring/Alerts**

- No tracking of email delivery success/failure rates
- No alerts when emails fail to send
- Logs exist but no aggregation or monitoring

## Recommended Solutions (Priority Order)

### ✅ IMMEDIATE FIX (5 minutes)

**Move email rendering to async context**

Update `verify-guest/route.ts`:

```typescript
// Current (BLOCKING)
sendVerificationCode({
  to: email,
  userName: firstName || "there",
  code,
  purpose: "guest_booking",
  expiryMinutes: 10,
}).catch((emailError) => { ... });

// IMPROVED (NON-BLOCKING)
// Don't await - send in background
setImmediate(() => {
  sendVerificationCode({
    to: email,
    userName: firstName || "there",
    code,
    purpose: "guest_booking",
    expiryMinutes: 10,
  }).catch((emailError) => {
    console.error("Email sending failed:", {
      error: emailError,
      email: email,
      timestamp: new Date().toISOString(),
    });
  });
});

// Return IMMEDIATELY
return NextResponse.json({
  success: true,
  sentAt: Date.now(),
  expiresAt: expiresAt.getTime(),
  message: "Verification code will be sent to your email shortly",
}, { status: 200 });
```

**Expected Improvement**: API response time drops from 1-3s to <100ms

---

### 🚀 SHORT-TERM (1-2 hours)

**Implement Edge Runtime Email Queue with Upstash**

#### Option A: Upstash QStash (Recommended)

```typescript
// lib/queue/email-queue.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function queueEmail(params: {
  type: "verification_code";
  to: string;
  data: any;
}) {
  // Queue to background worker
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/email-sender`,
    body: params,
    retries: 3,
    delay: 0, // send immediately
  });
}

// api/workers/email-sender/route.ts
export async function POST(request: Request) {
  const { type, to, data } = await request.json();

  switch (type) {
    case "verification_code":
      await sendVerificationCode({
        to,
        userName: data.userName,
        code: data.code,
        purpose: data.purpose,
        expiryMinutes: data.expiryMinutes,
      });
      break;
  }

  return NextResponse.json({ success: true });
}
```

**Benefits**:

- ✅ Automatic retries (up to 3 attempts)
- ✅ Dead letter queue for failed emails
- ✅ Webhook verification
- ✅ Free tier: 500 messages/day
- ✅ Works with Vercel Edge Runtime

**Cost**: Free tier sufficient for development, $0.50/1000 messages after

#### Option B: Vercel Cron + Database Queue

```typescript
// lib/queue/email-queue.ts
export async function queueEmail(params: EmailQueueItem) {
  await prisma.emailQueue.create({
    data: {
      type: params.type,
      to: params.to,
      data: params.data,
      status: "PENDING",
      retries: 0,
      maxRetries: 3,
    },
  });
}

// api/cron/process-email-queue/route.ts (runs every 1 minute)
export async function GET(request: Request) {
  const pending = await prisma.emailQueue.findMany({
    where: {
      status: "PENDING",
      retries: { lt: 3 },
    },
    take: 10,
  });

  for (const item of pending) {
    try {
      await sendEmailByType(item.type, item.to, item.data);
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: "SENT" },
      });
    } catch (error) {
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          retries: { increment: 1 },
          lastError: String(error),
        },
      });
    }
  }
}
```

**Benefits**:

- ✅ No external dependencies
- ✅ Full control over retry logic
- ✅ Free (uses existing Vercel + Neon)

**Drawbacks**:

- ❌ 1-minute delay (Vercel cron minimum interval)
- ❌ Requires database migration
- ❌ More code to maintain

---

### 🎯 MEDIUM-TERM (1 day)

**Implement Resend.com API (Replace SMTP)**

```typescript
// lib/helpers/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html }: MailInput) {
  const { data, error } = await resend.emails.send({
    from: "Fishon <no-reply@fishon.my>",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Email failed: ${error.message}`);
  }

  return data;
}
```

**Benefits**:

- ✅ 10x faster than SMTP (100-300ms vs 1-3s)
- ✅ Built-in retry mechanism
- ✅ Delivery tracking & analytics
- ✅ React Email native support
- ✅ Free tier: 3,000 emails/month
- ✅ Better deliverability than Zoho

**Migration Steps**:

1. Sign up at resend.com (5 min)
2. Verify domain (10 min - DNS)
3. Replace `sendMail()` implementation (5 min)
4. Update env vars (1 min)
5. Test (5 min)

**Cost**:

- Free: 0-3,000 emails/month
- Paid: $20/month for 50,000 emails

---

### 📊 LONG-TERM (Ongoing)

**Monitoring & Analytics**

#### 1. Add Email Delivery Tracking

```typescript
// Schema addition
model EmailLog {
  id          String   @id @default(cuid())
  to          String
  type        String   // "verification_code", "booking_created", etc.
  status      String   // "sent", "failed", "bounced"
  provider    String   // "zoho", "resend"
  latency     Int      // milliseconds
  error       String?
  sentAt      DateTime @default(now())
  deliveredAt DateTime?
}
```

#### 2. Setup Alerts

- Slack webhook when email failure rate > 5%
- Datadog/Sentry integration for email errors
- Daily email report of delivery stats

#### 3. User Feedback Loop

Add to UI:

```typescript
// After 30 seconds, show option to resend
{showResendOption && (
  <div>
    <p>Still haven't received the code?</p>
    <button onClick={handleResend}>Resend Code</button>
    <button onClick={handleContactSupport}>Contact Support</button>
  </div>
)}
```

---

## Implementation Priority

### Phase 1: IMMEDIATE (Today)

1. ✅ Update `verify-guest/route.ts` with `setImmediate()` - **5 min**
2. ✅ Add better error logging with timestamps - **5 min**
3. ✅ Test with real email address - **10 min**

**Expected Result**: Response time < 100ms, emails arrive within 1-5 seconds

### Phase 2: THIS WEEK

Choose ONE:

- **Option A**: Implement Upstash QStash queue (1-2 hours) - **Recommended**
- **Option B**: Switch to Resend.com (30 min) - **Fastest improvement**

### Phase 3: NEXT SPRINT

- Add email delivery tracking table
- Setup monitoring dashboard
- Implement user feedback UI

---

## Quick Wins Summary

| Solution       | Time   | Cost      | Speed Improvement | Reliability |
| -------------- | ------ | --------- | ----------------- | ----------- |
| setImmediate() | 5 min  | Free      | 5-10x             | Same        |
| Resend.com     | 30 min | Free/20   | 10x               | ⭐⭐⭐⭐⭐  |
| QStash Queue   | 2 hrs  | Free/Paid | 20x               | ⭐⭐⭐⭐⭐  |
| DB Queue       | 4 hrs  | Free      | 10x               | ⭐⭐⭐⭐    |

---

## Testing Checklist

After implementing improvements:

- [ ] Send test verification code
- [ ] Measure API response time (<200ms)
- [ ] Check email arrives within 5 seconds
- [ ] Test with Gmail, Outlook, Yahoo
- [ ] Verify spam folder handling
- [ ] Test rate limiting (3 requests/15min)
- [ ] Test retry on transient failures
- [ ] Monitor logs for errors

---

## Additional Considerations

### Zoho SMTP Limitations

- Rate limit: ~100 emails/hour on free tier
- Slow initial connection (3-10s)
- Deliverability issues with Gmail
- No webhook callbacks
- Limited analytics

### Why Resend is Better

- Built for transactional emails
- React Email native (you're already using this format)
- Instant sending (<300ms)
- Webhook support
- Better deliverability
- Free tier is generous

### Production Recommendations

1. **Use Resend for all transactional emails**
2. **Use QStash for async email queue**
3. **Monitor via Datadog/Sentry**
4. **Setup dead letter queue alerts**

---

## Code Changes Required

See implementation files:

- `/api/bookings/verify-guest/route.ts` - Immediate fix
- `/lib/queue/email-queue.ts` - QStash implementation (new)
- `/api/workers/email-sender/route.ts` - Email worker (new)
- `/lib/helpers/email.ts` - Resend integration (modify)
- `prisma/schema.prisma` - Email tracking (add)

**Need help implementing?** Let me know which solution you want to start with!
