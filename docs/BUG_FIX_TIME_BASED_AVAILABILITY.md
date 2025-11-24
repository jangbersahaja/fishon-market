# Bug Fix: Calendar Picker Time-Based Availability

## Issue

Calendar picker was blocking entire dates even when unavailability was time-based (e.g., only 08:00-12:00). All dates with any unavailability were showing as fully blocked with strikethrough instead of showing orange dots for partial availability.

## Root Cause

The PostgreSQL view (`v_public_charters`) was not exposing the time-based fields (`isAllDay`, `startTime`, `endTime`) from the `charter_unavailability` table. The view only included `startDate`, `endDate`, and `reason`.

**Timeline:**

1. ✅ Database migration added time fields to `charter_unavailability` table
2. ❌ SQL view was not updated to include these fields in the JSON output
3. ❌ TypeScript types in fishon-market didn't include the new fields
4. ❌ No test data existed with `isAllDay=false` to verify functionality

## Solution

### 1. Updated SQL View (fishon-captain)

**File:** `migration_add_time_based_unavailability_to_view.sql`

Updated the unavailability section of `v_public_charters` view:

```sql
'unavailability', COALESCE(
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'startDate', cu."startDate",
                'endDate', cu."endDate",
                'reason', cu.reason,
                'isAllDay', cu."isAllDay",      -- NEW
                'startTime', cu."startTime",    -- NEW
                'endTime', cu."endTime"         -- NEW
            )
            ORDER BY cu."startDate"
        )
        FROM "charter_unavailability" cu
        WHERE cu."charterId" = c.id
    ),
    '[]'::jsonb
)
```

**Command:**

```bash
cd /Users/jangbersahaja/Website/fishon-captain
npx prisma db execute --file migration_add_time_based_unavailability_to_view.sql --schema prisma/schema.prisma
```

### 2. Updated TypeScript Types (fishon-market)

**File:** `src/lib/api/captain-api.ts`

Added time-based fields to `BackendCharter` type:

```typescript
unavailability: Array<{
  startDate: string;
  endDate: string;
  reason: string | null;
  isAllDay?: boolean; // NEW: If false, time-based blocking
  startTime?: string; // NEW: HH:MM format (e.g., "08:00")
  endTime?: string; // NEW: HH:MM format (e.g., "12:00")
}> | null;
```

### 3. Updated Data Converter (fishon-market)

**File:** `src/lib/services/charter-adapter.ts`

Updated `convertUnavailability()` to map new fields:

```typescript
return backendUnavailability.map((period) => ({
  startDate: period.startDate,
  endDate: period.endDate,
  reason: period.reason,
  isAllDay: period.isAllDay, // NEW
  startTime: period.startTime, // NEW
  endTime: period.endTime, // NEW
}));
```

### 4. Created Test Data

**File:** `create-test-unavailability.js`

Created test unavailability records for charter `cmgf4czdp0006uys679s67w8g` (Skipper Prima):

- **2025-11-24**: Morning block (08:00-12:00) - `isAllDay=false`
- **2025-11-25**: Afternoon block (14:00-17:00) - `isAllDay=false`
- **2025-11-26**: Full day block - `isAllDay=true`

## Verification

### Database Query Results

```
Unavailability counts: {
  total_count: 57n,
  time_based_count: 2n,    // ✅ 2 time-based records created
  null_count: 0n,
  all_day_count: 55n
}
```

### View Output (Sample)

```json
[
  {
    "reason": "Test: Morning maintenance",
    "endDate": "2025-11-24T16:00:00",
    "endTime": "12:00",
    "isAllDay": false, // ✅ Time-based flag
    "startDate": "2025-11-24T16:00:00",
    "startTime": "08:00" // ✅ Time fields present
  }
]
```

## Expected Behavior (fishon-market)

### Calendar Picker

1. **2025-11-24 (Morning block 08:00-12:00)**
   - ✅ Should show **orange dot** (partial availability)
   - ✅ Date should be **selectable**
   - ✅ Only trips starting between 08:00-12:00 should show gray "Unavailable" badge

2. **2025-11-25 (Afternoon block 14:00-17:00)**
   - ✅ Should show **orange dot** (partial availability)
   - ✅ Date should be **selectable**
   - ✅ Only trips starting between 14:00-17:00 should show gray "Unavailable" badge

3. **2025-11-26 (Full day block)**
   - ✅ Should show **strikethrough** (fully blocked)
   - ✅ Date should be **disabled/unselectable**
   - ✅ All trips should show gray "Unavailable" badge

### Trip Selection Card

- Trips with start times conflicting with time-based unavailability show gray "Unavailable" badge
- Trips outside time-based unavailability show standard appearance or orange "Limited Availability" badge if date has partial blocks

## Testing Instructions

1. **Navigate to charter booking page:**

   ```
   http://localhost:3000/book/cmgf4czdp0006uys679s67w8g
   ```

2. **Open calendar and check November 2025:**
   - Look for dates 24-26
   - Verify orange dots on 24th and 25th
   - Verify strikethrough on 26th

3. **Select Nov 24 or Nov 25:**
   - Verify trip list shows availability badges correctly
   - Morning/afternoon trips should be marked "Unavailable" based on time conflict

4. **Try selecting different trips:**
   - Non-conflicting trips should remain bookable
   - Conflicting trips should be disabled/marked unavailable

## Files Modified (fishon-market)

1. `src/lib/api/captain-api.ts` - Updated BackendCharter type
2. `src/lib/services/charter-adapter.ts` - Updated convertUnavailability function

## Files Modified (fishon-captain)

1. `migration_add_time_based_unavailability_to_view.sql` - Updated view
2. `create-test-unavailability.js` - Test data creation script
3. `check-unavailability.js` - Verification script

## Cleanup Tasks

After verifying the feature works, you may want to:

1. **Delete test scripts:**

   ```bash
   rm create-test-unavailability.js check-unavailability.js
   ```

2. **Remove test unavailability records:**
   ```sql
   DELETE FROM charter_unavailability
   WHERE reason LIKE 'Test:%'
   AND "charterId" = 'cmgf4czdp0006uys679s67w8g';
   ```

## Related Documentation

- **Phase 2 Implementation:** `docs/PHASE2_TIME_BASED_SCHEDULING_IMPLEMENTATION.md`
- **Booking Configuration:** `docs/config/BOOKING_FLOW.md`
- **Admin Tools:** `docs/config/ADMIN_TOOLS_SYSTEM.md`
