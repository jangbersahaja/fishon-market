# Campaign System Configuration

> Last updated: 27 November 2025

## Overview

The Campaign System enables promotional banners and announcements across the Fishon platform. Campaigns are **managed in fishon-captain** (admin) but **stored and consumed in fishon-market** (public).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FISHON CAPTAIN                                │
│                        (Admin Dashboard)                                │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ /staff/campaigns │    │  campaign-api.ts │    │ campaign-actions │   │
│  │ (Admin Pages)    │───▶│  (API Proxy)     │───▶│  (Server Actions)│   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
│                                   │                                     │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │ HTTP + x-captain-api-secret
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FISHON MARKET                                 │
│                        (Public Marketplace)                             │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ /api/internal/   │    │  campaign-service│    │    Database      │   │
│  │ campaigns/*      │◀──▶│  (Business Logic)│◀──▶│  (PostgreSQL)    │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
│           ▲                       │                       │             │
│           │                       ▼                       ▼             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ /api/campaigns/  │    │ PromotionalBanner│    │ CampaignContainer│   │
│  │ track (Public)   │◀───│  (Client Comp)   │    │  (Server Comp)   │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │ /admin/campaigns │  ◀── LEGACY (to be deprecated)                    │
│  │ (Old Admin UI)   │                                                   │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Models (fishon-market)

### PromotionalCampaign

Main campaign configuration.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (CUID) |
| `code` | String | Unique campaign code (e.g., "WELCOME2025") |
| `type` | Enum | REGISTRATION_INCENTIVE, SEASONAL_PROMOTION, PARTNER_OFFER, ANNOUNCEMENT |
| `status` | Enum | DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED |
| `priority` | Int | Display priority (higher = shown first, default: 50) |
| `startDate` | DateTime? | When campaign becomes active |
| `endDate` | DateTime? | When campaign ends |
| `targetGuests` | Boolean | Show to non-logged-in users |
| `targetRegistered` | Boolean | Show to logged-in users |
| `excludeRoles` | String[] | Roles to exclude (e.g., ["ADMIN"]) |
| `allowedPages` | String[] | Pages where campaign shows (e.g., ["home", "search"]) |
| `allowedDevices` | String[] | Device types (e.g., ["DESKTOP", "MOBILE"]) |
| `contentEn` | Json | English content (title, subtitle, cta, benefits[], imageUrl) |
| `contentMy` | Json | Malay content |
| `dismissalStrategy` | Enum | SESSION_ONLY, SESSION_WITH_COOLDOWN, PERMANENT, MAX_DISMISSALS |
| `cooldownDays` | Int? | Days before re-showing (for SESSION_WITH_COOLDOWN) |
| `maxDismissals` | Int? | Max times to show (for MAX_DISMISSALS) |
| `impressions` | Int | Total impressions count |
| `clicks` | Int | Total clicks count |
| `conversions` | Int | Total conversions count |
| `createdBy` | String? | User ID who created |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### CampaignPlacement

Where to show the campaign.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (CUID) |
| `campaignId` | String | Foreign key to PromotionalCampaign |
| `placementKey` | String | Unique placement identifier (e.g., "home-sidebar") |
| `devices` | String[] | Devices for this placement |
| `position` | Enum | RIGHT_SIDEBAR, LEFT_SIDEBAR, BOTTOM_FIXED, TOP_BANNER, MODAL_CENTER, INLINE_CONTENT |
| `sticky` | Boolean | Whether placement sticks on scroll |
| `displayRules` | Json | Additional display conditions |
| `layoutConfig` | Json | Layout customization (variant, className) |

### UserCampaignInteraction

Tracks user interactions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Primary key (CUID) |
| `userId` | String? | User ID (null for guests) |
| `sessionId` | String | Session identifier |
| `campaignId` | String | Foreign key to PromotionalCampaign |
| `placementKey` | String | Where interaction occurred |
| `action` | Enum | IMPRESSION, CLICK, DISMISS, CONVERSION |
| `metadata` | Json | Additional data (page, device, locale, timestamp) |
| `createdAt` | DateTime | When interaction occurred |

## API Endpoints

### Internal API (fishon-market)

For admin operations, called from fishon-captain.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/internal/campaigns` | List all campaigns |
| POST | `/api/internal/campaigns` | Create new campaign |
| GET | `/api/internal/campaigns/[id]` | Get single campaign |
| PUT | `/api/internal/campaigns/[id]` | Update campaign |
| DELETE | `/api/internal/campaigns/[id]` | Delete campaign |
| POST | `/api/internal/campaigns/upload-image` | Upload campaign image |

**Authentication**: `x-captain-api-secret` header with `CAPTAIN_API_SECRET` value.

### Public API (fishon-market)

For tracking user interactions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/campaigns/track` | Track impression, click, dismiss, conversion |

**Payload**:

```json
{
  "campaignId": "clxxx...",
  "placementKey": "home-sidebar",
  "action": "IMPRESSION" | "CLICK" | "DISMISS" | "CONVERSION"
}
```

## Admin Pages

### fishon-captain (Primary)

Located at `/staff/campaigns/*`:

| Page | Path | Description |
|------|------|-------------|
| List | `/staff/campaigns` | View all campaigns with status, preview, edit |
| Create | `/staff/campaigns/new` | Create new campaign |
| Edit | `/staff/campaigns/[id]/edit` | Edit existing campaign |

### fishon-market (Legacy - To Deprecate)

Located at `/admin/campaigns/*`:

| Page | Path | Status |
|------|------|--------|
| List | `/admin/campaigns` | DEPRECATED - Use fishon-captain |
| Create | `/admin/campaigns/new` | DEPRECATED - Use fishon-captain |
| Edit | `/admin/campaigns/[id]/edit` | DEPRECATED - Use fishon-captain |

## Frontend Components (fishon-market)

### PromotionalBanner (Client Component)

Main display component with tracking.

**Props**:

```typescript
interface PromotionalBannerProps {
  campaignId: string;
  placementKey: string;
  content: CampaignContent;
  variant: "card" | "bar" | "modal";
  dismissible?: boolean;
  ctaHref: string;
  className?: string;
  onImpression?: () => void;
  onClick?: () => void;
  onDismiss?: () => void;
}
```

**Variants**:

- `card`: For sidebar placements (desktop)
- `bar`: For mobile bottom fixed bar
- `modal`: For modal/interstitial (with countdown)

### CampaignContainer (Server Component)

Fetches and renders active campaign for a placement.

**Props**:

```typescript
interface CampaignContainerProps {
  placementKey: string;
  currentPage: string;
  device: "DESKTOP" | "MOBILE" | "TABLET";
  locale: string;
}
```

**Usage**:

```tsx
// In a server component (e.g., search page)
<CampaignContainer
  placementKey="search-sidebar"
  currentPage="search"
  device="DESKTOP"
  locale={params.locale}
/>
```

## Campaign Service (fishon-market)

Located at `src/lib/services/campaign-service.ts`.

### Key Methods

| Method | Description |
|--------|-------------|
| `getActiveCampaigns(context)` | Get campaigns filtered by targeting rules |
| `filterDismissedCampaigns(campaigns, context)` | Apply dismissal strategy |
| `getCampaignContent(campaign, locale)` | Get EN or MY content |
| `trackImpression(campaignId, placementKey, context)` | Track view |
| `trackClick(campaignId, placementKey, context)` | Track CTA click |
| `trackDismissal(campaignId, placementKey, context)` | Track dismiss |
| `trackConversion(userId, sessionId)` | Track registration |
| `getAllCampaigns()` | Admin: Get all campaigns |
| `getCampaignAnalytics(campaignId)` | Get CTR, conversion rate |

## Environment Variables

### fishon-captain

```env
# Base URL for fishon-market API
FISHON_MARKET_API_URL="http://localhost:3001"  # dev
FISHON_MARKET_API_URL="https://fishon.my"      # prod

# Shared secret for API authentication
CAPTAIN_API_SECRET="your-secret-here"
```

### fishon-market

```env
# Shared secret for API authentication (must match fishon-captain)
CAPTAIN_API_SECRET="your-secret-here"

# Blob storage for campaign images
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

## Campaign Lifecycle

### 1. Creation (fishon-captain)

1. Admin navigates to `/staff/campaigns/new`
2. Fills out campaign form (code, type, content EN/MY, targeting, placements)
3. Optionally uploads image
4. Submits → calls fishon-market internal API → creates in database

### 2. Activation

Campaign becomes active when:

- `status` = ACTIVE
- `startDate` <= now (or null)
- `endDate` >= now (or null)

### 3. Display (fishon-market)

1. `CampaignContainer` server component fetches active campaigns
2. Filters by: page, device, user type, roles, dismissal rules
3. Renders `PromotionalBanner` with appropriate variant
4. Banner auto-tracks impression on mount

### 4. Interaction

- **Click**: Tracks click, navigates to CTA URL
- **Dismiss**: Tracks dismissal, hides banner (respects dismissal strategy)
- **Conversion**: Tracked when user registers within 1 hour of seeing campaign

### 5. Analytics

Aggregate counters updated in real-time:

- `impressions`: Total views
- `clicks`: Total CTA clicks
- `conversions`: Total registrations attributed

CTR = clicks / impressions × 100
Conversion Rate = conversions / clicks × 100

## Dismissal Strategies

| Strategy | Behavior |
|----------|----------|
| `SESSION_ONLY` | Dismissed for current browser session only |
| `SESSION_WITH_COOLDOWN` | Reappears after `cooldownDays` days |
| `PERMANENT` | Never shows again after dismissal |
| `MAX_DISMISSALS` | Shows up to `maxDismissals` times |

## Pages for Targeting

Common page identifiers:

- `home` - Homepage
- `search` - Charter search/listing page
- `charter-detail` - Individual charter page
- `checkout` - Booking checkout
- `account` - User account pages

## Device Types

- `DESKTOP` - Screen width ≥ 1024px
- `TABLET` - Screen width 768-1023px
- `MOBILE` - Screen width < 768px

## Implementation Checklist

### ✅ Complete

- [x] Database models defined (PromotionalCampaign, CampaignPlacement, UserCampaignInteraction)
- [x] Campaign service with business logic
- [x] Internal API for admin CRUD (`/api/internal/campaigns/*`)
- [x] Public tracking API (`/api/campaigns/track`)
- [x] PromotionalBanner component with variants (card, bar, modal)
- [x] CampaignContainer server component with auto-detection
- [x] fishon-captain admin pages (primary admin interface)
- [x] Predefined placement slots with dropdown in form
- [x] All 8 placements implemented (home, search, charter-detail, book, global)
- [x] Session ID cookie initialization (middleware)
- [x] API authentication with `CAPTAIN_API_SECRET`

### 🔧 Configuration Required

Before going live, ensure these environment variables are set:

**fishon-captain (.env.local):**

```env
FISHON_MARKET_API_URL="https://fishon.my"  # Production URL
CAPTAIN_API_SECRET="<generate-with-openssl-rand-base64-48>"
```

**fishon-market (.env.local):**

```env
CAPTAIN_API_SECRET="<same-secret-as-fishon-captain>"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."  # For campaign images
```

### 🚧 Future Enhancements

- [ ] **Remove fishon-market admin pages** (deprecate legacy `/admin/campaigns`)
- [ ] **Analytics dashboard** for campaign performance (CTR, conversions)
- [ ] **A/B testing support** for campaign variants
- [ ] **Promo code integration** - link campaigns to PromoCode system
- [ ] **Scheduled campaigns** - auto-activate based on startDate

## Predefined Placement Slots

Placements are now **predefined** in `fishon-captain/src/lib/constants/campaign-placements.ts`. The campaign form shows a dropdown of available slots instead of free-text input.

### Available Placements

| Placement Key | Label | Pages | Position | Devices | Variant | Status |
|---------------|-------|-------|----------|---------|---------|--------|
| `home-welcome-modal` | Home Welcome Modal | home | MODAL_CENTER | ALL | modal | ✅ Ready |
| `search-sidebar` | Search Sidebar | search | RIGHT_SIDEBAR | DESKTOP | card | ✅ Ready |
| `search-bottom-bar` | Search Bottom Bar | search | BOTTOM_FIXED | MOBILE, TABLET | bar | ✅ Ready |
| `charter-detail-sidebar` | Charter Detail Sidebar | charter-detail | RIGHT_SIDEBAR | DESKTOP | card | ✅ Ready |
| `charter-detail-bottom-bar` | Charter Detail Bottom Bar | charter-detail | BOTTOM_FIXED | MOBILE, TABLET | bar | ✅ Ready |
| `pre-checkout-modal` | Pre-Checkout Modal | book | MODAL_CENTER | ALL | modal | ✅ Ready |
| `global-bottom-bar` | Global Bottom Bar | all | BOTTOM_FIXED | MOBILE, TABLET | bar | ✅ Ready |

### Adding New Placements

To add a new placement slot:

1. **Add to constants file** (`fishon-captain/src/lib/constants/campaign-placements.ts`):

```typescript
{
  key: "new-placement-key",
  label: "New Placement Name",
  pages: ["page-name"],
  position: "RIGHT_SIDEBAR",
  devices: ["DESKTOP"],
  variant: "card",
  description: "Description for the admin UI",
  implemented: false, // Set to true once component is added
}
```

2. **Add CampaignContainer** to the target page in fishon-market:

```tsx
<CampaignContainer
  placementKey="new-placement-key"
  currentPage="page-name"
  device="DESKTOP"
  locale={locale}
/>
```

3. **Update implemented flag** to `true` in the constants file

### Placement Components by Page

#### Home Page (`/[locale]/home/page.tsx`)

```tsx
<HomeWelcomeModal
  campaignId={campaign?.id}
  placementKey="home-welcome-modal"
  content={content}
  variant={variant}
  ctaHref={ctaHref}
/>
```

#### Search Page (`/[locale]/(marketplace)/search/page.tsx`)

```tsx
{/* Desktop Sidebar */}
<CampaignContainer
  placementKey="search-sidebar"
  currentPage="search"
  device="DESKTOP"
  locale={locale}
