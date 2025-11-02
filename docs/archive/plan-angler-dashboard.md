---
type: plan
status: in-progress
updated: 2025-10-24
feature: Angler Dashboard
author: GitHub Copilot
tags:
  - dashboard
  - user-experience
  - bookings
  - profile
impact: high
---

# Angler Dashboard - Strategic Plan (Revised)

## Executive Summary

This document outlines a comprehensive plan to build a professional, trust-building angler dashboard for fishon-market. The dashboard will serve as the central hub for anglers to manage their profiles, bookings, and interactions with captains.

**Current State (Post-Restructure):**

- ✅ Route groups architecture in place (`(auth)`, `(dashboard)`, `(marketplace)`, `(marketing)`)
- ✅ Booking flow pages: `/book/[charterId]` (form), `/book/confirm` (confirmation), `/book/payment/[bookingId]` (payment)
- ✅ Component organization (feature-based folders)
- ⚠️ Empty `(dashboard)` route group - ready for implementation
- ⚠️ Basic user authentication with NextAuth (Google OAuth + credentials)

**Proposed:** Full-featured dashboard leveraging existing booking pages, with profile management, booking history, reviews, favorites, and support

## Goals & Success Metrics

### Primary Goals

1. **Build Trust**: Transparent booking management, clear status updates, and captain communication
2. **Increase Conversion**: Easy access to favorites and past charters for repeat bookings
3. **Reduce Support Burden**: Self-service profile management and clear booking information
4. **Encourage Reviews**: Seamless review flow after completed trips builds marketplace credibility

### Success Metrics

- **Engagement**: % of users who access dashboard within 7 days of booking
- **Retention**: Repeat booking rate from dashboard
- **Review Coverage**: % of PAID bookings that receive reviews
- **Support Reduction**: Decrease in booking status inquiries
- **Profile Completeness**: % of users with complete profiles (phone, address)

## Proposed Dashboard Structure

### URL Structure (Aligned with Route Groups)

```
# Dashboard Route Group: app/(dashboard)/account/
/account                       → Dashboard layout + redirect to /account/overview
/account/overview              → Dashboard home (summary cards, quick stats)
/account/profile               → Profile management
/account/bookings              → All bookings list with filters
/account/bookings/[id]         → Booking detail page
/account/favorites             → Saved charters
/account/support               → Help center & contact

# Existing Marketplace Routes (already implemented):
/book/[charterId]              → Booking form (trip selection, date, guests)
/book/confirm                  → Booking confirmation page
/book/payment/[bookingId]      → Payment page (Senang Pay integration - planned)

# Future Expansion (Phase 2+):
/account/profile/security      → Password & 2FA settings
/account/profile/preferences   → Notification preferences
/account/trips                 → Confirmed trips (PAID status filter)
/account/trips/upcoming        → Future trips only
/account/trips/past            → Completed trips with review prompts
```

**Key Architecture Notes:**

- Dashboard pages live in `app/(dashboard)/account/`
- Shared dashboard layout: `app/(dashboard)/layout.tsx`
- Booking flow stays in `app/(marketplace)/book/`
- Components organized in `src/components/account/`
- Services in `src/lib/services/booking-service.ts` (create new)

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Angler Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│  Overview | Bookings | Trips | Favorites | Profile | Support │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Feature Specifications

### 1. Dashboard Overview (`/account/overview`)

**Purpose:** At-a-glance view of account activity

**Components:**

- Welcome banner with user name
- Quick stats cards:
  - Pending bookings (action required)
  - Upcoming trips
  - Past trips
  - Favorite charters
- Recent activity timeline (last 5 items)
- Quick actions: "Book a charter", "View favorites", "Need help?"

**UI/UX:**

- Mobile-first responsive grid
- Status badges with color coding (pending=yellow, approved=green, paid=blue)
- Empty states with CTAs ("No bookings yet - explore charters!")

### 2. Profile Management (`/account/profile`)

**Tab Structure:**

#### 2.1 Personal Information Tab

**Fields:**

- Display name (editable)
- Email (display only, verified indicator)
- Phone number (editable with country code selector)
- Profile photo upload (optional)
- Address fields:
  - Street address
  - City
  - State/Province (dropdown - Malaysian states)
  - Postcode
  - Country (default: Malaysia)
- Emergency contact (optional):
  - Name
  - Phone
  - Relationship

**Data Model Update Required:**

