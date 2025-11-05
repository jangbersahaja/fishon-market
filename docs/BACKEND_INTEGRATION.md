# fishon-market: Backend Integration Configuration

## Overview

Fishon Market connects to the Fishon Captain backend to fetch charter data. Two integration methods are supported with automatic fallback:

1. **Direct Database Connection** (Preferred) - Read-only access via PostgreSQL view
2. **Public API** (Fallback) - HTTP REST API at `/api/public/v1/charters`

## Environment Variables

Add to `.env.local`:

```env
# === Direct Database Connection (Preferred) ===
# Enable direct DB access for better performance and real-time data
USE_CAPTAIN_DB=1
CAPTAIN_DATABASE_URL=postgresql://user:pass@host/database?sslmode=require

# === Public API Fallback ===
# Used when direct DB is not available or disabled
FISHON_CAPTAIN_API_URL=https://fishon-captain.vercel.app

# Optional: API key if backend requires authentication
FISHON_CAPTAIN_API_KEY=your-secret-api-key-here
```

## Data Source Priority

The system automatically selects the data source in this order:

1. **Direct DB** (if `USE_CAPTAIN_DB=1` AND `CAPTAIN_DATABASE_URL` is set)
   - Reads from `v_public_charters` PostgreSQL view
   - Real-time data, no caching delays
   - Better performance (no HTTP overhead)

2. **Public API** (fallback)
   - Endpoint: `/api/public/v1/charters` and `/api/public/v1/charters/:id`
   - 5-minute cache (ISR revalidation)
   - Works across different networks/deployments

3. **Error** (if neither is configured)

## Database View Structure

The `v_public_charters` view exposes charter data as JSONB:

```sql
SELECT id, charter FROM v_public_charters;
-- Returns: { id: 'cuid', charter: { ...charter data } }
```

Charter JSONB includes:

- Basic info (id, name, location, description, etc.)
- Captain profile (name, bio, experience, avatar)
- Boat details (name, type, capacity, features)
- Trips array (pricing, duration, species, techniques)
- Media (photos and videos with URLs)
- Amenities and features
- Pickup and policies
- **Schedule** (operational days)
- **Unavailability** (captain-defined blocked dates)

### Unavailability Format

```typescript
unavailability: Array<{
  startDate: string; // ISO format: "2025-11-06T00:00:00"
  endDate: string; // ISO format: "2025-11-08T00:00:00"
  reason: string | null;
}>;
```

Unavailability dates are filtered to only include future dates (`endDate >= CURRENT_DATE`) and are used to block dates in the booking calendar.

## API Endpoints

### v1 Public API

**List all charters:**

```http
GET /api/public/v1/charters
Response: { charters: Charter[] }
```

**Get single charter:**

```http
GET /api/public/v1/charters/:id
Response: { charter: Charter }
```

Both endpoints return the same data structure as the DB view, ensuring consistency across data sources.

## Integration Architecture

```text
┌─────────────────────────────────────────────────────┐
│ fishon-market (Next.js App)                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ charter-service.ts                           │  │
│  │ - Unified data fetching interface            │  │
│  │ - Automatic source selection                 │  │
│  └────────────┬─────────────────────────────────┘  │
│               │                                     │
│       ┌───────┴────────┐                           │
│       ▼                ▼                           │
│  ┌─────────┐     ┌─────────┐                      │
│  │ captain-│     │ captain-│                      │
│  │ db.ts   │     │ api.ts  │                      │
│  └────┬────┘     └────┬────┘                      │
│       │               │                            │
└───────┼───────────────┼────────────────────────────┘
        │               │
        │               │ HTTP
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────────────────────────┐
│ PostgreSQL   │  │ fishon-captain API               │
│ v_public_    │  │ /api/public/v1/charters          │
│ charters     │  │ /api/public/v1/charters/:id      │
└──────────────┘  └──────────────────────────────────┘
```

## Key Files

### Data Fetching Layer

- `src/lib/services/charter-service.ts` - Unified interface with source priority
- `src/lib/api/captain-db.ts` - Direct PostgreSQL view access
- `src/lib/api/captain-api.ts` - HTTP API client (v1 endpoints)

### Data Transformation

