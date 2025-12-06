# i18n (Internationalization) Audit Report

**Date**: 6 December 2025  
**Issue**: #[issue_number] - Audit all pages for i18n support  
**Status**: 🔴 Critical - Most pages require i18n implementation

---

## Executive Summary

Out of **46 total pages**, only **2 pages** (4%) are fully i18n-ready with both translations and `setRequestLocale()`. An additional **13 pages** (28%) have translations but are missing the required `setRequestLocale()` call for Next.js 16 compatibility. The remaining **31 pages** (68%) have no i18n implementation.

### Key Findings

- ✅ **2 pages** (4%) - Fully i18n ready
- 🟡 **13 pages** (28%) - Partial implementation (missing `setRequestLocale`)
- 🔴 **31 pages** (68%) - No i18n implementation

### Critical Issues

1. **Legal/Policy Pages** - No i18n support despite being user-facing
   - `/terms` - Terms of Service
   - `/privacy` - Privacy Policy
   - `/refund-policy` - Refund & Cancellation Policy
   - `/captain-terms` - Captain Terms

2. **Account Pages** - Core user functionality without translations
   - All 10 account pages lack i18n support

3. **Next.js 16 Compatibility** - Missing `setRequestLocale()` in 44/46 pages
   - Required for static rendering with next-intl in Next.js 16

---

## Detailed Page Analysis

### ✅ Fully i18n Ready (2 pages)

| Route | Status | Notes |
|-------|--------|-------|
| `/charters/[id]` | ✓ Complete | Has translations + setRequestLocale |
| `/[locale]/layout.tsx` | ✓ Complete | Root locale layout |

### 🟡 Partial Implementation - Missing `setRequestLocale` (13 pages)

#### Marketing/Static Pages (3)
| Route | Has Translations | Missing |
|-------|-----------------|---------|
| `/about` | ✓ | setRequestLocale |
| `/support/contact` | ✓ | setRequestLocale |
| `/support/help` | ✓ | setRequestLocale |

#### Booking Flow (4)
| Route | Has Translations | Missing |
|-------|-----------------|---------|
| `/book/[charterId]` | ✓ | setRequestLocale |
| `/book/confirm` | ✓ | setRequestLocale |
| `/book/payment/[bookingId]` | ✓ | setRequestLocale |
| `/book/payment/preview` | ✓ | setRequestLocale |

#### Categories (4)
| Route | Has Translations | Missing |
|-------|-----------------|---------|
| `/categories/destinations` | ✓ | setRequestLocale |
| `/categories/species` | ✓ | setRequestLocale |
| `/categories/techniques` | ✓ | setRequestLocale |
| `/categories/types` | ✓ | setRequestLocale |

#### Charters & Blog (2)
| Route | Has Translations | Missing |
|-------|-----------------|---------|
| `/charters` | ✓ | setRequestLocale |
| `/blog/[slug]` | ✓ | setRequestLocale |

### 🔴 No i18n Implementation (31 pages)

#### High Priority - Legal & Policy Pages (4)
| Route | Status | Priority |
|-------|--------|----------|
| `/terms` | ✗ No i18n | 🔴 Critical |
| `/privacy` | ✗ No i18n | 🔴 Critical |
| `/refund-policy` | ✗ No i18n | 🔴 Critical |
| `/captain-terms` | ✗ No i18n | 🔴 Critical |

**Impact**: Legal pages must be accessible in both English and Malay for compliance and user accessibility.

#### High Priority - Account Pages (10)
| Route | Status | Priority |
|-------|--------|----------|
| `/account/overview` | ✗ No i18n | 🔴 Critical |
| `/account/bookings` | ✗ No i18n | 🔴 Critical |
| `/account/profile` | ✗ No i18n | 🔴 Critical |
| `/account/favorites` | ✗ No i18n | 🔴 Critical |
| `/account/messages` | ✗ No i18n | 🔴 Critical |
| `/account/messages/[conversationId]` | ✗ No i18n | 🔴 Critical |
| `/account/notifications` | ✗ No i18n | 🔴 Critical |
| `/account/notifications/settings` | ✗ No i18n | 🔴 Critical |
| `/account/reviews` | ✗ No i18n | 🔴 Critical |
| `/account` (redirect) | ✗ No i18n | 🟡 Medium |

**Impact**: Core user functionality is not accessible to non-English speakers.

#### Medium Priority - Auth Pages (3)
| Route | Status | Priority |
|-------|--------|----------|
| `/login` | ✗ No i18n | 🟡 Medium |
| `/register` | ✗ No i18n | 🟡 Medium |
| `/forgot-password` | ✗ No i18n | 🟡 Medium |

#### Medium Priority - Marketplace Pages (7)
| Route | Status | Priority |
|-------|--------|----------|
| `/home` | ✗ No i18n | 🟡 Medium |
| `/search` | ✗ No i18n | 🟡 Medium |
| `/search/category/type/[type]` | ✗ No i18n | 🟡 Medium |
| `/search/category/technique/[technique]` | ✗ No i18n | 🟡 Medium |
| `/find-booking` | ✗ No i18n | 🟡 Medium |
| `/book/payment/processing` | ✗ No i18n | 🟡 Medium |
| `/book/payment/return` | ✗ No i18n | 🟡 Medium |

