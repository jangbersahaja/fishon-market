---
type: summary
status: in-progress
updated: 2025-01-06
feature: analytics
phase: backend-complete
author: AI Assistant
---

# Analytics System Implementation - Phase 1 Complete

## Overview

Phase 1 of the analytics system is now complete. We've successfully built the entire backend infrastructure for tracking user interactions in fishon-market and exposing that data to fishon-captain for captain dashboards.

## What Was Built

### 1. Database Schema (fishon-market)

**Location:** `fishon-market/prisma/schema.prisma`

```prisma
enum AnalyticsEventType {
  PROFILE_VIEW, CHARTER_VIEW, CHARTER_SEARCH,
  PHOTO_VIEW, VIDEO_VIEW, CONTACT_CLICK,
  BOOKING_STARTED, BOOKING_SUBMITTED,
  REVIEW_VIEW, SHARE_CLICKED
}

model AnalyticsEvent {
  id String @id @default(cuid())
  eventType AnalyticsEventType
  charterId String?
  captainId String?
  userId String?
  sessionId String?
  metadata Json?
  referrer String?
  source String?
  userAgent String?
  ipAddress String?  // SHA-256 hashed for privacy
  createdAt DateTime @default(now())

  // 5 indexes for performance
  @@index([charterId, createdAt])
  @@index([captainId, createdAt])
  @@index([eventType, createdAt])
  @@index([sessionId, createdAt])
  @@index([userId, createdAt])
  @@map("analytics_events")
}
```

**Migration:** `20251106155922_add_analytics_events/migration.sql` - Applied successfully ✅

### 2. Analytics Service (fishon-market)

**Location:** `fishon-market/src/lib/analytics-service.ts`

**Key Functions:**

```typescript
// Record events (non-blocking, error-handled)
async function trackEvent(params: {
  eventType: AnalyticsEventType;
  charterId?: string;
  captainId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  referrer?: string;
  source?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void>;

// Captain analytics (summary, time series, sources, top charters)
async function getCaptainAnalytics(
  captainId: string,
  period: "7d" | "30d" | "90d" | "1y"
): Promise<CaptainAnalytics>;

// Charter analytics (views, engagement, bookings, time series)
async function getCharterAnalytics(
  charterId: string,
  period: "7d" | "30d" | "90d" | "1y"
): Promise<CharterAnalytics>;

// Privacy utilities
function hashIpAddress(ip: string): string;
function getOrCreateSessionId(): string;
function detectTrafficSource(referrer: string): string;
```

### 3. API Endpoints (fishon-market)

#### Public Tracking Endpoint

**POST** `/api/analytics/track`

- **Purpose:** Record analytics events from client-side
- **Authentication:** None (public)
- **Rate Limit:** 100 requests/min per IP
- **Location:** `fishon-market/src/app/api/analytics/track/route.ts`

**Features:**

- Validates event types
- Auto-detects traffic source
- Hashes IPs for privacy
- Handles CORS for cross-origin requests
- Non-blocking error handling

#### Captain Analytics Endpoint

**GET** `/api/captain/analytics?captainId={id}&period={period}`

- **Purpose:** Aggregated analytics for all captain's charters
- **Authentication:** API key via `x-api-key` header
- **Location:** `fishon-market/src/app/api/captain/analytics/route.ts`

**Returns:**

- Summary (views, visitors, conversion, bookings)
- Time series (daily aggregations)
- Referral sources (search, social, direct, etc.)
- Top charters (top 10 by views)

#### Charter Analytics Endpoint

**GET** `/api/captain/analytics/charter/{charterId}?period={period}`

- **Purpose:** Detailed analytics for specific charter
- **Authentication:** API key via `x-api-key` header
- **Location:** `fishon-market/src/app/api/captain/analytics/charter/[charterId]/route.ts`

**Returns:**

- Views (total, last 30 days, unique visitors)
- Engagement (photos, videos, contacts, shares, bookings)
- Conversion metrics
- Time series (daily views and bookings)
- Traffic sources

### 4. Client-Side Tracking Utility (fishon-market)

**Location:** `fishon-market/src/lib/analytics-tracking.ts`

