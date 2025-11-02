# Fishon Market Environment Variables Audit

## ✅ Active Environment Variables

All variables in `.env.example` are actively used in the codebase.

### Core Database & Auth (REQUIRED)

- `DATABASE_URL` - Primary PostgreSQL connection
- `NEXTAUTH_SECRET` - NextAuth JWT encryption secret
- `TAC_SECRET` - Time-based authentication code secret (fallback to NEXTAUTH_SECRET)
- `GOOGLE_CLIENT_ID` - Google OAuth (required for login)
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

### Email (REQUIRED for Notifications)

- `SMTP_HOST` - SMTP server hostname (Zoho example)
- `SMTP_PORT` - SMTP server port (465 or 587)
- `SMTP_SECURE` - Use TLS/SSL (true for 465, false for 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password (also supports `SMTP_PASSWORD`)
- `EMAIL_VERIFY_AT_START` - Verify SMTP transporter in development (optional)

### Fishon Captain Integration (REQUIRED for Charter Data)

- `CAPTAIN_DATABASE_URL` - Direct DB access to captain database (preferred)
- `FISHON_CAPTAIN_API_URL` - Captain API endpoint (fallback)
- `NEXT_PUBLIC_CAPTAIN_API_URL` - Public Captain API endpoint (client-side)
- `FISHON_CAPTAIN_API_KEY` - API key for captain API authentication (optional)
- `CAPTAIN_WEBHOOK_SECRET` - Webhook verification secret
- `CAPTAIN_WEBHOOK_URL` - Captain webhook endpoint URL
- `CAPTAIN_NOTIFICATIONS_EMAIL` - Fallback captain notification email (optional)

### Pusher Real-time (OPTIONAL)

- `PUSHER_APP_ID` - Pusher app ID
- `PUSHER_KEY` - Pusher key
- `PUSHER_SECRET` - Pusher secret
- `PUSHER_CLUSTER` - Pusher cluster (e.g., "ap1")

### Booking System (OPTIONAL)

- `BOOKINGS_EXPIRE_SECRET` - Secret for scheduled booking expiration job
- `CRON_SECRET` - Secret for automated booking status updates

### Media Storage (OPTIONAL)

- `NEXT_PUBLIC_BLOB_HOST` - Vercel Blob hostname for image optimization

### Admin Authentication (OPTIONAL)

- `ADMIN_PASSWORD` - Simple password for /admin routes

### Development & Testing (OPTIONAL)

- `EMAIL_TEST_SECRET` - Dev-only test route guard for /api/dev/email-test

### Deployment (OPTIONAL)

- `NEXT_PUBLIC_APP_URL` - Public app URL for email links and redirects
- `NODE_ENV` - Node environment (auto-set by platform)

## 🗑️ Unused/Legacy Variables

**None found** - All variables in `.env.example` are actively used.

However, some variables are **optional** and can be removed if features aren't needed:

### Can Remove If Not Using

- **Pusher**: All `PUSHER_*` variables if not using real-time notifications
- **Direct Captain DB**: `CAPTAIN_DATABASE_URL` if using API fallback only
- **Admin Panel**: `ADMIN_PASSWORD` if not using /admin routes
- **Development**: `EMAIL_TEST_SECRET`, `EMAIL_VERIFY_AT_START` in production

## 📝 Recommendations

### 1. Minimize Production Variables

For production deployment, you only need:

```bash
# Required Core
DATABASE_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Required Email
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS

# Required Captain Integration
CAPTAIN_DATABASE_URL  # Preferred
# OR fallback to:
FISHON_CAPTAIN_API_URL
NEXT_PUBLIC_CAPTAIN_API_URL

CAPTAIN_WEBHOOK_SECRET
CAPTAIN_WEBHOOK_URL

# Optional (based on features used)
PUSHER_* (if using real-time notifications)
BOOKINGS_EXPIRE_SECRET, CRON_SECRET (if using automated jobs)
```

### 2. Security Best Practices

**Captain Integration:**

- Use `CAPTAIN_DATABASE_URL` for direct read-only access (preferred method)
- This reads from `v_public_charters` PostgreSQL view
- Fallback to `FISHON_CAPTAIN_API_URL` if direct DB not available

**Webhook Security:**

- Keep `CAPTAIN_WEBHOOK_SECRET` secure and rotate regularly
- Verify webhook signatures in captain app

**SMTP Credentials:**

- Use app-specific passwords for SMTP (not account password)
- Restrict SMTP user to send-only permissions

### 3. Environment-Specific Configuration

**Development:**

```bash
# Local development
FISHON_CAPTAIN_API_URL="http://localhost:3001"
NEXT_PUBLIC_CAPTAIN_API_URL="http://localhost:3001"
EMAIL_VERIFY_AT_START="true"
NODE_ENV="development"
```

**Production:**

```bash
# Production
FISHON_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
NEXT_PUBLIC_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
EMAIL_VERIFY_AT_START="false"  # or omit
NODE_ENV="production"
```

### 4. Captain DB vs API Strategy

#### Preferred: Direct Database Connection

```bash
CAPTAIN_DATABASE_URL="postgresql://market_reader:password@host/fishon_captain"
```

- Faster queries (no HTTP overhead)
- Read from `v_public_charters` view
- Requires database user with SELECT permission on views

#### Fallback: Captain API

```bash
FISHON_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
NEXT_PUBLIC_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
FISHON_CAPTAIN_API_KEY="optional-api-key"
```

- Used when direct DB connection not available
- Endpoints: `/api/public/charters`, `/api/public/charters/:id`
- See `src/lib/api/captain-api.ts` and `captain-db.ts`

### 5. Pusher Configuration

Pusher is **optional** - if not configured, real-time features gracefully degrade:

- Notifications still work (database polling)
- No live updates (user must refresh page)
- See `src/lib/pusher/server.ts` for graceful fallback handling

### 6. SMTP Configuration

Supports both variable names for flexibility:

- `SMTP_PASS` - Primary
- `SMTP_PASSWORD` - Alternative

Choose one and stick with it. Both work identically in the codebase.

## Usage Statistics

**Total variables**: ~30

- **Required (core)**: 5
- **Required (email)**: 5
- **Required (captain integration)**: 4-6
- **Optional (pusher)**: 4
- **Optional (booking system)**: 2
- **Optional (media)**: 1
- **Optional (admin)**: 1
- **Optional (development)**: 2
- **Optional (deployment)**: 2

All variables are actively referenced in the codebase.

## Key Differences from Fishon Captain

### fishon-market has fewer environment variables

1. **No video processing** - No QStash, video worker, or blob upload tokens
2. **No MFA** - No MFA encryption key (angler login is simpler)
3. **Simpler OAuth** - Only Google (no Facebook/Apple for anglers)
4. **Read-only captain data** - Uses views or API, doesn't manage captain data
5. **No email sending from captain** - Uses @fishon/email package with own SMTP

### fishon-market has unique variables

1. **TAC_SECRET** - Time-based authentication codes for passwordless login
2. **CAPTAIN_DATABASE_URL** - Direct read-only access to captain DB
3. **BOOKINGS_EXPIRE_SECRET** - Automated booking expiration
4. **ADMIN_PASSWORD** - Simple cookie-based admin auth

## Migration Notes

### Email System (@fishon/email)

The app now uses the `@fishon/email` package (React Email templates):

- Package: `git+https://github.com/jangbersahaja/fishon-email`
- Service: `src/lib/services/email-service.ts`
- Legacy code: `src/lib/helpers/email.ts` (deprecated, kept for reference)

All email sending uses:

```typescript
import {
  sendBookingCreatedEmail,
  sendBookingApprovedEmail,
  // ... etc
} from "src/lib/services/email-service";
```

### Charter Data Access

Two methods supported with automatic fallback:

```typescript
// 1. Direct DB (preferred) - src/lib/api/captain-db.ts
await fetchChartersFromDb();
await fetchCharterByIdFromDb(id);

// 2. API fallback - src/lib/api/captain-api.ts
await fetchCharters();
await fetchCharterById(id);

// Service layer handles fallback - src/lib/services/charter-service.ts
await getCharters(); // Tries DB first, then API
```

## Verification Checklist

Before deployment, verify:

- [ ] `DATABASE_URL` - PostgreSQL connection works
- [ ] `NEXTAUTH_SECRET` - Generated securely (32+ chars)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` - OAuth working
- [ ] `SMTP_*` - Email sending tested
- [ ] `CAPTAIN_DATABASE_URL` or `FISHON_CAPTAIN_API_URL` - Charter data loading
- [ ] `CAPTAIN_WEBHOOK_SECRET` - Matches fishon-captain webhook sender
- [ ] `PUSHER_*` - Real-time notifications working (or intentionally disabled)
- [ ] Remove dev-only variables in production (`EMAIL_TEST_SECRET`)
