# i18n Integration Guide

## Overview

The fishon-market app now has full internationalization (i18n) support using `next-intl` with:

- **Malay ((my))** - Default language
- **English (en)** - Secondary language

## Architecture

### File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (minimal, returns children)
│   ├── page.tsx                # Root redirect to /(my)
│   └── [locale]/
│       ├── layout.tsx          # Main layout with i18n setup
│       ├── page.tsx            # Home page
│       └── ...                 # All other routes
├── i18n/
│   ├── config.ts              # Locale configuration
│   └── request.ts             # Request configuration
├── components/
│   └── shared/
│       ├── LanguageSwitcher.tsx  # Language switcher UI
│       └── LocalizedLink.tsx     # Localized Link wrapper (optional)
└── messages/
    ├── en.json                # English translations
    └── (my).json                # Malay translations
```

### Middleware Configuration

The middleware (`middleware.ts`) handles:

1. Locale detection and routing
2. Authentication protection for `/admin` and `/account` routes
3. Automatic locale prefix management

**Key settings:**

- `locale: "my"/home`, `/en/home`)
- `localeDetection: true` - Automatically detect user's preferred locale
- Default locale: "my"` (Malay)
- Supported locale: "my"', 'en']`

**Route behavior:**

- `/` → redirects to `/(my)` (default locale)
- `/home` → redirects to `/my/home`
- `/en/home` → English version
- Middleware automatically detects and redirects to user's preferred locale

## Usage

### In Server Components

```tsx
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("home");

  return <h1>{t("title")}</h1>;
}
```

### In Client Components

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function Component() {
  const t = useTranslations("common");

  return <button>{t("save")}</button>;
}
```

### Using the Language Switcher

Already integrated in the Navbar:

```tsx
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

<LanguageSwitcher />;
```

### Navigation & Redirects

**IMPORTANT:** All internal links and redirects must include the locale prefix.

#### Links in Client Components

```tsx
"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

export default function Nav() {
  const locale = useLocale();

  return (
    <nav>
      <Link href={`/${locale}/home`}>Home</Link>
      <Link href={`/${locale}/charters`}>Charters</Link>
      <Link href={`/${locale}/account`}>Account</Link>
    </nav>
  );
}
```

#### Links in Server Components

```tsx
import { getLocale } from "next-intl/server";
import Link from "next/link";

export default async function Nav() {
  const locale = await getLocale();

  return (
    <nav>
      <Link href={`/${locale}/home`}>Home</Link>
      <Link href={`/${locale}/charters`}>Charters</Link>
    </nav>
  );
}
```

#### Redirects in Server Components

```tsx
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const locale = await getLocale();

  // Include locale in redirect path
  redirect(`/${locale}/login`);
}
```

#### Redirects in Server Actions

```tsx
"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  // ... create post logic

  // Get current locale for redirect and revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/blog`);
  redirect(`/${locale}/blog/posts`);
}
```

#### Redirects in API Routes (Without Locale Context)

When redirecting from API routes that don't have locale context (like payment callbacks), use the default locale:

```tsx
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // ... process payment

  // Use default locale 'my' for payment redirects
  // since API routes don't have locale context
  return NextResponse.redirect(
    new URL("/my/book/confirm?payment=success", request.url)
  );
}
```

#### Revalidating for All Locales

When you need to revalidate pages for all locales (e.g., in payment callbacks):

```tsx
import { locales } from "@/i18n/config";
import { revalidatePath } from "next/cache";

async function revalidatePages() {
  // Revalidate for all locales
  for (const locale of locales) {
    revalidatePath(`/${locale}/book/confirm`, "page");
    revalidatePath(`/${locale}/account/bookings`, "page");
  }
}
```

The middleware:

- Redirects root (`/`) to default locale: "my"`)
- Redirects unprefixed paths (`/home`) to prefixed paths (`/my/home`)
- Handles locale switching via `LanguageSwitcher`
- Automatically detects user's preferred locale

## Translation Files

### Structure

All translations are organized by namespace in JSON files:

- `common` - Common UI elements (loading, error, buttons)
- `nav` - Navigation ite(my)
- `footer` - Footer links and text
- `home` - Home page content
- `charter` - Charter-related content
- `booking` - Booking flow
- `account` - User account pages
- `search` - Search and filtering
- `auth` - Authentication for(my)
- `validation` - Form validation messages
- `errors` - Error messages

### Adding New Translations

1. Add the key to both `messages/en.json` and `messages/(my).json`
2. Use dot notation for nested keys: `"namespace.key"`
3. Use placeholders with curly braces: `{count}`, `{name}`

Example:

```json
{
  "booking": {
    "checkBookings": "Check your {count} booking(s)"
  }
}
```

Usage:

```tsx
t("booking.checkBookings", { count: 3 });
```

## URL Structure

### Default Locale (Malay)

- `/` → redirects to `/(my)` → renders home page
- `/home` → renders as `/home` (no prefix shown in URL)
- `/charters` → renders as `/charters`
- `/account/bookings` → renders as `/account/bookings`

### English Locale

- `/en` → renders English home page
- `/en/home` → renders English home page
- `/en/charters` → renders English charters page
- `/en/account/bookings` → renders English bookings page

## Components Already Internationalized

### UI Components

✅ Navbar - Full navigation with language switcher and locale-aware links
✅ Footer - All footer links and text with locale prefixes
✅ Home page - Complete home page content
✅ Language Switcher - Toggle between my/en
✅ Check Your Bookings component
✅ AuthModal - Login/register forms with locale-aware links
✅ NotificationDropdown - Notification links with locale prefixes

### Pages

✅ Marketplace pages - Charter detail, search, category pages with locale-aware navigation
✅ Admin blog pages - Posts, categories, tags, comments (server actions with locale)

### API Routes & Server Actions

✅ Payment callback API - Redirects use locale prefix (`/my/`)
✅ Blog post actions - Create, update, delete, toggle publish (all use `getLocale()`)
✅ Blog category actions - Create, update, delete with locale-aware revalidation
✅ Blog tag actions - Create, update, delete with locale-aware revalidation
✅ Blog comment actions - Approve, delete, create with locale-aware revalidation
✅ Payment side effects - Revalidates pages for all locales (my, en)

### Notification, Email & Message Services

✅ **Notification Service** (`src/lib/services/notification-service.ts`)

- `sendNotificationEmail()` - All email URLs use `/my/` prefix
- Notification `actionUrl` fields include locale prefix
- Real-time Pusher notifications work with locale-aware URLs

✅ **Email Service** (`src/lib/services/email-service.ts`)

- All direct email calls pass locale-prefixed URLs
- Email templates receive URLs from calling code (not constructed internally)

✅ **Notification Hook** (`src/hooks/useNotifications.ts`)

- Toast action buttons use locale-prefixed URLs
- Notification settings link uses `/my/account/notifications/settings`

✅ **All Notification Creation Points**:

- ✅ Payment callback notifications (`/my/book/confirm`)
- ✅ Booking create notifications (`/my/book/confirm`)
- ✅ Booking acknowledge notifications (`/my/account/bookings/:id`)
- ✅ Booking pay notifications (`/my/book/confirm`)
- ✅ Booking cancel notifications (`/my/search`)
- ✅ Booking expiry notifications (`/my/search`)
- ✅ Payment side effects notifications (`/my/book/confirm`)
- ✅ Review submitted notifications (`/my/account/reviews`)
- ✅ Review approved notifications (`/my/charters/:id#reviews`)
- ✅ Review rejected notifications (`/my/account/reviews`)
- ✅ Refund processing notifications (`/my/account/bookings/:id`)
- ✅ Refund completed notifications (`/my/account/bookings/:id`)
- ✅ Test notification route (`/my/account/notifications`)

✅ **All Email URL Construction Points**:

- ✅ Payment callback emails (`/my/book/confirm`)
- ✅ Booking create emails (`/my/book/confirm`)
- ✅ Booking acknowledge emails (`/my/account/bookings/:id`)
- ✅ Booking pay emails (`/my/book/confirm`)
- ✅ Manual booking emails (`/my/account/bookings/:id`)
- ✅ Guest booking emails (`/my/book/confirm`)
- ✅ Notification service emails (BOOKING_APPROVED, BOOKING_REJECTED)

