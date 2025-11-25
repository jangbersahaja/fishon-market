# Promotional Banner System Configuration

**Last Updated**: 25 November 2025  
**Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 Ready  
**Purpose**: Drive user registrations through strategic promotional placements without explicitly revealing promo codes

---

## Implementation Progress

### ✅ Phase 1: Foundation (Complete)

- [x] Database schema with 3 tables and 5 enums
- [x] Service layer (`CampaignService` class)
- [x] Tracking API route (`/api/campaigns/track`)
- [x] Seed script with `reg-welcome-2025` campaign
- [x] 3 placements (search-sidebar, search-bottom-bar, pre-checkout-modal)
- [x] Type checking passing
- [x] System tests passing

**Documentation**: `/docs/implementation/PHASE_1_COMPLETE.md`

### ✅ Phase 2: Core Components (Complete)

- [x] Base `PromotionalBanner` component with tracking
- [x] Card variant (desktop sidebar - gradient design)
- [x] Bar variant (mobile bottom - compact layout)
- [x] Modal variant (interstitial - countdown timer)
- [x] `useCampaignTracking` custom hook
- [x] `CampaignContainer` server component wrapper
- [x] Helper utilities for device/page detection
- [x] Animations (fade-in, slide-in, zoom-in)
- [x] Accessibility features (ARIA, keyboard nav, focus trap)
- [x] Dark mode support
- [x] Type checking passing

**Documentation**: `/docs/implementation/PHASE_2_COMPLETE.md`  
**Components**: 5 files, ~563 lines of code  
**Ready for**: Search page integration

### 🚧 Phase 3: Search Integration (Next)

- [ ] Integrate desktop sidebar on search page
- [ ] Integrate mobile bottom bar on search page
- [ ] Test sticky positioning
- [ ] Verify tracking in production
- [ ] Monitor analytics

---

## System Overview

A flexible promotional banner system that displays registration incentives across multiple touchpoints, with targeting rules, dismissal tracking, and analytics integration.

### Business Goals

1. **Primary**: Increase ANGLER registrations to auto-assign FISHONTRIP1 (10% off first booking)
2. **Secondary**: Drive qualified traffic to registration flow
3. **Tertiary**: Build flexible ad system for future internal/external campaigns

### Key Principles

- ✅ Promote benefits and exclusivity, NOT specific promo codes
- ✅ Focus on registration incentive, NOT code reminder
- ✅ Non-intrusive, contextually relevant placements
- ✅ Dismissible with frequency capping
- ✅ Mobile-responsive and performance-optimized
- ❌ No explicit "FISHONTRIP1" mentions to maintain exclusivity

---

## Campaign Configuration

### Campaign: Registration Welcome Bonus 2025

```typescript
{
  id: "reg-welcome-2025",
  type: "REGISTRATION_INCENTIVE",
  status: "ACTIVE",
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z",
  priority: 100, // Higher = more important

  targeting: {
    userTypes: ["GUEST"], // Only show to non-registered users
    excludeRoles: ["ANGLER", "CAPTAIN", "STAFF", "ADMIN"],
    pages: ["search", "charter-detail", "pre-checkout"],
    devices: ["DESKTOP", "MOBILE", "TABLET"]
  },

  content: {
    en: {
      title: "Register Now & Save on Your First Trip",
      subtitle: "New members get 10% off their first charter booking",
      cta: "Sign Up Free",
      benefits: [
        "Instant 10% discount",
        "Exclusive member deals",
        "Faster checkout"
      ]
    },
    my: {
      title: "Daftar Sekarang & Jimat Perjalanan Pertama",
      subtitle: "Ahli baharu dapat diskaun 10% untuk tempahan charter pertama",
      cta: "Daftar Percuma",
      benefits: [
        "Diskaun 10% segera",
        "Tawaran eksklusif ahli",
        "Checkout lebih pantas"
      ]
    }
  },

  dismissal: {
    strategy: "SESSION_WITH_COOLDOWN",
    cooldownDays: 3, // Show again after 3 days if dismissed
    maxDismissals: 5, // Stop showing after 5 dismissals
    respectPermanent: true // Honor "Don't show again"
  },

  analytics: {
    trackImpressions: true,
    trackClicks: true,
    trackConversions: true, // Track if user registers within session
    conversionWindow: 3600 // 1 hour attribution window
  }
}
```

