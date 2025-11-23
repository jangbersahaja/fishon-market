# i18n Comprehensive Fix Plan

**Created**: November 23, 2025  
**Status**: 🚨 CRITICAL - 84 components with hardcoded strings  
**Current Phase**: Phase 3 - Component Migration (20% complete)

---

## Executive Summary

### Current State

- ✅ **Phase 1 Complete**: App Router restructured with `[locale]` routing
- ✅ **Phase 2 Complete**: Layout components (Navbar, Footer, Chrome) migrated
- 🔄 **Phase 3 In Progress**: Common components migration (20% - only Homepage & CheckYourBookings)
- ⏳ **Phase 4 Pending**: Page content migration

### Critical Issue

**84 out of ~100 component files still contain hardcoded English strings** that are not using the i18n translation system.

### Impact

- **User Experience**: Malay users see mixed English/Malay interface
- **Maintainability**: Translations scattered across codebase
- **Completeness**: i18n infrastructure complete but underutilized

---

## Comprehensive Component Audit

### 1. Authentication Components (`src/components/auth/`)

**Priority**: 🔴 HIGH (User-facing, critical flow)

| Component              | Status          | Hardcoded Strings Found                                                                                         | Effort |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| `AuthModal.tsx`        | ❌ Not migrated | "Sign In", "Sign Up", "Signing in…", "Creating account…", "Email", "Password", "or", "Already have an account?" | Medium |
| `AuthModalContext.tsx` | ✅ Context only | None (no UI strings)                                                                                            | N/A    |

**Translation Keys Needed**:

```json
{
  "auth": {
    "signIn": "Sign In",
    "signUp": "Sign Up",
    "signingIn": "Signing in…",
    "creatingAccount": "Creating account…",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "or": "OR",
    "alreadyHaveAccount": "Already have an account?",
    "dontHaveAccount": "Don't have an account?",
    "continueWith": "Continue with {provider}",
    "signingInWith": "Signing in with {provider}…"
  }
}
```

---

### 2. Booking Components (`src/components/booking/`)

**Priority**: 🔴 HIGH (Core business flow)

| Component                           | Status          | Hardcoded Strings                    | Effort   |
| ----------------------------------- | --------------- | ------------------------------------ | -------- |
| `CheckYourBookings.tsx`             | ✅ Migrated     | None                                 | Complete |
| `BookingActions.tsx`                | ❌ Not migrated | Action button labels                 | Small    |
| `BookingDetails.tsx`                | ❌ Not migrated | Details labels, status messages      | Medium   |
| `BookingProgressTimeline.tsx`       | ❌ Not migrated | Timeline labels, status descriptions | Medium   |
| `BookingTimeline.tsx`               | ❌ Not migrated | Timeline steps                       | Medium   |
| `BookingCountdown.tsx`              | ❌ Not migrated | Countdown labels, messages           | Small    |
| `BookingExpiredScreen.tsx`          | ❌ Not migrated | Error messages, CTAs                 | Small    |
| `CancellationReasonDialog.tsx`      | ❌ Not migrated | Dialog title, options, buttons       | Medium   |
| `CancellationInfo.tsx`              | ❌ Not migrated | Policy information                   | Small    |
| `EmailVerificationModal.tsx`        | ❌ Not migrated | Modal content, instructions          | Small    |
| `GuestBookingVerificationModal.tsx` | ❌ Not migrated | Modal content, form labels           | Medium   |
| `ReviewSection.tsx`                 | ❌ Not migrated | "Sign In", review labels             | Small    |
| `TripPreparation.tsx`               | ❌ Not migrated | Preparation checklist items          | Medium   |
| `DateNoLongerAvailableScreen.tsx`   | ❌ Not migrated | Error message, CTAs                  | Small    |

**Translation Keys Needed** (add to existing `booking` namespace):

