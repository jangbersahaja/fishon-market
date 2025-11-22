---
type: documentation
status: active
updated: 2025-01-06
feature: analytics
author: AI Assistant
---

# Analytics API Documentation

## Overview

The analytics system tracks user interactions on fishon-market (customer-facing app) and provides performance insights to captains via the fishon-captain dashboard. Analytics data is stored in fishon-market's database and exposed through API endpoints.

## Architecture

```
User → fishon-market → Analytics Events → Database
                                            ↓
Captain Dashboard ← fishon-captain ← Analytics API
```

**Key Design Decisions:**

- Events tracked at source (fishon-market) for accuracy
- Data stored in fishon-market database (close to source)
- API endpoints expose aggregated data to fishon-captain
- No PII stored - IPs are hashed for privacy

## Database Schema

### AnalyticsEvent Model

```prisma
model AnalyticsEvent {
  id            String              @id @default(cuid())
  eventType     AnalyticsEventType
  charterId     String?             // Reference to fishon-captain Charter
  captainId     String?             // Reference to fishon-captain CaptainProfile
  userId        String?             // fishon-market User (if logged in)
  sessionId     String?             // Anonymous session tracking
  metadata      Json?               // Additional event data
  referrer      String?             // HTTP referrer
  source        String?             // Traffic source category
  userAgent     String?             // Browser user agent
  ipAddress     String?             // Hashed IP (SHA-256)
  createdAt     DateTime            @default(now())

  @@index([charterId, createdAt])
  @@index([captainId, createdAt])
  @@index([eventType, createdAt])
  @@index([sessionId, createdAt])
  @@index([userId, createdAt])
  @@map("analytics_events")
}
```

### Event Types

```typescript
enum AnalyticsEventType {
  PROFILE_VIEW       // Captain profile viewed
  CHARTER_VIEW       // Charter detail page viewed
  CHARTER_SEARCH     // Charter appeared in search results
  PHOTO_VIEW         // Charter photo viewed in gallery
  VIDEO_VIEW         // Charter video played
  CONTACT_CLICK      // Contact button clicked (WhatsApp, phone, email)
  BOOKING_STARTED    // Booking form opened
  BOOKING_SUBMITTED  // Booking form submitted
  REVIEW_VIEW        // Charter reviews section viewed
  SHARE_CLICKED      // Charter share button clicked
}
```

## API Endpoints

### 1. Track Event (Public)

**POST** `/api/analytics/track`

Records an analytics event from the client-side.

**Authentication:** None (public endpoint)  
**Rate Limit:** 100 requests per minute per IP

**Request Body:**

```typescript
{
  eventType: AnalyticsEventType;     // Required
  charterId?: string;                 // Optional
  captainId?: string;                 // Optional
  userId?: string;                    // Optional (if user logged in)
  sessionId?: string;                 // Auto-generated if not provided
  metadata?: Record<string, any>;     // Optional event-specific data
}
```

**Example Request:**

```typescript
fetch("/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventType: "CHARTER_VIEW",
    charterId: "clx123abc",
    captainId: "cly456def",
    metadata: {
      scrollDepth: 75,
      timeOnPage: 30000,
    },
  }),
});
```

**Response:**

```json
{ "success": true }
```

**Error Responses:**

- `400` - Invalid event type
- `429` - Rate limit exceeded
- `500` - Server error

### 2. Get Captain Analytics (Protected)

**GET** `/api/captain/analytics?captainId={id}&period={period}`

Returns aggregated analytics for a captain across all their charters.

**Authentication:** API key via `x-api-key` header  
**Required Env:** `CAPTAIN_API_KEY` (fishon-market)

**Query Parameters:**

- `captainId` (required) - Captain's ID from CaptainProfile
- `period` (optional) - Time period: `7d`, `30d`, `90d`, `1y` (default: `30d`)

**Example Request:**

```bash
curl -H "x-api-key: your-api-key" \
  "https://fishon.my/api/captain/analytics?captainId=cly456def&period=30d"
```

**Response:**

```typescript
{
  summary: {
    totalViews: 1234,
    uniqueVisitors: 567,
    bookingConversion: 0.045,  // 4.5%
    bookingStarts: 89,
    bookingSubmits: 56
  },
  timeSeries: [
    {
      date: "2025-01-01",
      views: 45,
      bookings: 2,
      uniqueVisitors: 23
    },
    // ... more days
  ],
  referralSources: [
    { source: "search", count: 500, percentage: 40.5 },
    { source: "social", count: 300, percentage: 24.3 },
    { source: "direct", count: 250, percentage: 20.2 },
    { source: "referral", count: 150, percentage: 12.1 },
    { source: "internal", count: 34, percentage: 2.9 }
  ],
  topCharters: [
    {
      charterId: "clx123abc",
      name: "Deep Sea Fishing Adventure",
      views: 456,
      bookings: 12,
      conversionRate: 0.026
    },
    // ... up to 10 charters
  ]
}
```