---

## Placement Strategy

### Priority 1: Search Results Sidebar (Desktop)

**Location**: Right sidebar on `/search` page  
**Rationale**: High-intent users actively looking for charters  
**Layout**: Sticky sidebar card, 300x400px  
**Behavior**: Persistent during scroll, dismissible

```typescript
{
  placement: "search-sidebar",
  devices: ["DESKTOP"],
  position: "RIGHT_SIDEBAR",
  sticky: true,
  displayRules: {
    showAfterScroll: 200, // Show after 200px scroll
    hideOnCheckout: false,
    maxViewsPerSession: 1
  },
  layout: {
    variant: "CARD",
    width: "300px",
    maxHeight: "400px",
    className: "shadow-lg rounded-lg border border-gray-200"
  }
}
```

**Component Structure**:

```tsx
<SearchSidebarBanner>
  <BannerImage src="/images/promo/fishing-discount.jpg" />
  <BannerTitle>{t("campaigns.regWelcome.title")}</BannerTitle>
  <BannerSubtitle>{t("campaigns.regWelcome.subtitle")}</BannerSubtitle>
  <BenefitsList items={benefits} />
  <CTAButton href="/register">{t("campaigns.regWelcome.cta")}</CTAButton>
  <DismissButton />
</SearchSidebarBanner>
```

---

### Priority 2: Search Results Bottom Bar (Mobile)

**Location**: Fixed bottom bar on `/search` page (mobile only)  
**Rationale**: Match desktop experience, non-intrusive on mobile  
**Layout**: Fixed bottom, 100% width, 80px height  
**Behavior**: Slide up animation, dismissible

```typescript
{
  placement: "search-bottom-bar",
  devices: ["MOBILE", "TABLET"],
  position: "BOTTOM_FIXED",
  sticky: true,
  displayRules: {
    showAfterDelay: 3000, // Show after 3 seconds
    hideOnScroll: false,
    maxViewsPerSession: 1
  },
  layout: {
    variant: "BAR",
    width: "100%",
    height: "80px",
    className: "shadow-top border-t border-gray-200"
  }
}
```

**Component Structure**:

```tsx
<MobileBottomBar>
  <CompactContent>
    <IconBadge icon={<GiftIcon />} />
    <TextContent>
      <Title>{t("campaigns.regWelcome.title")}</Title>
      <Subtitle>{t("campaigns.regWelcome.subtitle")}</Subtitle>
    </TextContent>
    <CTAButton size="sm" href="/register">
      {t("campaigns.regWelcome.cta")}
    </CTAButton>
  </CompactContent>
  <DismissButton size="sm" />
</MobileBottomBar>
```

---

### Priority 3: Pre-Checkout Interstitial

**Location**: Modal overlay before checkout flow  
**Rationale**: Highest conversion intent, last chance to capture registration  
**Layout**: Center modal, 600x500px max  
**Behavior**: Show once per session, skippable after 3 seconds

```typescript
{
  placement: "pre-checkout-interstitial",
  devices: ["DESKTOP", "MOBILE", "TABLET"],
  position: "MODAL_CENTER",
  sticky: false,
  displayRules: {
    triggerOn: "CHECKOUT_INTENT", // User clicks "Book Now"
    showForGuests: true,
    showForRegistered: false,
    maxViewsPerSession: 1,
    minWaitTime: 3000 // Can skip after 3 seconds
  },
  layout: {
    variant: "MODAL",
    maxWidth: "600px",
    maxHeight: "500px",
    backdrop: "blur",
    className: "rounded-xl shadow-2xl"
  }
}
```

**Component Structure**:

