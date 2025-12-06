# i18n Implementation Status & Next Steps

**Last Updated**: 6 December 2025  
**Related Issue**: Audit all pages for i18n support  
**Audit Report**: See `docs/I18N_AUDIT_REPORT.md`

---

## Executive Summary

**Progress**: 57% of pages now have Next.js 16 i18n compatibility (up from 4%)

- ✅ **Phase 1A Complete** - All critical pages (legal, account, auth) have `setRequestLocale`
- ⏳ **Phase 1B In Progress** - Marketplace pages partially complete (57%)
- 📋 **Phase 2 Planned** - Full translation implementation

---

## Completed Work

### ✅ Phase 1A: Critical Pages (100% Complete)

#### Legal/Policy Pages (4/4)
- [x] `/terms` - Terms of Service
- [x] `/privacy` - Privacy Policy
- [x] `/refund-policy` - Refund & Cancellation Policy
- [x] `/captain-terms` - Captain Terms & Conditions

#### Account Pages (10/10)
- [x] `/account` - Redirect page
- [x] `/account/overview` - Dashboard
- [x] `/account/profile` - Profile settings
- [x] `/account/bookings` - Bookings list
- [x] `/account/favorites` - Saved charters
- [x] `/account/messages` - Message inbox
- [x] `/account/messages/[conversationId]` - Chat detail
- [x] `/account/notifications` - Notifications (client component)
- [x] `/account/notifications/settings` - Settings
- [x] `/account/reviews` - User reviews

#### Auth Pages (2/2 server components)
- [x] `/login` - Sign in
- [x] `/register` - Create account
- Note: `/forgot-password` is client-only (no setRequestLocale needed)

---

## Current Work

### ⏳ Phase 1B: Marketplace Pages (57% Complete)

#### Completed (6/25)
- [x] `/charters/[id]` - Charter detail
- [x] `/charters` - Charter listing
- [x] `/categories/types` - Fishing types
- [x] `/categories/techniques` - Techniques
- [x] `/categories/species` - Species
- [x] `/categories/destinations` - Destinations
- [x] `/book/[charterId]` - Checkout

#### Remaining (19/25)

**Booking Flow** (5 pages):
- [ ] `/book/confirm` - Booking confirmation ✓ Has translations
- [ ] `/book/payment/preview` - Payment preview ✓ Has translations
- [ ] `/book/payment/[bookingId]` - Payment page ✓ Has translations
- [ ] `/book/payment/processing` - Processing
- [ ] `/book/payment/return` - Payment return

**Search & Home** (4 pages):
- [ ] `/home` - Landing page
- [ ] `/search` - Charter search
- [ ] `/search/category/type/[type]` - Type search
- [ ] `/search/category/technique/[technique]` - Technique search

**Other** (2 pages):
- [ ] `/find-booking` - Find booking
- [ ] `/dev/booking-tests` - Dev page (low priority)

---

## Pending Work

### 📋 Phase 1C: Blog Pages (0% Complete)

**Blog Pages** (7 pages):
- [ ] `/blog` - Blog listing
- [ ] `/blog/[slug]` - Blog post ✓ Has translations
- [ ] `/blog/categories` - Categories
- [ ] `/blog/category/[slug]` - Category page
- [ ] `/blog/search` - Blog search
- [ ] `/blog/tag/[slug]` - Tag page
- [ ] `/blog/tags` - Tag listing

---

## Phase 2: Full Translation Implementation

**Status**: Not Started  
**Estimated Effort**: 20-30 hours

### Priorities

#### High Priority - Legal Pages (8-10 hours)
Must be translated for compliance and accessibility.

**Pages**:
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/refund-policy` - Refund & Cancellation
- `/captain-terms` - Captain Terms

**Tasks**:
1. Create translation keys in `messages/en.json` and `messages/ms.json`
2. Replace hardcoded text with translation calls
3. Update metadata to use translations
4. Test with both locales
5. Review translations with native Malay speaker

**Example Translation Structure**:
```json
{
  "termsPage": {
    "title": "Terms of Service",
    "lastUpdated": "Last updated: {date}",
    "intro": "Welcome to Fishon.my...",
    "sections": {
      "acceptance": {
        "title": "Acceptance of Terms",
        "content": "..."
      }
    }
  }
}
```

#### High Priority - Account Pages (6-8 hours)
Core user functionality should be accessible in both languages.

**Pages**:
- `/account/overview` - Dashboard
- `/account/bookings` - Bookings
- `/account/profile` - Profile
- `/account/favorites` - Favorites
- `/account/messages` - Messages
- `/account/reviews` - Reviews

**Tasks**:
1. Identify all hardcoded strings
2. Create account namespace translations
3. Update components to use `getTranslations()` or `useTranslations()`
4. Test user flows in both languages
5. Ensure error messages are translated

**Example Account Translation**:
```json
{
  "account": {
    "overview": {
      "welcome": "Welcome back, {name}!",
      "subtitle": "Here's what's happening with your fishing charters.",
      "recentBookings": "Recent Bookings",
      "noBookings": "No bookings yet",
      "browseCharters": "Browse Charters",
      "needHelp": "Need Help?",
      "contactSupport": "Contact Support"
    }
  }
}
```

#### Medium Priority - Support Pages (2-3 hours)
Already partially translated, needs completion.

**Pages**:
- `/support/help` - Help Center
- `/support/contact` - Contact Us

#### Low Priority - Other Pages (4-6 hours)
- Auth pages (login, register)
- Search pages
- Blog pages

---

## Implementation Guide

### Adding `setRequestLocale` to a Page

**For Server Components**:
```tsx
import { setRequestLocale } from "next-intl/server";

