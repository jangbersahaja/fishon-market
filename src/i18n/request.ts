/**
 * i18n Request Configuration
 * 
 * This file configures how translations are loaded for each request.
 * Used by next-intl to provide translations to server and client components.
 */

import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ locale = defaultLocale }) => {
  // Validate locale
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`../../messages/${validLocale}.json`)).default,
  };
});