### 3. Get Charter Analytics (Protected)

**GET** `/api/captain/analytics/charter/{charterId}?period={period}`

Returns detailed analytics for a specific charter.

**Authentication:** API key via `x-api-key` header  
**Required Env:** `CAPTAIN_API_KEY` (fishon-market)

**Path Parameters:**

- `charterId` (required) - Charter's ID

**Query Parameters:**

- `period` (optional) - Time period: `7d`, `30d`, `90d`, `1y` (default: `30d`)

**Example Request:**

```bash
curl -H "x-api-key: your-api-key" \
  "https://fishon.my/api/captain/analytics/charter/clx123abc?period=30d"
```

**Response:**

```typescript
{
  views: {
    total: 456,
    last30Days: 234,
    uniqueVisitors: 189
  },
  engagement: {
    photoViews: 123,
    videoViews: 45,
    contactClicks: 23,
    shareClicks: 12,
    bookingStarts: 34
  },
  bookings: {
    total: 12,
    conversionRate: 0.026  // 2.6%
  },
  timeSeries: [
    {
      date: "2025-01-01",
      views: 15,
      bookings: 1,
      uniqueVisitors: 12
    },
    // ... more days
  ],
  sources: [
    { source: "search", count: 200, percentage: 43.9 },
    { source: "social", count: 100, percentage: 21.9 },
    // ... more sources
  ]
}
```

## Client-Side Usage (fishon-market)

### Basic Tracking

```typescript
import { trackEvent } from "@/lib/analytics-tracking";

// Track a charter view
trackEvent({
  eventType: "CHARTER_VIEW",
  charterId: charter.id,
  captainId: charter.captainId,
});

// Track a booking start with metadata
trackEvent({
  eventType: "BOOKING_STARTED",
  charterId: charter.id,
  metadata: {
    tripId: trip.id,
    tripDate: trip.date,
  },
});
```

### Page View Hook

```typescript
'use client';

import { useTrackPageView } from '@/lib/analytics-tracking';

export default function CharterPage({ charter }) {
  // Automatically tracks view on mount
  useTrackPageView({
    eventType: 'CHARTER_VIEW',
    charterId: charter.id,
    captainId: charter.captainId,
  });

  return <div>...</div>;
}
```

### Track Component

```typescript
import { TrackEvent } from '@/lib/analytics-tracking';

<button onClick={handleContact}>
  <TrackEvent
    eventType="CONTACT_CLICK"
    charterId={charter.id}
    metadata={{ contactMethod: 'whatsapp' }}
  />
  Contact Captain
</button>
```

## Server-Side Usage (fishon-captain)

### Fetching Captain Analytics

```typescript
import { analyticsApi } from '@/lib/analytics-api';

// In a server component or API route
async function CaptainAnalyticsPage({ captainId }) {
  const analytics = await analyticsApi.getCaptainAnalytics(
    captainId,
    '30d'
  );

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <StatsCards summary={analytics.summary} />
      <ViewsChart timeSeries={analytics.timeSeries} />
      <ReferralSourcesChart sources={analytics.referralSources} />
      <TopChartersTable charters={analytics.topCharters} />
    </div>
  );
}
```

### Fetching Charter Analytics

```typescript
import { analyticsApi } from '@/lib/analytics-api';

async function CharterAnalyticsWidget({ charterId }) {
  const analytics = await analyticsApi.getCharterAnalytics(
    charterId,
    '7d'
  );

  return (
    <div>
      <h2>Last 7 Days</h2>
      <p>Views: {analytics.views.last30Days}</p>
      <p>Bookings: {analytics.bookings.total}</p>
      <p>Conversion: {(analytics.bookings.conversionRate * 100).toFixed(1)}%</p>
    </div>
  );
}
```

## Environment Configuration

### fishon-market (Tracking App)

```bash
# API key for fishon-captain to fetch analytics
# MUST match FISHON_MARKET_API_KEY in fishon-captain .env
CAPTAIN_API_KEY="your-captain-api-key-here"

# Optional: Captain app URL for CORS
FISHON_CAPTAIN_URL="https://fishon-captain.vercel.app"
```