**Important Notes:**

- All notification `actionUrl` fields and email URLs use default locale `/my/`
- Middleware automatically redirects to user's preferred locale when they click the link
- This ensures consistent behavior for all users while respecting their language preference
- Email templates don't construct URLs internally - they receive them as parameters from calling code

## Next Steps for Full i18n Coverage

### High Priority

1. Charter detail pages - Translate charter card content
2. Booking flow - Translate all booking forms and steps
3. Account pages - Translate dashboard and profile pages
4. Search and filters - Translate search UI and filters
5. Error pages - Translate 404, 500, etc.

### Medium Priority

6. Blog posts - Consider multilingual blog content
7. Email notifications - Translate email templates based on user locale
8. Date and time formatting - Localized date/time display
9. Currency formatting - Ensure RM formatting works for both locales
10. SEO metadata - Translate page titles and meta descriptions

### Low Priority

11. Charter descriptions - Consider translating charter operator content
12. Reviews and ratings - Handle multilingual user-generated content
13. Chat/messages - Real-time translation or language matching

## Testing

### Manual Testing

1. Visit `http://localhost:3001` → Should redirect to home page
2. Click language switcher → Should toggle between (my)/en
3. Navigate to different pages → Should maintain selected language
4. Check URL structure → Default locale: "my"` prefix
5. Check browser back button → Should work correctly with locale switching

### Automated Testing

```bash
npm run typecheck  # Verify no TypeScript errors
```

## Common Issues & Solutions

### Issue: Links not maintaining locale

**Solution:** Always include locale prefix in links. Use `useLocale()` in client components or `getLocale()` in server components.

### Issue: Server-side redirects missing locale

**Problem:** `redirect("/account/bookings")` from a page in `[locale]` segment doesn't include locale.

**Solution:** Import `getLocale()` and include locale in redirect:

```tsx
import { getLocale } from "next-intl/server";
const locale = await getLocale();
redirect(`/${locale}/account/bookings`);
```

**Note:** Middleware only intercepts incoming HTTP requests, not server-side redirects!

### Issue: API route redirects don't have locale context

**Problem:** Payment callbacks and other API routes don't know the user's current locale.

**Solution:** Use default locale for redirects:

```tsx
// Use 'my' (default) for API redirects
return NextResponse.redirect(new URL("/my/book/confirm", request.url));
```

### Issue: revalidatePath not working after mutations

**Problem:** Page doesn't refresh after creating/updating content.

**Solution:** Include locale in revalidatePath calls:

```tsx
const locale = await getLocale();
revalidatePath(`/${locale}/blog`);
```

Or revalidate all locales if needed:

```tsx
for (const locale of locales) {
  revalidatePath(`/${locale}/blog`, "page");
}
```

### Issue: Translation key not found

**Solution:** Check that the key exists in both `en.json` and `my.json` files with the same path.

### Issue: Language switcher not working

**Solution:** Ensure you're using the `LanguageSwitcher` component and it has access to `useLocale()` from next-intl.

### Issue: Root layout errors

**Solution:** Never use `notFound()` in the root layout. Use it in the `[locale]/layout.tsx` instead.

### Issue: Params not awaited error

**Solution:** In Next.js 15, always await params: `const { locale } = await params;`

## Migration Checklist

### Core Setup

- [x] Install and configure next-intl
- [x] Set up locale routing with middleware (`localePrefix: 'always'`)
- [x] Create translation files (en.json, my.json)
- [x] Update root and locale layouts
- [x] Create LanguageSwitcher component

### Components & Pages

- [x] Update Navbar with locale-aware links
- [x] Update Footer with locale-aware links
- [x] Update AuthModal with locale-aware links
- [x] Update NotificationDropdown with locale-aware links
- [x] Update Home page with translations
- [x] Update Marketplace pages (charter detail, search, categories)
- [ ] Update Booking flow with translations
- [ ] Update Account pages with translations
- [ ] Update Search filters with translations
- [ ] Update Auth pages with translations

### API Routes & Server Actions

- [x] Update payment callback API redirects (use default locale)
- [x] Update blog post server actions (create, update, delete, toggle)
- [x] Update blog category server actions (create, update, delete)
- [x] Update blog tag server actions (create, update, delete)
- [x] Update blog comment server actions (approve, delete, create)
- [x] Update payment side effects revalidation (all locales)
- [x] Update page component redirects (account, admin, payment pages)
- [x] Update notification service URLs (all notification actionUrls)
- [x] Update email service URLs (all email URL parameters)
- [x] Update useNotifications hook (toast action URLs)
- [x] Update all createNotification callers (11 files updated)
- [x] Update all sendEmail callers with URL parameters (6 files updated)

### Testing & Polish

- [ ] Add locale-aware metadata
- [ ] Test all navigation flows
- [ ] Test language switching persistence
- [ ] Test redirect flows (auth, payment, errors)
- [ ] Test revalidation after mutations
- [ ] Test SEO with different locales

## Best Practices for Locale-Aware URLs

### 1. Notification & Email URLs

**Always use default locale `/my/` for notifications and emails:**

```typescript
// ✅ CORRECT - Use default locale
await createNotification({
  userId: user.id,
  actionUrl: `/my/account/bookings/${bookingId}`,
  // ...
});

