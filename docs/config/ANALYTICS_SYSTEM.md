# Analytics System Configuration

**Last Updated**: 25 November 2025  
**Status**: Production Ready ✅  
**Applies To**: fishon-market (tracking), fishon-captain (display)

---

## System Overview

The analytics system tracks user interactions on fishon-market and provides performance insights to captains via the fishon-captain dashboard.

### Architecture

```
User → fishon-market → Analytics Events → Database
                                            ↓
Captain Dashboard ← fishon-captain ← Analytics API
```

### Key Features

- ✅ Event tracking at source (fishon-market)
- ✅ Data stored close to source
- ✅ API endpoints for fishon-captain
- ✅ Privacy-first (IP hashing, no PII)
- ✅ Rate limiting protection

---

## Event Types

```typescript
enum AnalyticsEventType {
  PROFILE_VIEW       // Captain profile viewed
  CHARTER_VIEW       // Charter detail page viewed
  CHARTER_SEARCH     // Charter appeared in search
  PHOTO_VIEW         // Charter photo viewed
  VIDEO_VIEW         // Charter video played
  CONTACT_CLICK      // Contact button clicked
  BOOKING_STARTED    // Booking form opened
  BOOKING_SUBMITTED  // Booking form submitted
  REVIEW_VIEW        // Reviews section viewed
  SHARE_CLICKED      // Share button clicked
}
```

---

## Database Schema

```prisma
model AnalyticsEvent {
  id            String              @id @default(cuid())
  eventType     AnalyticsEventType
  charterId     String?
  captainId     String?
  userId        String?             // If logged in
  sessionId     String?             // Anonymous tracking
  metadata      Json?
  referrer      String?
  source        String?             // Traffic category
  userAgent     String?
  ipAddress     String?             // SHA-256 hashed
  createdAt     DateTime            @default(now())

  @@index([charterId, createdAt])
  @@index([captainId, createdAt])
  @@index([eventType, createdAt])
  @@map("analytics_events")
}
```

---

## API Endpoints

### Track Event (Public)

**POST** `/api/analytics/track`

```typescript
// Request
{
  eventType: AnalyticsEventType,
  charterId?: string,
  captainId?: string,
  userId?: string,
  sessionId?: string,
  metadata?: Record<string, any>
}

// Response
{ success: true }
```

**Rate Limit**: 100 requests/min per IP

### Get Captain Analytics (Protected)

**GET** `/api/captain/analytics?captainId={id}&period={period}`

**Auth**: `x-api-key` header

**Periods**: `7d`, `30d`, `90d`, `1y`

```typescript
// Response
{
  summary: {
    totalViews: number,
    uniqueVisitors: number,
    bookingConversion: number,
    bookingStarts: number,
    bookingSubmits: number
  },
  timeSeries: [{
    date: string,
    views: number,
    bookings: number,
    uniqueVisitors: number
  }],
  referralSources: [{
    source: string,
    count: number,
    percentage: number
  }],
  topCharters: [{
    charterId: string,
    name: string,
    views: number,
    bookings: number,
    conversionRate: number
  }]
}
```

### Get Charter Analytics (Protected)

**GET** `/api/captain/analytics/charter/{charterId}?period={period}`

```typescript
// Response
{
  views: {
    total: number,
    last30Days: number,
    uniqueVisitors: number
  },
  engagement: {
    photoViews: number,
    videoViews: number,
    contactClicks: number,
    shareClicks: number,
    bookingStarts: number
  },
  bookings: {
    total: number,
    conversionRate: number
  },
  timeSeries: [...],
  sources: [...]
}
```

---

## Client-Side Usage

### Basic Tracking

```typescript
import { trackEvent } from "@/lib/analytics-tracking";

trackEvent({
  eventType: "CHARTER_VIEW",
  charterId: charter.id,
  captainId: charter.captainId,
});
```

### Page View Hook

```typescript
"use client";

import { useTrackPageView } from "@/lib/analytics-tracking";

export default function CharterPage({ charter }) {
  useTrackPageView({
    eventType: "CHARTER_VIEW",
    charterId: charter.id,
    captainId: charter.captainId,
  });

  return <div>...</div>;
}
```

### Track Component

```typescript
import { TrackEvent } from "@/lib/analytics-tracking";

<button onClick={handleContact}>
  <TrackEvent
    eventType="CONTACT_CLICK"
    charterId={charter.id}
    metadata={{ contactMethod: "whatsapp" }}
  />
  Contact Captain
</button>
```

---

## Environment Configuration

### fishon-market

```bash
# API key for fishon-captain
CAPTAIN_API_KEY="your-api-key"

# CORS (optional)
FISHON_CAPTAIN_URL="https://captain.fishon.my"
```

### fishon-captain

```bash
# Market API URL
FISHON_MARKET_API_URL="https://fishon.my"
NEXT_PUBLIC_FISHON_MARKET_URL="https://fishon.my"

# API key (must match CAPTAIN_API_KEY)
FISHON_MARKET_API_KEY="your-api-key"
```

---

## Privacy & Security

### Data Protection

- ✅ IP addresses SHA-256 hashed
- ✅ No PII stored in events
- ✅ Session IDs are browser-based
- ✅ Rate limiting prevents abuse

### Authentication

- **Public Tracking**: No auth (rate limited)
- **Analytics Retrieval**: API key required
- **CORS**: Restricted to fishon-captain

### Data Retention

```sql
-- Recommended: Delete events older than 2 years
DELETE FROM analytics_events
WHERE "createdAt" < NOW() - INTERVAL '2 years';
```

---

## Key Files

| File                                     | Purpose              |
| ---------------------------------------- | -------------------- |
| `src/lib/analytics-tracking.ts`          | Client-side tracking |
| `src/lib/services/analytics-service.ts`  | Server-side service  |
| `src/app/api/analytics/track/route.ts`   | Track endpoint       |
| `src/app/api/captain/analytics/route.ts` | Captain analytics    |

---

## Testing

### Development

```bash
# Test tracking
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"CHARTER_VIEW","charterId":"test123"}'

# Test retrieval
curl http://localhost:3001/api/captain/analytics?captainId=test123 \
  -H "x-api-key: your-dev-key"
```

### Production

```bash
# Check tracking works
curl -X POST https://fishon.my/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"CHARTER_VIEW","charterId":"clx123"}'

# Check analytics (from fishon-captain)
curl https://fishon.my/api/captain/analytics?captainId=cly456 \
  -H "x-api-key: ${FISHON_MARKET_API_KEY}"
```

---

## Troubleshooting

### Rate Limit Exceeded (429)

Implement client-side debouncing or increase limit.

### Unauthorized (401)

Check `FISHON_MARKET_API_KEY` matches in both apps.

### Invalid Event Type (400)

Use valid `AnalyticsEventType` enum values.

---

## Future Enhancements

- Real-time analytics (WebSocket)
- Batch event tracking
- Funnel analysis
- A/B testing framework
- Export reports (CSV/PDF)
- Email alerts for milestones
- Cohort analysis

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Owner**: Engineering Team
