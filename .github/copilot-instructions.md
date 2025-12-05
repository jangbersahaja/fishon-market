# Copilot Instructions

# Fishon.my Development Guide

## Purpose & App Structure

Fishon.my is the **customer-facing marketplace** where anglers discover, browse, and book fishing charters across Malaysia. This is one of three interconnected Fishon applications:

- **Fishon.my (this app)**: Public marketplace for anglers to find and book charters
- **Fishon Captain**: Management dashboard for captains/charter operators (registration, editing, analytics)
- **Fishon Video Worker**: External video normalization service

## System Configuration

- Please check on /docs/config/\* to see current system configuration file.
- It's either in Fishon Captain or Fishon Market repository depending on where the main implementation is.
- Treat this document as a living document and update it as necessary when you make changes to the system configuration.

### Booking System (`docs/config/BOOKING_FLOW.md`)

- **Dual Flows**:
  - **MANUAL**: Request → Captain Approve → Pay. Best for lower risk.
  - **AUTO**: Pay Upfront → Captain Acknowledge. Best for instant confirmation.
- **Guest Checkout**: Supported for both flows via email verification (TAC).
- **Payment**: SenangPay integration.
  - **Card**: Tokenized (charged on approval/acknowledgment).
  - **FPX/E-Wallet**: Direct charge (refunded if rejected).
- **Data Sources**:
  1. Direct DB View (`v_public_charters`)
  2. Public API Fallback (`/api/public/v1/charters`)
  3. Guest-safe fallback (defaults to MANUAL if data missing)

### Chat System (`docs/config/CHAT_SYSTEM_CONFIGURATION.md`)

- **Architecture**:
  - **Storage**: fishon-market DB (`Conversation`, `Message` tables).
  - **Access**: Anglers write directly; Captains write via API proxy.
  - **Real-time**: Pusher websockets (`message:new`, `typing:start`, etc.).
- **Lifecycle**:
  - **LOCKED**: Before payment.
  - **ACTIVE**: After payment (PAID/PAYMENT_AUTHORIZED).
  - **CLOSED**: 24h after trip completion.
- **System Messages**: Auto-generated for booking events (Created, Approved, Paid, Cancelled).
- **Unread Counts**: Separate counts for Angler and Captain.

### Current Implementation Status

### ✅ Complete

- Direct database connection to fishon-captain via PostgreSQL view (`v_public_charters`)
- Fallback to fishon-captain Public v1 API (`/api/public/v1/charters`)
- **No dummy data** - all charter data comes from real backend
- Type definitions imported from `@fishon/ui` shared package
- Charter browsing, search, and detail pages
- Angler registration and authentication (NextAuth with Google OAuth)
- Booking flow with guest and authenticated booking
- Analytics tracking (owner-based, removed captainId redundancy)
- Database backup and migration safety system

### 🚧 In Progress

- Reviews and ratings system
- Payment integration
- Captain profile pages on marketplace

### 📋 Planned

- Favorites/wishlist functionality
- Advanced filtering and sorting
- Automated booking confirmation workflow

## Architecture & Patterns

Built with Next.js 16 App Router using **route groups** for logical organization. Follow our established structure when implementing new features.

### Core Stack

- **Framework**: Next.js 16.0.7 (App Router with Route Groups)
- **React**: React 19.2.1 with React DOM
- **Database**: PostgreSQL (Neon-hosted, shared with fishon-captain)
- **ORM**: Prisma
- **Authentication**: NextAuth v4 with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **Type Safety**: TypeScript with strict mode
- **Internationalization**: next-intl 4.5.5 with setRequestLocale pattern
- **Email**: Resend via `@fishon/email` package
- **Build System**: Turbopack (default in Next.js 16)
- **Shared Packages**:
  - `@fishon/ui` - Shared UI components and types (git package)
  - `@fishon/schemas` - Shared validation schemas (git package)
  - `@fishon/email` - Email templates with React Email (git package)

### Next.js 16 Migration Notes