**Usage Examples:**

```typescript
// Basic tracking
import { trackEvent } from '@/lib/analytics-tracking';

trackEvent({
  eventType: 'CHARTER_VIEW',
  charterId: charter.id,
  captainId: charter.captainId,
});

// Page view hook (automatic tracking on mount)
import { useTrackPageView } from '@/lib/analytics-tracking';

export default function CharterPage({ charter }) {
  useTrackPageView({
    eventType: 'CHARTER_VIEW',
    charterId: charter.id,
  });
  return <div>...</div>;
}

// Track component (declarative tracking)
<TrackEvent
  eventType="CONTACT_CLICK"
  charterId={charter.id}
  metadata={{ contactMethod: 'whatsapp' }}
/>
```

**Features:**

- Automatic session ID management (localStorage)
- Automatic referrer detection
- Fire-and-forget (non-blocking)
- Error handling (silent failures)
- Batch tracking support

### 5. Analytics API Client (fishon-captain)

**Location:** `fishon-captain/src/lib/analytics-api.ts`

**Usage Examples:**

```typescript
import { analyticsApi } from "@/lib/analytics-api";

// Fetch captain analytics
const analytics = await analyticsApi.getCaptainAnalytics(captainId, "30d");

// Fetch charter analytics
const charterStats = await analyticsApi.getCharterAnalytics(charterId, "7d");
```

**Features:**

- Automatic API key injection
- TypeScript types for all responses
- Cache control (always fresh data)
- Error handling with meaningful messages

### 6. Documentation

**Created:**

1. **API_ANALYTICS.md** - Comprehensive API documentation
   - Database schema reference
   - API endpoint specifications
   - Client-side usage examples
   - Server-side usage examples
   - Environment configuration
   - Privacy & security guidelines
   - Performance considerations
   - Testing guide
   - Troubleshooting

2. **feature-analytics-implementation.md** - Implementation plan
   - Metrics to track
   - Database design
   - API specifications
   - UI component layouts
   - Testing strategy
   - Future enhancements

### 7. Environment Configuration

**Updated Files:**

- `fishon-market/.env.example` - Added `CAPTAIN_API_KEY`
- `fishon-captain/.env.example` - Added `FISHON_MARKET_API_KEY`, `NEXT_PUBLIC_FISHON_MARKET_URL`

**Required Environment Variables:**

**fishon-market:**

```bash
# API key for fishon-captain to fetch analytics
CAPTAIN_API_KEY="your-captain-api-key-here"

# Optional: Captain app URL for CORS
FISHON_CAPTAIN_URL="https://fishon-captain.vercel.app"
```

**fishon-captain:**

```bash
# Market API URL (server-side)
FISHON_MARKET_API_URL="https://fishon.my"

# Public market URL (client-side)
NEXT_PUBLIC_FISHON_MARKET_URL="https://fishon.my"

# API key to fetch analytics
FISHON_MARKET_API_KEY="your-captain-api-key-here"
```

## Architecture Decisions

### Why Store Analytics in fishon-market?

1. **Data at Source:** Events occur in fishon-market (customer app), so tracking there is most accurate
2. **Reduced API Calls:** No need to send events to fishon-captain just to store them
3. **Separation of Concerns:** Customer data stays in customer database
4. **Cross-Reference:** Uses string IDs to reference fishon-captain entities (charterId, captainId)

### Privacy-First Design

1. **IP Hashing:** All IPs are SHA-256 hashed before storage
2. **No PII:** Personal identifying information never stored
3. **Anonymous Sessions:** Browser-based session IDs, no user tracking
4. **Optional User ID:** Only stored if user is logged in (for registered anglers)

### Performance Optimizations

1. **Indexed Queries:** All time-range queries use composite indexes
2. **Aggregation Layer:** Pre-compute metrics in service layer
3. **Fire-and-Forget Tracking:** Client doesn't wait for response
4. **Rate Limiting:** Prevents abuse and database overload
5. **Future Ready:** Schema designed for partitioning and materialized views

## Testing Checklist

### Backend (fishon-market)

