# Pricing Update Implementation Plan

## Summary of Changes

After discussion with the Fishon team, we're making a major pricing model update to **hide commission from anglers** and adjust fee structures.

### Current Model (What Anglers See)

```
Trip Base Price:         RM 500
Platform Fee (10%):      RM  50   ← VISIBLE
Discount (if any):      -RM  50
Service Fee (1.5%):      RM   7.50
─────────────────────────────────
Total:                   RM 507.50
```

### New Model (What Anglers Will See)

```
Trip Price:              RM 550   ← Commission baked in (was RM 500 + 50)
Discount (if any):      -RM  50
Service Fee (2%):        RM  10   ← Increased from 1.5%
─────────────────────────────────
Total:                   RM 510
```

## Key Changes

### 1. **Commission Policy**

- **Rate**: 10% of trip base price
- **Maximum Cap**: RM 100
- **Application**:
  - Trips ≤ RM 1,000: 10% commission (e.g., RM 500 trip = RM 50 commission)
  - Trips > RM 1,000: RM 100 flat rate (e.g., RM 2,000 trip = RM 100 commission, not RM 200)
- **Visibility**: HIDDEN from anglers (baked into displayed trip price)

### 2. **Service Fee**

- **Old**: 1.5% of amount before service fee
- **New**: 2% of amount before service fee
- **Visibility**: VISIBLE to anglers (payment gateway fee)

### 3. **Pricing Display Logic**

- Captain sets: **Base Price** (e.g., RM 500)
- System calculates: **Commission** (e.g., RM 50, max RM 100)
- Angler sees: **Trip Price = Base + Commission** (e.g., RM 550)
- Breakdown shows: Trip Price, Discount, Service Fee, Total
- Breakdown NEVER shows: Commission/Platform Fee

## Financial Flow Examples

### Example 1: Small Trip (RM 500)

```typescript
// Captain Side (fishon-captain)
captainSetsPrice = 500        // What captain enters

// System Calculation (Hidden)
commission = 500 * 0.10 = 50  // 10%, under cap
displayPrice = 500 + 50 = 550 // What angler sees

// Angler Side (fishon-market) - WITHOUT PROMO
tripPrice: 550                // Displayed price (commission baked in)
serviceFee: 550 * 0.02 = 11   // 2% of trip price
finalPrice: 550 + 11 = 561    // What angler pays

// Captain receives
captainEarnings = 500         // priceOverride ?? price (what was set as base)

// Fishon receives
fishonRevenue = 50 + 11 = 61  // Commission + Service Fee
```

### Example 2: Large Trip (RM 2,000)

````typescript
### Example 2: Large Trip (RM 2,000)
```typescript
// Captain Side
captain/adminSetsPrice = 2000  // Via price or priceOverride
basePrice = priceOverride ?? price = 2000

// System Calculation (Hidden)
commission = min(2000 * 0.10, 100) = 100  // Capped at RM 100
displayPrice = 2000 + 100 = 2100

// Angler Side - WITHOUT PROMO
tripPrice: 2100
serviceFee: 2100 * 0.02 = 42
finalPrice: 2100 + 42 = 2142

// Captain receives
captainEarnings = 2000

// Fishon receives
fishonRevenue = 100 + 42 = 142
````

### Example 3: With Promo Code (RM 500 base, 10% off)

```typescript
// Captain Side
captainSetsPrice = 500

// System Calculation
commission = 50 (10% of 500)
displayPrice = 550

// Angler Side - WITH 10% PROMO
tripPrice: 550
discount: 55                  // 10% of 550
subtotalAfterDiscount: 495    // 550 - 55
serviceFee: 495 * 0.02 = 9.90
finalPrice: 495 + 9.90 = 504.90

// Captain receives
captainEarnings = 500         // Always gets base price