**Completed Changes:**

- Upgraded from Next.js 15.5.3 → 16.0.7
- Upgraded React 19.1.0 → 19.2.1
- Renamed `middleware.ts` → `proxy.ts` (Next.js 16 convention)
- Removed `dynamic = "force-dynamic"` and `runtime = "nodejs"` from route configs
- Added `setRequestLocale(locale)` for next-intl static rendering compatibility
- Wrapped `useSearchParams()` components in Suspense boundaries
- Added `unstable_noStore` to dynamic server components using headers()/cookies()
- Updated async params pattern: `params: Promise<{ id: string }>` with `await params`

**Pending Improvements:**

- Cache Components (PPR) disabled - requires auth pattern refactoring
- React Compiler - optional enhancement for auto-memoization

**Key Patterns for Next.js 16:**

```typescript
// ✅ Async params pattern (required for dynamic routes)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}

// ✅ Suspense wrapper for useSearchParams
import { Suspense } from "react";
<Suspense fallback={<Loading />}>
  <ComponentUsingSearchParams />
</Suspense>

// ✅ Dynamic server component opt-out
import { unstable_noStore as noStore } from "next/cache";
export async function DynamicComponent() {
  noStore(); // Opt out of static rendering
  const session = await auth();
  // ...
}

// ✅ next-intl static rendering
import { setRequestLocale } from "next-intl/server";
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}
```

### Folder Architecture

**CRITICAL**: Always follow this structure when creating new files.

#### App Router Structure (Route Groups)

```
src/app/
├── (auth)/              # 🔐 Authentication pages (no layout)
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (account)/           # 👤 User dashboard (shared sidebar layout)
│   ├── layout.tsx       # Dashboard shell
│   └── account/
│       ├── overview/
│       ├── profile/
│       ├── bookings/
│       └── ...
├── (marketplace)/       # 🎣 Public marketplace (marketplace layout)
│   ├── layout.tsx       # Marketplace shell with navbar
│   ├── charters/
│   ├── search/
│   ├── book/
│   └── ...
├── (marketing)/         # 📄 Static pages (minimal layout)
│   ├── layout.tsx
│   ├── about/
│   ├── contact/
│   └── ...
├── api/                 # 🔌 API routes
└── blog/                # ✅ Blog platform
```

**Route Group Rules:**

1. Parentheses `()` in folder names indicate route groups
2. Route groups don't affect URL structure
3. Each group can have its own `layout.tsx`
4. Use groups to organize related pages and apply shared layouts

#### Component Organization

```
src/components/
├── account/           # Dashboard-specific components
├── auth/              # Auth forms, modals
├── charter/           # Charter detail components
├── charters/          # Charter list/grid components
├── layout/            # Navbar, Footer, Chrome
├── marketing/         # Landing page components
├── search/            # Search & filters
├── shared/            # Reusable utilities
└── ui/                # shadcn/ui primitives
```

**Component Rules:**

1. Organize by feature, not by type
2. Collocate related components
3. Use barrel exports (`index.ts`) for clean imports
4. Shared utilities go in `shared/`

#### Lib Organization

```
src/lib/
├── api/               # API clients (captain-api, captain-db)
├── auth/              # Auth utilities, NextAuth config
├── booking/           # Booking business logic
├── database/          # Prisma clients
├── helpers/           # Helper functions
├── services/          # Data services (charter-service, etc.)
└── webhooks/          # Webhook handlers
```

**Lib Rules:**

1. Group by service domain
2. Keep business logic separate from API clients
3. Database clients in `database/`
4. Reusable helpers in `helpers/`

#### Data & Assets

```
src/
├── data/
│   ├── mock/          # Mock data for development
│   ├── destinations/  # Static destination data
│   └── categories/    # Static category data
├── assets/
│   └── images/
│       ├── brand/     # Logos, branding
│       ├── placeholders/
│       └── icons/
```

### Architecture Conventions

**When Creating New Features:**

