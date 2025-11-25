# Pricing Update: Quick Reference Guide

## TL;DR

- ✅ **Hide commission** from anglers (bake into trip price)
- ✅ **Commission cap**: RM 100 maximum (helps expensive trips)
- ✅ **Service fee**: 1.5% → 2%
- ✅ **Captain earnings**: Unchanged (always base price)
- ✅ **Database storage**: Split structure maintained (tripPrice, platformFee, serviceFee separate)

---

## Before & After (Quick View)

### What Angler Sees

| Line Item    | Before         | After      |
| ------------ | -------------- | ---------- |
| Trip Price   | RM 500         | RM 550 ⚡  |
| Platform Fee | RM 50          | _hidden_   |
| Service Fee  | RM 7.50 (1.5%) | RM 11 (2%) |
| **Total**    | **RM 507.50**  | **RM 561** |

_⚡ Commission now baked into trip price_

---

## Commission Cap Logic

```typescript
function calculateCommission(basePrice: number): number {
  const commission = basePrice * 0.1; // 10%
  return Math.min(commission, 100); // Cap at RM 100
}
```

### Examples

- RM 500 base → RM 50 commission ✅
- RM 1,000 base → RM 100 commission ✅
- RM 2,000 base → RM 100 commission (not RM 200!) 🎯

---

## New Pricing Formula

````typescript
### Key Calculations

```typescript
// 1. Calculate base price (with priceOverride support)
const basePrice = trip.priceOverride ?? trip.price;

// 2. Calculate commission with RM100 cap
const subtotal = basePrice * days;
const commission = Math.min(subtotal * 0.1, 100);

// 3. Calculate display price (for UI only)
const displayPrice = basePrice + commission;

// 4. Calculate service fee (2%)
const afterDiscount = subtotal + commission - discount;
const serviceFee = afterDiscount * 0.02;

// 5. Calculate final price
const finalPrice = afterDiscount + serviceFee;

// 6. Captain earnings (unchanged)
const captainEarnings = subtotal; // basePrice * days
````

### Database Storage (CRITICAL)

```typescript
// ✅ CORRECT: Split structure (current & future)
await prisma.booking.create({
  data: {
    tripPrice: basePrice, // Captain's base price
    platformFee: commission, // Commission (split!)
    serviceFee: serviceFee, // Service fee
    captainEarnings: basePrice * days,
    finalPrice: finalPrice,
  },
});

// ❌ WRONG: DO NOT bake commission into tripPrice
await prisma.booking.create({
  data: {
    tripPrice: basePrice + commission, // NO!
    platformFee: 0, // NO!
    // ...
  },
});
```

````

---

## Implementation Checklist

### Phase 1: Core Logic ⚡ HIGH PRIORITY

- [ ] Update `pricing-service.ts`
  - [ ] Add `calculateCommission()` helper
  - [ ] Update `calculatePricing()` function
  - [ ] Change service fee: 1.5% → 2%
  - [ ] Update `PricingBreakdown` interface

### Phase 2: UI Updates

- [ ] Update `BookingWidget` (fishon-ui)
- [ ] Update `BaseCharterCard`
- [ ] Update `BookingSummaryCard`
- [ ] Update payment preview page

### Phase 3: API Routes

- [ ] Update `/api/bookings/create`
- [ ] Update `/api/bookings/create-guest`
- [ ] Verify payment callback logic

### Phase 4: Testing

- [ ] Unit tests (commission cap)
- [ ] Integration tests (booking flows)
- [ ] Manual testing (all flows)

---

## Database Fields

### What We Store

| Field             | What It Stores        | Example |
| ----------------- | --------------------- | ------- |
| `tripPrice`       | Captain's base price  | RM 500  |
| `platformFee`     | Commission (with cap) | RM 50   |
| `serviceFee`      | 2% service fee        | RM 11   |
| `captainEarnings` | `tripPrice * days`    | RM 500  |
| `finalPrice`      | What angler pays      | RM 561  |

### What Angler Sees

| UI Label           | Calculation               | Example |
| ------------------ | ------------------------- | ------- |
| "Trip Price"       | `tripPrice + platformFee` | RM 550  |
| "Discount"         | Promo amount              | -RM 55  |
| "Service Fee (2%)" | 2% of amount              | RM 11   |
| "Total"            | `finalPrice`              | RM 561  |

**⚠️ Never show `platformFee` to angler!**

---

## Code Examples

### 1. Calculate Display Price

```typescript
// In charter-service.ts or anywhere displaying trip price
function getDisplayPrice(trip: Trip): number {
  const basePrice = trip.priceOverride ?? trip.price;
  const commission = Math.min(basePrice * 0.1, 100);
  return basePrice + commission;
}
````