type RouteParams = Promise<{ locale: string; /* other params */ }>;

export default async function Page({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  // Rest of component
}
```

**For Client Components**:
```tsx
// Client components don't need setRequestLocale
// They use useLocale() and useTranslations() instead
"use client";
import { useLocale, useTranslations } from "next-intl";

export default function ClientComponent() {
  const locale = useLocale();
  const t = useTranslations("namespace");
  
  return <div>{t("key")}</div>;
}
```

### Adding Translations to a Page

**Step 1**: Add keys to translation files

```json
// messages/en.json
{
  "pageName": {
    "title": "Page Title",
    "description": "Page description"
  }
}

// messages/ms.json
{
  "pageName": {
    "title": "Tajuk Halaman",
    "description": "Penerangan halaman"
  }
}
```

**Step 2**: Use translations in component

```tsx
// Server Component
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("pageName");
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}

// Client Component
"use client";
import { useTranslations } from "next-intl";

export default function ClientPage() {
  const t = useTranslations("pageName");
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
```

**Step 3**: Update metadata

```tsx
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

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

---

## Testing Checklist

### Per Page Testing

When implementing i18n for a page, verify:

- [ ] Page renders in English (`/en/...`)
- [ ] Page renders in Malay (`/ms/...`)
- [ ] Language switcher works on the page
- [ ] All text is translated (no hardcoded strings)
- [ ] Metadata is translated (title, description)
- [ ] Error messages are translated
- [ ] Form validation messages are translated
- [ ] Dates/numbers are properly formatted
- [ ] Links maintain locale (use `/${locale}/...`)
- [ ] No console errors or warnings
- [ ] Build succeeds without errors

### Integration Testing

After completing a section:

- [ ] Navigation works between pages in same locale
- [ ] Language switcher maintains page context
- [ ] Authentication flows work in both locales
- [ ] Booking flows work in both locales
- [ ] Email notifications use correct locale
- [ ] Payment flows work in both locales

---

## Quick Wins (1-2 hours)

### Complete Remaining Marketplace Pages

The following pages already have translations, they just need `setRequestLocale`:

1. `/book/confirm` - Already translated
2. `/book/payment/preview` - Already translated
3. `/book/payment/[bookingId]` - Already translated

**Steps**:
1. Add `setRequestLocale(locale)` at component start
2. Update params to async pattern
3. Test in both locales
4. Commit changes

### Add setRequestLocale to Simple Pages

Pages without translations but easy to add `setRequestLocale`:

1. `/home` - Landing page
2. `/search` - Search page
3. `/search/category/*` - Category search pages
4. `/find-booking` - Find booking page

---

## Resources

### Documentation
- [Next.js 16 Migration Notes](../NEXTJS_16_MIGRATION.md)
- [i18n System Configuration](./config/I18N_SYSTEM.md)
- [i18n Audit Report](./I18N_AUDIT_REPORT.md)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)

### Translation Files
- English: `messages/en.json`
- Malay: `messages/ms.json`

### Key Files
- i18n config: `src/i18n/config.ts`
- Request config: `src/i18n/request.ts`
- Proxy: `proxy.ts` (handles locale routing)

---

## Timeline Estimates

### Phase 1: setRequestLocale Implementation

- ✅ **Phase 1A Complete** (Critical Pages) - 4 hours
- ⏳ **Phase 1B In Progress** (Marketplace) - 2-3 hours remaining
- 📋 **Phase 1C Pending** (Blog) - 1-2 hours

**Total Phase 1**: ~6-9 hours remaining

### Phase 2: Full Translation Implementation

- **Legal Pages**: 8-10 hours
- **Account Pages**: 6-8 hours
- **Support Pages**: 2-3 hours
- **Other Pages**: 4-6 hours

**Total Phase 2**: 20-27 hours

### Phase 3: Testing & Refinement

- **Manual Testing**: 4-6 hours
- **Translation Review**: 2-3 hours
- **Bug Fixes**: 2-4 hours

**Total Phase 3**: 8-13 hours

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All pages have `setRequestLocale` (excluding client-only pages)
- [ ] No Next.js 16 compatibility warnings
- [ ] Build succeeds without errors
- [ ] Type checking passes

### Phase 2 Complete When:
- [ ] All critical pages fully translated
- [ ] No hardcoded English text on translated pages
- [ ] Both locales render correctly
- [ ] Language switcher works on all pages
- [ ] Metadata translated for SEO

### Project Complete When:
- [ ] All user-facing pages support both languages
- [ ] End-to-end user flows work in both locales
- [ ] Translation quality reviewed by native speakers
- [ ] Documentation updated
- [ ] No i18n-related bugs or issues

---

**Document Version**: 1.0  
**Last Review**: 6 December 2025  
**Next Review**: After Phase 1 completion