1. **New Auth Flow?** → Add page to `app/(auth)/`
2. **New Dashboard Section?** → Add to `app/(dashboard)/account/`
3. **New Public Page?** → Add to `app/(marketplace)/` or `app/(marketing)/`
4. **New Component?** → Create in feature-based folder under `components/`
5. **New Service?** → Add to appropriate `lib/` subfolder
6. **New API Route?** → Add to `app/api/` with logical grouping

**File Placement Examples:**

```typescript
// ✅ CORRECT - Feature-based organization
components / charter / CharterGallery.tsx;
components / booking / BookingForm.tsx;
lib / services / charter - service.ts;
lib / helpers / image - helpers.ts;

// ❌ WRONG - Root-level or type-based
components / CharterGallery.tsx;
components / forms / BookingForm.tsx;
lib / charter - service.ts;
lib / image.ts;
```

**Import Path Examples:**

```typescript
// Component imports
import { CharterGallery } from "@/components/charter/CharterGallery";
import { Navbar } from "@/components/layout/Navbar";

// Service imports
import { getCharters } from "@/lib/services/charter-service";
import { auth } from "@/lib/auth/auth";

// Data imports
import { mockCharters } from "@/data/mock/charter";
```

### Data Architecture

#### Data Sources (Priority Order)

1. **Direct DB Connection** (if `USE_CAPTAIN_DB=1` + `CAPTAIN_DATABASE_URL` set)
   - Reads from `v_public_charters` PostgreSQL view in fishon-captain database
   - View returns: `id` (text) and `charter` (jsonb)
   - Filters only active charters (`isActive = true`)
   - **Note**: This connects fishon-market to fishon-captain's database for read-only charter data

2. **fishon-captain Public v1 API** (fallback)
   - Base URL: `FISHON_CAPTAIN_API_URL`
   - Endpoints: `/api/public/v1/charters`, `/api/public/v1/charters/:id`, `/api/public/v1/charters/:id/availability`
   - Legacy endpoints removed: All `/api/public/charters/*` endpoints (replaced by v1)

3. **Error** - No dummy data fallbacks

**Database Architecture:**

- **fishon-market DB**: User accounts, bookings, reviews, favorites, analytics, blog posts, notifications
- **fishon-captain DB**: Charter data, captain profiles, boats, trips, policies
- **Cross-DB Access**: fishon-market reads charter data via PostgreSQL view or API (read-only)
- **Reverse Access**: fishon-captain reads booking/analytics from fishon-market DB via `MARKET_DATABASE_URL` (read-only)

#### Charter Data Service (`src/lib/charter-service.ts`)

```typescript
// Priority: DB → API → Error
getCharters()                    // Fetch all active charters
getCharterById(id)              // Fetch single charter
searchChartersByCriteria(...)   // Search with filters
getChartersByType(type)         // Filter by fishing type
getChartersByTechnique(tech)    // Filter by technique
```

#### Type Imports

```typescript
// Use shared package types
import type { Charter, Captain, Trip, Policies } from "@fishon/ui";

// TODO(@fishon/packages): When encountering shared code, add this comment
// to mark it for consolidation into the unified package
```

### Key Conventions

**CRITICAL**: Follow the route groups architecture defined above.

#### Directory Structure Rules

**App Router (Route Groups):**

- Use `(auth)` for authentication pages
- Use `(dashboard)` for user account pages
- Use `(marketplace)` for public charter browsing
- Use `(marketing)` for static content pages
- Route groups `()` don't affect URLs
- Each group can have its own `layout.tsx`

**Components:**

- Organize by feature, not by type
- Example: `components/charter/` not `components/cards/`
- Use barrel exports for clean imports
- Import UI components from `@fishon/ui`: `BookingWidget`, `CaptainCard`, `AmenitiesCard`, etc.
- Use shadcn/ui for base components: `Button`, `Card`, `Dialog`, etc.

**Lib (Services & Utilities):**