```json
{
  "booking": {
    // Existing keys...
    "actions": {
      "pay": "Pay Now",
      "cancel": "Cancel Booking",
      "viewDetails": "View Details",
      "contactCaptain": "Contact Captain"
    },
    "timeline": {
      "requested": "Booking Requested",
      "approved": "Approved by Captain",
      "paymentPending": "Payment Pending",
      "paid": "Payment Confirmed",
      "acknowledged": "Trip Confirmed"
    },
    "cancellation": {
      "title": "Cancel Booking",
      "reason": "Cancellation Reason",
      "confirm": "Confirm Cancellation",
      "policy": "Cancellation Policy"
    },
    "countdown": {
      "expiresIn": "Expires in",
      "days": "days",
      "hours": "hours",
      "minutes": "minutes"
    },
    "expired": {
      "title": "Booking Expired",
      "message": "This booking has expired",
      "searchAgain": "Search Again"
    },
    "dateUnavailable": {
      "title": "Date No Longer Available",
      "message": "The selected date is no longer available",
      "chooseAnother": "Choose Another Date"
    }
  }
}
```

---

### 3. Charter Components (`src/components/charter/`)

**Priority**: 🔴 HIGH (Product display, conversion critical)

| Component                   | Status          | Hardcoded Strings                                 | Effort |
| --------------------------- | --------------- | ------------------------------------------------- | ------ |
| `BookingWidget.tsx`         | ❌ Not migrated | "Select Date", "Guests", "Book Now", price labels | Large  |
| `CharterViewTracker.tsx`    | ✅ No UI        | None                                              | N/A    |
| `EnhancedReviewsList.tsx`   | ❌ Not migrated | "Reviews", "No reviews yet", rating labels        | Medium |
| `GalleryTabs.tsx`           | ❌ Not migrated | "Photos", "Videos" tab labels                     | Small  |
| `LazySection.tsx`           | ✅ Generic      | None                                              | N/A    |
| `PhotoGallery.tsx`          | ❌ Not migrated | "View All", navigation labels                     | Small  |
| `ReviewsList.tsx`           | ❌ Not migrated | Review display labels                             | Medium |
| `ShareButton.tsx`           | ❌ Not migrated | "Share" button text                               | Small  |
| `TripCard.tsx`              | ❌ Not migrated | Trip details labels                               | Medium |
| `TripSpeciesSection.tsx`    | ❌ Not migrated | Species list labels                               | Small  |
| `TripTechniquesSection.tsx` | ❌ Not migrated | Techniques labels                                 | Small  |
| `VideoGallery.tsx`          | ❌ Not migrated | Video player controls                             | Small  |

**Translation Keys Needed** (add to existing `charter` namespace):

```json
{
  "charter": {
    // Existing keys...
    "booking": {
      "selectDate": "Select Date",
      "selectGuests": "Select Guests",
      "adults": "Adults",
      "children": "Children",
      "totalPrice": "Total Price",
      "bookNow": "Book Now",
      "checkAvailability": "Check Availability"
    },
    "gallery": {
      "photos": "Photos",
      "videos": "Videos",
      "viewAll": "View All",
      "of": "of"
    },
    "reviews": {
      "title": "Reviews",
      "noReviews": "No reviews yet",
      "writeReview": "Write a Review",
      "rating": "Rating",
      "helpful": "Helpful"
    },
    "share": {
      "button": "Share",
      "title": "Share this charter",
      "copied": "Link copied!"
    }
  }
}
```

---

### 4. Charters Components (`src/components/charters/`)

**Priority**: 🔴 HIGH (Product listing, SEO)

| Component             | Status          | Hardcoded Strings                           | Effort |
| --------------------- | --------------- | ------------------------------------------- | ------ |
| `BaseCharterCard.tsx` | ❌ Not migrated | "Book Now" (×2), price labels, trip details | Large  |
| `ImageMosaic.tsx`     | ✅ No text      | None                                        | N/A    |

**Translation Keys** (use existing `charter` namespace above)

---

### 5. Account Components (`src/components/account/`)

**Priority**: 🟡 MEDIUM (Authenticated users only)

| Component                  | Status          | Hardcoded Strings                                                                                                          | Effort |
| -------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| `BookingActionButtons.tsx` | ❌ Not migrated | "Call Captain", "Chat Captain", "View Details", "Waze", "Maps", "Write Review", "View Review", "Pay Now", "Cancel Booking" | Large  |
| `BookingCard.tsx`          | ❌ Not migrated | Status labels, action labels                                                                                               | Medium |
| `BookingDetailsCard.tsx`   | ❌ Not migrated | Details labels                                                                                                             | Medium |
| `FavoriteButton.tsx`       | ❌ Not migrated | "Save", "Saved"                                                                                                            | Small  |