// ❌ WRONG - Missing locale prefix
await createNotification({
  userId: user.id,
  actionUrl: `/account/bookings/${bookingId}`, // Will 404!
  // ...
});
```

**Why?**

- Notifications/emails don't have user's locale context
- Middleware automatically redirects to user's preferred locale
- Using `/my/` ensures the link works for all users
- User's language preference is maintained via session/cookies

### 2. API Route Redirects

**Use default locale for API redirects (no locale context available):**

```typescript
// ✅ CORRECT - Use default locale in API routes
return NextResponse.redirect(new URL("/my/book/confirm", request.url));

// ❌ WRONG - Can't access locale in API routes
const locale = await getLocale(); // This won't work in API routes!
```

### 3. Server Component Redirects

**Use getLocale() for server component redirects:**

```typescript
// ✅ CORRECT - Get current locale
const locale = await getLocale();
redirect(`/${locale}/account/bookings`);

// ❌ WRONG - Hardcoded locale
redirect(`/my/account/bookings`); // Ignores user's language preference
```

### 4. Client Component Links

**Use useLocale() for client component links:**

```tsx
// ✅ CORRECT - Dynamic locale from hook
const locale = useLocale();
<Link href={`/${locale}/charters`}>Charters</Link>

// ❌ WRONG - Hardcoded locale
<Link href="/my/charters">Charters</Link>
```

### 5. Revalidation After Mutations

**Revalidate all locales for shared data:**

```typescript
import { locales } from "@/i18n/config";

// ✅ CORRECT - Revalidate all locales
for (const locale of locales) {
  revalidatePath(`/${locale}/charters`, "page");
}

// ❌ WRONG - Only revalidates one locale
const locale = await getLocale();
revalidatePath(`/${locale}/charters`); // Other language versions won't update!
```

### Quick Reference

| Context                     | Method         | Example                               |
| --------------------------- | -------------- | ------------------------------------- |
| **Notifications/Emails**    | Use `/my/`     | `actionUrl: "/my/account/bookings"`   |
| **API Routes**              | Use `/my/`     | `NextResponse.redirect("/my/...")`    |
| **Server Components**       | `getLocale()`  | `const locale = await getLocale()`    |
| **Client Components**       | `useLocale()`  | `const locale = useLocale()`          |
| **Server Actions**          | `getLocale()`  | `const locale = await getLocale()`    |
| **Revalidation (shared)**   | All locales    | `for (const locale of locales) {...}` |
| **Revalidation (specific)** | Current locale | `revalidatePath(\`/\${locale}/...\`)` |

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- Translation files: `/messages/en.json`, `/messages/(my).json`
- Configuration: `/src/i18n/config.ts`, `/src/i18n/request.ts`
