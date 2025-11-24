# TripSelectionCard Integration Guide

**Status**: 🚧 Pending Implementation  
**Priority**: High  
**Estimated Time**: 1-2 hours

## Overview

This guide provides step-by-step instructions for integrating time-based availability filtering into the TripSelectionCard component. This is the final piece needed to complete Phase 2 time-based scheduling enhancement.

## Current State

### What's Already Implemented ✅

1. **Backend Foundation**:
   - `v_public_charters` view includes time-based unavailability (`isAllDay`, `startTime`, `endTime`)
   - `calculatePartialAvailability()` function returns Map of dates with unavailable time ranges
   - Booked dates API includes PAYMENT_AUTHORIZED bookings with `timeSlots`

2. **Calendar UI**:
   - CalendarPicker accepts `partialAvailability` prop
   - Orange dot badge indicates partial availability
   - Tooltip shows "Some trips available"

### What's Missing 🚧

- **TripSelectionCard** does not filter trips based on time-based unavailability
- Trips show as available even if their start times conflict with blocked periods
- No visual indication of which specific trips are unavailable

## Implementation Plan

### Step 1: Locate TripSelectionCard Component

**Expected Location**: `/fishon-market/src/components/booking/TripSelectionCard.tsx`

**If Not Found**: Search for trip selection logic in:

- `src/app/book/[id]/page.tsx` (booking page)
- `src/components/charter/` (charter-related components)
- `src/components/booking/` (booking flow components)

### Step 2: Update Component Props

**Add New Props**:

```typescript
interface TripSelectionCardProps {
  trips: Trip[];
  selectedDate: string; // YYYY-MM-DD
  partialAvailability?: Map<string, PartialAvailability>; // NEW
  onSelectTrip: (trip: Trip) => void;
  // ... existing props
}
```

**Import Required Types**:

```typescript
import type { PartialAvailability } from "@/lib/helpers/availability-helpers";
```

### Step 3: Create Time Conflict Detection Utility

**Add Helper Function** (inside component or separate utils file):

```typescript
/**
 * Check if a trip start time conflicts with unavailable time ranges
 *
 * @param tripStartTime - HH:MM format (e.g., "08:00")
 * @param unavailableRanges - Array of time ranges
 * @returns true if conflict exists
 */
function isTimeInConflict(
  tripStartTime: string,
  unavailableRanges: { startTime: string; endTime: string }[]
): boolean {
  const [tripHour, tripMin] = tripStartTime.split(":").map(Number);
  const tripMinutes = tripHour * 60 + tripMin;

  return unavailableRanges.some((range) => {
    const [startHour, startMin] = range.startTime.split(":").map(Number);
    const [endHour, endMin] = range.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Check if trip start time falls within unavailable range
    return tripMinutes >= startMinutes && tripMinutes < endMinutes;
  });
}
```

### Step 4: Filter Trips by Availability

**Calculate Available Trips**:

```typescript
const TripSelectionCard = ({
  trips,
  selectedDate,
  partialAvailability,
  onSelectTrip,
}: TripSelectionCardProps) => {
  const selectedDatePartial = selectedDate
    ? partialAvailability?.get(selectedDate)
    : undefined;

  const tripsWithAvailability = useMemo(() => {
    if (!selectedDatePartial) {
      // No time-based unavailability - all trips available
      return trips.map((trip) => ({ trip, isAvailable: true }));
    }

    // Check each trip against unavailable time ranges
    return trips.map((trip) => {
      // If trip has no start times defined, assume available
      if (!trip.startTimes || trip.startTimes.length === 0) {
        return { trip, isAvailable: true };
      }

      // Trip is available if ANY start time is not in conflict
      const hasAvailableSlot = trip.startTimes.some(
        (startTime) =>
          !isTimeInConflict(
            startTime.value,
            selectedDatePartial.unavailableTimeRanges
          )
      );

      return { trip, isAvailable: hasAvailableSlot };
    });
  }, [trips, selectedDatePartial]);

  // ... render logic
};
```

### Step 5: Update Trip Card UI

**Visual States**:

1. **Available Trip** (default):

   ```tsx
   <div className="border border-gray-300 rounded-lg hover:border-[#ec2227]">
     {/* Trip content */}
   </div>
   ```

2. **Unavailable Trip** (all start times conflict):

   ```tsx
   <div className="border border-gray-200 rounded-lg opacity-60 pointer-events-none">
     <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
       Unavailable
     </div>
     {/* Trip content with reduced opacity */}
   </div>
   ```

3. **Partially Available Trip** (some start times conflict):

   ```tsx
   <div className="border border-orange-300 rounded-lg hover:border-orange-500">
     <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
       Limited Availability
     </div>
     {/* Show only available start times */}
   </div>
   ```

### Step 6: Filter Start Times Display

**Show Only Available Start Times**:

```typescript
const availableStartTimes = useMemo(() => {
  if (!selectedDatePartial || !trip.startTimes) {
    return trip.startTimes || [];
  }

  return trip.startTimes.filter(
    startTime => !isTimeInConflict(
      startTime.value,
      selectedDatePartial.unavailableTimeRanges
    )
  );
}, [trip.startTimes, selectedDatePartial]);

// Render
{availableStartTimes.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {availableStartTimes.map(time => (
      <span key={time.value} className="text-sm text-gray-700">
        {time.value}
      </span>
    ))}
  </div>
) : (
  <span className="text-sm text-gray-500">No available times</span>
)}
```

### Step 7: Pass Props from Parent Component

**Locate Booking Page** (e.g., `src/app/book/[id]/page.tsx`):