**Translation Keys Needed** (add to existing `account` namespace):

```json
{
  "account": {
    // Existing keys...
    "bookingActions": {
      "callCaptain": "Call Captain",
      "chatCaptain": "Chat Captain",
      "chatNotAvailable": "Chat not available",
      "viewDetails": "View Details",
      "waze": "Waze",
      "maps": "Maps",
      "writeReview": "Write Review",
      "viewReview": "View Review",
      "payNow": "Pay Now",
      "cancelBooking": "Cancel Booking",
      "bookAgain": "Book Again"
    },
    "favorites": {
      "save": "Save",
      "saved": "Saved",
      "remove": "Remove from favorites"
    }
  }
}
```

---

### 6. Marketing Components (`src/components/marketing/`)

**Priority**: 🟡 MEDIUM (Landing pages)

| Component        | Status          | Hardcoded Strings   | Effort |
| ---------------- | --------------- | ------------------- | ------ |
| `LatestTrip.tsx` | ❌ Not migrated | "View Details" (×2) | Small  |

**Translation Keys** (use common `charter.viewDetails`)

---

### 7. Search Components (`src/components/search/`)

**Priority**: 🟡 MEDIUM (Discovery flow)

| Component                  | Status          | Hardcoded Strings                          | Effort       |
| -------------------------- | --------------- | ------------------------------------------ | ------------ |
| Multiple search components | ❌ Not migrated | Search labels, filter labels, sort options | Medium-Large |

**Estimate**: 5-8 components with search/filter UI text

---

### 8. Chat/Messages Components (`src/components/chat/`, `src/components/messages/`)

**Priority**: 🟢 LOW (Post-booking feature)

| Component                     | Status          | Hardcoded Strings             | Effort |
| ----------------------------- | --------------- | ----------------------------- | ------ |
| `ChatHeader.tsx`              | ❌ Not migrated | Header labels                 | Small  |
| `ChatInput.tsx`               | ❌ Not migrated | Placeholder text, send button | Small  |
| `MessageBubble.tsx`           | ❌ Not migrated | Timestamp labels              | Small  |
| `QuickReplies.tsx`            | ❌ Not migrated | Quick reply suggestions       | Medium |
| `TypingIndicator.tsx`         | ❌ Not migrated | "Typing..."                   | Small  |
| `BookingDetailsCard.tsx`      | ❌ Not migrated | Card labels                   | Small  |
| `ConversationListItem.tsx`    | ❌ Not migrated | Time labels                   | Small  |
| `EmptyConversationsState.tsx` | ❌ Not migrated | Empty state message           | Small  |
| `ChatStatusNotice.tsx`        | ❌ Not migrated | Status messages               | Small  |

**Translation Keys Needed**:

```json
{
  "messages": {
    "title": "Messages",
    "empty": "No conversations yet",
    "typeMessage": "Type a message...",
    "send": "Send",
    "typing": "Typing...",
    "online": "Online",
    "offline": "Offline",
    "chatLocked": "Chat will unlock after payment",
    "chatClosed": "Chat closed"
  }
}
```

---

### 9. Notifications Components (`src/components/notifications/`)

**Priority**: 🟢 LOW

| Component               | Status          | Hardcoded Strings     | Effort       |
| ----------------------- | --------------- | --------------------- | ------------ |
| Notification components | ❌ Not migrated | Notification messages | Small-Medium |

---

### 10. Payment Components (`src/components/payment/`)

**Priority**: 🔴 HIGH (Revenue critical)

| Component                  | Status          | Hardcoded Strings            | Effort |
| -------------------------- | --------------- | ---------------------------- | ------ |
| Payment-related components | ❌ Not migrated | Payment labels, instructions | Medium |

---

### 11. Admin & Blog Components

**Priority**: 🟢 LOW (Internal/Content)

| Component        | Status          | Hardcoded Strings | Effort |
| ---------------- | --------------- | ----------------- | ------ |
| Admin components | ❌ Not migrated | Admin UI labels   | Medium |
| Blog components  | ❌ Not migrated | Blog UI labels    | Medium |

---

### 12. Shared/UI Components

**Priority**: 🟡 MEDIUM (Reusable across app)

