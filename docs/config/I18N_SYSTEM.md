# Internationalization (i18n) System Configuration

**Last Updated**: 30 November 2025  
**Status**: Production Ready ✅  
**Library**: next-intl  
**Applies To**: fishon-market

---

## System Overview

Fishon.my supports full internationalization using `next-intl` with two languages:

| Language | Code | Status    |
| -------- | ---- | --------- |
| Malay    | `ms` | Default   |
| English  | `en` | Secondary |

### Key Features

- ✅ Locale-prefixed URLs (`/ms/home`, `/en/home`)
- ✅ Automatic locale detection
- ✅ Language switcher in navbar
- ✅ Locale-aware navigation & redirects
- ✅ Notification/email URLs with locale

---

## Architecture

### File Structure

```
src/
├── i18n/
│   ├── config.ts              # Locale configuration
│   └── request.ts             # Request configuration
├── app/
│   ├── layout.tsx             # Root layout (minimal)
│   └── [locale]/
│       ├── layout.tsx         # Main layout with i18n
│       └── ...                # All locale-aware routes
├── components/
│   └── shared/
│       └── LanguageSwitcher.tsx
└── messages/
    ├── en.json                # English translations
    └── ms.json                # Malay translations
```

### URL Structure

| Default Locale (Malay) | English                |
| ---------------------- | ---------------------- |
| `/` → `/ms`            | `/en`                  |
| `/ms/home`             | `/en/home`             |
| `/ms/charters`         | `/en/charters`         |
| `/ms/account/bookings` | `/en/account/bookings` |

---

## Configuration

### i18n Config (`src/i18n/config.ts`)

```typescript
export const locales = ["ms", "en"] as const;
export const defaultLocale = "ms";
export type Locale = (typeof locales)[number];
```

### Middleware Settings

- `localePrefix: 'always'` - All URLs include locale prefix
- `localeDetection: true` - Auto-detect user preference
- Default locale: `ms` (Malay)

---

## Usage

### Server Components

```tsx
import { getTranslations, getLocale } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("home");
  const locale = await getLocale();

  return (
    <div>
      <h1>{t("title")}</h1>
      <Link href={`/${locale}/charters`}>{t("viewCharters")}</Link>
    </div>
  );
}
```

### Client Components

```tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <nav>
      <Link href={`/${locale}/home`}>{t("home")}</Link>
      <Link href={`/${locale}/charters`}>{t("charters")}</Link>
    </nav>
  );
}
```

### Server Actions & API Routes

```typescript
// Server actions - use getLocale()
"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export async function createPost() {
  const locale = await getLocale();
  redirect(`/${locale}/blog`);
}

// API routes - use default locale
// (no locale context available)
return NextResponse.redirect(new URL("/ms/book/confirm", request.url));
```

---

## Translation Files

### Namespace Structure

```json
// messages/en.json
{
  "common": { "loading": "Loading...", "error": "Error" },
  "nav": { "home": "Home", "charters": "Charters" },
  "footer": { "copyright": "© 2025 Fishon" },
  "home": { "title": "Find Your Charter" },
  "charter": { "book": "Book Now" },
  "booking": { "confirm": "Confirm Booking" },
  "account": { "profile": "Profile" },
  "auth": { "login": "Login", "register": "Register" },
  "validation": { "required": "This field is required" },
  "errors": { "notFound": "Page not found" }
}
```

### Adding Translations

1. Add key to both `en.json` and `my.json`
2. Use dot notation: `namespace.key`
3. Use placeholders: `{count}`, `{name}`

```json
{
  "booking": {
    "checkBookings": "Check your {count} booking(s)"
  }
}
```

```tsx
t("booking.checkBookings", { count: 3 });
```

---

## Best Practices

### URL Construction

| Context               | Method         | Example                             |
| --------------------- | -------------- | ----------------------------------- |
| Notifications/Emails  | Default `/ms/` | `actionUrl: "/ms/account/bookings"` |
| API Routes            | Default `/ms/` | `NextResponse.redirect("/ms/...")`  |
| Server Components     | `getLocale()`  | `redirect(\`/${locale}/...\`)`      |
| Client Components     | `useLocale()`  | `href={\`/${locale}/...\`}`         |
| Revalidation (shared) | All locales    | `for (const locale of locales)`     |

### Common Patterns

```typescript
// ✅ CORRECT - Notifications use default locale
await createNotification({
  actionUrl: `/ms/book/confirm?id=${bookingId}`,
});

// ✅ CORRECT - Server component with dynamic locale
const locale = await getLocale();
redirect(`/${locale}/account/bookings`);

// ✅ CORRECT - Revalidate all locales
for (const locale of locales) {
  revalidatePath(`/${locale}/charters`, "page");
}

// ❌ WRONG - Missing locale prefix (will 404)
actionUrl: `/book/confirm?id=${bookingId}`,
```

---

## Components

### Language Switcher

```tsx
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

<LanguageSwitcher />;
```

Already integrated in Navbar.

### Internationalized Components

- ✅ Navbar - Locale-aware links
- ✅ Footer - Locale-aware links
- ✅ AuthModal - Locale-aware redirects
- ✅ NotificationDropdown - Locale-prefixed URLs
- ✅ Home page - Full translations
- ✅ Blog admin - Server action locales

---

## Implementation Status

### Complete ✅

- [x] next-intl configuration
- [x] Middleware with locale routing
- [x] Translation files (en, my)
- [x] Language switcher
- [x] Navbar & Footer
- [x] Home page translations
- [x] Payment callbacks
- [x] Notification URLs
- [x] Email URLs
- [x] Blog server actions

### In Progress

- [ ] Charter detail translations
- [ ] Booking flow translations
- [ ] Account page translations
- [ ] Error page translations
- [ ] SEO metadata translations

---

## Troubleshooting

### Links not maintaining locale

**Solution**: Always include locale prefix in links.

```tsx
const locale = useLocale(); // or getLocale() in server
<Link href={`/${locale}/path`}>...</Link>;
```

### Server redirect missing locale

**Solution**: Get locale and include in redirect.

```tsx
const locale = await getLocale();
redirect(`/${locale}/account/bookings`);
```

### API route redirect

**Solution**: Use default locale (no context available).

```tsx
return NextResponse.redirect(new URL("/ms/book/confirm", request.url));
```

### revalidatePath not working

**Solution**: Include locale in path.

```tsx
const locale = await getLocale();
revalidatePath(`/${locale}/blog`);
```

---

## Key Files

| File                                         | Purpose               |
| -------------------------------------------- | --------------------- |
| `src/i18n/config.ts`                         | Locale configuration  |
| `src/i18n/request.ts`                        | Request configuration |
| `middleware.ts`                              | Locale routing        |
| `messages/en.json`                           | English translations  |
| `messages/ms.json`                           | Malay translations    |
| `src/components/shared/LanguageSwitcher.tsx` | Language toggle       |

---

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

---

**Document Version**: 1.1  
**Last Review**: 30 November 2025  
**Owner**: Engineering Team