```tsx
<PreCheckoutModal>
  <HeroImage src="/images/promo/register-save.jpg" />
  <ModalHeader>
    <Title>{t("campaigns.regWelcome.title")}</Title>
    <Subtitle>{t("campaigns.regWelcome.subtitle")}</Subtitle>
  </ModalHeader>
  <BenefitsGrid items={benefits} />
  <CTASection>
    <PrimaryButton href="/register">
      {t("campaigns.regWelcome.cta")}
    </PrimaryButton>
    <SecondaryButton onClick={continueAsGuest}>
      {t("common.continueAsGuest")}
    </SecondaryButton>
  </CTASection>
  <SkipTimer countdown={3} />
</PreCheckoutModal>
```

---

### Future Placements (Phase 2)

1. **Homepage Hero Modal**: First-time visitor welcome (1-time only)
2. **Charter Detail Sidebar**: Similar to search sidebar, contextual to specific charter
3. **Post-Search Toast**: After 5+ searches without interaction
4. **Email Campaign Landing**: Dedicated landing page for external campaigns

---

## Technical Architecture

### Database Schema

```prisma
model PromotionalCampaign {
  id          String   @id @default(cuid())
  code        String   @unique // e.g., "reg-welcome-2025"
  type        CampaignType
  status      CampaignStatus
  priority    Int      @default(50)

  // Scheduling
  startDate   DateTime?
  endDate     DateTime?

  // Targeting
  targetGuests      Boolean @default(true)
  targetRegistered  Boolean @default(false)
  excludeRoles      Role[]
  allowedPages      String[]
  allowedDevices    String[]

  // Content (JSON)
  contentEn   Json
  contentMy   Json

  // Dismissal rules
  dismissalStrategy   DismissalStrategy
  cooldownDays        Int?
  maxDismissals       Int?

  // Analytics
  impressions   Int @default(0)
  clicks        Int @default(0)
  conversions   Int @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status, priority])
}

model CampaignPlacement {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    PromotionalCampaign @relation(fields: [campaignId], references: [id])

  placementKey  String // e.g., "search-sidebar"
  devices       String[]
  position      PlacementPosition
  sticky        Boolean @default(false)

  // Display rules (JSON)
  displayRules  Json
  layoutConfig  Json

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([campaignId, placementKey])
}

model UserCampaignInteraction {
  id          String   @id @default(cuid())
  userId      String?
  sessionId   String
  campaignId  String
  campaign    PromotionalCampaign @relation(fields: [campaignId], references: [id])

  placementKey  String
  action        InteractionAction // IMPRESSION, CLICK, DISMISS, CONVERSION

  metadata    Json? // Additional context
  createdAt   DateTime @default(now())

  @@index([userId, campaignId])
  @@index([sessionId, campaignId])
  @@index([campaignId, action, createdAt])
}

enum CampaignType {
  REGISTRATION_INCENTIVE
  SEASONAL_PROMOTION
  PARTNER_OFFER
  ANNOUNCEMENT
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

enum DismissalStrategy {
  SESSION_ONLY        // Dismissed for current session only
  SESSION_WITH_COOLDOWN // Reappear after X days
  PERMANENT           // Never show again after dismissal
  MAX_DISMISSALS      // Stop after X dismissals
}

enum PlacementPosition {
  RIGHT_SIDEBAR
  LEFT_SIDEBAR
  BOTTOM_FIXED
  TOP_BANNER
  MODAL_CENTER
  INLINE_CONTENT
}

enum InteractionAction {
  IMPRESSION
  CLICK
  DISMISS
  CONVERSION
}
```

---

### Service Layer