### fishon-captain (Display App)

```bash
# Market API URL for fetching analytics
FISHON_MARKET_API_URL="https://fishon.my"

# Public market URL for client-side requests
NEXT_PUBLIC_FISHON_MARKET_URL="https://fishon.my"

# API key to authenticate with fishon-market
# MUST match CAPTAIN_API_KEY in fishon-market .env
FISHON_MARKET_API_KEY="your-captain-api-key-here"
```

## Privacy & Security

### Data Protection

- **IP Hashing**: All IPs are SHA-256 hashed before storage
- **No PII**: Personal identifying information is not stored in events
- **Session IDs**: Browser-based, don't contain user data
- **Rate Limiting**: 100 requests/min per IP prevents abuse

### Authentication

- **Public Tracking**: No auth required for event tracking
- **Protected Analytics**: API key required for data retrieval
- **CORS**: Restricted to fishon-captain domain in production

### Data Retention

```sql
-- Recommended: Delete events older than 2 years
DELETE FROM analytics_events
WHERE "createdAt" < NOW() - INTERVAL '2 years';
```

## Performance Considerations

### Tracking Performance

- **Fire and Forget**: Client tracking uses `keepalive: true`
- **Non-Blocking**: Tracking errors don't break the app
- **Batch Inserts**: Future optimization for high-volume events

### Query Performance

- **Indexed Queries**: All time-range queries use indexed columns
- **Aggregation**: Pre-computed in service layer
- **Caching**: Consider Redis cache for captain analytics (future)

### Recommended Indexes

```prisma
// Already implemented in schema
@@index([charterId, createdAt])
@@index([captainId, createdAt])
@@index([eventType, createdAt])
@@index([sessionId, createdAt])
@@index([userId, createdAt])
```

## Testing

### Development Testing

```bash
# fishon-market (tracking app)
cd fishon-market
npm run dev

# Test tracking endpoint
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"CHARTER_VIEW","charterId":"test123"}'

# Test analytics retrieval (requires CAPTAIN_API_KEY)
curl http://localhost:3001/api/captain/analytics?captainId=test123 \
  -H "x-api-key: your-dev-api-key"
```

### Production Verification

```bash
# Check if tracking works
curl -X POST https://fishon.my/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"CHARTER_VIEW","charterId":"clx123abc"}'

# Check analytics (from fishon-captain)
curl https://fishon.my/api/captain/analytics?captainId=cly456def \
  -H "x-api-key: ${FISHON_MARKET_API_KEY}"
```

## Troubleshooting

### Common Issues

**Issue:** Rate limit exceeded

```
Response: { "error": "Rate limit exceeded" }
Status: 429
```

**Solution:** Implement client-side debouncing or increase rate limit

**Issue:** Unauthorized analytics access

```
Response: { "error": "Unauthorized" }
Status: 401
```

**Solution:** Check `FISHON_MARKET_API_KEY` matches in both apps

**Issue:** Invalid event type

```
Response: { "error": "Invalid event type" }
Status: 400
```

**Solution:** Use valid `AnalyticsEventType` enum values

### Debugging

```typescript
// Enable tracking logs in development
// In analytics-tracking.ts, uncomment:
if (process.env.NODE_ENV === 'development') {
  console.log('[Analytics] Would track:', para(my));
  return;
}

// Check database for recorded events
// In fishon-market database:
SELECT * FROM analytics_events
WHERE "charterId" = 'clx123abc'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Future Enhancements

### Planned Features

1. **Real-time Analytics**: WebSocket/SSE for live updates
2. **Batch Tracking**: POST multiple events in one request
3. **Funnel Analysis**: Multi-step conversion tracking
4. **A/B Testing**: Experiment tracking and comparison
5. **Export Reports**: CSV/PDF download for captains
6. **Alerts**: Email notifications for milestone achievements
7. **Heatmaps**: Click tracking and visualization
8. **Cohort Analysis**: User retention and engagement trends

### Performance Optimizations

1. **Redis Cache**: Cache aggregated analytics (5-15 min TTL)
2. **Materialized Views**: Pre-computed daily/weekly aggregates
3. **Database Partitioning**: Partition by month for faster queries
4. **CDN Caching**: Cache static analytics responses

## Related Documentation

- [Feature Implementation Plan](./feature-analytics-implementation.md)
- [Dashboard Redesign](./feature-dashboard-overview-redesign.md)
- [Booking Flow](./BOOKING_FLOW.md)
- [Backend Integration](./BACKEND_INTEGRATION.md)