```bash
# 1. Test tracking endpoint (public)
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CHARTER_VIEW",
    "charterId": "test-charter-123",
    "captainId": "test-captain-456"
  }'

# Expected: {"success":true}

# 2. Check database
# Connect to fishon-market database and run:
SELECT * FROM analytics_events ORDER BY "createdAt" DESC LIMIT 5;

# 3. Test captain analytics (protected)
curl http://localhost:3001/api/captain/analytics?captainId=test-captain-456&period=30d \
  -H "x-api-key: your-dev-api-key"

# Expected: JSON with summary, timeSeries, referralSources, topCharters

# 4. Test charter analytics (protected)
curl http://localhost:3001/api/captain/analytics/charter/test-charter-123?period=7d \
  -H "x-api-key: your-dev-api-key"

# Expected: JSON with views, engagement, bookings, timeSeries, sources
```

### Client-Side (fishon-market)

```typescript
// In any charter page component
import { trackEvent } from "@/lib/analytics-tracking";

// Test tracking
trackEvent({
  eventType: "CHARTER_VIEW",
  charterId: charter.id,
  captainId: charter.captainId,
});

// Check browser console for any errors
// Check Network tab for POST to /api/analytics/track
```

### API Client (fishon-captain)

```typescript
// In any server component or API route
import { analyticsApi } from "@/lib/analytics-api";

async function testAnalytics() {
  try {
    const analytics = await analyticsApi.getCaptainAnalytics(
      "test-captain-456",
      "30d"
    );
    console.log("Analytics:", analytics);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
  }
}
```

## What's Next (Phase 2: Integration & UI)

### 1. Add Tracking to fishon-market Pages

**Files to Update:**

```typescript
// src/app/(marketplace)/charters/[id]/page.tsx
// Add charter view tracking on page load

// src/app/(marketplace)/search/page.tsx
// Track charter appearances in search results

// src/components/charter/CharterGallery.tsx
// Track photo/video views in gallery

// src/components/charter/BookingWidget.tsx
// Track booking starts/submits

// src/components/charter/CaptainCard.tsx
// Track contact clicks
```

**Implementation:**

- Use `useTrackPageView()` for page views
- Use `trackEvent()` for user interactions
- Add metadata for context (e.g., photo index, trip ID)

### 2. Build Analytics UI Components (fishon-captain)

**Components to Create:**

```bash
src/components/captain/analytics/
├── AnalyticsStatsCards.tsx        # Key metrics (views, visitors, conversion)
├── ViewsChart.tsx                  # Line chart for time series (recharts)
├── ConversionFunnel.tsx            # Funnel visualization (recharts)
├── ReferralSourcesChart.tsx        # Pie/donut chart (recharts)
├── TopChartersTable.tsx            # Performance comparison table
├── PeriodSelector.tsx              # 7d, 30d, 90d, 1y switcher
└── index.ts                        # Barrel export
```

**Libraries Needed:**

```bash
cd fishon-captain
npm install recharts
npm install --save-dev @types/recharts
```

### 3. Build Analytics Page (fishon-captain)

**File:** `src/app/(dashboard)/captain/analytics/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Analytics Dashboard                       [7d|30d|90d|1y]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 1,234    │ │   567    │ │  4.5%    │ │   56     │    │
│ │ Views    │ │ Visitors │ │Conversion│ │ Bookings │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │         Views & Bookings Over Time                │   │
│ │  [Line Chart with dual axis]                      │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─────────────────┐ ┌─────────────────────────────────┐ │
│ │ Traffic Sources │ │ Top Performing Charters         │ │
│ │ [Pie Chart]     │ │ [Table with rankings]           │ │
│ └─────────────────┘ └─────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**

- Server component to fetch data
- Client components for interactivity
- Period selector updates URL params
- Loading and error states
- Mobile responsive design

### 4. Environment Setup

**Development:**

```bash
# fishon-market/.env.local
CAPTAIN_API_KEY="dev-api-key-123"
FISHON_CAPTAIN_URL="http://localhost:3000"