- Group by service domain: `lib/auth/`, `lib/booking/`, `lib/services/`
- Database clients in `lib/database/`
- API clients in `lib/api/`
- Helpers in `lib/helpers/`

**Data & Assets:**

- Mock data in `src/data/mock/`
- Static data in `src/data/`
- Images in `src/assets/images/`
- Location data normalized via `destinationAliases.ts`

**Google Maps:**

- Integration with `MapScriptLoader` component
- API key in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

#### Component Patterns

- React Hook Form + Zod validation
- Server actions with `"use server"` directive
- Include `revalidatePath()` after mutations

### Development Workflow

#### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Required environment variables:
# - DATABASE_URL (PostgreSQL connection)
# - CAPTAIN_DATABASE_URL (fishon-captain DB for direct access)
# - USE_CAPTAIN_DB=1 (enable direct DB connection)
# - FISHON_CAPTAIN_API_URL (fallback API endpoint)
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Google Maps integration)

# Database operations
npm run prisma:migrate -- --name "your_migration_name"
npm run prisma:generate

# Development server
npm run dev  # Uses --turbopack for faster builds
```

#### Key Scripts

- `npm run dev` - Development with Turbopack
- `npm run build` - Production build with Turbopack
- `npm run typecheck` - TypeScript type checking
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run db:backup` - Create database backup
- `npm run db:restore` - Restore from backup
- `npm run db:migrate:safe` - Safe migration with auto-backup

### Malaysia-Specific Context

- **Pricing**: All prices in Malaysian Ringgit (RM)
- **Geographic**: Coordinates for Malaysian waters, state/district structure

### Integration Points

- **Google Maps**: API key in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Images**: Unsplash integration configured in `next.config.ts`
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **Deployment**: Vercel-optimized with Prisma migrate in build process

### Critical Files

- `src/lib/services/charter-service.ts` - Unified charter data fetching service
- `src/lib/charter-adapter.ts` - Backend to frontend data conversion
- `src/lib/api/captain-api.ts` - fishon-captain API client
- `src/lib/api/captain-db.ts` - Direct database access via PostgreSQL view
- `src/lib/database/prisma.ts` - Database client singleton
- `src/lib/analytics-service.ts` - Analytics event tracking service
- `src/lib/analytics-tracking.ts` - Client-side analytics utility
- `src/lib/auth/auth-options.ts` - NextAuth configuration with Google OAuth
- `prisma/schema.prisma` - Database schema and relationships
- `src/app/layout.tsx` - Global layout with SEO metadata
- `src/utils/destinationAliases.ts` - Location search normalization
- `proxy.ts` - Next.js 16 proxy configuration (renamed from middleware.ts)
- `.npmrc` - npm configuration with legacy-peer-deps for deployment

### Common Tasks

- **Charter Data Fetching**: Use `charter-service.ts` functions, never bypass the service layer
- **New Components**: Check `@fishon/ui` first before creating local components
- **Location Features**: Extend `destinationAliases.ts` for search
- **Type Definitions**: Import from `@fishon/ui` or `@fishon/schemas`, mark shared code with `// TODO(@fishon/packages)`
- **Database Changes**: Always run migrations, never edit migration files directly

## Database Backup & Migration Safety

**CRITICAL**: Always backup before database migrations. We learned this lesson the hard way after a data loss incident.

### Backup Strategy

The project includes automated backup scripts to prevent data loss during migrations:

#### Quick Reference

```bash
# Safe migration (RECOMMENDED - auto-backup + review + apply)
npm run db:migrate:safe migration-name

# Manual backup
npm run db:backup backup-name

# Restore from backup
npm run db:restore ./backups/backup-file.sql.gz
```

#### Migration Workflow (ALWAYS USE THIS)

1. **Before any schema change**: Create a backup

   ```bash
   npm run db:backup pre-migration
   ```

2. **Make schema changes**: Edit `prisma/schema.prisma`

3. **Run safe migration**: Auto-backup, review SQL, confirm, apply

   ```bash
   npm run db:migrate:safe add_user_field
   ```

