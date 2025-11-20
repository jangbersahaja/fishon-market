# i18n Migration Plan

## Overview

This document outlines the step-by-step plan to migrate the existing fishon-market application to use the new i18n infrastructure.

## Current Status

✅ **COMPLETED**:
- i18n infrastructure setup (next-intl)
- Translation files created (en.json, ms.json)
- Middleware configured for locale routing
- LanguageSwitcher component created
- Documentation written

⏳ **PENDING**:
- App Router restructuring to use `[locale]` parameter
- Component migration to use translations
- Testing and validation

## Migration Strategy

We will use a **phased approach** to minimize disruption:

### Phase 1: App Router Restructuring ⚠️ CRITICAL
**Priority**: HIGH  
**Effort**: Medium  
**Risk**: Medium

This phase restructures the app directory to support locale parameters.

#### Steps:

1. **Create `[locale]` directory structure**
   ```bash
   mkdir -p src/app/[locale]
   ```

2. **Move route groups into `[locale]`**
   ```bash
   # Move each route group
   mv src/app/(account) src/app/[locale]/(account)
   mv src/app/(auth) src/app/[locale]/(auth)
   mv src/app/(dev) src/app/[locale]/(dev)
   mv src/app/(marketing) src/app/[locale]/(marketing)
   mv src/app/(marketplace) src/app/[locale]/(marketplace)
   mv src/app/__tests__ src/app/[locale]/__tests__
   mv src/app/admin src/app/[locale]/admin
   mv src/app/blog src/app/[locale]/blog
   
   # Move files
   mv src/app/page.tsx src/app/[locale]/page.tsx
   ```

3. **Create new root layout**
   
   Create `src/app/layout.tsx`:
   ```typescript
   import { locales } from '@/i18n/config';
   import { NextIntlClientProvider } from 'next-intl';
   import { getMessages } from 'next-intl/server';
   
   export function generateStaticParams() {
     return locales.map((locale) => ({ locale }));
   }
   
   export default async function RootLayout({
     children,
     params: { locale }
   }: {
     children: React.ReactNode;
     params: { locale: string };
   }) {
     const messages = await getMessages();
     
     return (
       <html lang={locale}>
         <body>
           <NextIntlClientProvider messages={messages}>
             {children}
           </NextIntlClientProvider>
         </body>
       </html>
     );
   }
   ```