# fishon-captain/.env.local
FISHON_MARKET_API_URL="http://localhost:3001"
NEXT_PUBLIC_FISHON_MARKET_URL="http://localhost:3001"
FISHON_MARKET_API_KEY="dev-api-key-123"
```

**Production:**

```bash
# fishon-market .env (Vercel)
CAPTAIN_API_KEY="[generate-secure-key]"
FISHON_CAPTAIN_URL="https://fishon-captain.vercel.app"

# fishon-captain .env (Vercel)
FISHON_MARKET_API_URL="https://fishon.my"
NEXT_PUBLIC_FISHON_MARKET_URL="https://fishon.my"
FISHON_MARKET_API_KEY="[same-as-above]"
```

## Success Criteria

### Phase 1 (Backend) ✅ COMPLETE

- [x] Database schema designed and migrated
- [x] Analytics service with tracking and aggregation
- [x] Public tracking API endpoint
- [x] Protected analytics API endpoints
- [x] Client-side tracking utility
- [x] Server-side API client
- [x] Environment configuration
- [x] Comprehensive documentation

### Phase 2 (Integration & UI) 🔄 NEXT

- [ ] Tracking integrated in fishon-market charter pages
- [ ] Analytics UI components built in fishon-captain
- [ ] Analytics page implemented in fishon-captain
- [ ] Environment variables configured in both apps
- [ ] End-to-end testing (tracking → storage → display)
- [ ] Production deployment

## Files Changed

### fishon-market

**Created:**

- `prisma/migrations/20251106155922_add_analytics_events/migration.sql`
- `src/lib/analytics-service.ts`
- `src/lib/analytics-tracking.ts`
- `src/app/api/analytics/track/route.ts`
- `src/app/api/captain/analytics/route.ts`
- `src/app/api/captain/analytics/charter/[charterId]/route.ts`
- `docs/API_ANALYTICS.md`

**Modified:**

- `prisma/schema.prisma` - Added AnalyticsEvent model and enum
- `.env.example` - Added CAPTAIN_API_KEY

### fishon-captain

**Created:**

- `src/lib/analytics-api.ts`

**Modified:**

- `.env.example` - Added analytics configuration

### fishon-market (Existing - To Update)

- `docs/feature-analytics-implementation.md` (already exists)

## Commands Run

```bash
# 1. Created analytics migration in fishon-market
cd fishon-market
npx prisma migrate dev --name add_analytics_events

# 2. Cleaned up fishon-captain migration (moved to market)
cd fishon-captain
rm -rf prisma/migrations/20251106_add_analytics_events
npx prisma generate

# 3. Dropped analytics tables from fishon-captain DB (PostgreSQL)
# Executed SQL: DROP TABLE IF EXISTS "AnalyticsEvent" CASCADE; DROP TYPE IF EXISTS "AnalyticsEventType";
```

## Next Steps

1. **Add tracking to fishon-market pages** (2-3 hours)
   - Charter detail page view tracking
   - Photo/video view tracking
   - Contact click tracking
   - Booking funnel tracking

2. **Build analytics UI components** (4-6 hours)
   - Stats cards with numbers and trends
   - Time series line chart (recharts)
   - Conversion funnel visualization
   - Referral sources pie chart
   - Top charters table

3. **Implement analytics page** (2-3 hours)
   - Page layout with period selector
   - Data fetching with loading states
   - Error handling
   - Mobile responsive design

4. **Testing and deployment** (2-3 hours)
   - Local testing with dev data
   - Environment configuration
   - Production deployment
   - Verification

**Total Estimated Time for Phase 2:** 10-15 hours

## Questions for User

1. **Tracking Granularity:** Should we track every photo/video view, or only when gallery is opened?
2. **Real-Time Updates:** Do you want live analytics updates, or is periodic refresh (every 5 min) acceptable?
3. **Date Range:** Any specific time periods beyond 7d/30d/90d/1y?
4. **Export Features:** Should captains be able to export analytics to CSV/PDF?
5. **Alerts:** Should we send email notifications for milestones (e.g., "Your charter reached 100 views!")?

## Related Documentation

- [API Analytics Documentation](../docs/API_ANALYTICS.md)
- [Feature Implementation Plan](../docs/feature-analytics-implementation.md)
- [Dashboard Redesign Plan](../docs/feature-dashboard-overview-redesign.md)
