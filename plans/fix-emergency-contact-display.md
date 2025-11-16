## Fix: Emergency Contact Not Saved to Bookings

### Issue

Emergency contact was being collected during booking but not saved to the booking record. The fields were being saved to the user table but not included in the booking's `guests` JSON field, so the BookingDetails component couldn't display it.

### Root Cause

In both `/api/bookings/create/route.ts` and `/api/bookings/create-guest/route.ts`, the code was:

1. ✅ Collecting emergency contact fields (emergencyName, emergencyPhone, emergencyRelation)
2. ✅ Saving them to the user table
3. ❌ **Missing**: Adding them to the booking's `guests` JSON field

The booking display service expected the emergency contact in `booking.guests.emergencyContact` but it was never being saved there.

### Files Fixed

1. **src/app/api/bookings/create/route.ts** (authenticated bookings)
   - Added emergency contact to `guestsData` object before creating booking
   - Emergency contact now included in booking record alongside participants

2. **src/app/api/bookings/create-guest/route.ts** (guest bookings)
   - Same fix applied for guest booking flow
   - Ensures both authenticated and guest bookings save emergency contact

### Changes Made

**Before:**

```typescript
const guestsData: any = {
  adults: ad,
  children: ch,
};

// Add participants if provided
if (Array.isArray(participants) && participants.length > 0) {
  guestsData.participants = participants.map((p: any) => ({
    name: p.name,
    phone: p.phone,
    isBooker: p.isBooker || false,
  }));
}
```

**After:**

```typescript
const guestsData: any = {
  adults: ad,
  children: ch,
};

// Add participants if provided
if (Array.isArray(participants) && participants.length > 0) {
  guestsData.participants = participants.map((p: any) => ({
    name: p.name,
    phone: p.phone,
    isBooker: p.isBooker || false,
  }));
}

// Add emergency contact if provided
if (
  emergencyName &&
  typeof emergencyName === "string" &&
  emergencyName.trim() &&
  emergencyPhone &&
  typeof emergencyPhone === "string" &&
  emergencyPhone.trim()
) {
  guestsData.emergencyContact = {
    name: emergencyName.trim(),
    phone: emergencyPhone.trim(),
    relationship:
      emergencyRelation &&
      typeof emergencyRelation === "string" &&
      emergencyRelation.trim()
        ? emergencyRelation.trim()
        : "Not specified",
  };
}
```

### Data Flow (Now Working)

1. **Booking Form** → Collects emergency contact fields
2. **API Endpoint** → Saves to both:
   - User table (for future bookings)
   - Booking guests JSON (for this booking)
3. **enrichBookingWithTripData** → Parses from `booking.guests.emergencyContact`
4. **BookingDetails Component** → Displays emergency contact section

### Verification Checklist

- ✅ Emergency contact saved to booking record
- ✅ Emergency contact appears in BookingDetails component
- ✅ Participants list displays correctly
- ✅ Both authenticated and guest bookings include emergency contact
- ⚠️ **Note**: Existing bookings without emergency contact in JSON won't show it (expected - only affects new bookings)

### Future Enhancement: Editing Modals

**Not implemented yet** - Would require:

1. New API endpoint: `PATCH /api/bookings/[id]` to update guests JSON
2. New component: `EditParticipantsModal.tsx`
3. New component: `EditEmergencyContactModal.tsx`
4. Edit buttons in BookingDetails component
5. Authorization check (only booking owner can edit)

This is a separate feature request and should be tracked separately.

### Testing Steps

1. Create a new booking with emergency contact filled in
2. Navigate to booking confirmation page
3. Verify emergency contact section appears in BookingDetails
4. Verify participants list appears (if provided)
5. Check that emergency contact has: name, phone, relationship

### Git Commit Message

```
fix: save emergency contact to booking guests JSON

- Add emergencyContact to booking.guests JSON field during creation
- Emergency contact now displays in BookingDetails component
- Applies to both authenticated and guest booking flows
- Maintains backward compatibility (optional field)
```
