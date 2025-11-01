# Advanced Filters System

## Overview

The advanced filters system provides a comprehensive, modular filtering interface for the search page. It's designed to be responsive, performant, and maintainable.

## Architecture

### Component Structure

```
src/components/charters/
├── AdvancedFiltersBar.tsx          # Main container component
└── filters/
    ├── index.ts                     # Barrel export
    ├── FilterSection.tsx            # Collapsible section wrapper
    ├── CheckboxFilter.tsx           # Multi-select checkbox list
    ├── RadioFilter.tsx              # Single-select radio buttons
    └── RangeFilter.tsx              # Dual-handle range slider
```

### Filter Categories

The system organizes filters into logical sections:

**Left Column:**

- Price Range (dropdown)
- Trip Type (dropdown)
- Departure Time (radio)
- Duration (radio)
- Fishing Type (radio)

**Right Column:**

- Target Species (checkbox, multi-select)
- Techniques (checkbox, multi-select)
- Amenities (checkbox, multi-select)
- Boat Type (checkbox, multi-select)
- Review Score (range slider)
- Policies & Features (checkbox)
- Charter Style (radio)

## Components

### FilterSection

Collapsible section wrapper with badge support for active filter counts.

```tsx
<FilterSection
  title="Target Species"
  icon={<FishIcon />}
  badge={selectedSpecies.length}
  defaultOpen={true}
>
  {/* Filter content */}
</FilterSection>
```

### CheckboxFilter

Multi-select checkbox list with scrollable container.

```tsx
<CheckboxFilter
  options={[
    { value: "siakap", label: "Siakap (Barramundi)", count: 12 },
    { value: "kembung", label: "Kembung (Mackerel)", count: 8 },
  ]}
  selected={selectedSpecies}
  onChange={(values) => handleMultiSelect("species", values)}
  maxHeight="max-h-64"
  emptyMessage="No species available"
/>
```

### RadioFilter

Single-select radio button group with optional descriptions.

```tsx
<RadioFilter
  name="fishing_type"
  options={[
    {
      value: "inshore",
      label: "Inshore",
      description: "Calm waters, nearshore",
    },
    { value: "offshore", label: "Offshore", description: "Deep sea fishing" },
  ]}
  selected={selectedFishingType}
  onChange={(value) => setParam("fishing_type", value)}
/>
```

### RangeFilter

Dual-handle range slider with formatted labels.

```tsx
<RangeFilter
  min={0}
  max={5}
  step={0.5}
  value={[minRating, maxRating]}
  onChange={([min, max]) => {
    setParam("min_rating", String(min));
    setParam("max_rating", String(max));
  }}
  formatLabel={(val) => `${val} ⭐`}
  unit=""
/>
```

## URL Parameters

All filters sync with URL query parameters for shareability and SEO:

| Parameter           | Type    | Example              | Description                      |
| ------------------- | ------- | -------------------- | -------------------------------- |
| `orderby`           | string  | `price_low_high`     | Sort order                       |
| `price_range`       | string  | `501-1000`           | Price bucket                     |
| `trip_type`         | string  | `Half-Day`           | Trip name filter                 |
| `departure`         | string  | `morning`            | Departure time slot              |
| `duration`          | string  | `half`               | Trip duration                    |
| `fishing_type`      | string  | `inshore`            | Water type                       |
| `species`           | csv     | `siakap,kembung`     | Target species (comma-separated) |
| `techniques`        | csv     | `trolling,jigging`   | Fishing techniques               |
| `amenities`         | csv     | `live-bait,rod-reel` | Included amenities               |
| `boat_type`         | csv     | `speedboat,yacht`    | Boat types                       |
| `min_rating`        | number  | `3.5`                | Minimum review score             |
| `max_rating`        | number  | `5`                  | Maximum review score             |
| `pickup`            | boolean | `1`                  | Pickup available                 |
| `child_friendly`    | boolean | `1`                  | Kid-friendly                     |
| `license_provided`  | boolean | `1`                  | License provided                 |
| `catch_and_keep`    | boolean | `1`                  | Catch & keep policy              |
| `catch_and_release` | boolean | `1`                  | Catch & release policy           |
| `charter_style`     | string  | `private`            | Private or shared                |

## Responsive Behavior

### Mobile (< 768px)

- Filters hidden by default behind a button
- Collapsible with active filter count badge
- Stacks vertically with full width

### Desktop (≥ 768px)

- Always visible
- Two-column grid layout
- Sections default to collapsed state (except Price Range)

## Data Extraction

The search page extracts unique filter options from the charter data:

```tsx
// Extract unique species
const availableSpecies = uniqSorted(
  charters.flatMap((c) => c.species || [])
).sort((a, b) => a.localeCompare(b));

// Extract unique techniques
const availableTechniques = uniqSorted(
  charters.flatMap((c) => c.techniques || [])
).sort((a, b) => a.localeCompare(b));

// Extract unique amenities
const availableAmenities = uniqSorted(
  charters.flatMap((c) => c.includes || [])
).sort((a, b) => a.localeCompare(b));

// Extract unique boat types
const availableBoatTypes = uniqSorted(
  charters.map((c) => c.boat?.type).filter(Boolean)
).sort((a, b) => a.localeCompare(b));
```

## Styling

The system uses:

- Fishon red (`#ec2227`) for primary actions and accents
- Tailwind CSS utilities for layout and spacing
- Custom slider styling for range inputs
- Smooth transitions and hover effects
- Gradient backgrounds for visual depth

## Performance

- Client-side filtering with URL sync (no page reloads)
- Efficient `useMemo` for derived state
- `useCallback` for event handlers
- Lazy rendering with collapsible sections
- Optimized re-renders with proper React keys

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus visible states
- Screen reader friendly

## Future Enhancements

Potential improvements:

- Search within long checkbox lists
- Save filter presets
- Filter count indicators per option
- Date range picker for availability
- Capacity slider
- Distance slider for location-based search
- Advanced boolean logic (AND/OR)

## Maintenance

When adding new filters:

1. Add URL parameter handling in search page
2. Extract unique values from charter data
3. Add filter section to appropriate column
4. Update filtering logic in search page
5. Update this README with new parameter

## Related Files

- `/src/app/(marketplace)/search/page.tsx` - Search results page with filtering logic
- `/src/lib/services/charter-service.ts` - Charter data fetching
- `/prisma/schema.prisma` - Database schema
- `/src/data/` - Static data (amenities, species)
