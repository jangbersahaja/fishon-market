"use client";

import { useTranslations } from "next-intl";

/**
 * Example component demonstrating i18n usage
 * 
 * This component shows how to use translations in:
 * - Simple text
 * - Buttons
 * - Navigation links
 * - Form labels
 * - Error messages
 * 
 * Use this as a reference when implementing translations in other components.
 */
export function I18nExample() {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tValidation = useTranslations("validation");

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-2">i18n Usage Examples</h2>
        <p className="text-gray-600">
          This component demonstrates how to use translations in different contexts.
        </p>
      </div>

      {/* Common translations */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Common Translations</h3>
        <div className="flex gap-2 flex-wrap">
          <button className="px-4 py-2 bg-blue-500 text-white rounded">
            {tCommon("save")}
          </button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded">
            {tCommon("cancel")}
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded">
            {tCommon("delete")}
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded">
            {tCommon("confirm")}
          </button>
        </div>
      </div>

      {/* Navigation translations */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Navigation Translations</h3>
        <nav className="flex gap-4 text-sm">
          <a href="#" className="text-blue-600 hover:underline">
            {tNav("home")}
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            {tNav("charters")}
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            {tNav("blog")}
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            {tNav("account")}
          </a>
        </nav>
      </div>

      {/* Auth translations */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Authentication Translations</h3>
        <form className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              {tAuth("email")}
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded"
              placeholder={tAuth("email")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {tAuth("password")}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              placeholder={tAuth("password")}
            />
          </div>
          <button
            type="button"
            className="w-full px-4 py-2 bg-[#ec2227] text-white rounded"
          >
            {tAuth("signIn")}
          </button>
        </form>
      </div>

      {/* Validation messages */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Validation Translations</h3>
        <div className="space-y-1 text-sm">
          <p className="text-red-600">{tValidation("required")}</p>
          <p className="text-red-600">{tValidation("invalidEmail")}</p>
          <p className="text-red-600">{tValidation("passwordTooShort")}</p>
        </div>
      </div>

      {/* State indicators */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">State Translations</h3>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            {tCommon("loading")}
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            {tCommon("error")}
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {tCommon("success")}
          </span>
        </div>
      </div>

      {/* Code example */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Code Example</h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
          {`import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common');
  
  return <button>{t('save')}</button>;
}`}
        </pre>
      </div>
    </div>
  );
}
