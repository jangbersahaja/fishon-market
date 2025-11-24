# i18n Migration Tracking

**Last Updated**: November 23, 2025  
**Total Components**: 84  
**Migrated**: 3 (3.6%)  
**Remaining**: 81 (96.4%)

---

## Quick Stats

```
Progress: [▓░░░░░░░░░░░░░░░░░░░] 3.6%

🔴 HIGH Priority: 45 components
🟡 MEDIUM Priority: 25 components
🟢 LOW Priority: 14 components
```

---

## Week 1: Critical User Flows (Revenue Impacting)

### Authentication (2 components)

- [ ] `src/components/auth/AuthModal.tsx` 🔴 HIGH

### Charter Display (5 components)

- [ ] `src/components/charter/BookingWidget.tsx` 🔴 HIGH
- [ ] `src/components/charters/BaseCharterCard.tsx` 🔴 HIGH
- [ ] `src/components/charter/GalleryTabs.tsx` 🔴 HIGH
- [ ] `src/components/charter/TripCard.tsx` 🔴 HIGH
- [ ] `src/components/charter/PhotoGallery.tsx` 🔴 HIGH

### Booking Flow (5 components)

- [ ] `src/components/booking/BookingDetails.tsx` 🔴 HIGH
- [ ] `src/components/booking/BookingProgressTimeline.tsx` 🔴 HIGH
- [ ] `src/components/booking/BookingExpiredScreen.tsx` 🔴 HIGH
- [ ] `src/components/booking/DateNoLongerAvailableScreen.tsx` 🔴 HIGH
- [ ] `src/components/booking/ReviewSection.tsx` 🔴 HIGH

**Week 1 Total**: 12 components

---

## Week 2: Secondary Flows

### Payment (estimate 3-5 components)

- [ ] `src/components/payment/*` 🔴 HIGH

### Account Management (3 components)

- [ ] `src/components/account/BookingActionButtons.tsx` 🟡 MEDIUM
- [ ] `src/components/account/BookingCard.tsx` 🟡 MEDIUM
- [ ] `src/components/account/FavoriteButton.tsx` 🟡 MEDIUM

### Search & Discovery (estimate 5-8 components)

- [ ] `src/components/search/*` 🟡 MEDIUM

**Week 2 Total**: ~15 components

---

## Week 3: Supporting Features

### Booking Details (6 components)

- [ ] `src/components/booking/CancellationReasonDialog.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/CancellationInfo.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/BookingTimeline.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/BookingCountdown.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/TripPreparation.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/EmailVerificationModal.tsx` 🟡 MEDIUM
- [ ] `src/components/booking/GuestBookingVerificationModal.tsx` 🟡 MEDIUM

### Charter Details (7 components)

- [ ] `src/components/charter/EnhancedReviewsList.tsx` 🟡 MEDIUM
- [ ] `src/components/charter/ReviewsList.tsx` 🟡 MEDIUM
- [ ] `src/components/charter/VideoGallery.tsx` 🟡 MEDIUM
- [ ] `src/components/charter/ShareButton.tsx` 🟡 MEDIUM
- [ ] `src/components/charter/TripSpeciesSection.tsx` 🟡 MEDIUM
- [ ] `src/components/charter/TripTechniquesSection.tsx` 🟡 MEDIUM

### Messaging (9 components)

- [ ] `src/components/chat/ChatHeader.tsx` 🟢 LOW
- [ ] `src/components/chat/ChatInput.tsx` 🟢 LOW
- [ ] `src/components/chat/MessageBubble.tsx` 🟢 LOW
- [ ] `src/components/chat/QuickReplies.tsx` 🟢 LOW
- [ ] `src/components/chat/TypingIndicator.tsx` 🟢 LOW
- [ ] `src/components/chat/BookingDetailsCard.tsx` 🟢 LOW
- [ ] `src/components/messages/ConversationListItem.tsx` 🟢 LOW
- [ ] `src/components/messages/EmptyConversationsState.tsx` 🟢 LOW
- [ ] `src/components/messages/ChatStatusNotice.tsx` 🟢 LOW

**Week 3 Total**: ~22 components

---

## Week 4: Lower Priority

### Marketing (estimate 2-3 components)

- [ ] `src/components/marketing/LatestTrip.tsx` 🟡 MEDIUM
- [ ] `src/components/marketing/*` 🟡 MEDIUM

### Admin & Blog (estimate 8-12 components)

- [ ] `src/components/admin/*` 🟢 LOW
- [ ] `src/components/blog/*` 🟢 LOW

### Notifications (estimate 2-4 components)

- [ ] `src/components/notifications/*` 🟢 LOW

**Week 4 Total**: ~15 components

---

## Components Already Migrated ✅

1. `src/components/layout/Navbar.tsx` (Phase 2)
2. `src/components/layout/Footer.tsx` (Phase 2)
3. `src/components/booking/CheckYourBookings.tsx` (Phase 3)

---

## Command to Check Progress

```bash
# Count remaining components with hardcoded strings
cd /Users/jangbersahaja/Website/fishon-market
find src/components -name "*.tsx" -type f ! -path "*/ui/*" -exec grep -l "\"[A-Z][a-z]" {} \; | wc -l

# Current: 84
# Target: 0
```

---

## Daily Update Template

```markdown
### Date: YYYY-MM-DD

**Components Migrated Today**: X
**Total Migrated**: X / 84
**Completion**: X%

#### Completed:

- [ ] Component name

#### Issues Found:

- Issue description

#### Notes:

- Any observations
```

---

## Resource Links

- **Comprehensive Plan**: [`I18N_COMPREHENSIVE_FIX_PLAN.md`](./I18N_COMPREHENSIVE_FIX_PLAN.md)
- **Migration Status**: [`I18N_MIGRATION_STATUS.md`](./I18N_MIGRATION_STATUS.md)
- **Implementation Guide**: [`I18N_IMPLEMENTATION.md`](./I18N_IMPLEMENTATION.md)
- **Quick Start**: [`I18N_QUICKSTART.md`](./I18N_QUICKSTART.md)

---

**Next Session**: Start with `AuthModal.tsx` (Week 1, highest priority)