```prisma
model User {
  // ... existing fields

  // New profile fields
  profilePhoto     String?
  streetAddress    String?
  city             String?
  state            String?
  postcode         String?
  country          String?  @default("Malaysia")
  emergencyName    String?
  emergencyPhone   String?
  emergencyRelation String?
}
```

**Validation:**

- Phone: International format with country code
- Email: Verified via email verification flow (future)
- Postcode: Malaysian format validation

**Trust Building:**

- Show profile completion percentage
- Explain why each field helps (e.g., "Address helps captains verify pickup locations")
- Privacy assurance badge ("Your information is only shared with confirmed bookings")

#### 2.2 Security Tab

**Features:**

- Change password (current + new + confirm)
- Password strength meter
- Last password change date
- Login activity log (last 5 logins with device/location)
- Two-Factor Authentication (MFA) - **Coming Soon placeholder**
  - "Protect your account with 2FA - Launching Q1 2026"
  - Email for waitlist notification

**Data Model:**

```prisma
model LoginActivity {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  ipAddress String
  userAgent String
  location  String?  // Parsed from IP
  loginAt   DateTime @default(now())

  @@index([userId, loginAt])
}
```

#### 2.3 Preferences Tab (Future Phase)

**Placeholder for:**

- Email notification settings
- SMS notifications (when implemented)
- Marketing preferences
- Language preference
- Currency preference (MYR default)

### 3. Bookings (`/account/bookings`)

**Leverage Existing Infrastructure:**

- ✅ Booking form already exists at `/book/[charterId]`
- ✅ Confirmation page at `/book/confirm`
- ✅ Payment page at `/book/payment/[bookingId]` (Senang Pay - planned)
- 🆕 Need: Bookings list page showing user's booking history

**Features:**

- Tab filters:
  - All bookings
  - Pending (awaiting captain approval)
  - Approved (awaiting payment)
  - Paid (confirmed trips)
  - Rejected/Expired
- Search by charter name, location, or date
- Sort by: Date (newest/oldest), Status, Total price

**Booking Card Layout:**

```tsx
┌─────────────────────────────────────────────────────────┐
│ [Charter Name]                         [Status Badge]   │
│ [Location] • [Trip Type]                                │
│ 📅 [Date] • ⏱️ [Duration] • 👥 [Guests]                  │
│ 💰 RM [Total Price]                                     │
│                                                         │
│ [View Details] [Status-Based Action Button]             │
└─────────────────────────────────────────────────────────┘
```

**Status-Based Action Buttons:**

| Status   | Button Text              | Action             | Link                        |
| -------- | ------------------------ | ------------------ | --------------------------- |
| PENDING  | "Waiting..." + countdown | View details       | `/account/bookings/[id]`    |
| APPROVED | "Pay Now" (green)        | Proceed to payment | `/book/payment/[bookingId]` |
| PAID     | "View Trip"              | See trip details   | `/account/bookings/[id]`    |
| REJECTED | "Find Similar"           | Browse charters    | `/charters?location=...`    |
| EXPIRED  | "Book Again"             | Restart booking    | `/book/[charterId]`         |

**Integration with Existing Pages:**

- "Pay Now" → Redirect to `/book/payment/[bookingId]`
- "Book Again" → Pre-fill form at `/book/[charterId]` with previous selections
- "View Trip" → Link to detailed view (new page)

**Trust Building:**

- Clear timeline visualization showing booking progress
- Expected response time messaging ("Captains typically respond within 6 hours")
- Automatic expiry countdown with notification

### 4. Booking Detail Page (`/account/bookings/[id]`)

**Purpose:** Detailed view of a single booking with all information and actions

**Sections:**

#### 4.1 Booking Summary