```typescript
// In booking page component
const { charter } = await getCharterById(id); // Contains unavailability
const partialAvailability = calculatePartialAvailability(
  charter.unavailability,
  startDate,
  endDate
);

return (
  <TripSelectionCard
    trips={charter.trips}
    selectedDate={selectedDate}
    partialAvailability={partialAvailability} // NEW
    onSelectTrip={handleSelectTrip}
  />
);
```

## Testing Scenarios

### Test Case 1: No Unavailability

**Setup**: Charter with no unavailability periods  
**Expected**: All trips show as available, no badges

### Test Case 2: All-Day Unavailability

**Setup**: Charter blocked all day (`isAllDay=true`)  
**Expected**: Date strikethrough in calendar, no trips shown for that date

### Test Case 3: Morning Unavailability

**Setup**: Charter blocked 08:00-12:00  
**Expected**:

- Orange dot in calendar
- Morning trips (08:00, 10:00) show "Unavailable"
- Afternoon trips (14:00, 16:00) show as available

### Test Case 4: Multiple Time Blocks

**Setup**: Charter blocked 08:00-10:00 and 14:00-16:00  
**Expected**:

- Orange dot in calendar
- Trips at 08:00, 09:00, 14:00, 15:00 unavailable
- Trips at 10:00, 12:00, 16:00 available

### Test Case 5: All Start Times Blocked

**Setup**: Charter blocked 08:00-18:00, trip has start times 09:00, 11:00, 13:00  
**Expected**:

- Orange dot in calendar
- Trip shows "Unavailable" badge
- Disabled/grayed out

## UI/UX Considerations

### Visual Hierarchy

1. **Fully Available**: Standard border, all start times shown
2. **Partially Available**: Orange border, "Limited Availability" badge, filtered start times
3. **Unavailable**: Gray border, "Unavailable" badge, reduced opacity, not clickable

### Accessibility

- **ARIA Labels**: `aria-disabled="true"` for unavailable trips
- **Screen Reader**: "Trip unavailable for selected date"
- **Keyboard Navigation**: Skip disabled trips in tab order

### Mobile Optimization

- **Compact Badges**: Use icons + text on mobile
- **Touch Targets**: Ensure 44x44px minimum for tappable areas
- **Scroll Performance**: Use `will-change: transform` for smooth scrolling

## Edge Cases to Handle

### 1. Trip Without Start Times

**Scenario**: Legacy trip without `startTimes` array  
**Solution**: Assume available (can't determine conflict)

### 2. Unavailability Spanning Midnight

**Scenario**: Blocked 22:00-02:00  
**Solution**: Handle time comparison correctly (convert to minutes since midnight)

### 3. Multiple Date Selection (Range Mode)

**Scenario**: User selects 3-day trip  
**Solution**: Check availability for ALL dates in range, block trip if ANY date conflicts

### 4. Partial Availability Not Loaded

**Scenario**: `partialAvailability` prop is undefined or empty Map  
**Solution**: Show all trips as available (graceful degradation)

## Performance Optimization

### 1. Memoization

```typescript
const tripsWithAvailability = useMemo(() => {
  // ... filtering logic
}, [trips, selectedDatePartial]);
```

### 2. Early Return

```typescript
if (!selectedDatePartial) {
  // No filtering needed, return early
  return trips.map((trip) => ({ trip, isAvailable: true }));
}
```

### 3. Batch Updates

```typescript
// Use React.memo for trip cards
const TripCard = React.memo(({ trip, isAvailable }) => {
  // ... render logic
});
```

## Integration Checklist

- [ ] Locate TripSelectionCard component file
- [ ] Add `partialAvailability` prop
- [ ] Import `PartialAvailability` type
- [ ] Implement `isTimeInConflict()` helper function
- [ ] Filter trips by availability
- [ ] Update trip card visual states (available/unavailable/partial)
- [ ] Filter start times display
- [ ] Pass props from parent booking page
- [ ] Test all scenarios (no unavailability, morning block, all-day block, etc.)
- [ ] Verify accessibility (ARIA labels, keyboard navigation)
- [ ] Test on mobile devices

## Next Steps After Integration

1. **Manual Testing**: Test on staging environment with various unavailability scenarios
2. **Captain Dashboard**: Build UI in fishon-captain for creating time-based unavailability
3. **User Documentation**: Create help articles explaining partial availability feature
4. **Analytics**: Track usage of time-based unavailability feature
5. **Performance Monitoring**: Monitor API response times, frontend render performance

## Related Documentation

- **Phase 2 Implementation**: `docs/PHASE2_TIME_BASED_SCHEDULING_IMPLEMENTATION.md`
- **Availability System**: `docs/AVAILABILITY_CALCULATION_SYSTEM.md`
- **Booking System**: `docs/config/BOOKING_SYSTEM.md`
- **Operational Calendar**: `docs/config/OPERATIONAL_CALENDAR_SYSTEM.md`

## Questions & Support

**Common Questions**:

1. **Q**: What if a trip has multiple start times and only some conflict?  
   **A**: Show "Limited Availability" badge and display only non-conflicting start times.

2. **Q**: Should unavailable trips be hidden or shown with disabled state?  
   **A**: Show with disabled state (grayed out) so users understand why they can't select it.

3. **Q**: What happens if user selects unavailable trip?  
   **A**: Prevent selection with `pointer-events-none` or show error toast explaining conflict.

4. **Q**: How to handle multi-day trips with different availability per day?  
   **A**: Check availability for each day, block trip if ANY day has full conflict.

---

**Last Updated**: January 2025  
**Status**: Ready for Implementation  
**Assignee**: TBD