```typescript
// src/lib/services/campaign-service.ts

import { prisma } from "@/lib/database/prisma";

export interface CampaignContext {
  userId?: string;
  sessionId: string;
  userRole?: Role;
  currentPage: string;
  device: "DESKTOP" | "MOBILE" | "TABLET";
  locale: string;
}

export class CampaignService {
  /**
   * Get active campaigns for current context
   */
  async getActiveCampaigns(context: CampaignContext) {
    const campaigns = await prisma.promotionalCampaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        // Targeting filters
        ...(context.userId
          ? { targetRegistered: true }
          : { targetGuests: true }),
        allowedPages: { has: context.currentPage },
        allowedDevices: { has: context.device },
      },
      include: {
        placements: {
          where: {
            devices: { has: context.device },
          },
        },
      },
      orderBy: { priority: "desc" },
    });

    // Filter out dismissed campaigns
    return this.filterDismissedCampaigns(campaigns, context);
  }

  /**
   * Check if campaign should be shown based on dismissal rules
   */
  async filterDismissedCampaigns(campaigns: any[], context: CampaignContext) {
    const interactions = await prisma.userCampaignInteraction.findMany({
      where: {
        sessionId: context.sessionId,
        action: "DISMISS",
        campaignId: { in: campaigns.map((c) => c.id) },
      },
    });

    return campaigns.filter((campaign) => {
      const dismissals = interactions.filter(
        (i) => i.campaignId === campaign.id
      );

      if (campaign.dismissalStrategy === "SESSION_ONLY") {
        return dismissals.length === 0;
      }

      if (campaign.dismissalStrategy === "PERMANENT") {
        return dismissals.length === 0;
      }

      if (campaign.dismissalStrategy === "SESSION_WITH_COOLDOWN") {
        const lastDismissal = dismissals[0]?.createdAt;
        if (!lastDismissal) return true;

        const cooldownEnd = new Date(lastDismissal);
        cooldownEnd.setDate(cooldownEnd.getDate() + campaign.cooldownDays!);
        return new Date() > cooldownEnd;
      }

      if (campaign.dismissalStrategy === "MAX_DISMISSALS") {
        return dismissals.length < campaign.maxDismissals!;
      }

      return true;
    });
  }

  /**
   * Track campaign impression
   */
  async trackImpression(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ) {
    await prisma.userCampaignInteraction.create({
      data: {
        userId: context.userId,
        sessionId: context.sessionId,
        campaignId,
        placementKey,
        action: "IMPRESSION",
        metadata: {
          page: context.currentPage,
          device: context.device,
          locale: context.locale,
        },
      },
    });

    await prisma.promotionalCampaign.update({
      where: { id: campaignId },
      data: { impressions: { increment: 1 } },
    });
  }

  /**
   * Track campaign click
   */
  async trackClick(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ) {
    await prisma.userCampaignInteraction.create({
      data: {
        userId: context.userId,
        sessionId: context.sessionId,
        campaignId,
        placementKey,
        action: "CLICK",
        metadata: {
          page: context.currentPage,
          device: context.device,
          locale: context.locale,
        },
      },
    });

    await prisma.promotionalCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } },
    });
  }

  /**
   * Track campaign dismissal
   */
  async trackDismissal(
    campaignId: string,
    placementKey: string,
    context: CampaignContext
  ) {
    await prisma.userCampaignInteraction.create({
      data: {
        userId: context.userId,
        sessionId: context.sessionId,
        campaignId,
        placementKey,
        action: "DISMISS",
        metadata: {
          page: context.currentPage,
          device: context.device,
          locale: context.locale,
        },
      },
    });
  }

  /**
   * Track campaign conversion (user registered after seeing campaign)
   */
  async trackConversion(campaignId: string, userId: string, sessionId: string) {
    // Check if user saw this campaign in current session
    const impression = await prisma.userCampaignInteraction.findFirst({
      where: {
        sessionId,
        campaignId,
        action: "IMPRESSION",
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Within 1 hour
        },
      },
    });

    if (impression) {
      await prisma.userCampaignInteraction.create({
        data: {
          userId,
          sessionId,
          campaignId,
          placementKey: impression.placementKey,
          action: "CONVERSION",
        },
      });

      await prisma.promotionalCampaign.update({
        where: { id: campaignId },
        data: { conversions: { increment: 1 } },
      });
    }
  }
}

export const campaignService = new CampaignService();
```

---

### React Components

#### Core Banner Component

