# Promotional Banner System - Quick Reference

**Status**: Phase 1 ✅ | Phase 2 ✅ | Ready for Phase 3  
**Last Updated**: 25 November 2025

---

## 🎯 What We Built

A complete promotional banner system to drive user registrations without explicitly revealing promo codes.

### Phase 1: Foundation ✅

- **Database**: 3 tables, 5 enums (PromotionalCampaign, CampaignPlacement, UserCampaignInteraction)
- **Service Layer**: `CampaignService` with smart filtering and tracking
- **API**: `/api/campaigns/track` endpoint for impression/click/dismiss/conversion tracking
- **Seed Data**: `reg-welcome-2025` campaign with 3 placements

### Phase 2: Components ✅

- **PromotionalBanner**: Main component with 3 variants (card, bar, modal)
- **CampaignContainer**: Server component wrapper for auto-fetching
- **useCampaignTracking**: Reusable tracking hook
- **Helpers**: Device detection, page mapping, session management

---

## 📦 Component Library

### Main Components

```typescript
// Client component with tracking
import { PromotionalBanner } from "@/components/promotional";

<PromotionalBanner
  campaignId="reg-welcome-2025"
  placementKey="search-sidebar"
  content={{ title, subtitle, cta, benefits }}
  variant="card" // "card" | "bar" | "modal"
  ctaHref="/register"
/>
```

```typescript
// Server component with auto-fetch
import { CampaignContainer } from "@/components/promotional";

<CampaignContainer
  placementKey="search-sidebar"
  currentPage="search"
  device="DESKTOP"
  locale="en"
/>
```

### Tracking Hook

```typescript
import { useCampaignTracking } from "@/hooks/useCampaignTracking";

const { trackImpression, trackClick, trackDismiss } = useCampaignTracking({
  campaignId: "campaign-id",
  placementKey: "placement-key",
});
```

---

## 🎨 Variants

### 1. Card Variant (Desktop Sidebar)

- **Design**: Gradient blue background, badge, benefits checklist
- **Animation**: Slide-in from right
- **Size**: 300px width, auto height
- **Best for**: Sticky sidebar placements

### 2. Bar Variant (Mobile Bottom)

- **Design**: Compact horizontal layout with icon
- **Animation**: Slide-in from bottom
- **Size**: Full width, 80px height
- **Best for**: Fixed bottom mobile placements

### 3. Modal Variant (Interstitial)

- **Design**: Full-screen backdrop, centered card
- **Animation**: Zoom-in with backdrop fade
- **Features**: 3-second countdown, body scroll lock
- **Best for**: Pre-checkout interstitials

---

## 📊 Current Campaign

### Registration Welcome Bonus 2025

**Campaign ID**: `reg-welcome-2025`  
**Status**: ACTIVE  
**Duration**: Jan 1 - Dec 31, 2025  
**Target**: Guest users only

**Content (English)**:

- Title: "Register Now & Save on Your First Trip"
- Subtitle: "New members get 10% off their first charter booking"
- CTA: "Sign Up Free"
- Benefits: Instant 10% discount, Exclusive member deals, Faster checkout

**Placements**:

1. **search-sidebar** (Desktop) - Right sidebar, sticky
2. **search-bottom-bar** (Mobile/Tablet) - Fixed bottom
3. **pre-checkout-modal** (All) - Center modal

---

## 🔧 Quick Start Guide

### Add to Search Page (Desktop)

```tsx
// In search page layout or component
import { CampaignContainer } from "@/components/promotional";

export default async function SearchPage({ params }) {
  return (
    <div className="flex gap-6">
      <main className="flex-1">{/* Search results */}</main>

      <aside className="w-80 sticky top-20">
        <CampaignContainer
          placementKey="search-sidebar"
          currentPage="search"
          device="DESKTOP"
          locale={params.locale}
        />
      </aside>
    </div>
  );
}
```

### Add to Search Page (Mobile)

```tsx
// Render at bottom of search page
<CampaignContainer
  placementKey="search-bottom-bar"
  currentPage="search"
  device="MOBILE"
  locale={params.locale}
/>
```

### Add Pre-Checkout Modal

```tsx
// In checkout flow
<CampaignContainer
  placementKey="pre-checkout-modal"
  currentPage="checkout"
  device={deviceType}
  locale={locale}
/>
```

---

## 📈 Analytics

### Track in Database

```sql
-- View campaign performance
SELECT
  code,
  status,
  impressions,
  clicks,
  conversions,
  ROUND((clicks::float / NULLIF(impressions, 0) * 100), 2) as ctr,
  ROUND((conversions::float / NULLIF(clicks, 0) * 100), 2) as cvr
FROM "PromotionalCampaign"
WHERE status = 'ACTIVE';
```

### Query Interactions

```sql
-- View recent interactions
SELECT
  action,
  "placementKey",
  "createdAt",
  metadata
FROM "UserCampaignInteraction"
WHERE "campaignId" = 'your-campaign-id'
ORDER BY "createdAt" DESC
LIMIT 100;
```

---

## ✅ Testing Checklist

- [ ] Campaign shows to guests only
- [ ] Campaign hides for registered users
- [ ] Impressions tracked in database
- [ ] Clicks tracked before navigation
- [ ] Dismissals persist across pages
- [ ] Desktop sidebar is sticky
- [ ] Mobile bar slides from bottom
- [ ] Modal countdown works (3s)
- [ ] Modal locks body scroll
- [ ] Escape key closes modal (after countdown)
- [ ] Dark mode displays correctly
- [ ] Content truncates on mobile
- [ ] All animations smooth (60fps)
- [ ] Keyboard navigation works
- [ ] Screen readers announce content

---

## 🚀 Next Steps

### Phase 3: Search Integration

1. Add `CampaignContainer` to search page layout
2. Implement device detection logic
3. Test sticky behavior on scroll
4. Verify tracking in production
5. Monitor conversion rates
6. A/B test content variations

### Future Enhancements

- Homepage modal (first-time visitors)
- Charter detail sidebar
- Post-search toast notifications
- Email campaign landing pages
- Dynamic content personalization
- Multi-campaign priority system

---

## 📚 Documentation

- **Full Config**: `/docs/config/PROMOTIONAL_BANNER_SYSTEM.md`
- **Phase 1**: `/docs/implementation/PHASE_1_COMPLETE.md`
- **Phase 2**: `/docs/implementation/PHASE_2_COMPLETE.md`
- **Seed Script**: `/scripts/seed-campaigns.ts`
- **Test Script**: `/scripts/test-campaign-system.ts`

---

## 🆘 Troubleshooting

### Campaign not showing?

1. Check campaign status is ACTIVE
2. Verify targeting rules (guests vs registered)
3. Check date range (startDate/endDate)
4. Verify placement exists for campaign
5. Check device targeting (DESKTOP/MOBILE/TABLET)

### Tracking not working?

1. Check `/api/campaigns/track` endpoint responds
2. Verify session ID cookie is set
3. Check browser console for errors
4. Verify campaign ID and placement key are correct

### Dismissal not persisting?

1. Check dismissal strategy in database
2. Verify session ID remains consistent
3. Check UserCampaignInteraction table for DISMISS records

---

**Ready for production deployment!** 🎉