/>

{/* Mobile Bottom Bar */}
<CampaignContainer
  placementKey="search-bottom-bar"
  currentPage="search"
  device="MOBILE"
  locale={locale}
/>
```

#### Charter Detail Page (`/[locale]/(marketplace)/charters/[id]/page.tsx`)

```tsx
{/* Desktop Sidebar (below BookingWidget) */}
<CampaignContainer
  placementKey="charter-detail-sidebar"
  currentPage="charter-detail"
  device="DESKTOP"
  locale={locale}
/>

{/* Mobile Bottom Bar */}
<CampaignContainer
  placementKey="charter-detail-bottom-bar"
  currentPage="charter-detail"
  device="MOBILE"
  locale={locale}
/>
```

#### Booking Page (`/[locale]/(marketplace)/book/[charterId]/page.tsx`)

```tsx
{/* Pre-checkout modal - shown before completing booking */}
<CampaignContainer
  placementKey="pre-checkout-modal"
  variant="modal"
  charterId={charterId}
/>
```

#### Global Layout (`/[locale]/layout.tsx`)

```tsx
{/* Global bottom bar - persistent across all pages on mobile */}
<CampaignContainer
  placementKey="global-bottom-bar"
  variant="bar"
/>
```

## Troubleshooting

### "SyntaxError: Unexpected token '<'" when fetching campaigns

**Cause**: fishon-market server not running or wrong URL.

**Fix**:

1. Ensure fishon-market is running: `cd fishon-market && npm run dev`
2. Check `FISHON_MARKET_API_URL` in fishon-captain `.env.local`
3. Default ports: fishon-captain = 3000, fishon-market = 3001

### Campaigns not showing on pages

**Cause**: CampaignContainer not added to page.

**Fix**: Add server component to page:

```tsx
<CampaignContainer
  placementKey="your-placement-key"
  currentPage="page-name"
  device="DESKTOP"
  locale={params.locale}
/>
```

### Campaign showing despite being dismissed

**Cause**: Dismissal strategy or session ID issue.

**Fix**:

1. Check `dismissalStrategy` setting
2. Verify `fishon_session_id` cookie is set
3. Check `UserCampaignInteraction` table for dismiss records