- `src/lib/services/charter-adapter.ts` - Converts backend format to frontend types
  - Handles ISO date formats for unavailability
  - Maps charter types, pricing tiers, and nested arrays

### Availability & Booking

- `src/lib/helpers/availability-helpers.ts` - Blocked dates calculation
  - Combines schedule, unavailability, and bookings from charter data
  - Handles ISO timestamp format (`YYYY-MM-DDTHH:MM:SS`)
  - Returns Set of blocked date strings (`YYYY-MM-DD`)
  - Used by booking widgets, calendars, and booking validation

### Type Definitions

- Shared types imported from `@fishon/ui` package
- `BackendCharter` type in `captain-api.ts` matches API/DB structure

## Date Handling

### Unavailability Dates

The system handles two date formats:

1. **Database/API format**: ISO strings with timestamps
   - Example: `"2025-11-06T00:00:00"`
   - Returned by DB view and v1 API

2. **Frontend format**: Date-only strings
   - Example: `"2025-11-06"`
   - Used in calendars and booking widgets

The `calculateBlockedDates` function in `availability-helpers.ts` automatically extracts the date part from ISO strings before processing.

## Testing

### Test Database Connection

```bash
cd fishon-market
npx tsx scripts/test-charter-unavailability.ts
```

This verifies:

- Charter data is fetched correctly
- Unavailability periods are present
- Dates are blocked in the calendar
- ISO date format is handled properly

### Test API Endpoints

```bash
# From fishon-captain project
curl http://localhost:3000/api/public/v1/charters
curl http://localhost:3000/api/public/v1/charters/:id
curl "http://localhost:3000/api/public/v1/charters/:id/availability?startDate=2025-11-05&endDate=2025-11-15"
```

Note: Charter data endpoints require Bearer token authentication (`FISHON_CAPTAIN_API_KEY`). Availability endpoint is public and does not require authentication.

## Migration Notes

### From Legacy API to v1

**Changes:**

- New endpoint paths: `/api/public/v1/charters` (was `/api/public/charters`)
- Added `unavailability` field to charter data
- Added `schedule` field to charter data
- Consistent JSONB structure matching DB view

**Backward Compatibility:**

- Legacy endpoints may still exist but are deprecated
- New code should use v1 endpoints only
- DB view is the source of truth for data structure

### Database View Updates

The `v_public_charters` view must include:

```sql
-- Schedule data
'schedule', CASE
    WHEN cs.id IS NOT NULL THEN
        jsonb_build_object(
            'type', cs."scheduleType",
            'operationalDays', cs."operationalDays"
        )
    ELSE NULL
END,

-- Unavailability data (captain-defined blocked dates)
'unavailability', COALESCE(
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'startDate', cu."startDate",
                'endDate', cu."endDate",
                'reason', cu.reason
            )
            ORDER BY cu."startDate"
        )
        FROM "charter_unavailability" cu
        WHERE cu."charterId" = c.id
          AND cu."endDate" >= CURRENT_DATE
    ),
    '[]'::jsonb
)
```

See migration: `/prisma/migrations/20251021144800_create_v_public_charters_view/migration.sql`

## Troubleshooting

### No charters returned

- Check `USE_CAPTAIN_DB` and connection strings
- Verify `v_public_charters` view exists in database
- Check API endpoint is accessible
- Review server logs for errors

### Unavailability dates not blocking

- Verify migration has been applied
- Check date format in database (should be ISO strings)
- Test with `scripts/test-charter-unavailability.ts`
- Ensure `calculateBlockedDates` is called with correct parameters

### Performance issues

- Enable direct DB connection for better performance
- Consider materialized views for large datasets
- Check database indexes on `Charter.isActive`

## Development Workflow

1. **Local Development**
   - Point to local fishon-captain: `FISHON_CAPTAIN_API_URL=http://localhost:3000`
   - Or use direct DB: `USE_CAPTAIN_DB=1` with local database

2. **Staging/Production**
   - Use direct DB connection for best performance
   - API fallback ensures resilience across deployments

3. **Adding New Fields**
   - Update `v_public_charters` view SQL
   - Run migration in fishon-captain
   - Update `BackendCharter` type in `captain-api.ts`
   - Update adapter in `charter-adapter.ts`
   - Update frontend `Charter` type in `@fishon/ui` if needed