4. **Verify migration**: Check database and run tests
   ```bash
   npm run typecheck
   npm run test
   ```

#### Backup Scripts Location

All scripts are in `scripts/` directory:

- **`backup-db.sh`** - Creates timestamped, compressed backups
  - Stores in `./backups/` directory
  - Auto-cleanup: keeps last 10 backups
  - Compression: gzip for space efficiency

- **`restore-db.sh`** - Restores from backup file
  - Lists available backups if none specified
  - Creates safety backup before restore
  - Requires "yes" confirmation to prevent accidents

- **`safe-migrate.sh`** - Complete migration workflow
  - Step 1: Auto-backup (pre-{migration}\_{timestamp})
  - Step 2: Create migration (--create-only)
  - Step 3: Show SQL for review
  - Step 4: Apply after user confirmation
  - Provides rollback instructions on failure

#### Critical Rules

**NEVER DO THIS:**

- ❌ `npx prisma migrate reset` on databases with important data
- ❌ Run migrations without reviewing the SQL first
- ❌ Skip backups "just this once"
- ❌ Edit migration files directly after creation

**ALWAYS DO THIS:**

- ✅ Use `npm run db:migrate:safe` for all migrations
- ✅ Review migration SQL before applying
- ✅ Keep backups in `./backups/` (gitignored)
- ✅ Test migrations on development/staging first
- ✅ Check Neon dashboard for point-in-time restore options

#### Emergency Rollback

If a migration fails or causes issues:

```bash
# 1. List available backups
ls -lh ./backups/

# 2. Restore from pre-migration backup
npm run db:restore ./backups/pre-migration_TIMESTAMP.sql.gz

# 3. Regenerate Prisma client
npm run prisma:generate

# 4. Fix the schema issue
# Edit prisma/schema.prisma

# 5. Try migration again
npm run db:migrate:safe fixed-migration-name
```

#### Neon-Specific Features

Neon PostgreSQL provides additional safety:

- **Point-in-Time Restore**: Available in Neon dashboard (last 7 days, varies by plan)
- **Branching**: Create test branch for migration testing

  ```bash
  # Install Neon CLI
  npm install -g neonctl

  # Create test branch
  neonctl branches create --name test-migration

  # Test migration on branch, then apply to main if successful
  ```

- **Automatic Snapshots**: Check Neon dashboard for available restore points

#### Backup Schedule Recommendations

- **Development**: Before each migration (automated with `safe-migrate.sh`)
- **Staging**: Daily automated backups + before deployments
- **Production**: Use Neon's built-in backups + daily S3 backups for compliance

#### Documentation

For complete documentation, see: `scripts/README.md`

- Usage examples for all scripts
- Troubleshooting guide
- Neon-specific features
- Advanced backup strategies

## Shared Package Strategy

### Current Packages

- **@fishon/ui**: Shared UI components and types (Charter, Captain, Trip, etc.) - git package
- **@fishon/schemas**: Shared validation schemas - git package
- **@fishon/email**: Email templates with React Email - git package

### Future: @fishon/packages

Plan to consolidate `@fishon/ui` and `@fishon/schemas` into a single `@fishon/packages` monorepo containing:

- Components (React UI components)
- Types (TypeScript definitions)
- Schemas (Zod validation)
- Lib (Utility functions, formatters)
- Data (Static data like amenities, species)

### Implementation Guidelines

1. **When Encountering Shared Code**: Add a TODO comment to mark for consolidation

   ```typescript
   // TODO(@fishon/packages): Move this to shared package
   ```

2. **Before Adding to Package**: Ensure code is:
   - Used in at least 2 apps (fishon-market, fishon-captain, or fishon-video-worker)
   - Stable and unlikely to change frequently per app
   - Properly typed with TypeScript
   - Has no app-specific dependencies

3. **Installation**: Always use git URL format for Vercel compatibility
   ```bash
   npm install git+https://github.com/jangbersahaja/fishon-ui#main
   ```