| Component               | Status          | Hardcoded Strings | Effort |
| ----------------------- | --------------- | ----------------- | ------ |
| `LanguageSwitcher.tsx`  | ✅ Likely OK    | Language labels   | Check  |
| Other shared components | ❌ Not migrated | Various           | Varies |

---

## Implementation Strategy

### Phase 3: Common Components Migration (CURRENT)

**Goal**: Migrate all customer-facing components to i18n

**Priority Order** (based on user impact):

#### Week 1: Critical User Flows (Revenue Impacting)

1. **Authentication** (`src/components/auth/`)
   - [ ] `AuthModal.tsx` - Sign in/Sign up modal
   - Effort: 2-3 hours
   - Impact: New user onboarding

2. **Charter Display** (`src/components/charter/` + `src/components/charters/`)
   - [ ] `BookingWidget.tsx` - Booking form
   - [ ] `BaseCharterCard.tsx` - Product cards
   - [ ] `GalleryTabs.tsx` - Media tabs
   - [ ] `TripCard.tsx` - Trip display
   - Effort: 4-6 hours
   - Impact: Product discovery & conversion

3. **Booking Flow** (`src/components/booking/`)
   - [ ] `BookingDetails.tsx`
   - [ ] `BookingProgressTimeline.tsx`
   - [ ] `BookingExpiredScreen.tsx`
   - [ ] `DateNoLongerAvailableScreen.tsx`
   - [ ] `ReviewSection.tsx`
   - Effort: 4-5 hours
   - Impact: Booking completion

#### Week 2: Secondary Flows

4. **Payment** (`src/components/payment/`)
   - [ ] All payment components
   - Effort: 3-4 hours
   - Impact: Payment success rate

5. **Account Management** (`src/components/account/`)
   - [ ] `BookingActionButtons.tsx`
   - [ ] `BookingCard.tsx`
   - [ ] `FavoriteButton.tsx`
   - Effort: 3-4 hours
   - Impact: User engagement

6. **Search & Discovery** (`src/components/search/`)
   - [ ] All search/filter components
   - Effort: 4-6 hours
   - Impact: User experience

#### Week 3: Supporting Features

7. **Booking Details & Actions** (remaining)
   - [ ] `CancellationReasonDialog.tsx`
   - [ ] `CancellationInfo.tsx`
   - [ ] `BookingTimeline.tsx`
   - [ ] `BookingCountdown.tsx`
   - [ ] `TripPreparation.tsx`
   - Effort: 3-4 hours

8. **Charter Details** (remaining)
   - [ ] `EnhancedReviewsList.tsx`
   - [ ] `ReviewsList.tsx`
   - [ ] `PhotoGallery.tsx`
   - [ ] `VideoGallery.tsx`
   - [ ] `ShareButton.tsx`
   - [ ] `TripSpeciesSection.tsx`
   - [ ] `TripTechniquesSection.tsx`
   - Effort: 4-5 hours

9. **Messaging** (`src/components/chat/` + `src/components/messages/`)
   - [ ] All chat/message components
   - Effort: 3-4 hours
   - Impact: Customer support

#### Week 4: Lower Priority

10. **Marketing** (`src/components/marketing/`)
    - [ ] All marketing components
    - Effort: 2-3 hours

11. **Admin & Blog** (admin UI, blog management)
    - [ ] Admin components
    - [ ] Blog components
    - Effort: 4-6 hours
    - Impact: Internal only

12. **Notifications** (`src/components/notifications/`)
    - [ ] Notification components
    - Effort: 2-3 hours

---

## Translation Keys Strategy

### 1. Update Existing Namespaces

Most keys can fit into existing namespaces:

- `auth` - Authentication flows
- `booking` - Booking flows (expand significantly)
- `charter` - Charter display (expand)
- `account` - Account management (expand)
- `search` - Search & filters
- `common` - Shared UI elements

### 2. Add New Namespaces

```json
{
  "messages": {
    /* Chat/messaging */
  },
  "payment": {
    /* Payment flows */
  },
  "notifications": {
    /* Notifications */
  },
  "reviews": {
    /* Review system */
  },
  "admin": {
    /* Admin UI */
  },
  "blog": {
    /* Blog UI */
  }
}
```

