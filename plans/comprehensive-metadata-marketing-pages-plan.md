## Plan: Comprehensive Metadata for Marketing Pages

Add comprehensive metadata to all **fishon-market marketing pages** (7 pages) and **fishon-captain captain-specific pages** (list-your-business). Includes SEO tags, Open Graph, Twitter Cards, structured data (JSON-LD), and reusable utilities. Fixes critical search engine blocking issues.

**Scope:** fishon-market only (fishon-captain marketing pages will redirect to market, except captain-specific)

**Phases: 6**

### 1. **Phase 1: Critical SEO Fixes**
   - **Objective:** Fix critical search engine blocking in fishon-market root layout and update metadataBase to production URL
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/src/app/layout.tsx` - Remove `robots: { index: false }` and update metadataBase
   - **Tests to Write:**
     - Manual verification: Check robots meta tag in browser dev tools allows indexing
     - Manual verification: Verify metadataBase inheritance in nested pages
   - **Steps:**
     1. Remove `robots: { index: false, follow: false }` from root layout metadata
     2. Update metadataBase from `your-domain-here.com` to `https://www.fishon.my`
     3. Verify in browser that metadata inheritance works correctly

### 2. **Phase 2: Create Shared Metadata Utilities**
   - **Objective:** Build reusable metadata generation helpers and JSON-LD schema builders for consistent implementation
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/src/lib/seo/metadata.ts` - Metadata helper functions
     - `/Users/jangbersahaja/Website/fishon-market/src/lib/seo/structured-data.ts` - JSON-LD schema builders
     - `/Users/jangbersahaja/Website/fishon-market/src/lib/seo/constants.ts` - SEO constants and site config
     - `/Users/jangbersahaja/Website/fishon-market/src/lib/seo/types.ts` - TypeScript interfaces
   - **Tests to Write:**
     - Unit test: `createMetadata()` generates complete Metadata object with all fields
     - Unit test: `createOrganizationSchema()` produces valid JSON-LD
     - Unit test: `createWebSiteSchema()` includes search action
     - Unit test: `createContactPointSchema()` with phone and social links
     - Unit test: `createFAQPageSchema()` with question/answer pairs
   - **Steps:**
     1. Create `src/lib/seo/` directory structure
     2. Define TypeScript interfaces: `PageMetadataConfig`, `StructuredDataConfig`, `SiteConfig`
     3. Create SITE_CONFIG constant with URL, name, description, social handles (Facebook, Instagram, TikTok)
     4. Implement `createMetadata()` helper function (title, description, canonical, OG, Twitter, keywords, robots)
     5. Implement `createOrganizationSchema()` for Organization JSON-LD
     6. Implement `createWebSiteSchema()` with search action
     7. Implement `createContactPointSchema()` for contact pages
     8. Implement `createFAQPageSchema()` for help pages
     9. Implement `createBreadcrumbSchema()` for navigation
     10. Write comprehensive unit tests for all functions

### 3. **Phase 3: Enhance fishon-market Marketing Pages (Part 1)**
   - **Objective:** Add comprehensive metadata to About, Terms, Privacy, and Refund pages using new utilities
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/about/page.tsx` - Refactor to use utilities
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/terms/page.tsx` - Add full metadata
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/privacy/page.tsx` - Add full metadata
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/refund/page.tsx` - Add full metadata
   - **Tests to Write:**
     - Integration test: Verify metadata renders correctly in HTML for each page
     - Integration test: Verify JSON-LD scripts appear in page source
     - Snapshot test: JSON-LD output matches expected schema
   - **Steps:**
     1. Refactor About page to use `createMetadata()` utility (keep existing good structure)
     2. Add comprehensive metadata to Terms page: title, description, canonical URL, OG tags, Twitter Card, keywords (mix: "Fishon", "fishing charter Malaysia", "terms of service")
     3. Remove `robots: { index: false }` from Terms page
     4. Add comprehensive metadata to Privacy page with appropriate keywords
     5. Remove `robots: { index: false }` from Privacy page
     6. Add comprehensive metadata to Refund page with appropriate keywords
     7. Remove `robots: { index: false }` from Refund page
     8. Add TODO comments for OG images: `// TODO: Add branded OG image (1200x630px) for social sharing`
     9. Write integration tests to verify metadata completeness