#### Low Priority - Blog & Dev (7)
| Route | Status | Priority |
|-------|--------|----------|
| `/blog` | ✗ No i18n | 🟢 Low |
| `/blog/categories` | ✗ No i18n | 🟢 Low |
| `/blog/category/[slug]` | ✗ No i18n | 🟢 Low |
| `/blog/search` | ✗ No i18n | 🟢 Low |
| `/blog/tag/[slug]` | ✗ No i18n | 🟢 Low |
| `/blog/tags` | ✗ No i18n | 🟢 Low |
| `/dev/booking-tests` | ✗ No i18n | 🟢 Low (dev only) |

---

## Technical Requirements

### 1. Add `setRequestLocale()` to All Pages

**Reason**: Next.js 16 requires this for static rendering compatibility with next-intl.

**Pattern for Server Components**:
```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations("namespaceName");
  
  return (
    <div>
      <h1>{t("title")}</h1>
    </div>
  );
}
```

**Pattern for Client Components**:
```tsx
"use client";
import { useTranslations } from "next-intl";

export default function ClientComponent() {
  const t = useTranslations("namespaceName");
  
  return <div>{t("title")}</div>;
}
```

### 2. Add Translation Keys

All hardcoded English text must be moved to translation files:
- `messages/en.json` - English translations
- `messages/ms.json` - Malay translations

**Example**:
```json
// messages/en.json
{
  "account": {
    "overview": {
      "welcome": "Welcome back, {name}!",
      "subtitle": "Here's what's happening with your fishing charters.",
      "recentBookings": "Recent Bookings",
      "viewAll": "View All",
      "noBookings": "No bookings yet",
      "browseCharters": "Browse Charters"
    }
  }
}
```

### 3. Update Metadata

Metadata should support both locales:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageName.metadata" });
  
  return {
    title: t("title"),
    description: t("description"),
  };
}
```

### 4. Ensure Locale-Aware Links

All internal links must include the locale prefix:

```tsx
const locale = await getLocale(); // server component
// or
const locale = useLocale(); // client component

<Link href={`/${locale}/path`}>Link</Link>
```

---

## Implementation Priorities

### Phase 1: Critical (Week 1-2)
**Estimated Effort**: 16-20 hours

1. Add `setRequestLocale` to all 44 pages missing it (2-3 hours)
2. Implement i18n for legal/policy pages (8-10 hours):
   - `/terms`
   - `/privacy`
   - `/refund-policy`
   - `/captain-terms`
3. Implement i18n for top 5 account pages (6-8 hours):
   - `/account/overview`
   - `/account/bookings`
   - `/account/profile`
   - `/account/favorites`
   - `/account/messages`

### Phase 2: High Priority (Week 3-4)
**Estimated Effort**: 12-16 hours

1. Remaining account pages (4-6 hours):
   - `/account/messages/[conversationId]`
   - `/account/notifications`
   - `/account/notifications/settings`
   - `/account/reviews`
2. Auth pages (3-4 hours):
   - `/login`
   - `/register`
   - `/forgot-password`
3. Support pages refinement (2-3 hours)
4. Marketplace search pages (3-4 hours)

### Phase 3: Medium Priority (Week 5-6)
**Estimated Effort**: 8-12 hours

1. Booking flow pages (4-6 hours)
2. Home and search pages (4-6 hours)

### Phase 4: Low Priority (Future)
**Estimated Effort**: 6-8 hours

1. Blog pages (4-6 hours)
2. Other low-priority pages (2-3 hours)

---

## Testing Checklist

For each page implemented:

- [ ] Page renders correctly in English (`/en/...`)
- [ ] Page renders correctly in Malay (`/ms/...`)
- [ ] `setRequestLocale()` is called in server component
- [ ] All hardcoded text is replaced with translation keys
- [ ] Metadata is translated (title, description)
- [ ] All links include locale prefix
- [ ] Language switcher maintains page context
- [ ] No console errors or warnings
- [ ] Build succeeds without errors

---

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js 16 Migration Notes](docs/NEXTJS_16_MIGRATION.md)
- [i18n System Configuration](docs/config/I18N_SYSTEM.md)
- Translation files: `messages/en.json`, `messages/ms.json`

---

## Recommendations

1. **Immediate Action**: Add `setRequestLocale` to all pages (quick win, 2-3 hours)
2. **Critical Path**: Focus on legal pages and top account pages first
3. **Automation**: Consider creating a script to validate i18n implementation
4. **Quality**: Create reusable i18n component patterns to reduce duplication
5. **Documentation**: Update i18n documentation with common patterns and examples

---

**Report Generated**: 6 December 2025  
**Next Review**: After Phase 1 completion
