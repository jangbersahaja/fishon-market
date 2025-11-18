## Phase 3 Complete: Enhance Marketing Pages Part 1

Added comprehensive SEO metadata to Terms, Privacy, and Refund Policy pages using the new `createMetadata()` utility. All pages now have complete metadata (title, description, keywords, canonical, OpenGraph, Twitter Card) and allow search engine indexing. Created 27 integration tests to verify metadata completeness.

**Files created/changed:**

- `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/terms/page.tsx`
- `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/privacy/page.tsx`
- `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/refund-policy/page.tsx`
- `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/__tests__/marketing-metadata.test.ts`

**Note:** About page (`/src/app/(marketing)/about/page.tsx`) kept its existing comprehensive manual metadata with JSON-LD Organization schema as it's already well-implemented.

**Functions created/changed:**

**Terms Page:**

- Replaced manual metadata with `createMetadata()` utility
- Added keywords: ["terms of service", "user agreement", "booking terms"]
- Removed `robots: { index: false }` to allow indexing
- Added canonical URL: `https://www.fishon.my/terms`
- Added TODO comment for OG image

**Privacy Page:**

- Replaced manual metadata with `createMetadata()` utility
- Added keywords: ["privacy policy", "data protection", "personal information"]
- Removed `robots: { index: false }` to allow indexing
- Added canonical URL: `https://www.fishon.my/privacy`
- Added TODO comment for OG image

**Refund Policy Page:**

- Replaced manual metadata with `createMetadata()` utility
- Added keywords: ["refund policy", "cancellation", "booking refund"]
- Removed `robots: { index: false }` to allow indexing
- Added canonical URL: `https://www.fishon.my/refund-policy`
- Added TODO comment for OG image

**Tests created/changed:**

- 27 integration tests covering all 4 marketing pages
  - About Page: 6 tests (title, description, indexing, canonical, OG, Twitter)
  - Terms Page: 7 tests (includes keywords verification)
  - Privacy Page: 7 tests (includes keywords verification)
  - Refund Policy Page: 7 tests (includes keywords verification)

**Review Status:** APPROVED

**Git Commit Message:**

```
feat: add comprehensive metadata to marketing pages (terms, privacy, refund)

- Replace manual metadata with createMetadata() utility on Terms, Privacy, Refund pages
- Add relevant keywords for each page (terms, privacy, refund specific)
- Remove robots noindex to allow search engine indexing
- Add canonical URLs for proper SEO
- Include TODO comments for future OG images
- Create 27 integration tests for metadata verification
- Keep About page's existing comprehensive metadata with JSON-LD
```
