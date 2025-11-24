# Translation Files

This directory contains all translation files for the fishon-market application.

## Files

- **`en.json`** - English translations 🇬🇧
- **`ms.json`** - Malay translations (Bahasa Melayu) 🇲🇾

## Structure

Translation files are organized by feature/category:

```json
{
  "common": {
    // Common UI elements (buttons, states, etc.)
  },
  "nav": {
    // Navigation menu items
  },
  "footer": {
    // Footer links and content
  },
  "home": {
    // Homepage content
  },
  // ... more categories
}
```

## Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `common` | Common UI elements | save, cancel, loading, error |
| `nav` | Navigation menu | home, charters, account, signIn |
| `footer` | Footer content | aboutUs, contactUs, termsOfService |
| `home` | Homepage | title, subtitle, features |
| `charter` | Charter pages | bookNow, viewDetails, duration |
| `booking` | Booking flow | selectDate, confirmBooking |
| `account` | User account | profile, bookings, settings |
| `search` | Search/filters | searchCharters, noResults |
| `auth` | Authentication | signIn, signUp, email, password |
| `validation` | Form validation | required, invalidEmail |
| `errors` | Error messages | somethingWentWrong, pageNotFound |

## Guidelines for Contributors

### When Adding New Translations

1. **Add to BOTH files** - Always update both `en.json` and `ms.json`
2. **Use the same structure** - Keep the same category and key in both files
3. **Use descriptive keys** - Use camelCase: `bookNow`, not `btn1`
4. **Group related items** - Keep related translations in the same category

### Example: Adding a New Translation

**Step 1**: Add to `en.json`
```json
{
  "charter": {
    "existingKey": "Existing text",
    "newFeature": "New Feature Text"  // ← Add here
  }
}
```

**Step 2**: Add to `ms.json` at the SAME location
```json
{
  "charter": {
    "existingKey": "Teks sedia ada",
    "newFeature": "Teks Ciri Baharu"  // ← Add here with Malay translation
  }
}
```

### Translation Quality Guidelines

#### For English (en.json):
- Use clear, concise language
- Use proper grammar and spelling
- Be consistent with terminology
- Consider international English audience

#### For Malay (ms.json):
- Use formal Bahasa Melayu
- Localize for Malaysian context
- Use appropriate Malaysian terms
- Keep length similar to English (for layout consistency)
- For technical terms:
  - Common terms: Can use English (e.g., "Email", "Login")
  - Everyday terms: Translate (e.g., "Search" → "Cari")

### Common Patterns

#### Buttons
```json
{
  "common": {
    "save": "Save",           // en
    "save": "Simpan",         // ms
    "cancel": "Cancel",       // en
    "cancel": "Batal"         // ms
  }
}
```

#### Forms
```json
{
  "auth": {
    "email": "Email",         // en
    "email": "Emel",          // ms
    "password": "Password",   // en
    "password": "Kata Laluan" // ms
  }
}
```

#### Validation
```json
{
  "validation": {
    "required": "This field is required",              // en
    "required": "Ruangan ini diperlukan",              // ms
    "invalidEmail": "Invalid email address",           // en
    "invalidEmail": "Alamat emel tidak sah"            // ms
  }
}
```

### Parameters in Translations

For dynamic values, use curly braces:

```json
{
  "validation": {
    "minAmount": "Minimum amount is {min}",           // en
    "minAmount": "Jumlah minimum ialah {min}"         // ms
  }
}
```

Usage in code:
```typescript
t('minAmount', { min: 50 })
```

### Checking Your Changes

Before committing:

1. **Validate JSON syntax**
   ```bash
   # Check if files are valid JSON
   cat messages/en.json | jq . > /dev/null
   cat messages/ms.json | jq . > /dev/null
   ```

2. **Check both files have same keys**
   - Compare the structure
   - Ensure no missing translations

3. **Test in the application**
   - Load page in English: `http://localhost:3001/en/your-page`
   - Load page in Malay: `http://localhost:3001/your-page`
   - Verify text displays correctly

4. **Run TypeScript check**
   ```bash
   npm run typecheck
   ```

## Current Status

These files contain the foundational translations for:
- ✅ Common UI elements
- ✅ Navigation
- ✅ Footer
- ✅ Authentication
- ✅ Form validation
- ✅ Error messages
- ✅ Basic charter content
- ✅ Basic booking flow

More translations will be added as features are developed.

## Need Help?

- **Quick Start**: See `docs/I18N_QUICKSTART.md`
- **Full Documentation**: See `docs/I18N_IMPLEMENTATION.md`
- **Migration Guide**: See `docs/I18N_MIGRATION_PLAN.md`
- **Example Component**: See `src/components/shared/I18nExample.tsx`

## Translation Contribution Workflow

1. **Identify need** for new translation
2. **Choose or create** appropriate category
3. **Add to both files** with descriptive key
4. **Test locally** in both languages
5. **Commit changes** with clear message:
   ```
   i18n: Add translations for [feature]
   
   - Add [keys] to common category
   - Update [category] with new translations
   ```

## Key Naming Conventions

- **Use camelCase**: `bookNow`, `signIn`, `charterDetails`
- **Be descriptive**: `selectDate` not `date1`
- **Avoid abbreviations**: `description` not `desc`
- **Group prefixes for related items**:
  ```json
  {
    "booking": {
      "selectDate": "...",
      "selectTime": "...",
      "selectGuests": "..."
    }
  }
  ```

## Common Mistakes to Avoid

❌ **Don't**:
- Add to only one file
- Use generic keys like `text1`, `label2`
- Mix languages within a single file
- Forget to escape special characters
- Use different structures in en.json and ms.json

✅ **Do**:
- Add to both files simultaneously
- Use descriptive, meaningful keys
- Keep consistent structure
- Test in both languages
- Use proper JSON escaping for quotes

## File Maintenance

These files should be:
- ✅ Valid JSON (no trailing commas, proper quotes)
- ✅ Properly indented (2 spaces)
- ✅ Alphabetically sorted within categories (optional but helpful)
- ✅ Free of duplicate keys
- ✅ Kept in sync between en.json and ms.json

## Support

For questions about translations:
- Technical issues: Check documentation
- Translation quality: Consult with team
- Missing translations: Add them following this guide

---

**Last Updated**: November 2024  
**Maintained By**: Fishon Development Team
