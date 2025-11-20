/**
 * Type definitions for i18n
 * 
 * This file provides type safety for translation keys.
 */

import type enMessages from '../../messages/en.json';

// Type for all translation messages
export type Messages = typeof enMessages;

// Type for translation namespaces
export type TranslationNamespace = keyof Messages;

// Declare global types for next-intl
declare global {
  // Use type safe messages keys with `next-intl`
  interface IntlMessages extends Messages {}
}