### 3. Translation File Updates Required

Both `messages/en.json` and `messages/my.json` need:

- ~150-200 new translation keys
- Organized by namespace
- Proper pluralization support
- Dynamic value interpolation (e.g., `{count}`, `{name}`)

---

## Migration Checklist Per Component

For each component to migrate:

### Pre-Migration

- [ ] Read component file
- [ ] Identify all hardcoded strings
- [ ] Check if translation keys exist
- [ ] Add missing keys to both `en.json` and `my.json`

### Migration

- [ ] Add `"use client"` if client component
- [ ] Import `useTranslations` from 'next-intl'
- [ ] Create translation hook: `const t = useTranslations('namespace')`
- [ ] Replace all hardcoded strings with `t('key')`
- [ ] Handle dynamic values with interpolation: `t('key', { value })`
- [ ] Handle pluralization if needed

### Post-Migration

- [ ] Test component in Malay (default)
- [ ] Test component in English (`/en` routes)
- [ ] Verify no layout breaks with different text lengths
- [ ] Check TypeScript compilation
- [ ] Commit with descriptive message

---

## Risk Assessment

### High Risk Areas

1. **Booking Widget** - Complex state management + i18n
2. **Payment Forms** - Security + compliance + translations
3. **Search Filters** - Many dynamic labels

### Medium Risk Areas

1. **Timeline Components** - Date/time formatting
2. **Review Components** - Rating displays
3. **Chat Components** - Real-time updates

### Low Risk Areas

1. **Static Marketing Pages**
2. **Admin Components** (internal use)

---

## Success Metrics

### Completion Targets

- **End of Week 1**: 30 components migrated (~35% total)
- **End of Week 2**: 60 components migrated (~70% total)
- **End of Week 3**: 75 components migrated (~90% total)
- **End of Week 4**: 84 components migrated (100% complete)

### Quality Metrics

- Zero hardcoded English strings in customer-facing components
- Both Malay and English translations complete
- No layout breaks in either language
- TypeScript compilation successful
- All tests passing

---

## Tools & Automation

### Search for Hardcoded Strings

```bash
# Find components with potential hardcoded strings
grep -r "\"[A-Z][a-z]" src/components --include="*.tsx" | grep -v "ui/"

# Count remaining components
find src/components -name "*.tsx" -type f ! -path "*/ui/*" -exec grep -l "\"[A-Z][a-z]" {} \; | wc -l
```

### Validation Script (TODO)

Create script to validate:

- All customer-facing text uses translations
- Translation keys exist in both languages
- No missing interpolation values

---

## Dependencies

### Required Before Starting

- ✅ Phase 1 Complete (App Router)
- ✅ Phase 2 Complete (Layout Components)
- ✅ Translation infrastructure ready
- ✅ Translation files structure established

### Required During Migration

- Translation file updates (concurrent)
- Testing in both languages
- QA review of text lengths/layouts

---

## Resource Requirements

### Developer Time

- **Week 1**: 10-14 hours (critical flows)
- **Week 2**: 10-12 hours (secondary flows)
- **Week 3**: 9-11 hours (supporting features)
- **Week 4**: 8-10 hours (lower priority)
- **Total**: ~40-50 hours over 4 weeks

### Translator Time

- Review ~150-200 new Malay translations
- Estimated: 5-8 hours (can be parallel)

---

## Next Steps

### Immediate Actions (Today)

1. Review and approve this plan
2. Prioritize Week 1 components
3. Set up tracking board/spreadsheet

### Start Week 1 (Tomorrow)

1. Migrate `AuthModal.tsx`
2. Add authentication translation keys
3. Test authentication flow in both languages

### Ongoing

- Update progress in `docs/I18N_MIGRATION_STATUS.md`
- Commit each component migration separately
- Track remaining count with grep command
- Adjust priorities based on business needs

---

## Notes

- **Incremental Approach**: Each component can be migrated independently
- **No Breaking Changes**: Migration doesn't affect functionality
- **Backward Compatible**: Non-migrated components continue working
- **Flexible Schedule**: Can pause/resume without issues
- **Quality Over Speed**: Better to do it right than fast

---

**Status**: 🚨 PLAN READY FOR REVIEW  
**Next Action**: Approve plan and begin Week 1 migrations