```typescript
// src/components/promotional/PromotionalBanner.tsx

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface CampaignContent {
  title: string;
  subtitle: string;
  cta: string;
  benefits?: string[];
}

export interface PromotionalBannerProps {
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

export function PromotionalBanner({
  campaignId,
  placementKey,
  content,
  variant,
  dismissible = true,
  ctaHref,
  className = "",
  onImpression,
  onClick,
  onDismiss
}: PromotionalBannerProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [tracked, setTracked] = useState(false);

  // Track impression on mount
  useEffect(() => {
    if (!tracked && visible) {
      trackImpression();
      setTracked(true);
    }
  }, [visible, tracked]);

  const trackImpression = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "IMPRESSION"
        })
      });
      onImpression?.();
    } catch (error) {
      console.error("Failed to track impression:", error);
    }
  };

  const handleClick = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "CLICK"
        })
      });
      onClick?.();
      router.push(ctaHref);
    } catch (error) {
      console.error("Failed to track click:", error);
      router.push(ctaHref);
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch("/api/campaigns/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          placementKey,
          action: "DISMISS"
        })
      });
      onDismiss?.();
      setVisible(false);
    } catch (error) {
      console.error("Failed to track dismissal:", error);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`promotional-banner promotional-banner--${variant} ${className}`}>
      {variant === "card" && (
        <CardVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}

      {variant === "bar" && (
        <BarVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}

      {variant === "modal" && (
        <ModalVariant
          content={content}
          onCTAClick={handleClick}
          onDismiss={dismissible ? handleDismiss : undefined}
        />
      )}
    </div>
  );
}

// Card variant (sidebar placement)
function CardVariant({ content, onCTAClick, onDismiss }: any) {
  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800 p-6 shadow-lg">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="mb-4">
        <Badge variant="secondary" className="mb-2">New Member Offer</Badge>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {content.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {content.subtitle}
        </p>
      </div>

      {content.benefits && (
        <ul className="space-y-2 mb-6">
          {content.benefits.map((benefit: string, idx: number) => (
            <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500 mr-2">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      )}

      <Button onClick={onCTAClick} className="w-full" size="lg">
        {content.cta}
      </Button>
    </div>
  );
}

// Bar variant (mobile bottom placement)
function BarVariant({ content, onCTAClick, onDismiss }: any) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-top p-4">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {content.title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {content.subtitle}
          </p>
        </div>

        <Button onClick={onCTAClick} size="sm" className="shrink-0">
          {content.cta}
        </Button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Modal variant (interstitial placement)
function ModalVariant({ content, onCTAClick, onDismiss }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎣</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {content.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {content.subtitle}
          </p>
        </div>

        {content.benefits && (
          <div className="mb-6 space-y-3">
            {content.benefits.map((benefit: string, idx: number) => (
              <div key={idx} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <span className="text-green-500 mr-3 text-lg">✓</span>
                {benefit}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={onCTAClick} className="w-full" size="lg">
            {content.cta}
          </Button>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              className="w-full"
            >
              Maybe Later
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### API Routes

```typescript
// src/app/api/campaigns/track/route.ts