- Charter details with photos (reuse `CharterGallery` from `@/components/charter/`)
- Trip details (type, duration, what's included) - from booking data
- Date, time, number of guests
- Pricing breakdown (trip price + platform fee + total)
- Status timeline (visual progress bar)

#### 4.2 Payment Information (for APPROVED/PAID status)

**For APPROVED (Awaiting Payment):**

- "Complete Payment" CTA button → redirects to `/book/payment/[bookingId]`
- Shows payment deadline (if applicable)
- Payment methods preview

**For PAID (Confirmed):**

- Payment confirmation badge
- Receipt download button (PDF) - **NEW: needs implementation**
- Payment reference number
- Payment date & time
- Payment method used

**Receipt Generation (New Feature):**

- PDF template with Fishon branding
- Booking reference number
- Itemized breakdown (trip fee, platform fee, tax if applicable)
- Company details (for business expense claims)
- Captain information (after payment only)
- QR code with booking verification link (future)

#### 4.3 Captain Information (PAID bookings only)

**Privacy Protection:**

- Captain contact info only visible after payment
- Captain name, photo, and rating visible at all stages
- Unhide phone/email after PAID status

**Display:**

- Captain profile card (reuse `CaptainCard` from `@/components/charter/`)
- Direct contact button (opens WhatsApp/phone)
- Charter boat details
- Meeting point with embedded Google Map

#### 4.4 Trip Details

**What's Included:**

- Amenities list (from charter data)
- Species targeted
- Fishing techniques
- Provided equipment
- Food/drinks included
- Safety equipment

#### 4.5 Cancellation & Refund

**Cancellation Policy Display:**

- Charter's cancellation terms (from charter data)
- Refund policy breakdown
- Cancellation deadline countdown
- "Cancel Booking" button (if eligible based on status and policy)

**Cancellation Flow:**

- Modal confirmation with policy reminder
- Reason selection (optional)
- POST `/api/account/bookings/[id]/cancel`
- Email notification to angler + captain

#### 4.6 Action Panel (Context-Aware)

**Status-based actions:**

| Status   | Available Actions                                                              |
| -------- | ------------------------------------------------------------------------------ |
| PENDING  | View charter details, Cancel request                                           |
| APPROVED | **Pay Now** (primary), Modify booking (future), Cancel                         |
| PAID     | Download receipt, Contact captain, View meeting point, Cancel (with penalties) |
| REJECTED | View rejection reason, Find similar charters, Contact support                  |
| EXPIRED  | Book again, Browse similar charters                                            |

**Additional Actions (All Statuses):**

- Contact support
- Report issue
- Share booking (future)

### 5. Trips (`/account/trips`)

**Purpose:** Focus on confirmed (PAID) bookings - the actual trips

**Tabs:**

- **Upcoming**: Future trips, sorted by date
- **Past**: Completed trips with review option

#### 5.1 Upcoming Trips View

**Features:**

- Trip countdown ("Departing in 5 days!")
- Weather forecast integration (future)
- Packing checklist reminder
- Add to calendar button (iCal/Google Calendar)
- Trip preparation tips
- Captain contact info (unhidden)

**Trip Card:**

```
┌─────────────────────────────────────────────────────────┐
│ 🎣 UPCOMING IN 5 DAYS                                   │
│                                                          │
│ [Charter Photo]                                          │
│ [Charter Name]                                           │
│ [Location]                                               │
│                                                          │
│ 📅 Nov 15, 2025 • 7:00 AM                               │
│ ⏱️ 8 hours • 👥 4 adults                                │
│                                                          │
│ 📍 Meeting Point: Port Klang Jetty                      │
│                                                          │
│ [View Details] [Contact Captain] [Add to Calendar]      │
└─────────────────────────────────────────────────────────┘
```

#### 5.2 Past Trips View

**Features:**

- Trip memories section (upload photos - future)
- Review prompt if not reviewed
- "Book again" quick action
- Download receipt

**Review Flow:**

- Star rating (1-5)
- Review categories:
  - Captain professionalism
  - Boat condition
  - Value for money
  - Overall experience
- Text review (optional)
- Photo upload (optional)
- Anonymous option checkbox

**Data Model:**

```prisma
model Review {
  id                    String   @id @default(cuid())
  bookingId             String   @unique
  booking               Booking  @relation(fields: [bookingId], references: [id])
  userId                String
  user                  User     @relation(fields: [userId], references: [id])

  charterIdcuid         String   // For aggregation on captain side

  // Ratings (1-5 scale)
  captainRating         Int
  boatRating            Int
  valueRating           Int
  overallRating         Int      // Average of above

  // Content
  reviewText            String?
  photos                String[] // Array of blob URLs
  isAnonymous           Boolean  @default(false)

  // Moderation
  isPublished           Boolean  @default(true)
  isFlagged             Boolean  @default(false)
  flagReason            String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([charterIdcuid, isPublished])
  @@index([userId])
  @@index([createdAt])
}
```

**Trust Building:**

- Show review impact: "Help future anglers make informed decisions"
- Badge for verified reviewer (must have completed trip)
- Review moderation for quality control

### 6. Favorites (`/account/favorites`)

**Features:**

- Grid/list view toggle
- Save charters for later
- Quick book button
- Remove from favorites
- Share favorite list (future)

**Data Model:**

```prisma
model Favorite {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  charterId   String   // Captain charter ID
  addedAt     DateTime @default(now())
  notes       String?  // User's private notes

  @@unique([userId, charterId])
  @@index([userId, addedAt])
}
```

**UI:**

- Heart icon on charter cards (filled = favorited)
- Favorite count on charter detail pages
- "Saved on [date]" timestamp
- Private notes field ("Great for family trips")

### 7. Support (`/account/support`)

**Sections:**

#### 7.1 Help Center

- FAQ accordion
- Common topics:
  - Booking process
  - Payment methods
  - Cancellation policy
  - Contact captain
  - Safety guidelines
  - Weather concerns

#### 7.2 Contact Support

- Contact form
- Email: <support@fishon.my>
- Response time expectation: "24 hours"
- Attach booking reference for faster resolution

#### 7.3 Resources

- Charter booking guide (PDF)
- Safety checklist
- What to bring
- Fishing tips for beginners
- Terms of service
- Privacy policy

## Trust-Building Strategy

### Transparency Principles

1. **Clear Communication**

   - Plain language explanations
   - Status updates via email + in-app notifications
   - Expected timelines for captain responses

2. **Security Indicators**

   - HTTPS everywhere
   - "Secure payment" badges
   - Data privacy assurances
   - Verified captain badges

3. **Social Proof**

   - Charter review ratings
   - Total bookings count
   - "Booked by X anglers this month"
   - Featured reviews

4. **Responsive Support**
   - Live chat (future)
   - WhatsApp support number
   - Quick response promise
   - Dedicated booking support

### Trust Elements to Implement

#### Visual Trust Indicators

- SSL certificate badge
- Payment partner logos (when integrated)
- Money-back guarantee seal (if applicable)
- "Safe booking" promise

#### Content Trust

- Captain verification process explanation
- Safety standards disclosure
- Insurance coverage information
- Refund policy clarity

#### Interactive Trust

- Real-time booking updates
- Captain response rate display
- Booking success rate statistics
- Customer testimonials

## Additional Features to Consider

### Phase 1 (MVP) - Q1 2026

✅ Dashboard overview  
✅ Profile management (personal info)  
✅ Bookings list with filters  
✅ Trip management  
✅ Favorites  
✅ Support center  
✅ PDF receipt generation

### Phase 2 - Q2 2026

- Review & rating system
- Photo uploads
- Login activity tracking
- Email notifications
- Address management

### Phase 3 - Q3 2026

- Two-factor authentication
- Calendar integration
- Weather forecast integration
- Trip memories/photos album
- Referral program
- Loyalty points

### Phase 4 - Q4 2026

- Live chat support
- Mobile app notifications
- Advanced search/filter
- Charter comparison tool
- Trip planning assistant

## Technical Implementation Plan

### File Structure (Following Route Groups Architecture)

```
src/app/(dashboard)/
├── layout.tsx                           → Dashboard shell (sidebar, header)
└── account/
    ├── page.tsx                         → Redirect to /account/overview
    ├── overview/
    │   └── page.tsx                     → Dashboard home (stats, quick actions)
    ├── profile/
    │   ├── page.tsx                     → Profile edit form
    │   ├── security/
    │   │   └── page.tsx                 → Password change (Phase 2)
    │   └── preferences/
    │       └── page.tsx                 → Notifications (Phase 3)
    ├── bookings/
    │   ├── page.tsx                     → Bookings list with filters
    │   └── [id]/
    │       ├── page.tsx                 → Booking detail view
    │       └── receipt/
    │           └── route.ts             → PDF receipt API endpoint
    ├── favorites/
    │   └── page.tsx                     → Saved charters grid
    └── support/
        └── page.tsx                     → Help center & contact form

src/components/account/                  → Dashboard-specific components
├── DashboardNav.tsx                     → Sidebar navigation
├── DashboardHeader.tsx                  → Mobile header with menu
├── DashboardShell.tsx                   → Layout wrapper
├── ProfileForm.tsx                      → Profile edit form
├── BookingCard.tsx                      → Booking list item
├── BookingStatusBadge.tsx               → Status pill component
├── BookingTimeline.tsx                  → Progress visualization
├── BookingSummary.tsx                   → Booking detail summary
├── PaymentInfo.tsx                      → Payment details display
├── ReceiptGenerator.tsx                 → PDF receipt generation
├── FavoriteButton.tsx                   → Heart icon toggle
├── EmptyState.tsx                       → "No bookings yet" states
└── QuickStats.tsx                       → Dashboard overview cards

src/lib/services/
├── booking-service.ts                   → Booking data fetching (NEW)
│   ├── getUserBookings()
│   ├── getBookingById()
│   ├── cancelBooking()
│   └── generateReceipt()
└── favorite-service.ts                  → Favorites CRUD (NEW)
    ├── getFavorites()
    ├── addFavorite()
    └── removeFavorite()

src/lib/helpers/
└── booking-helpers.ts                   → Booking utilities (NEW)
    ├── getBookingStatusColor()
    ├── getBookingActionButton()
    ├── calculateRefundAmount()
    └── canCancelBooking()
```

**Reusable Components from Existing Structure:**

- `@/components/charter/CharterGallery` - For booking detail images
- `@/components/charter/CaptainCard` - For captain information
- `@/components/charter/AmenitiesCard` - For trip inclusions
- `@/components/shared/CalendarPicker` - For date selection (if needed)
- `@/components/layout/Navbar` - Already handles dashboard link

### Database Migrations Required

**User Profile Extensions:**

```prisma
model User {
  // ... existing fields (id, name, email, image, etc.)

  // NEW: Profile fields
  phone             String?
  streetAddress     String?
  city              String?
  state             String?
  postcode          String?
  country           String?  @default("Malaysia")
  emergencyName     String?
  emergencyPhone    String?
  emergencyRelation String?

  // Relations
  favorites         Favorite[]
  reviews           Review[]
  loginActivity     LoginActivity[]
}
```

**New Models:**

```prisma
model Favorite {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  charterId  String
  notes      String?
  addedAt    DateTime @default(now())

  @@unique([userId, charterId])
  @@index([userId, addedAt])
}

model Review {
  id                String   @id @default(cuid())
  bookingId         String   @unique
  booking           Booking  @relation(fields: [bookingId], references: [id])
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  charterId         String

  captainRating     Int
  boatRating        Int
  valueRating       Int
  overallRating     Int
  reviewText        String?
  photos            String[]
  isAnonymous       Boolean  @default(false)
  isPublished       Boolean  @default(true)
  isFlagged         Boolean  @default(false)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([charterId, isPublished])
  @@index([userId])
}

model LoginActivity {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  ipAddress  String
  userAgent  String
  location   String?
  loginAt    DateTime @default(now())

  @@index([userId, loginAt])
}

// Update Booking model
model Booking {
  // ... existing fields
  review  Review?
}
```

### API Routes Required

**Following Route Groups Architecture:**

```typescript
// Dashboard API routes in app/api/account/
POST   /api/account/profile              → Update profile info
POST   /api/account/profile/photo        → Upload profile photo (Phase 2)
POST   /api/account/password/change      → Change password (Phase 2)

GET    /api/account/bookings             → List user's bookings (with filters)
GET    /api/account/bookings/[id]        → Get single booking detail
POST   /api/account/bookings/[id]/cancel → Cancel a booking
GET    /api/account/bookings/[id]/receipt → Generate PDF receipt

POST   /api/account/favorites            → Add charter to favorites
DELETE /api/account/favorites/[id]       → Remove from favorites
GET    /api/account/favorites            → List user's favorites

POST   /api/account/reviews              → Submit review (Phase 2)
GET    /api/account/reviews              → List user's reviews (Phase 2)

GET    /api/account/activity             → Get login activity (Phase 2)

// Existing marketplace routes (already implemented):
POST   /api/bookings                     → Create new booking (from /book/[charterId])
// Payment routes will be added with Senang Pay integration
```

**API Response Standards:**

- Use consistent error handling (`applySecurityHeaders`)
- Rate limiting on POST/DELETE endpoints
- Authentication required (check `getServerSession`)
- Return type-safe responses matching Prisma schemas

### Component Architecture

```
src/app/account/
├── layout.tsx                    → Dashboard shell with sidebar
├── page.tsx                      → Redirect to /account/overview
├── overview/
│   └── page.tsx                  → Dashboard home
├── profile/
│   ├── page.tsx                  → Personal info form
│   ├── security/page.tsx         → Password & MFA
│   └── preferences/page.tsx      → Notifications
├── bookings/
│   ├── page.tsx                  → Booking list
│   └── [id]/page.tsx             → Booking detail
├── trips/
│   ├── page.tsx                  → All trips
│   ├── upcoming/page.tsx         → Future trips
│   └── past/page.tsx             → Completed trips
├── favorites/
│   └── page.tsx                  → Saved charters
└── support/
    └── page.tsx                  → Help center

src/components/account/
├── DashboardNav.tsx              → Sidebar navigation
├── DashboardHeader.tsx           → Mobile header
├── ProfileForm.tsx               → Profile edit form
├── BookingCard.tsx               → Booking list item
├── BookingTimeline.tsx           → Status progress
├── TripCard.tsx                  → Trip display
├── ReviewForm.tsx                → Review submission
├── ReceiptGenerator.tsx          → PDF receipt
└── FavoriteButton.tsx            → Heart icon toggle
```

### Design System

**Colors:**

- Primary: #EC2227 (Fishon red)
- Success: #10B981 (Green)
- Warning: #F59E0B (Amber)
- Info: #3B82F6 (Blue)
- Error: #EF4444 (Red)

**Status Colors:**

- PENDING: Yellow/Amber
- APPROVED: Green
- PAID: Blue
- REJECTED: Red
- EXPIRED: Gray
- CANCELLED: Gray

**Typography:**

- Headings: Inter, semibold
- Body: Inter, regular
- Monospace: JetBrains Mono (for booking IDs)

## Security Considerations

### Data Access Controls

- Users can only access their own data
- Server-side session validation on every request
- Row-level security checks in database queries

### Privacy

- Email/phone only visible to captains after payment
- Address only shared with confirmed bookings
- Review anonymity option
- GDPR-compliant data export/deletion

### Payment Security

- PCI DSS compliance (when payment integrated)
- No credit card storage on our servers
- Secure payment gateway integration
- Receipt encryption

## Performance Optimization

### Caching Strategy

- Static: Profile page structure
- ISR: Booking list (revalidate every 60s)
- Client: Favorites list (React Query)
- CDN: Profile photos, receipts

### Loading States

- Skeleton screens for lists
- Optimistic updates for favorites
- Progressive image loading
- Lazy load past trips

## Mobile Responsiveness

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile-First Features

- Bottom navigation (mobile)
- Swipe gestures for status filters
- Pull-to-refresh
- Native share integration
- Add to calendar

## Analytics & Tracking

### Key Events to Track

- Dashboard view
- Profile completion rate
- Booking status checks
- Favorite additions
- Review submissions
- Support contact attempts
- Payment initiations

### Conversion Funnels

1. Dashboard → Browse → Book
2. Trip complete → Review submit
3. Past trip → Rebook
4. Favorite → Book

## Migration Strategy

### Existing State After Restructure

✅ **Already Completed:**

- Route groups architecture (`(auth)`, `(dashboard)`, `(marketplace)`, `(marketing)`)
- Booking flow pages: `/book/[charterId]`, `/book/confirm`, `/book/payment/[bookingId]`
- Component organization (feature-based folders)
- Authentication with NextAuth (Google OAuth + credentials)
- Database schema with User and Booking models

⚠️ **Needs Migration:**

- Empty `(dashboard)` route group → needs account pages
- No existing `/account` or `/mybooking` pages to migrate
- Fresh start with clean architecture

### Implementation Phases

#### Phase 1: Dashboard Foundation (Week 1-2)

**Goal:** Basic dashboard shell with bookings list

1. Create dashboard layout (`app/(dashboard)/layout.tsx`)

   - Sidebar navigation (desktop)
   - Mobile header with hamburger menu
   - Breadcrumbs
   - User profile dropdown

2. Dashboard overview page (`app/(dashboard)/account/overview/page.tsx`)

   - Welcome banner
   - Quick stats cards (bookings count, upcoming trips)
   - "Book a charter" CTA
   - Empty state handling

3. Bookings list (`app/(dashboard)/account/bookings/page.tsx`)

   - Fetch user's bookings from database
   - Tab filters (All, Pending, Approved, Paid, Rejected)
   - Booking cards with status badges
   - Status-based action buttons
   - Integration with existing `/book/payment/[bookingId]` page

4. Booking detail (`app/(dashboard)/account/bookings/[id]/page.tsx`)
   - Complete booking information
   - Reuse existing charter components
   - Payment status display
   - "Pay Now" button → redirect to `/book/payment/[bookingId]`

**Components to Build:**

- `DashboardNav.tsx`
- `DashboardHeader.tsx`
- `BookingCard.tsx`
- `BookingStatusBadge.tsx`
- `QuickStats.tsx`
- `EmptyState.tsx`

**Services to Build:**

- `src/lib/services/booking-service.ts` (getUserBookings, getBookingById)
- `src/lib/helpers/booking-helpers.ts` (status helpers, action button logic)

**API Routes:**

- `GET /api/account/bookings`
- `GET /api/account/bookings/[id]`

#### Phase 2: Profile & Favorites (Week 3-4)

**Goal:** User profile management and charter favorites

1. Profile page (`app/(dashboard)/account/profile/page.tsx`)

   - Personal information form
   - Profile photo upload
   - Address fields
   - Emergency contact
   - Profile completion indicator

2. Favorites page (`app/(dashboard)/account/favorites/page.tsx`)
   - Grid of saved charters
   - Heart icon toggle
   - Quick book button
   - Remove from favorites

**Components to Build:**

- `ProfileForm.tsx`
- `FavoriteButton.tsx` (reusable across app)
- `CharterGrid.tsx` (if not exists)

**API Routes:**

- `POST /api/account/profile`
- `POST /api/account/favorites`
- `DELETE /api/account/favorites/[id]`
- `GET /api/account/favorites`

**Database Migration:**

- Add profile fields to User model
- Create Favorite model
- Generate Prisma client

#### Phase 3: Reviews & Enhanced Features (Week 5-6)

**Goal:** Review system and receipt generation

1. Review submission (on `/account/bookings/[id]` page for PAID bookings)

   - Star ratings (captain, boat, value, overall)
   - Text review + photos
   - Anonymous option
   - Moderation flags

2. PDF Receipt generation

   - Receipt API route (`GET /api/account/bookings/[id]/receipt`)
   - PDF template with branding
   - Download button on booking detail page

3. Support page (`app/(dashboard)/account/support/page.tsx`)
   - FAQ accordion
   - Contact form
   - Help resources

**Components to Build:**

- `ReviewForm.tsx`
- `ReceiptGenerator.tsx` (using `@react-pdf/renderer` or similar)
- `SupportForm.tsx`

**API Routes:**

- `POST /api/account/reviews`
- `GET /api/account/reviews`
- `GET /api/account/bookings/[id]/receipt`
- `POST /api/account/support/contact`

**Database Migration:**

- Create Review model
- Add review relation to Booking model

#### Phase 4: Advanced Features (Future)

**Goal:** Security, notifications, and trip management

1. Security page (`app/(dashboard)/account/profile/security/page.tsx`)

   - Password change
   - Login activity log
   - 2FA placeholder

2. Trips pages (separate from bookings)

   - `/account/trips/upcoming`
   - `/account/trips/past`
   - Weather integration
   - Calendar export

3. Notification preferences
   - `/account/profile/preferences`
   - Email/SMS toggles
   - Marketing opt-in/out

**Components to Build:**

- `PasswordChangeForm.tsx`
- `LoginActivityLog.tsx`
- `TripCard.tsx`
- `PreferencesForm.tsx`

**API Routes:**

- `POST /api/account/password/change`
- `GET /api/account/activity`

**Database Migration:**

- Create LoginActivity model

### Rollout Strategy

**Beta Testing:**

1. Enable dashboard for test users first
2. Gather feedback on UX/UI
3. Iterate on design and functionality
4. Fix bugs before public launch

**Public Launch:**

1. Announcement email to all users
2. In-app tutorial/walkthrough
3. Blog post explaining new features
4. Monitor analytics and support tickets

**Metrics to Track:**

- Dashboard adoption rate
- Booking completion rate
- Profile completion rate
- Review submission rate
- Support ticket volume (should decrease)

### Data Migration

**No Breaking Changes:**

- All new fields are nullable
- Existing User and Booking models remain compatible
- No data migration required
- Backward compatible with existing auth flow

### Rollback Plan

**If Issues Arise:**

1. Feature flag to disable dashboard
2. Redirect `/account/*` to old placeholder page
3. Investigate and fix issues
4. Re-enable dashboard

**Monitoring:**

- Sentry error tracking
- Vercel Analytics for page performance
- User feedback form on dashboard

## Success Criteria

### Launch Criteria (MVP)

- [ ] All dashboard pages functional
- [ ] Mobile responsive design
- [ ] PDF receipt generation working
- [ ] Profile updates persist correctly
- [ ] Booking status accurate
- [ ] Support form delivers emails
- [ ] No critical security vulnerabilities
- [ ] Page load < 3s on 3G
- [ ] 95%+ uptime in staging

### Post-Launch Metrics (30 days)

- 60%+ of users visit dashboard
- 40%+ complete profile information
- 20%+ add charters to favorites
- 15%+ of completed trips receive reviews
- <5% support tickets about booking status

## Recommendations Summary

### Must-Have Features (MVP)

1. ✅ Dashboard overview with quick stats
2. ✅ Profile management (personal info)
3. ✅ Bookings list with status filters
4. ✅ Booking detail with status timeline
5. ✅ PDF receipt generation
6. ✅ Trips page (upcoming/past)
7. ✅ Favorites system
8. ✅ Support center with FAQ

### High Priority (Phase 2)

1. Review & rating system
2. Email notifications
3. Login activity tracking
4. Enhanced security (password change)
5. Profile photo uploads

### Medium Priority (Phase 3)

1. Two-factor authentication
2. Calendar integration
3. Weather forecasts
4. Trip photo albums
5. Referral program

### Low Priority (Phase 4)

1. Live chat
2. Mobile app
3. Charter comparison
4. Trip planning tools

## Conclusion

This comprehensive dashboard strategy transforms fishon-market from a simple booking platform into a trusted, full-service angler experience hub. By prioritizing transparency, clear communication, and user empowerment, we build trust that drives repeat bookings and positive reviews.

The phased approach allows us to launch an MVP quickly while planning for long-term feature expansion based on user feedback and analytics.

**Next Steps:**

1. Review and approve this plan
2. Create detailed UI mockups
3. Prioritize Phase 1 features
4. Begin database schema migrations
5. Develop component library
6. Implement dashboard shell
7. Roll out features incrementally
8. Gather user feedback
9. Iterate and improve

---

**Questions for Discussion:**

1. Should we implement payment gateway in Phase 1 or Phase 2?
2. Do we want social login (Facebook, Apple) on profile page?
3. Should favorites be public or private?
4. What's the review moderation workflow?
5. Do we need booking insurance/protection plans?

---

## Revised Implementation Summary

### Key Changes from Original Plan

1. **Leverages Existing Booking Flow**: No need to rebuild `/book/[charterId]`, `/book/confirm`, or `/book/payment/[bookingId]` - they already exist
2. **Follows Route Groups Architecture**: Dashboard lives in `app/(dashboard)/account/`, consistent with restructured app
3. **Component Reuse**: Maximizes use of existing charter components (`CharterGallery`, `CaptainCard`, `AmenitiesCard`)
4. **Clean Separation**: Marketplace (public) vs Dashboard (authenticated) with clear boundaries
5. **Phased Approach**: 4 phases over 6+ weeks, starting with core booking management

### Critical Path for MVP (Phase 1)

**Priority: HIGH - Must Have for Launch**

1. Dashboard layout with navigation
2. Bookings list page with filters
3. Booking detail page with "Pay Now" integration
4. Quick stats on overview page
5. Basic empty states

**Priority: MEDIUM - Should Have Soon**

6. Profile management (name, email, phone)
7. Favorites system
8. PDF receipt generation

**Priority: LOW - Can Wait**

9. Reviews & ratings
10. Security features (password change, 2FA)
11. Trip management pages
12. Notification preferences

### Success Criteria (30 days post-launch)

- [ ] 60%+ of users visit dashboard within 7 days of booking
- [ ] 80%+ of APPROVED bookings proceed to payment via dashboard
- [ ] 30%+ of users complete profile information
- [ ] 10%+ of PAID bookings receive reviews
- [ ] <5% support tickets about booking status (down from baseline)

### Next Steps

1. ✅ Review and approve revised plan
2. Create dashboard layout mockups (Figma/design)
3. Set up database migrations (User profile fields, Favorite model)
4. Implement Phase 1 (Week 1-2):
   - Dashboard shell
   - Bookings list
   - Booking detail
5. User testing with beta group
6. Iterate based on feedback
7. Roll out Phases 2-4 incrementally

---

**Last Updated:** 2025-10-24  
**Status:** ✅ Revised and aligned with restructured app architecture  
**Ready for:** Design mockups and Phase 1 implementation
