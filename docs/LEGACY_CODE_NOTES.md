# Legacy Code Notes

This document tracks remaining legacy code patterns that should be addressed in future refactors.

**Last Updated**: November 20, 2025

## Removed in This PR

### Archive Directories
- ✅ `src/app/(account)/account/bookings/_archive/` - Old booking detail route (expired retention period)
- ✅ `docs/archive/` - Old documentation files (43 files removed)

### Dead Mock Data
- ✅ `src/data/mock/charter.ts` - Not imported anywhere
- ✅ `src/data/mock/destination.ts` - Not imported anywhere

### Deprecated Email Code
- ✅ Removed unused email template functions from `src/lib/helpers/email.ts`:
  - `renderBookingCreatedEmail()` - Now in @fishon/email package
  - `renderStatusEmail()` - Now in @fishon/email package
- ✅ Kept only the low-level `sendMail()` transport function (still used by auth routes)

## Remaining Legacy Code (To Be Addressed)

### 1. Mock Ratings System (High Priority)

**Location**: 
- `src/data/mock/receipts.ts` - Mock review data
- `src/utils/ratings.ts` - Mock rating map builder
- `src/lib/helpers/ratings.ts` - Mock rating helpers
- `src/utils/mapIte(my).ts` - Uses mock ratings

**Issue**: 
The app has a real review system (`src/lib/services/review-service.ts` with database-backed reviews), but listing/search pages still use mock ratings from `receipts.ts`.

**Impact**:
- Charter listing pages (`BaseCharterCard`) show fake ratings
- Search pages show inconsistent ratings compared to charter detail pages
- Map markers show fake rating counts

**Recommendation**:
Refactor `BaseCharterCard` and related components to either:
1. Fetch real rating stats from the database (preferred)
2. Remove rating display from listing pages temporarily
3. Use a cached rating aggregation system

**Files to Update**:
- `src/components/charters/BaseCharterCard.tsx` - Currently imports from `@/lib/helpers/ratings`
- `src/app/(marketplace)/search/page.tsx` - Uses `getAverageRating()`
- `src/app/(marketplace)/search/category/type/[type]/page.tsx` - Uses `getRatingMap()`
- `src/utils/mapIte(my).ts` - Uses `getRatingMap()` for map markers

### 2. Email Helper Migration (Medium Priority)

**Location**: 
- `src/lib/helpers/email.ts` - Legacy SMTP transport
- `src/app/api/auth/request-tac/route.ts` - Uses legacy sendMail
- `src/app/api/auth/forgot-password/route.ts` - Uses legacy sendMail

**Issue**:
Auth routes still use the legacy `sendMail()` function with inline HTML strings instead of the new `@fishon/email` package with React Email templates.

**Recommendation**:
1. Create proper email templates in `@fishon/email` for:
   - TAC verification email
   - Password reset email
2. Update auth routes to use `email-service.ts` functions
3. Remove `src/lib/helpers/email.ts` completely

### 3. Blog Mock Data (Low Priority)

**Location**:
- `src/data/mock/blog.ts` - Mock blog posts/categories/tags
- `prisma/seed-blog.ts` - Seed script using mock data

**Issue**:
Blog mock data is only used by the seed script, not by the running application. The blog system works with real database data.

**Recommendation**:
Either:
1. Keep for development/testing purposes (mark as dev-only)
2. Replace with realistic sample data generator
3. Remove if not actively used for seeding

### 4. Unused Exports (Low Priority)

Several barrel exports and utility functions are not imported anywhere (identified by ts-prune):

**Components**:
- Various barrel exports in `src/components/*/index.ts` files
- Some skeleton components

**Utilities**:
- `src/lib/rateLimit.ts` - Some functions (resetRateLimit, isRateLimitExceeded, getRateLimitStats)
- `src/utils/reviewBadges.ts` - summariseBadges function
- `src/lib/analytics-tracking.ts` - trackEventsBatch, TrackEvent type

**Recommendation**:
Review and remove truly unused exports, but keep those that are part of public APIs or might be needed soon.

## Migration Strategy

### Phase 1: Mock Ratings Removal (Next PR)
1. Add real rating aggregation to charter-service
2. Update BaseCharterCard to fetch real ratings
3. Update search pages to use real ratings
4. Remove mock receipts, ratings utilities
5. Test thoroughly on all listing/search pages

### Phase 2: Email System Completion
1. Add TAC/password reset templates to @fishon/email
2. Update auth routes
3. Remove legacy email helper

### Phase 3: Cleanup
1. Review blog mock data usage
2. Remove truly unused exports
3. Final dead code sweep

## Notes

- The repository's custom instructions mention a future `@fishon/packages` consolidation plan
- Mark any shared code with `// TODO(@fishon/packages)` comment
- Keep mock data that's actively used for development/seeding
- Prioritize removing code that causes confusion (like dual rating syste(my))
