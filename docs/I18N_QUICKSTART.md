# i18n Quick Start Guide

## Overview

This guide helps you quickly get started with using translations in the fishon-market application.

## 5-Minute Setup for Developers

### 1. Understanding the Setup

We use **next-intl** with:
- **Malay (ms)** as the default language (no `/ms` prefix in URL)
- **English (en)** as alternative (with `/en` prefix in URL)
- Translation files in `messages/en.json` and `messages/ms.json`

### 2. Using Translations in Components

#### In Client Components

```typescript
"use client";

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common'); // Category from translation file
  
  return (
    <div>
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

#### In Server Components

```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('nav');
  
  return <h1>{t('home')}</h1>;
}
```

### 3. Available Translation Categories

| Category | Use For | Examples |
|----------|---------|----------|
| `common` | Common UI elements | save, cancel, loading, error |
| `nav` | Navigation menu | home, charters, account, signIn |
| `footer` | Footer links | aboutUs, contactUs, termsOfService |
| `home` | Homepage content | title, subtitle, captainTitle |
| `charter` | Charter pages | bookNow, viewDetails, duration |
| `booking` | Booking flow | selectDate, confirmBooking, totalAmount |
| `account` | User account | profile, bookings, settings |
| `search` | Search/filters | searchCharters, noResults, filters |
| `auth` | Authentication | signIn, signUp, email, password |
| `validation` | Form validation | required, invalidEmail, passwordTooShort |
| `errors` | Error messages | somethingWentWrong, pageNotFound |

### 4. Common Use Cases

#### Button Text
```typescript
const t = useTranslations('common');
<button>{t('save')}</button>
```

#### Form Labels
```typescript
const t = useTranslations('auth');
<label>{t('email')}</label>
<input placeholder={t('email')} />
```

#### Error Messages
```typescript
const t = useTranslations('validation');
{error && <p className="text-red-600">{t('required')}</p>}
```

#### Navigation Links
```typescript
const t = useTranslations('nav');
<Link href="/charters">{t('charters')}</Link>
```

### 5. Using Multiple Categories

```typescript
"use client";

import { useTranslations } from 'next-intl';

export function BookingForm() {
  const tCommon = useTranslations('common');
  const tBooking = useTranslations('booking');
  const tValidation = useTranslations('validation');
  
  return (
    <div>
      <h2>{tBooking('title')}</h2>
      <label>{tBooking('selectDate')}</label>
      {/* ... */}
      {error && <p>{tValidation('required')}</p>}
      <button>{tCommon('confirm')}</button>
    </div>
  );
}
```

### 6. Translations with Parameters

For translations that need dynamic values:

**Translation file:**
```json
{
  "validation": {
    "minAmount": "Minimum amount is {min}"
  }
}
```

**Usage:**
```typescript
const t = useTranslations('validation');
t('minAmount', { min: 50 }) // Output: "Minimum amount is 50"
```

### 7. Adding Language Switcher

Add to your navigation component:

```typescript
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export function Navbar() {
  return (
    <nav>
      {/* Your navigation items */}
      <LanguageSwitcher />
    </nav>
  );
}
```

### 8. Adding New Translations

#### Step 1: Add to both translation files

**messages/en.json:**
```json
{
  "charter": {
    "yourNewKey": "Your English Text"
  }
}
```

**messages/ms.json:**
```json
{
  "charter": {
    "yourNewKey": "Teks Bahasa Melayu Anda"
  }
}
```

#### Step 2: Use in component

```typescript
const t = useTranslations('charter');
<span>{t('yourNewKey')}</span>
```

### 9. Testing Translations

Visit your page at:
- **Malay**: `http://localhost:3001/your-page`
- **English**: `http://localhost:3001/en/your-page`

Or use the language switcher component to toggle between languages.

### 10. TypeScript Autocomplete

All translation keys have TypeScript autocomplete! Just type `t('` and your IDE will suggest available keys.

## Common Patterns

### Loading States
```typescript
const t = useTranslations('common');
{isLoading && <p>{t('loading')}</p>}
```

### Empty States
```typescript
const t = useTranslations('search');
{results.length === 0 && <p>{t('noResults')}</p>}
```

### Form Buttons
```typescript
const t = useTranslations('common');
<div className="flex gap-2">
  <button type="submit">{t('save')}</button>
  <button type="button">{t('cancel')}</button>
</div>
```

### Error Handling
```typescript
const t = useTranslations('errors');
{error && (
  <div className="text-red-600">
    {t('somethingWentWrong')}
  </div>
)}
```

## Quick Reference

### Import Statement
```typescript
import { useTranslations } from 'next-intl';
```

### Basic Usage
```typescript
const t = useTranslations('categoryName');
t('translationKey')
```

### With Parameters
```typescript
t('keyWithParam', { paramName: value })
```

### Multiple Categories
```typescript
const t1 = useTranslations('common');
const t2 = useTranslations('nav');
```

## Example Component

See `src/components/shared/I18nExample.tsx` for a complete working example demonstrating all usage patterns.

## Need Help?

- **Full Documentation**: See `docs/I18N_IMPLEMENTATION.md`
- **Translation Files**: `messages/en.json` and `messages/ms.json`
- **Example Component**: `src/components/shared/I18nExample.tsx`
- **next-intl Docs**: https://next-intl-docs.vercel.app/

## Tips

1. **Always add to both files**: When adding new translations, update both `en.json` AND `ms.json`
2. **Use descriptive keys**: Use `bookNow` not `btn1`
3. **Group related keys**: Keep related translations in the same category
4. **Check TypeScript**: Let autocomplete guide you to available translations
5. **Test both languages**: Always verify your changes work in both Malay and English

## Next Steps

After using translations in your components:

1. Run `npm run typecheck` to verify no errors
2. Test in both languages (with and without `/en` prefix)
3. Check the browser's language switcher works correctly
4. Update this guide if you discover new patterns!
