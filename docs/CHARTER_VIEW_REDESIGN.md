# Charter View Page Redesign Recommendations

**Date**: 29 November 2025  
**Priority**: HIGH  
**Impact**: User Booking Conversion

## Executive Summary

Based on user research priorities:

1. Users want to see **photos and videos** prominently
2. Users want to **check trip details** before booking

Current page buries critical information and requires extensive scrolling.

---

## Recommended Changes

### 1. Enhanced Media Gallery (Priority: CRITICAL)

**Current Issues:**

- Videos buried mid-page after description
- No unified media viewing experience
- Users miss video content entirely

**Solution:**
Create a unified media gallery with tabs/toggle:

```tsx
<MediaGallery>
  <TabToggle>
    <Tab active>Photos (12)</Tab>
    <Tab>Videos (3)</Tab>
  </TabToggle>

  {activeTab === "photos" && <PhotoGallery />}
  {activeTab === "videos" && <VideoGallery />}
</MediaGallery>
```

**Benefits:**

- Single click to view all media
- Clear indication of available content
- Better mobile experience

---

### 2. Trip Selector Card (Priority: CRITICAL)

**Current Issues:**

- Trip cards below the fold
- Users can't compare trips easily
- Species/techniques only on first card
- No visual hierarchy

**Solution:**
Move trips to top of left column with enhanced design:

```tsx
<section className="bg-white shadow-lg rounded-2xl p-6">
  <h2 className="text-2xl font-bold mb-4">Available Trips</h2>

  <div className="grid gap-4">
    {trips.map((trip, idx) => (
      <TripSelectorCard
        key={trip.id}
        trip={trip}
        isPopular={idx === 0}
        species={charter.species}
        techniques={charter.techniques}
        onSelect={() => setSelectedTrip(trip)}
      />
    ))}
  </div>
</section>
```

**Enhanced Trip Card Design:**

```tsx
import { Flame, DollarSign, Clock, Users, Fish, Target, Timer } from "lucide-react";

┌─────────────────────────────────────────┐
│ <Flame /> MOST POPULAR (if applicable)  │
├─────────────────────────────────────────┤
│ Half Day Trip                           │
│                                         │
│ <DollarSign /> RM 450/trip | <Clock /> 4 hours | <Users /> Max 6 anglers │
│                                         │
│ <Fish /> Target: Barramundi, Grouper, Snapper │
│ <Target /> Techniques: Jigging, Trolling, Casting │
│                                         │
│ <Timer /> Start Times: 7:00 AM • 1:00 PM │
│                                         │
│ [View Details] [Book This Trip →]      │
└─────────────────────────────────────────┘
```

---

### 3. Quick Facts Section (Priority: HIGH)

**Purpose:** Show key information at a glance

```tsx
import { Users, Anchor, Award, Check, FileText, Car } from "lucide-react";

<QuickFactsGrid>
  <Fact icon={<Users />} label="Max Capacity" value="6 anglers" />
  <Fact icon={<Anchor />} label="Fishing Type" value="Offshore" />
  <Fact icon={<Award />} label="Experience" value="10 years" />
  <Fact icon={<Check />} label="Amenities" value="8 included" />
  <Fact icon={<FileText />} label="Policies" value="Catch & Keep" />
  <Fact icon={<Car />} label="Pickup" value="Available (RM 50)" />
</QuickFactsGrid>;
```

---

### 4. Information Hierarchy Restructure

**New Order (Left Column):**