### 2. Booking Breakdown UI

```tsx
// In BookingSummaryCard.tsx
<div className="space-y-2">
  <div className="flex justify-between">
    <span>Trip Price ({days} days)</span>
    <span>RM {displayPrice * days}</span>
  </div>

  {discount > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Discount</span>
      <span>-RM {discount}</span>
    </div>
  )}

  <div className="flex justify-between">
    <span>Service Fee (2%)</span>
    <span>RM {serviceFee}</span>
  </div>

  <div className="flex justify-between font-bold border-t pt-2">
    <span>Total</span>
    <span>RM {finalPrice}</span>
  </div>
</div>;

{
  /* ❌ DON'T show this anymore */
}
{
  /* <div>Platform Fee: RM {platformFee}</div> */
}
```

### 3. API Route Update

```typescript
// In /api/bookings/create/route.ts
const basePrice = trip.priceOverride ?? trip.price;

const pricingBreakdown = calculatePricing({
  basePrice, // Changed from: tripPrice
  days,
  promoDiscount,
});

// Store in database
await prisma.booking.create({
  data: {
    tripPrice: basePrice, // Captain's base
    platformFee: pricingBreakdown.commission, // Hidden commission
    serviceFee: pricingBreakdown.serviceFee, // 2% fee
    captainEarnings: basePrice * days, // What captain gets
    finalPrice: pricingBreakdown.finalPrice, // What angler pays
    // ... other fields
  },
});
```

---

## Testing Scenarios

### Test Case 1: Small Trip

```
Base: RM 500
Expected Commission: RM 50
Expected Display: RM 550
Expected Service Fee: RM 11 (2% of 550)
Expected Total: RM 561
```

### Test Case 2: Large Trip (Commission Cap)

```
Base: RM 2,000
Expected Commission: RM 100 (capped, not RM 200!)
Expected Display: RM 2,100
Expected Service Fee: RM 42 (2% of 2,100)
Expected Total: RM 2,142
```

### Test Case 3: With Promo (10% off)

```
Base: RM 500
Commission: RM 50
Display: RM 550
Discount: RM 55 (10% of 550)
After Discount: RM 495
Service Fee: RM 9.90 (2% of 495)
Total: RM 504.90
```

---

## Common Mistakes to Avoid

### ❌ Wrong

```typescript
// DON'T show commission to angler
<div>Platform Fee: RM {platformFee}</div>

// DON'T use old service fee rate
serviceFee = amount * 0.015;  // Old: 1.5%

// DON'T forget commission cap
commission = basePrice * 0.10;  // Missing cap!
```

### ✅ Correct

```typescript
// DO hide commission (bake into display price)
displayPrice = basePrice + commission;

// DO use new service fee rate
serviceFee = amount * 0.02; // New: 2%

// DO apply commission cap
commission = Math.min(basePrice * 0.1, 100);
```

---

## Migration Strategy

### Option 1: Immediate Switch (Recommended)

```bash
# 1. Create feature branch
git checkout -b feat/hide-commission-increase-service-fee

# 2. Implement all changes
# 3. Test thoroughly
# 4. Deploy to production

# Simple, clean, no feature flags needed
```

### Option 2: Feature Flag

```typescript
// If gradual rollout preferred
const useNewPricing = process.env.NEW_PRICING_MODEL === "true";

if (useNewPricing) {
  // New pricing logic
} else {
  // Old pricing logic
}
```

**Recommendation:** Option 1 (cleaner, less complexity)

---

## Questions & Answers

### Q: Does this affect captain earnings?

**A:** No. Captains always receive base price × days. Zero change.

### Q: What about priceOverride?

**A:** Use `priceOverride ?? price` as base, then add commission.

### Q: Should we update fishon-captain?

**A:** Not required for angler-side changes, but may want to show commission cap info in captain earnings dashboard.

### Q: How to handle existing bookings?

**A:** Leave unchanged. Only new bookings use new pricing.

---

## Support Resources

### Documentation

- [Full Implementation Plan](./PRICING_UPDATE_PLAN.md)
- [Visual Comparison](./PRICING_COMPARISON.md)
- [Financial System Docs](../fishon-captain/docs/config/FINANCIAL_CALCULATION_SYSTEM.md)

### Code References

- Pricing Service: `src/lib/services/pricing-service.ts`
- Booking API: `src/app/api/bookings/create/route.ts`
- UI Components: `src/components/` and `@fishon/ui`

### Testing

```bash
# Run pricing tests
npm run test -- pricing-service

# Run booking tests
npm run test -- bookings/create

# Full test suite
npm test
```

---

**Last Updated:** 26 Nov 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 2-3 days
