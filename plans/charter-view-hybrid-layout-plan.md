# Plan: Charter View Hybrid Layout Redesign

Redesign the charter detail page with a smart photo gallery (portrait-aware), tabbed photo/video gallery, lazy-loaded content sections, and sticky booking widget to reduce cognitive overload and improve visual hierarchy.

**Phases:** 6

1. **Phase 1: Enhance PhotoGallery for Portrait Images**
   - **Objective:** Remove fixed aspect ratio from PhotoGallery main image, dynamically size based on actual image dimensions (portrait, landscape, square)
   - **Files/Functions to Modify/Create:**
     - `src/components/charter/PhotoGallery.tsx` - Update grid layout and image sizing
   - **Tests to Write:**
     - Unit test: Verify portrait image renders with correct aspect ratio
     - Unit test: Verify landscape image maintains 16:9 aspect ratio
     - Unit test: Verify thumbnails layout adapts to screen size
   - **Steps:**
     1. Remove fixed `sm:min-h-[500px]` and `sm:h-auto` constraints
     2. Replace `sm:row-span-2` with flexible height handling using `aspect-auto` or `h-auto`
     3. Update main image container to use `object-contain` instead of `object-cover` to preserve full image
     4. Add `data-aspect` attribute to track image dimensions for CSS calculations
     5. Test with portrait (3:4), landscape (16:9), and square (1:1) images
     6. Verify mobile horizontal scrolling still works smoothly

2. **Phase 2: Create GalleryTabs Component**
   - **Objective:** Build tab switcher for Photos ↔ Videos without layout shift, managing gallery state elegantly
   - **Files/Functions to Modify/Create:**
     - `src/components/charter/GalleryTabs.tsx` - New tab component
     - `src/components/charter/PhotoGallery.tsx` - Minor props update for integration
     - `src/components/charter/VideoGallery.tsx` - Minor props update for integration
   - **Tests to Write:**
     - Unit test: Verify tabs render correctly
     - Unit test: Verify clicking tab switches galleries without re-rendering parent
     - Unit test: Verify active tab styling
   - **Steps:**
     1. Create `GalleryTabs.tsx` as client component with `useState` for active tab
     2. Accept `photos`, `videos`, `hasPhotos`, `hasVideos` as props
     3. Render PhotoGallery or VideoGallery based on active tab
     4. Add tab indicators showing photo count + video count
     5. Only render photos/videos tabs if content exists
     6. Ensure no layout shift between gallery types

3. **Phase 3: Implement Lazy Loading with Suspense**
   - **Objective:** Lazy-load non-critical content sections (About, Schedule, Amenities, Trips, Captain, Boat, Policies, Reviews) to reduce initial paint time
   - **Files/Functions to Modify/Create:**
     - `src/app/(marketplace)/charters/[id]/page.tsx` - Wrap sections with Suspense
     - `src/components/charter/LazySection.tsx` - New wrapper component for consistent skeleton UI
   - **Tests to Write:**
     - Integration test: Verify Suspense boundaries render correctly
     - Integration test: Verify lazy sections load on scroll
     - Visual test: Verify skeleton loaders appear during load
   - **Steps:**
     1. Create `LazySection.tsx` component that wraps content with consistent skeleton UI
     2. Group related sections: (About + Schedule), (Amenities), (Trips), (Captain + Boat), (Policies + Reviews)
     3. Add Suspense boundaries around each group with fallback UI
     4. Import sections dynamically if needed for code splitting
     5. Use IntersectionObserver pattern or Next.js `dynamic()` for trigger points
     6. Test on slow network to verify loading behavior

4. **Phase 4: Refactor Page Layout Structure**
   - **Objective:** Update charter detail page to use GalleryTabs, reorganize content into sections, maintain sticky booking widget
   - **Files/Functions to Modify/Create:**
     - `src/app/(marketplace)/charters/[id]/page.tsx` - Restructure sections, add Suspense
   - **Tests to Write:**
     - Integration test: Verify page renders with all sections
     - Responsive test: Verify layout on mobile (single col), tablet (2 col), desktop (3 col)
     - Accessibility test: Verify tab navigation with keyboard
   - **Steps:**
     1. Replace inline PhotoGallery + VideoGallery with new GalleryTabs component
     2. Wrap About section in Suspense with skeleton
     3. Wrap Schedule section in Suspense with skeleton
     4. Wrap Amenities + Trips in Suspense group with skeleton
     5. Wrap Captain + Boat sections in Suspense group with skeleton
     6. Wrap Policies + Reviews in Suspense group with skeleton
     7. Verify booking widget remains sticky and visible
     8. Test scroll behavior on all devices

5. **Phase 5: Add Smart Skeleton Loaders**
   - **Objective:** Create visually consistent skeleton UI for lazy-loaded sections to reduce cumulative layout shift
   - **Files/Functions to Modify/Create:**
     - `src/components/charter/skeletons/SectionSkeleton.tsx` - Generic skeleton
     - `src/components/charter/skeletons/AboutSkeleton.tsx` - About section skeleton
     - `src/components/charter/skeletons/CardGridSkeleton.tsx` - Multi-card grid skeleton
   - **Tests to Write:**
     - Unit test: Verify skeleton renders correct structure
     - Visual test: Verify skeleton dimensions match actual content
   - **Steps:**
     1. Create generic `SectionSkeleton` component for headings + text
     2. Create `AboutSkeleton` for 3-4 paragraph placeholder lines
     3. Create `CardGridSkeleton` for Amenities/Trips grid cards
     4. Create `AvatarSkeleton` for Captain/Boat sections
     5. Use `animate-pulse` Tailwind class for subtle shimmer effect
     6. Match actual content heights to minimize layout shift

6. **Phase 6: Test & Verify Responsive Behavior**
   - **Objective:** Comprehensive testing on all screen sizes, image types, and network speeds
   - **Files/Functions to Modify/Create:** None (testing only)
   - **Tests to Write:**
     - E2E test: Mobile flow - gallery tab switching, scrolling, booking access
     - E2E test: Desktop flow - sticky widget, content loading, tab switching
     - Performance test: Measure FCP, LCP, CLS metrics
     - Accessibility test: WCAG 2.1 compliance for tabs, focus management
   - **Steps:**
     1. Test on iPhone SE (375px), iPad (768px), Desktop (1440px)
     2. Test with portrait images from Unsplash (3:4 aspect ratio)
     3. Test with landscape images (16:9 aspect ratio)
     4. Test with slow 3G network to verify lazy loading UX
     5. Verify keyboard navigation through tabs
     6. Check screen reader compatibility for tab labels
     7. Run Lighthouse audit for performance

**Open Questions:**

1. Should lazy-loaded sections auto-trigger on scroll, or require explicit visibility intersection observer?
2. Do you want skeleton loaders for all sections, or only critical path sections (About, Trips)?
3. Should the VideoGallery remain a carousel, or convert to grid like photos?
4. Any specific skeleton animation preference (pulse, shimmer, gradient)?
5. Should booking widget persist when scrolling on mobile (fixed at bottom), or remain sticky only on desktop?