import { NextRequest, NextResponse } from "next/server";
import { campaignService } from "@/lib/services/campaign-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    // Get or create session ID
    let sessionId = cookieStore.get("fishon_session_id")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set("fishon_session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    const { campaignId, placementKey, action } = await req.json();

    if (!campaignId || !placementKey || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const context = {
      userId: session?.user?.id,
      sessionId,
      userRole: session?.user?.role,
      currentPage: req.headers.get("referer") || "",
      device: getDeviceType(req.headers.get("user-agent") || ""),
      locale: req.headers.get("accept-language")?.split(",")[0] || "en",
    };

    switch (action) {
      case "IMPRESSION":
        await campaignService.trackImpression(
          campaignId,
          placementKey,
          context
        );
        break;
      case "CLICK":
        await campaignService.trackClick(campaignId, placementKey, context);
        break;
      case "DISMISS":
        await campaignService.trackDismissal(campaignId, placementKey, context);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getDeviceType(userAgent: string): "DESKTOP" | "MOBILE" | "TABLET" {
  if (/mobile/i.test(userAgent)) return "MOBILE";
  if (/tablet|ipad/i.test(userAgent)) return "TABLET";
  return "DESKTOP";
}
```

---

## Migration Plan

### Phase 1: Foundation (Week 1)

**Goal**: Database schema, service layer, tracking API

**Tasks**:

1. ✅ Create comprehensive configuration document (this file)
2. Add Prisma schema for campaigns
3. Run migration: `npm run db:migrate:safe add-promotional-campaigns`
4. Implement `CampaignService` class
5. Create tracking API route (`/api/campaigns/track`)
6. Seed initial campaign: "Registration Welcome Bonus 2025"

**Deliverables**:

- Database tables ready
- Service layer tested
- API endpoint functional
- Sample campaign seeded

---

### Phase 2: Core Components (Week 2)

**Goal**: Reusable banner components with variants

**Tasks**:

1. Create base `PromotionalBanner` component
2. Implement Card variant (sidebar placement)
3. Implement Bar variant (mobile bottom)
4. Implement Modal variant (interstitial)
5. Add animations and transitions
6. Test responsiveness across devices

**Deliverables**:

- Three banner variants functional
- Storybook stories (optional)
- Mobile-responsive
- Accessible (keyboard navigation, screen readers)

---

### Phase 3: Search Integration (Week 3)

**Goal**: Deploy Priority 1 & 2 placements (search page)

**Tasks**:

1. Add server component to fetch active campaigns
2. Integrate sidebar banner on desktop search page
3. Integrate bottom bar banner on mobile search page
4. Implement client-side tracking hooks
5. Test dismissal persistence
6. Monitor analytics in database

**Deliverables**:

- Search page banners live
- Desktop + mobile layouts working
- Tracking verified
- Dismissal working correctly

---

### Phase 4: Checkout Integration (Week 4)

**Goal**: Deploy Priority 3 placement (pre-checkout modal)

**Tasks**:

1. Create checkout interstitial logic
2. Trigger modal on "Book Now" click for guests
3. Implement skip timer (3 seconds)
4. Add conversion tracking on registration
5. Test guest vs. registered user behavior
6. A/B test modal timing

**Deliverables**:

- Pre-checkout modal functional
- Conversion tracking working
- Guest checkout flow preserved
- Registration conversions measurable

---

### Phase 5: Analytics & Optimization (Week 5)

**Goal**: Dashboard and optimization tools

**Tasks**:

1. Create admin dashboard for campaign analytics
2. Show impression/click/conversion rates
3. Implement A/B testing framework
4. Add campaign performance charts
5. Set up automated reports
6. Optimize based on data

**Deliverables**:

- Admin analytics dashboard
- Campaign performance metrics
- A/B testing capability
- Data-driven optimization recommendations

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Primary Metrics**:

- **Registration Rate**: % increase in ANGLER registrations
- **Conversion Rate**: Campaign clicks → registrations
- **Attribution Rate**: Registrations with campaign impression in session

**Secondary Metrics**:

- **Impression Rate**: % of eligible sessions with banner shown
- **Click-Through Rate (CTR)**: Clicks / Impressions
- **Dismissal Rate**: Dismissals / Impressions
- **Engagement Time**: Time between impression and click

**Business Metrics**:

- **FISHONTRIP1 Redemptions**: Users redeeming welcome promo
- **First Booking Rate**: % of registered users making first booking
- **Lifetime Value (LTV)**: Revenue from campaign-attributed users

### Target Benchmarks

```typescript
{
  benchmarks: {
    impressionRate: {
      target: 0.80, // Show to 80% of eligible sessions
      minimum: 0.60
    },
    clickThroughRate: {
      target: 0.08, // 8% CTR
      minimum: 0.05
    },
    conversionRate: {
      target: 0.25, // 25% of clicks convert to registration
      minimum: 0.15
    },
    registrationIncrease: {
      target: 0.30, // 30% increase in registrations
      minimum: 0.20
    }
  }
}
```

---

## Content Strategy

### Messaging Framework

**Core Value Proposition**: Save money + Get exclusive benefits

**Key Messages** (never mention specific code):

- ✅ "New members get 10% off first booking"
- ✅ "Register free and save on your first trip"
- ✅ "Exclusive member discount for first-time anglers"
- ✅ "Join today, fish for less tomorrow"
- ❌ "Use code FISHONTRIP1" (too explicit)
- ❌ "Promo code inside" (removes mystery)

### A/B Testing Variations

**Test 1: Benefit Focus**

- Variant A: "Save 10% on Your First Charter"
- Variant B: "Get Exclusive Member Perks + Save 10%"
- Variant C: "Start Your Fishing Journey with 10% Off"

**Test 2: Urgency Level**

- Variant A: No urgency
- Variant B: "Limited Time Offer for New Members"
- Variant C: "Join This Month, Save on Every First Booking"

**Test 3: Social Proof**

- Variant A: No social proof
- Variant B: "Join 10,000+ anglers saving with Fishon"
- Variant C: "Trusted by Malaysia's fishing community"

---

## Technical Considerations

### Performance

- **Lazy Load Components**: Only load banner when in viewport
- **Optimize Images**: Use Next.js Image component, WebP format
- **Debounce Tracking**: Batch impression events
- **Cache Campaign Data**: Cache active campaigns for 5 minutes
- **Minimize Re-renders**: Use React.memo for banner components

### Accessibility

- **Keyboard Navigation**: All CTAs and dismiss buttons keyboard-accessible
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Trap focus in modal variants
- **Color Contrast**: WCAG AA compliance (4.5:1 minimum)
- **Reduced Motion**: Respect `prefers-reduced-motion`

### Privacy & Compliance

- **Cookie Consent**: Session ID stored after consent
- **Data Retention**: Campaign interactions retained 90 days
- **GDPR Compliance**: User can request interaction data deletion
- **Analytics Anonymization**: No PII in campaign metadata

### Error Handling

```typescript
// Graceful degradation strategy
try {
  const campaigns = await campaignService.getActiveCampaigns(context);
  return <PromotionalBanner {...campaigns[0]} />;
} catch (error) {
  // Log error but don't break page
  console.error("Failed to load campaign:", error);
  return null; // Silently fail, user sees page without banner
}
```

---

## Future Enhancements

### Phase 6+: Advanced Features

1. **Dynamic Content**: Personalize based on user behavior (search history, viewed charters)
2. **Multi-Campaign Support**: Show multiple campaigns based on priority
3. **External Ads**: Support third-party ad networks (Google Ads, Facebook)
4. **Referral Integration**: Campaign-based referral tracking
5. **Email Integration**: Sync campaigns with email marketing
6. **Push Notifications**: Browser push for campaign updates
7. **Geotargeting**: Show campaigns based on user location
8. **Time-Based Triggers**: Morning/evening campaign variants

---

## Appendix

### Translation Keys

```json
// messages/en.json
{
  "campaigns": {
    "regWelcome": {
      "title": "Register Now & Save on Your First Trip",
      "subtitle": "New members get 10% off their first charter booking",
      "cta": "Sign Up Free",
      "benefits": [
        "Instant 10% discount",
        "Exclusive member deals",
        "Faster checkout"
      ]
    }
  }
}

// messages/my.json
{
  "campaigns": {
    "regWelcome": {
      "title": "Daftar Sekarang & Jimat Perjalanan Pertama",
      "subtitle": "Ahli baharu dapat diskaun 10% untuk tempahan charter pertama",
      "cta": "Daftar Percuma",
      "benefits": [
        "Diskaun 10% segera",
        "Tawaran eksklusif ahli",
        "Checkout lebih pantas"
      ]
    }
  }
}
```

### Environment Variables

```bash
# .env
NEXT_PUBLIC_CAMPAIGN_TRACKING_ENABLED=true
NEXT_PUBLIC_CAMPAIGN_DEBUG=false # Show debug info in console
CAMPAIGN_CACHE_TTL=300 # 5 minutes
```

### Testing Checklist

- [ ] Campaign shows to guests only
- [ ] Campaign hides for registered users
- [ ] Dismissal persists across page navigation
- [ ] Cooldown respects configured days
- [ ] Max dismissals stops showing campaign
- [ ] Impressions tracked correctly
- [ ] Clicks tracked correctly
- [ ] Conversions attributed within window
- [ ] Mobile layout responsive
- [ ] Desktop layout responsive
- [ ] Modal dismissible after 3 seconds
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Analytics dashboard shows data
- [ ] A/B test variants rotate correctly

---

**Document Version**: 1.0  
**Last Review**: 25 November 2025  
**Next Review**: After Phase 3 completion  
**Owner**: Growth Team  
**Stakeholders**: Product, Engineering, Marketing, Analytics