### 4. **Phase 4: Enhance fishon-market Marketing Pages (Part 2)**
   - **Objective:** Add comprehensive metadata to Captain Terms, Help, and Contact pages with specialized structured data
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/captain-terms/page.tsx` - Add full metadata
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/help/page.tsx` - Add metadata + FAQPage schema
     - `/Users/jangbersahaja/Website/fishon-market/src/app/(marketing)/contact/page.tsx` - Add metadata + ContactPoint schema
   - **Tests to Write:**
     - Integration test: Verify FAQPage schema renders correctly on Help page
     - Integration test: Verify ContactPoint schema renders correctly on Contact page
     - Validation test: Ensure JSON-LD validates against schema.org standards
   - **Steps:**
     1. Add comprehensive metadata to Captain Terms page with keywords targeting captains
     2. Remove `robots: { index: false }` from Captain Terms page
     3. Enhance Help page with full metadata
     4. Add FAQPage JSON-LD schema to Help page using `createFAQPageSchema()`
     5. Enhance Contact page with full metadata
     6. Add ContactPoint JSON-LD schema to Contact page with social links (Facebook, Instagram, TikTok)
     7. Add TODO comments for OG images on all pages
     8. Write tests to verify structured data validity

### 5. **Phase 5: Add Global Structured Data & Enhance Captain Page**
   - **Objective:** Inject Organization and WebSite JSON-LD at root layout, enhance list-your-business page
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/src/app/layout.tsx` - Add global JSON-LD scripts
     - `/Users/jangbersahaja/Website/fishon-captain/src/app/[locale]/(marketing)/list-your-business/page.tsx` - Enhance metadata
   - **Tests to Write:**
     - E2E test: Verify Organization schema appears in page HTML
     - E2E test: Verify WebSite schema with search action appears
     - Manual test: Validate with Google Rich Results Test
   - **Steps:**
     1. Add Organization JSON-LD schema to fishon-market root layout (company info, logo, social profiles)
     2. Add WebSite JSON-LD schema with search action to fishon-market root layout
     3. Enhance list-your-business page in fishon-captain with comprehensive metadata
     4. Add locale-aware metadata for multilingual support
     5. Add TODO comment for OG image
     6. Test schemas with structured data validation tools

### 6. **Phase 6: Documentation and Verification**
   - **Objective:** Document the metadata system, create usage guide, and verify all implementations are complete
   - **Files/Functions to Modify/Create:**
     - `/Users/jangbersahaja/Website/fishon-market/docs/SEO_METADATA_GUIDE.md` - Comprehensive documentation
     - `/Users/jangbersahaja/Website/fishon-market/scripts/audit-metadata.ts` - Automated audit script
   - **Tests to Write:**
     - Manual verification: Check all 7 pages in browser dev tools
     - Manual verification: Facebook Sharing Debugger for OG tags
     - Manual verification: Google Rich Results Test for JSON-LD
   - **Steps:**
     1. Create comprehensive SEO metadata documentation with examples
     2. Document all utility functions with usage examples
     3. Create "Adding Metadata to New Pages" guide
     4. List social media URLs in constants section
     5. Create automated metadata audit script to check completeness
     6. Manually verify all 7 fishon-market pages in browser dev tools
     7. Test Open Graph tags with Facebook Sharing Debugger
     8. Validate all JSON-LD with Google Rich Results Test
     9. Create checklist for future page metadata requirements

**Social Media Links:**
- Facebook: https://www.facebook.com/profile.php?id=61580228252347
- Instagram: https://www.instagram.com/fishon.my?utm_source=qr&igsh=ajltamRvZHI0ZzB4
- TikTok: https://www.tiktok.com/@fishon.my?_r=1&_t=ZS-91Au8zrjbLW