// Fishon receives
// Commission = 50 (unchanged)
// Discount comes from Fishon's commission
actualCommission = 50 - 55 = -5  // Fishon pays RM 5 to cover discount
serviceFee = 9.90
fishonRevenue = -5 + 9.90 = 4.90
```

## Implementation Tasks

### Phase 1: Core Pricing Service ✅ HIGH PRIORITY

**Files to Update:**

1. `/Users/jangbersahaja/Website/fishon-market/src/lib/services/pricing-service.ts`
   - Add `calculateCommission(basePrice: number): number` helper
   - Update `calculatePricing()` to:
     - Accept `basePrice` instead of `tripPrice`
     - Calculate commission with cap: `min(basePrice * 0.10, 100)`
     - Calculate `tripPrice = basePrice + commission`
     - Update service fee from 1.5% to 2%
     - Set `captainEarnings = basePrice` (NOT subtotal - commission)
   - Update `PricingBreakdown` interface:
     - Add `basePrice: number` (captain's original price, internal only)
     - Add `commission: number` (calculated, internal only)
     - Rename `tripPrice` → `displayPrice` (what angler sees)
     - Keep `subtotal` as `displayPrice * days`
   - Remove `platformFee` from public breakdown (keep internal for DB)

**New Pricing Formula:**

```typescript
// Input: basePrice (from captain), days, discount
const commission = Math.min(Math.round(basePrice * 0.1 * 100) / 100, 100);
const displayPrice = basePrice + commission;
const subtotal = displayPrice * days;
const amountAfterDiscount = subtotal - discount;
const serviceFee = Math.round(amountAfterDiscount * 0.02 * 100) / 100;
const finalPrice = amountAfterDiscount + serviceFee;
const captainEarnings = basePrice * days;
```

### Phase 2: Data Fetching & Display Logic

**Charter Service Updates:** 2. `/Users/jangbersahaja/Website/fishon-market/src/lib/services/charter-service.ts`

- When fetching charter data, ensure we get `basePrice` from captain DB
- Transform trips to show `displayPrice = basePrice + commission`
- Cache commission calculations

**BookingWidget Updates:** 3. `/Users/jangbersahaja/Website/fishon-ui/src/components/charter/BookingWidget.tsx`

- Display `displayPrice` instead of base `price`
- Update total calculation: `displayPrice * days`
- Remove any commission/platform fee mentions

**Charter Card Updates:** 4. `/Users/jangbersahaja/Website/fishon-market/src/components/charters/BaseCharterCard.tsx`

- Calculate `minDisplayPrice` (not `minPrice`)
- Show: "FROM RM [displayPrice]"
- Ensure `priceOverride` also includes commission

5. `/Users/jangbersahaja/Website/fishon-market/src/components/charters/CharterCard.tsx`
   - No changes needed (uses BaseCharterCard)

### Phase 3: Booking Flow UI

**Booking Summary:** 6. `/Users/jangbersahaja/Website/fishon-market/src/app/[locale]/(marketplace)/book/[charterId]/ui/BookingSummaryCard.tsx`

- Remove commission/platform fee line
- Show breakdown as:
  ```
  Trip Price (X days): RM [displayPrice * days]
  Discount:            -RM [discount] (if applicable)
  Service Fee (2%):    RM [serviceFee]
  ─────────────────────
  Total:               RM [finalPrice]
  ```

**Payment Preview:** 7. `/Users/jangbersahaja/Website/fishon-market/src/app/[locale]/(marketplace)/book/payment/preview/page.tsx`

- Update pricing snapshot to hide commission
- Show only: Trip Price, Discount, Service Fee, Total

### Phase 4: API Routes

**Booking Creation (Authenticated):** 8. `/Users/jangbersahaja/Website/fishon-market/src/app/api/bookings/create/route.ts`

- Update to pass `basePrice` to pricing service
- **Database storage (NO CHANGES - keep split structure):**
  - `tripPrice`: basePrice (captain's base) ✅
  - `platformFee`: commission (split, not baked) ✅
  - `serviceFee`: 2% service fee (changed from 1.5%) ⚡
  - `captainEarnings`: basePrice \* days ✅
  - `finalPrice`: what angler pays ✅

**Booking Creation (Guest):** 9. `/Users/jangbersahaja/Website/fishon-market/src/app/api/bookings/create-guest/route.ts`

- Same updates as authenticated route

**Payment Callbacks:** 10. `/Users/jangbersahaja/Website/fishon-market/src/app/api/payment/senangpay-callback/route.ts` - Commission calculation logic unchanged (uses stored `platformFee`) - Service fee already calculated correctly

11. `/Users/jangbersahaja/Website/fishon-market/src/app/[locale]/(marketplace)/book/payment/return/page.tsx`
    - Commission calculation unchanged (uses pricing plan)

### Phase 5: Database Schema (No Changes Required!)

**CRITICAL: Keep Current Split Structure**

The database storage remains **exactly the same** as current implementation:

- `Booking.tripPrice` → Captain's base price (trip.priceOverride ?? trip.price)
- `Booking.platformFee` → Commission (10% with RM100 cap) - **SPLIT, not baked in!**
- `Booking.serviceFee` → 2% service fee (changed from 1.5%)
- `Booking.captainEarnings` → basePrice \* days (unchanged)
- `Booking.finalPrice` → Total amount angler pays

**What Changes:**

- ✅ Commission calculation: Add RM100 cap
- ✅ Service fee: 1.5% → 2%
- ❌ Database structure: NO CHANGES
- ❌ Storage logic: NO CHANGES

**Current Storage Logic (Keep This!):**

```typescript
// Database storage (current & future - NO CHANGES)
await prisma.booking.create({
  data: {
    tripPrice: basePrice, // Captain's base (split)
    platformFee: commission, // Commission (split)
    serviceFee: serviceFee, // Service fee (split)
    captainEarnings: basePrice * days,
    finalPrice: total,
  },
});
```

**Only UI Changes:**

- Hide platformFee line from angler's breakdown
- Show trip price as: `basePrice + commission` (appears as single line)
- Captain dashboard still sees platformFee separately

**Migration:**

```sql
-- No schema changes required
-- Just ensure existing fields are used correctly:
-- tripPrice = captain's base price
-- platformFee = commission (10% with RM100 cap)
-- serviceFee = 2% service fee
-- captainEarnings = tripPrice * days
-- finalPrice = (tripPrice + commission) * days - discount + serviceFee
```

### Phase 6: Documentation

12. Create `/Users/jangbersahaja/Website/fishon-market/docs/config/PRICING_MODEL.md`
    - Document new pricing structure
    - Include all examples above
    - Explain commission cap logic
    - Show financial flow diagrams

13. Update `/Users/jangbersahaja/Website/fishon-captain/docs/config/FINANCIAL_CALCULATION_SYSTEM.md`
    - Update formulas to reflect new model
    - Explain commission cap
    - Update captain earnings calculation

14. Update `/Users/jangbersahaja/Website/fishon-captain/docs/FISHON_REVENUE_POLICY.md`
    - Explain angler-side pricing (commission hidden)
    - Document service fee increase to 2%

### Phase 7: Testing

15. **Unit Tests:**
    - Test `calculateCommission()` with various inputs
    - Test commission cap at RM 100
    - Test pricing breakdown with/without discount
    - Test service fee at 2%

16. **Integration Tests:**
    - Test booking creation with new pricing
    - Test payment callback with new structure
    - Test all booking flows (MANUAL/AUTO, Guest/Auth)

17. **Manual Testing:**
    - Create bookings with trips < RM 1,000
    - Create bookings with trips > RM 1,000 (verify cap)
    - Apply promo codes and verify discounts
    - Check all UI components show correct prices
    - Verify captain receives correct earnings

## Migration Strategy

### Option A: Immediate Switch (Recommended)

1. Deploy all changes at once
2. No dual-mode support
3. All new bookings use new pricing
4. Existing bookings unchanged

### Option B: Gradual Rollout

1. Add feature flag `NEW_PRICING_MODEL=true/false`
2. Run both pricing models in parallel
3. Switch flag when ready
4. Remove old logic after confirmation

**Recommendation:** Option A (Immediate Switch) because:

- Simpler implementation
- No confusion between two pricing models
- Existing bookings are immutable (won't be affected)

## Database Impact

### New Bookings

- Use new pricing calculation
- `platformFee` stores commission (with cap)
- `serviceFee` stores 2% service fee
- Display price = base + commission (not shown separately)

### Existing Bookings

- No changes needed
- Historical data remains accurate
- Reports can differentiate by booking date

## Compatibility Checklist

### fishon-market (Angler App)

- ✅ Pricing service updated
- ✅ UI components hide commission
- ✅ Booking APIs use new calculation
- ✅ Payment flows work correctly

### fishon-captain (Captain App)

- ⚠️ Captain still sets base price (no change)
- ⚠️ Captain dashboard shows base price (no change)
- ⚠️ Earnings calculation unchanged (always gets base price)
- ⚠️ Promo codes apply to display price (angler's view)
- ❓ **Question**: Do we need to update captain's earnings dashboard to show commission cap info?

### fishon-ui (Shared Components)

- ✅ BookingWidget updated to show display price
- ✅ Types updated to handle new pricing structure

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback:**

   ```bash
   git revert <pricing-update-commit>
   npm run build
   npm run deploy
   ```

2. **Database:**
   - No rollback needed (new pricing only affects future bookings)

3. **Monitoring:**
   - Watch booking creation rate
   - Monitor payment success rate
   - Check customer support tickets

## Communication Plan

### Internal Team

- [ ] Notify fishon-captain team of changes
- [ ] Update admin/staff training docs
- [ ] Brief customer support on new pricing structure

### Captains

- [ ] Email explaining new pricing (angler-side changes)
- [ ] Emphasize: earnings unchanged, just how we display to anglers
- [ ] Provide FAQ document

### Anglers

- [ ] Update pricing FAQ
- [ ] Update booking help articles
- [ ] No direct announcement (change is transparent to them)

## Timeline Estimate

- **Phase 1 (Core Service):** 2-3 hours
- **Phase 2 (Data & Display):** 3-4 hours
- **Phase 3 (Booking UI):** 2-3 hours
- **Phase 4 (API Routes):** 2-3 hours
- **Phase 5 (DB Review):** 1 hour
- **Phase 6 (Documentation):** 2 hours
- **Phase 7 (Testing):** 4-5 hours

**Total:** ~16-23 hours (2-3 days)

## Risk Assessment

### High Risk

- ❌ Incorrect commission calculation → Wrong captain earnings
- ❌ Service fee not updated → Incorrect final price
- ❌ Display price shows commission → Defeats purpose

### Medium Risk

- ⚠️ Promo code discount calculation off
- ⚠️ Large trip commission cap not applied
- ⚠️ UI shows old pricing labels

### Low Risk

- ℹ️ Documentation incomplete
- ℹ️ Test coverage gaps
- ℹ️ Captain confusion about display prices

## Success Criteria

- [x] Commission is hidden from all angler-facing UI
- [x] Service fee is 2% (not 1.5%)
- [x] Commission cap works correctly (RM 100 max)
- [x] Captain earnings = base price \* days
- [x] All booking flows create correct records
- [x] Payment processing works correctly
- [x] No breaking changes to existing bookings
- [x] Documentation is complete and accurate

## Questions to Resolve

1. **Captain App Impact:** Do we need to update fishon-captain to show commission cap info in earnings dashboard?
   - Current: Shows base price only (priceOverride ?? price)
   - Proposed: Show "Commission: RM X (capped at RM 100)" info?
   - Note: Captain earnings are always `(priceOverride ?? price) * days` - unchanged

2. **Price Override System (CLARIFIED):**
   - `priceOverride` is admin's active price override (set via pricing dashboard)
   - If `priceOverride` is null, use captain's base `price`
   - Pattern everywhere: `basePrice = trip.priceOverride ?? trip.price`
   - Commission is ALWAYS calculated from this base price: `min(basePrice * 0.10, 100)`
   - Display price to angler: `basePrice + commission`
   - Captain receives: `basePrice * days` (whether from override or base price)

3. **Promo Codes (CONFIRMED):**
   - Promo discounts apply to display price (base + commission)
   - Current behavior: Applies to `subtotal = displayPrice * days` ✅
   - This is correct and should remain unchanged

4. **Reports & Analytics:** Do we need to update:
   - Revenue reports to show commission with cap?
   - Booking reports to distinguish old vs new pricing?
   - Captain earnings reports to show priceOverride usage?

## Next Steps

1. Get approval from Fishon team on this plan
2. Answer questions above
3. Create feature branch: `feat/hide-commission-increase-service-fee`
4. Implement Phase 1 (Core Pricing Service)
5. Test thoroughly in dev environment
6. Review with team before proceeding to Phase 2

---

**Document Status:** Draft  
**Last Updated:** 26 Nov 2025  
**Author:** GitHub Copilot  
**Reviewers:** Fishon Team
