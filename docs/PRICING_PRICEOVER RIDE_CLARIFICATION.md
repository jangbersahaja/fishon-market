# Price Override System Clarification

## Summary

**`priceOverride`** is admin's active price override set via the pricing dashboard in fishon-captain. When set, it replaces the captain's base `price` for all calculations.

## Pattern

```typescript
// EVERYWHERE in the codebase
const basePrice = trip.priceOverride ?? trip.price;
```

This pattern is already implemented in:

- ✅ `BaseCharterCard.tsx` - Min price calculation
- ✅ `TripCard.tsx` - Display price
- ✅ `BookingWidget.tsx` - Booking calculations
- ✅ `/api/bookings/create/route.ts` - Booking creation
- ✅ `/api/bookings/create-guest/route.ts` - Guest booking
- ✅ `trip-service.ts` - All helper functions

## Database Schema

```prisma
model Trip {
  price         Decimal  @db.Decimal(10, 2)  // Captain's base price
  promoPrice    Decimal? @db.Decimal(10, 2)  // Min acceptable price (floor)
  priceOverride Decimal? @db.Decimal(10, 2)  // Admin's active override
}
```

## Pricing Flow with priceOverride

### Step 1: Determine Base Price

```typescript
const basePrice = trip.priceOverride ?? trip.price;
// If admin set override: use priceOverride
// Otherwise: use captain's base price
```

### Step 2: Calculate Commission (NEW)

```typescript
const commission = Math.min(basePrice * 0.1, 100);
// 10% of base price, capped at RM 100
```

### Step 3: Display Price (NEW)

```typescript
const displayPrice = basePrice + commission;
// What angler sees (commission hidden from them)
```

### Step 4: Captain Earnings

```typescript
const captainEarnings = basePrice * days;
// Captain always receives the base price
// Whether it came from price or priceOverride doesn't matter
```

## Examples

### Example 1: No Override (Captain's Base Price)

```typescript
Trip {
  price: 500,
  priceOverride: null,
}

// Calculation
basePrice = 500  // Uses captain's base price
commission = 50  // 10% of 500
displayPrice = 550  // What angler sees
captainEarnings = 500  // What captain receives
```

### Example 2: With Override (Admin Adjusted)

```typescript
Trip {
  price: 500,       // Captain's original
  priceOverride: 450,  // Admin reduced it
}

// Calculation
basePrice = 450  // Uses admin's override
commission = 45  // 10% of 450
displayPrice = 495  // What angler sees
captainEarnings = 450  // What captain receives (reduced)
```

### Example 3: Large Trip with Cap

```typescript
Trip {
  price: 2000,
  priceOverride: null,
}

// Calculation
basePrice = 2000
commission = 100  // Capped! (would be 200)
displayPrice = 2100
captainEarnings = 2000
```

### Example 4: Override + Promo Code

```typescript
Trip {
  price: 500,
  priceOverride: 450,
}
PromoCode: 10% off

// Calculation
basePrice = 450  // Override price
commission = 45  // 10% of 450
displayPrice = 495  // 450 + 45
subtotal = 495 * 1 day = 495
discount = 495 * 0.10 = 49.50  // 10% off display price
afterDiscount = 495 - 49.50 = 445.50
serviceFee = 445.50 * 0.02 = 8.91  // 2% service fee
finalPrice = 445.50 + 8.91 = 454.41

captainEarnings = 450  // Still receives base (override price)
fishonRevenue = 45 - 49.50 + 8.91 = 4.41  // Commission - discount + service
```

## Key Points

1. **priceOverride is the BASE price** when set by admin
   - Commission is calculated FROM this price
   - Captain receives THIS price (not the display price)
   - Display price = priceOverride + commission

2. **Commission is ALWAYS hidden from angler**
   - Never shown in breakdown
   - Baked into the "Trip Price" line item
   - Only service fee (2%) is shown separately

3. **Captain earnings are simple**
   - `captainEarnings = (priceOverride ?? price) * days`
   - No complex calculations
   - They get what was set as the base

4. **Promo codes apply to display price**
   - Discount is calculated from `(basePrice + commission) * days`
   - If discount > commission, Fishon absorbs the loss
   - Captain earnings remain unchanged

## Implementation for New Pricing System

### What Changes?

```typescript
// BEFORE (Current)
const tripPrice = trip.priceOverride ?? trip.price;
// angler sees: RM 500
// breakdown shows: Trip Price (RM 500) + Platform Fee (RM 50) + Service Fee (RM 8.25)

// AFTER (New System)
const basePrice = trip.priceOverride ?? trip.price; // Same!
const commission = Math.min(basePrice * 0.1, 100); // NEW
const displayPrice = basePrice + commission; // NEW
// angler sees: RM 550
// breakdown shows: Trip Price (RM 550) + Service Fee (RM 11)
// Platform Fee is HIDDEN
```

### What Stays the Same?

- ✅ Using `trip.priceOverride ?? trip.price` everywhere
- ✅ Captain earnings = base price \* days
- ✅ Promo codes apply to display price
- ✅ Database storage structure

### What's NEW?

- ❌ Hide commission from angler's breakdown
- ❌ Show commission-inclusive price as "Trip Price"
- ❌ Increase service fee from 1.5% to 2%
- ❌ Add commission cap at RM 100

## FAQ

### Q: Does priceOverride include commission?

**A:** No. priceOverride is the BASE price. Commission is calculated and added on top.

### Q: If admin sets priceOverride to RM 450, what does captain receive?

**A:** RM 450 per day (the override amount). Commission is Fishon's, not deducted from captain.

### Q: If override is RM 450, what does angler pay (no promo)?

**A:**

- Base: RM 450
- Commission: RM 45 (10% of 450)
- Display Price: RM 495
- Service Fee: RM 9.90 (2% of 495)
- **Total: RM 504.90**

### Q: What if admin sets override HIGHER than base price?

**A:** Captain receives the higher amount. Completely valid.

```typescript
Trip { price: 400, priceOverride: 500 }
// Captain receives RM 500 (the override)
// Angler pays RM 550 + RM 11 service = RM 561
```

### Q: Can captain see/modify priceOverride?

**A:** No. Only admin can set priceOverride via staff pricing dashboard. Captain only sets base `price`.

## Testing Scenarios

### Test 1: Override Set

```typescript
- Set trip.priceOverride = 450 in admin
- Expected display: RM 495 (450 + 45 commission)
- Expected captain earnings: RM 450
```

### Test 2: Override Removed

```typescript
- Remove priceOverride (set to null)
- Expected fallback to trip.price
- Expected commission calculated from base price
```

### Test 3: Override with Cap

```typescript
- Set trip.priceOverride = 2000
- Expected commission: RM 100 (capped)
- Expected display: RM 2100
```

### Test 4: Override Lower than Base

```typescript
- trip.price = 500
- Set trip.priceOverride = 400
- Expected: All calculations use 400
- Captain receives RM 400 (reduced earnings, intentional)
```

---

**Last Updated:** 26 Nov 2025  
**Status:** Clarification Document  
**Related:** PRICING_UPDATE_PLAN.md, PRICE_OVERRIDE_UI_UPDATES.md