4. **Update existing layout**
   
   Move current `src/app/layout.tsx` to `src/app/[locale]/layout.tsx` and update it to remove the `<html>` and `<body>` tags (they're now in root layout).

5. **Test routing**
   - Verify `/` redirects to `/` (default Malay)
   - Verify `/en` works
   - Verify all routes work with and without `/en` prefix

#### Files to Update:
- `src/app/layout.tsx` (move and modify)
- All route groups (move into `[locale]` folder)
- `middleware.ts` (may need adjustment)

#### Testing Checklist:
- [ ] Homepage loads at `/` and `/en`
- [ ] All route groups work with both locales
- [ ] Authentication still works
- [ ] Protected routes work
- [ ] Redirects still function correctly

---

### Phase 2: Layout Components Migration
**Priority**: HIGH  
**Effort**: Small  
**Risk**: Low

Migrate layout components (Navbar, Footer, Chrome) to use translations.

#### Files to Update:

1. **`src/components/layout/Navbar.tsx`**
   - Navigation links
   - Sign in/Sign out buttons
   - Account dropdown
   - Add LanguageSwitcher

2. **`src/components/layout/Footer.tsx`**
   - Footer sections
   - Link text
   - Copyright notice

3. **Update Chrome if needed**

#### Example Migration:

**Before:**
```typescript
<Link href="/charters">Charters</Link>
<button>Sign In</button>
```

**After:**
```typescript
const t = useTranslations('nav');
<Link href="/charters">{t('charters')}</Link>
<button>{t('signIn')}</button>
```

---

### Phase 3: Common Components Migration
**Priority**: MEDIUM  
**Effort**: Medium  
**Risk**: Low

Migrate frequently used shared components.

#### Priority Components:

1. **Button components**
   - Common actions (Save, Cancel, Delete, etc.)

2. **Form components**
   - Labels, placeholders, validation messages

3. **Status badges**
   - Loading, Error, Success states

4. **Modal dialogs**
   - Confirm/Cancel buttons
   - Modal titles

---

### Phase 4: Page-Specific Content Migration
**Priority**: LOW (can be done incrementally)  
**Effort**: Large  
**Risk**: Low

Migrate page-specific content. This should be done incrementally as features are developed or modified.

#### Pages to Migrate (Priority Order):

1. **Homepage** (`src/app/[locale]/page.tsx`)
   - Hero content
   - Feature descriptions
   - Call-to-action buttons

2. **Authentication pages** (`src/app/[locale]/(auth)/`)
   - Login page
   - Register page
   - Forgot password page

3. **Charter pages** (`src/app/[locale]/(marketplace)/charters/`)
   - Charter listing page
   - Charter detail page
   - Booking forms

4. **Account pages** (`src/app/[locale]/(account)/account/`)
   - Profile page
   - Bookings page
   - Settings page

5. **Marketing pages** (`src/app/[locale]/(marketing)/`)
   - About page
   - Contact page
   - Terms, Privacy pages

6. **Blog** (`src/app/[locale]/blog/`)
   - Blog listing
   - Blog post pages
   - Comments

7. **Admin pages** (`src/app/[locale]/admin/`)
   - Admin dashboard
   - Admin tools

---

## Implementation Guidelines

### For Each Component Migration:

1. **Identify translatable strings**
   - Text content
   - Button labels
   - Form labels
   - Validation messages
   - Error messages

2. **Check if translation exists**
   - Look in `messages/en.json`
   - If not, add to both `en.json` and `ms.json`

3. **Import translation hook**
   ```typescript
   import { useTranslations } from 'next-intl';
   ```

4. **Replace hardcoded strings**
   ```typescript
   const t = useTranslations('category');
   // Replace "Sign In" with {t('signIn')}
   ```

5. **Test in both languages**
   - Test at `/` (Malay)
   - Test at `/en` (English)

### Adding New Translations

When you need a translation that doesn't exist:

1. **Choose appropriate category** or create new one
   - Use existing: `common`, `nav`, `charter`, etc.
   - Create new if needed (keep related translations together)

2. **Add to both files** in the SAME location:
   
   **messages/en.json:**
   ```json
   {
     "charter": {
       "existingKey": "...",
       "yourNewKey": "Your English Text"
     }
   }
   ```
   
   **messages/ms.json:**
   ```json
   {
     "charter": {
       "existingKey": "...",
       "yourNewKey": "Teks Bahasa Melayu Anda"
     }
   }
   ```

3. **Use descriptive keys**
   - ✅ `bookNow`, `charterDescription`, `selectDate`
   - ❌ `text1`, `btn2`, `label`

### Translation Quality Guidelines

For Malay translations:

1. **Use formal Malay** (Bahasa Melayu formal)
2. **Localize, don't just translate**
   - Consider Malaysian context
   - Use locally appropriate terms
3. **Keep length similar** to English to avoid layout issues
4. **Technical terms**: 
   - Consider using English for widely-known terms (e.g., "Charter", "Email")
   - Translate common terms (e.g., "Search" → "Cari")

---

## Migration Tracking

### Component Migration Status

| Component | Status | Assignee | Notes |
|-----------|--------|----------|-------|
| App Router | ⏳ Todo | - | Phase 1 |
| Navbar | ⏳ Todo | - | Phase 2 |
| Footer | ⏳ Todo | - | Phase 2 |
| Homepage | ⏳ Todo | - | Phase 4 |
| Login/Register | ⏳ Todo | - | Phase 4 |
| Charter Listing | ⏳ Todo | - | Phase 4 |
| Charter Detail | ⏳ Todo | - | Phase 4 |
| Booking Flow | ⏳ Todo | - | Phase 4 |
| Account Pages | ⏳ Todo | - | Phase 4 |
| Admin Pages | ⏳ Todo | - | Phase 4 |
| Blog | ⏳ Todo | - | Phase 4 |

Legend:
- ✅ Complete
- 🔄 In Progress
- ⏳ Todo
- ⏸️ Blocked

---

## Testing Plan

### Unit Tests

For each migrated component:

```typescript
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

test('renders in English', () => {
  const messages = { nav: { home: 'Home' } };
  
  render(
    <NextIntlClientProvider messages={messages} locale="en">
      <MyComponent />
    </NextIntlClientProvider>
  );
  
  expect(screen.getByText('Home')).toBeInTheDocument();
});

test('renders in Malay', () => {
  const messages = { nav: { home: 'Laman Utama' } };
  
  render(
    <NextIntlClientProvider messages={messages} locale="ms">
      <MyComponent />
    </NextIntlClientProvider>
  );
  
  expect(screen.getByText('Laman Utama')).toBeInTheDocument();
});
```

### Manual Testing Checklist

For each migrated page:

- [ ] Page loads at default locale (no `/ms`)
- [ ] Page loads at `/en` prefix
- [ ] Language switcher changes content
- [ ] All text is translated
- [ ] Forms work correctly
- [ ] Validation messages appear in correct language
- [ ] Error messages appear in correct language
- [ ] Layout doesn't break (text length differences)
- [ ] Links work correctly
- [ ] SEO meta tags are correct

---

## Risk Mitigation

### Potential Issues:

1. **URL Changes**
   - **Risk**: Breaking existing links
   - **Mitigation**: Add redirects in `next.config.ts`

2. **Layout Shifts**
   - **Risk**: Different text lengths breaking layout
   - **Mitigation**: Use flexible layouts, test both languages

3. **Missing Translations**
   - **Risk**: Keys not found, showing raw keys
   - **Mitigation**: TypeScript catches most issues, add fallbacks

4. **SEO Impact**
   - **Risk**: Duplicate content, wrong language tags
   - **Mitigation**: Implement hreflang tags, proper meta tags

5. **User Confusion**
   - **Risk**: Users not knowing how to switch language
   - **Mitigation**: Prominent language switcher, remember preference

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: App Router | 2-3 days | None |
| Phase 2: Layouts | 1 day | Phase 1 |
| Phase 3: Common Components | 2-3 days | Phase 1, 2 |
| Phase 4: Page Content | Ongoing | Phase 1, 2, 3 |

**Total Initial Setup**: ~1 week  
**Full Migration**: 2-4 weeks (depending on content volume)

---

## Success Criteria

The migration is considered successful when:

- ✅ All pages load in both languages
- ✅ Language switcher works on all pages
- ✅ No broken layouts due to text length differences
- ✅ All forms and validation work in both languages
- ✅ SEO is properly configured (lang tags, hreflang)
- ✅ User language preference is remembered
- ✅ All automated tests pass
- ✅ No TypeScript errors

---

## Post-Migration Tasks

After completing the migration:

1. **Update documentation**
   - Mark migration as complete
   - Document any issues found
   - Update contribution guidelines

2. **Add CI checks**
   - Verify both translation files have same keys
   - Check for missing translations

3. **Monitor analytics**
   - Track language usage
   - Identify popular pages needing translation priority

4. **User feedback**
   - Collect feedback on translations
   - Improve based on user input

---

## Resources

- **Quick Start Guide**: `docs/I18N_QUICKSTART.md`
- **Full Documentation**: `docs/I18N_IMPLEMENTATION.md`
- **Translation Files**: `messages/en.json`, `messages/ms.json`
- **Example Component**: `src/components/shared/I18nExample.tsx`
- **next-intl Docs**: https://next-intl-docs.vercel.app/

---

## Questions or Issues?

If you encounter any issues during migration:

1. Check the documentation
2. Review the example component
3. Test with both locales
4. Check TypeScript errors
5. Ask the team for help

Contact: support@fishon.my
