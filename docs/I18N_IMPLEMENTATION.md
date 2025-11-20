# Internationalization (i18n) Implementation Guide

## Overview

This document describes the internationalization (i18n) implementation for the fishon-market application, supporting both Malay (ms) and English (en) languages.

## Technology Stack

- **Library**: next-intl v3.x
- **Framework**: Next.js 15 (App Router)
- **Default Language**: Malay (ms) - Malaysia's national language
- **Supported Languages**: 
  - Malay (ms) - `Bahasa Melayu` 🇲🇾
  - English (en) - `English` 🇬🇧

## Architecture

### Directory Structure

```
fishon-market/
├── messages/                    # Translation files
│   ├── en.json                 # English translations
│   └── ms.json                 # Malay translations
├── src/
│   ├── i18n/
│   │   ├── config.ts           # i18n configuration (locales, default locale)
│   │   └── request.ts          # next-intl request configuration
│   └── components/
│       └── shared/
│           └── LanguageSwitcher.tsx  # Language switcher component
├── middleware.ts                # Middleware for locale routing & auth
└── next.config.ts              # Next.js config with next-intl plugin
```

### Configuration Files

#### 1. i18n Configuration (`src/i18n/config.ts`)

Defines available locales, default locale, and locale metadata:

```typescript
export const locales = ['ms', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ms';
```

#### 2. Request Configuration (`src/i18n/request.ts`)

Configures how translations are loaded for each request:

```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

#### 3. Middleware (`middleware.ts`)

Handles both locale routing and authentication:

- Integrates next-intl middleware for locale detection and routing
- Uses `localePrefix: "as-needed"` - default locale (ms) doesn't show in URL
- Maintains existing authentication logic for protected routes

#### 4. Next.js Configuration (`next.config.ts`)

Wraps Next.js config with next-intl plugin:

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
module.exports = withNextIntl(nextConfig);
```

## Translation Files Structure

Translation files are organized by feature/domain in JSON format:

```json
{
  "common": {
    "loading": "...",
    "error": "...",
    "save": "..."
  },
  "nav": {
    "home": "...",
    "charters": "..."
  },
  "footer": {
    "aboutUs": "...",
    "contactUs": "..."
  },
  // ... more categories
}
```

### Translation Categories

- **common**: Common UI elements (buttons, actions, states)
- **nav**: Navigation menu items
- **footer**: Footer links and content
- **home**: Home page content
- **charter**: Charter-related content (listings, details)
- **booking**: Booking flow content
- **account**: User account pages
- **search**: Search and filter UI
- **auth**: Authentication (login, register)
- **validation**: Form validation messages
- **errors**: Error messages

## Usage Guide

### In Server Components

```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('common');
  
  return <h1>{t('loading')}</h1>;
}
```

### In Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('nav');
  
  return <button>{t('signIn')}</button>;
}
```

### With Parameters

```typescript
const t = useTranslations('validation');
// Translation: "Minimum amount is {min}"
t('minAmount', { min: 50 }); // Output: "Minimum amount is 50"
```

### Language Switcher

Use the `LanguageSwitcher` component in navigation:

```typescript
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

<LanguageSwitcher />
```

## URL Structure

With `localePrefix: "as-needed"`:

- **Malay (default)**: 
  - `https://fishon.my/` 
  - `https://fishon.my/charters`
  - `https://fishon.my/account`

- **English**:
  - `https://fishon.my/en`
  - `https://fishon.my/en/charters`
  - `https://fishon.my/en/account`

## App Router Structure (FUTURE IMPLEMENTATION)

**NOTE**: Currently, the app structure has NOT been migrated to use `[locale]` folder. This is documented here as the next step.

### Current Structure (Before Migration)
```
src/app/
├── (account)/
├── (auth)/
├── (marketplace)/
├── layout.tsx
└── page.tsx
```

### Target Structure (After Migration)
```
src/app/
├── [locale]/
│   ├── (account)/
│   ├── (auth)/
│   ├── (marketplace)/
│   ├── layout.tsx
│   └── page.tsx
└── layout.tsx (root layout for locale wrapper)
```

### Migration Steps (TODO)

1. **Create `[locale]` directory** in `src/app/`
2. **Move all route groups** into `[locale]/` directory
3. **Update root layout** to handle locale parameter
4. **Update all page imports** to accept locale parameter
5. **Test all routes** with both locales
6. **Update internal links** to use locale-aware routing

## SEO Considerations

### HTML Lang Attribute

Update root layout to set proper `lang` attribute:

```typescript
export default async function RootLayout({ 
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      {/* ... */}
    </html>
  );
}
```

### Hreflang Links

Add alternate language links in metadata:

```typescript
export async function generateMetadata({ params: { locale } }) {
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'ms': '/ms',
        'en': '/en',
      },
    },
  };
}
```

## Translation Workflow

### Adding New Translations

1. **Identify translatable text** in components
2. **Add to both translation files** (`messages/en.json` and `messages/ms.json`)
3. **Use appropriate category** (common, nav, etc.) or create new category
4. **Replace hardcoded text** with translation function
5. **Test in both languages**

### Example: Adding New Translation

**Step 1**: Add to translation files

`messages/en.json`:
```json
{
  "charter": {
    "fishingLicense": "Fishing License Required"
  }
}
```

`messages/ms.json`:
```json
{
  "charter": {
    "fishingLicense": "Lesen Memancing Diperlukan"
  }
}
```

**Step 2**: Use in component

```typescript
const t = useTranslations('charter');
<span>{t('fishingLicense')}</span>
```

## Best Practices

### 1. Translation Keys

- Use **camelCase** for keys: `fishingType`, `bookNow`
- Use **descriptive names**: `signIn` not `btn1`
- Group related translations: `charter.bookNow`, `charter.viewDetails`

### 2. Pluralization

For items that require pluralization:

```json
{
  "items": {
    "one": "{count} item",
    "other": "{count} items"
  }
}
```

```typescript
t('items', { count: 1 }); // "1 item"
t('items', { count: 5 }); // "5 items"
```

### 3. Rich Text

For text with formatting:

```json
{
  "welcome": "Welcome to <b>{name}</b>!"
}
```

```typescript
t.rich('welcome', {
  name: 'Fishon',
  b: (chunks) => <strong>{chunks}</strong>
});
```

### 4. Date & Time Formatting

Use next-intl's built-in formatters:

```typescript
import { useFormatter } from 'next-intl';

const format = useFormatter();
format.dateTime(date, { dateStyle: 'long' });
format.number(1234.56, { style: 'currency', currency: 'MYR' });
```

## Testing

### Manual Testing Checklist

- [ ] Homepage loads in both languages
- [ ] Language switcher works correctly
- [ ] URLs are correct (no `/ms` prefix for Malay)
- [ ] All navigation items are translated
- [ ] Footer content is translated
- [ ] Forms show translated labels and validation messages
- [ ] Error messages appear in correct language
- [ ] User can switch language mid-session
- [ ] Language preference persists across pages

### Automated Testing

```typescript
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

test('renders translated text', () => {
  const messages = { common: { loading: 'Loading...' } };
  
  render(
    <NextIntlClientProvider messages={messages} locale="en">
      <MyComponent />
    </NextIntlClientProvider>
  );
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

## Performance Considerations

### 1. Translation Loading

- Translations are loaded per-request
- Only active locale's translations are loaded
- Translations are cached by Next.js

### 2. Code Splitting

- next-intl automatically splits translations by route
- Only required translations are sent to client

### 3. Build Time

- Translations are validated at build time
- Missing translations cause build errors (if configured)

## Troubleshooting

### Issue: Translations Not Loading

**Solution**: Check that:
1. Translation file exists: `messages/{locale}.json`
2. Key exists in translation file
3. Import path in `request.ts` is correct

### Issue: Wrong Locale Detected

**Solution**: Check:
1. Middleware configuration
2. Cookie/header locale preferences
3. Browser language settings

### Issue: Layout Shifts

**Solution**: 
1. Ensure translated text has similar length
2. Use CSS to prevent layout shift
3. Consider using `min-width` for buttons

## Future Enhancements

### Planned Features

- [ ] **Locale persistence**: Remember user's language preference in cookie
- [ ] **Automatic detection**: Detect locale from browser settings
- [ ] **Dynamic content translation**: Translate charter descriptions from database
- [ ] **Admin translation UI**: Allow admins to edit translations without code changes
- [ ] **Translation coverage report**: Track which strings are translated
- [ ] **RTL support**: If supporting languages like Arabic in future

### Additional Languages

To add a new language (e.g., Chinese):

1. Add locale to `src/i18n/config.ts`: `locales = ['ms', 'en', 'zh']`
2. Create `messages/zh.json` with translations
3. Add label and flag to `localeLabels` and `localeFlags`
4. Test thoroughly

## References

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js 15 Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [MDN: Internationalization](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization)

## Support

For questions or issues with i18n implementation:
- Check this documentation
- Review next-intl documentation
- Contact development team at support@fishon.my
