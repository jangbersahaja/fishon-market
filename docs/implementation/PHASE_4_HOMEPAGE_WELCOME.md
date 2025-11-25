# Phase 4: Homepage Welcome Bar Implementation

**Status:** 🚧 In Progress  
**Previous:** Phase 3 Complete (Search Page Integration)  
**Based On:** UX Research (Nielsen Norman Group)

---

## Overview

Based on UX research from Nielsen Norman Group, **immediate modal popups for promotions = bad UX**. Users have "visceral disdain" for newsletter/signup modals that appear within the first 3 seconds.

**Research-backed approach:** Use a **non-blocking welcome bar** that appears after the user has engaged with the site (10 seconds OR 50% scroll).

### Why Not Modal?

❌ **Don't do this:**

- Modal popup on homepage load
- Blocks content before user sees value
- Forces immediate attention to non-essential information
- Creates frustration and reduces trust

✅ **Do this instead:**

- Welcome bar (top or bottom)
- Appears after engagement signal (time or scroll)
- Easy to dismiss (X button)
- Doesn't block primary content

---

## Implementation Plan

### 1. Homepage Welcome Bar Component

Create a client component that wraps the campaign logic with proper timing:

```typescript
// src/components/campaigns/HomeWelcomeBar.tsx
'use client';

import { useEffect, useState } from 'react';
import { CampaignContainer } from '@/components/campaigns/CampaignContainer';

export function HomeWelcomeBar() {
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let scrollHandler: (() => void) | null = null;

    // Show after 10 seconds
    timeoutId = setTimeout(() => {
      setShowBar(true);
    }, 10000);

    // OR show after 50% scroll
    scrollHandler = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercentage >= 50) {
        setShowBar(true);
        window.removeEventListener('scroll', scrollHandler!);
      }
    };

    window.addEventListener('scroll', scrollHandler);

    return () => {
      clearTimeout(timeoutId);
      if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
      }
    };
  }, []);

  if (!showBar) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <CampaignContainer placementKey="home-welcome-bar" />
    </div>
  );
}
```

### 2. Update Home Page

```typescript
// src/app/[locale]/(marketplace)/home/page.tsx
import { HomeWelcomeBar } from '@/components/campaigns/HomeWelcomeBar';

export default async function Home() {
  // ... existing code ...

  return (
    <div className="flex min-h-screen flex-col">
      {/* Welcome bar - shows after engagement */}
      <HomeWelcomeBar />

      {/* Hero Section */}
      <section className="relative h-[600px] w-full overflow-hidden">
        {/* ... existing hero code ... */}
      </section>

      {/* ... rest of page ... */}
    </div>
  );
}
```

### 3. Add Animation (Optional)

```css
/* tailwind.config.ts - extend theme.animation */
animation: {
  'slide-down': 'slideDown 0.3s ease-out',
}
keyframes: {
  slideDown: {
    '0%': { transform: 'translateY(-100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  }
}
```

---

## Testing Checklist

### Visual Tests

- [ ] Bar appears after 10 seconds on homepage
- [ ] Bar appears after scrolling 50% down page
- [ ] Bar is dismissible with X button
- [ ] Bar doesn't appear after dismissal (same session)
- [ ] Bar design is consistent with brand
- [ ] Mobile responsive (proper height, padding)

### Functional Tests

- [ ] Only shows on `/home` route
- [ ] Doesn't block hero content on load
- [ ] Click tracking works (check `/api/campaigns/track`)
- [ ] Dismiss tracking works
- [ ] Session persistence works (doesn't reappear)

### UX Tests

- [ ] User can view hero section immediately
- [ ] User can interact with SearchBox without interruption
- [ ] Bar feels helpful, not annoying
- [ ] Easy to dismiss if not interested
- [ ] Doesn't cover important content

---

## Campaign Configuration

Current campaign: `welcome-fishon-2025`

- **Placement:** `home-welcome-bar`
- **Device:** ALL (Desktop, Mobile, Tablet)
- **Position:** TOP_BANNER
- **Variant:** BAR
- **Trigger:** 10s delay OR 50% scroll
- **Dismissal:** Session-based (one per session)

---

## Analytics to Monitor

After launch, track these metrics:

1. **Show Rate:** % of homepage visitors who see the bar
2. **Interaction Rate:** (clicks / impressions) %
3. **Dismiss Rate:** (dismisses / impressions) %
4. **Bounce Impact:** Compare bounce rate before/after implementation
5. **Conversion Rate:** % who complete registration after clicking

**Expected Results (based on UX research):**

- Lower dismissal rate than modal (less annoying)
- Higher engagement rate (users have seen value first)
- No negative impact on bounce rate

---

## Alternative Approaches (If Needed)

If the welcome bar doesn't perform well:

### Option A: Exit Intent Modal

Show modal only when user moves cursor to close tab/window:

```typescript
useEffect(() => {
  const handleMouseLeave = (e: MouseEvent) => {
    if (e.clientY <= 0) {
      setShowModal(true);
    }
  };

  document.addEventListener("mouseleave", handleMouseLeave);
  return () => document.removeEventListener("mouseleave", handleMouseLeave);
}, []);
```

### Option B: Scroll-Triggered Slide-In

Show small notification in bottom-right after 80% scroll:

```typescript
// Position: BOTTOM_RIGHT (nonmodal)
// Trigger: scrollPercentage >= 80
// Size: 320px × 200px (card variant)
```

---

## UX Research References

- [Nielsen Norman Group: Modal vs. Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/)
- **Key Finding:** "Do not use modal dialogs for nonessential information that is not related to the current user flow"
- **User Quote:** "We heard visceral disdain for modal dialogs pertaining to email newsletter signups"

---

## Next Steps

1. ✅ Update campaign script (remove pre-checkout modal)
2. 🔲 Create `HomeWelcomeBar` component
3. 🔲 Integrate into home page
4. 🔲 Add animation styles
5. 🔲 Test timing triggers (10s + 50% scroll)
6. 🔲 Verify tracking works
7. 🔲 Monitor analytics for 1 week
8. 🔲 Adjust timing/position based on data

---

**Phase Status:** Ready for implementation  
**ETA:** 2-3 hours  
**Risk Level:** Low (non-blocking, dismissible)