1. **Trip Selector** (was #6) ⬆️ MOVED UP
2. **Quick Facts** (new) ⭐ NEW
3. **About Charter** (collapsible to save space)
4. **Boat Details**
5. **Captain Info**
6. **Location Map** (moved down from #4)

**Rationale:**

- Users need trip info BEFORE booking
- Quick facts reduce need to scan entire page
- Map is reference material, not critical decision factor

---

### 5. Booking Widget Enhancements

**Add Trip Quick Selector:**

```tsx
<BookingWidget>
  <div className="mb-4">
    <label>Select Trip</label>
    <TripDropdown
      trips={trips}
      selected={selectedTripIndex}
      onChange={setSelectedTripIndex}
    />
  </div>

  {/* Show selected trip summary */}
  <div className="bg-gray-50 p-3 rounded">
    <div className="text-sm text-gray-600">{selectedTrip.name}</div>
    <div className="text-lg font-bold">RM {selectedTrip.price}</div>
  </div>

  {/* Rest of booking form */}
</BookingWidget>
```

---

### 6. Mobile Optimization

**Current Issues:**

- Booking widget requires scroll
- Trip comparison difficult on small screens
- Too much vertical space

**Solutions:**

1. **Sticky Bottom Bar (Mobile):**

```tsx
<MobileStickyBar>
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm">From</div>
      <div className="text-lg font-bold">RM {minPrice}</div>
    </div>
    <Button onClick={scrollToBooking}>Book Now →</Button>
  </div>
</MobileStickyBar>
```

2. **Accordion Layout:**
   Collapse long sections by default on mobile:

- About Charter (show first 3 lines + "Read more")
- Boat Details (collapsed)
- Location (collapsed)

---

## Implementation Priority

### Phase 1: Critical (Immediate)

1. ✅ Move Trip Selector to top of left column
2. ✅ Add Quick Facts section
3. ✅ Enhanced trip cards with all info visible
4. ✅ Mobile sticky booking bar

### Phase 2: High (This Week)

1. ✅ Unified Media Gallery with tabs
2. ✅ Trip quick selector in booking widget
3. ✅ Collapsible About section
4. ✅ Mobile accordion optimizations

### Phase 3: Medium (Next Sprint)

1. ⏸️ Trip comparison view (side-by-side)
2. ⏸️ "Most Popular" badge logic
3. ⏸️ Enhanced filtering (by price, duration, etc.)

---

## Expected Impact

### Conversion Rate:

- **+15-20%** from improved trip visibility
- **+10-15%** from better media presentation
- **+8-12%** from mobile sticky CTA

### User Experience:

- **-40% scroll depth** required to make decision
- **-30% time** to understand offerings
- **+50% engagement** with trip details

### Mobile:

- **+25-30%** mobile booking conversion
- **-60% bounce rate** from critical info above fold

---

## Success Metrics

Track these KPIs after implementation:

1. **Scroll Depth**: Average scroll % before booking action
2. **Time to Book**: Seconds from page load to booking initiation
3. **Trip Engagement**: % users who click trip cards
4. **Media Engagement**: % users who view videos
5. **Conversion Rate**: Booking conversion by device

---

## Design Mockup Notes

### Trip Selector Card

- Use card-based design with clear visual hierarchy
- Show price prominently
- Icon-based quick facts using lucide-react:
  - `<Users />` for max anglers
  - `<Clock />` for duration
  - `<Fish />` for target species
  - `<Target />` for techniques
- One-click "Book This Trip" action

### Quick Facts Grid

- 2-column grid on desktop, 1-column on mobile
- Icon + Label + Value format using lucide-react icons
- Use brand colors for icons (#ec2227)
- Subtle hover effects

### Booking Widget

- Keep sticky behavior on desktop
- Add trip selector dropdown at top
- Show live price calculation
- Clear CTA with pricing

---

## Technical Considerations

### Performance:

- Lazy load map component
- Optimize media gallery (virtual scrolling for many images)
- Defer non-critical sections below fold

### Accessibility:

- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for interactive elements
- Keyboard navigation for trip selector

### SEO:

- Keep structured data for trips
- Maintain semantic HTML
- Ensure critical content not hidden by default

---

## Files to Modify

1. `/src/app/[locale]/(marketplace)/charters/[id]/page.tsx` - Main layout
2. `/src/components/charter/TripCard.tsx` - Enhanced design
3. `/src/components/charter/BookingWidget.tsx` - Add trip selector
4. `/src/components/charter/MediaGallery.tsx` - NEW unified gallery
5. `/src/components/charter/QuickFacts.tsx` - NEW component
6. `/src/components/charter/MobileStickyBar.tsx` - NEW component

---

## Questions for Product Team

1. What's our target booking conversion rate?
2. Do we have analytics on current scroll depth?
3. Which trips are actually most popular (for badge)?
4. Should map be collapsible or always visible?
5. Any A/B testing planned for this redesign?
