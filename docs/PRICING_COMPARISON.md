# Pricing Model Comparison: Before vs After

## Visual Comparison

### Current Model (Before)

```
┌─────────────────────────────────────────────────────┐
│ CAPTAIN SETS BASE PRICE: RM 500                     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ ANGLER SEES (BOOKING BREAKDOWN)                     │
├─────────────────────────────────────────────────────┤
│ Trip Base Price:         RM 500.00                  │
│ Platform Fee (10%):      RM  50.00  ← VISIBLE       │
│ ─────────────────────────────────────               │
│ Subtotal:                RM 550.00                  │
│ Discount (10%):         -RM  50.00  (if promo)     │
│ ─────────────────────────────────────               │
│ Before Service Fee:      RM 500.00                  │
│ Service Fee (1.5%):      RM   7.50  ← VISIBLE       │
│ ═════════════════════════════════════               │
│ TOTAL:                   RM 507.50                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ CAPTAIN RECEIVES: RM 500.00                         │
│ FISHON RECEIVES:  RM   7.50 (service fee only)     │
│                 + RM  50.00 (platform fee)          │
│                 = RM  57.50 - 50.00 (discount)      │
│                 = RM   7.50 net                     │
└─────────────────────────────────────────────────────┘
```

### New Model (After)

```
┌─────────────────────────────────────────────────────┐
│ CAPTAIN SETS BASE PRICE: RM 500                     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ SYSTEM CALCULATES (HIDDEN FROM ANGLER)              │
├─────────────────────────────────────────────────────┤
│ Base Price:              RM 500.00                  │
│ Commission (10%):        RM  50.00  ← HIDDEN        │
│ Display Price:           RM 550.00  ← SHOW THIS     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ ANGLER SEES (BOOKING BREAKDOWN)                     │
├─────────────────────────────────────────────────────┤
│ Trip Price:              RM 550.00  ← Commission    │
│                                       baked in!     │
│ Discount (10%):         -RM  55.00  (if promo)     │
│ ─────────────────────────────────────               │
│ Before Service Fee:      RM 495.00                  │
│ Service Fee (2%):        RM   9.90  ← VISIBLE       │
│ ═════════════════════════════════════               │
│ TOTAL:                   RM 504.90                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ CAPTAIN RECEIVES: RM 500.00 (unchanged)             │
│ FISHON RECEIVES:  RM   9.90 (service fee)           │
│                 + RM  50.00 (commission, hidden)    │
│                 = RM  59.90 - 55.00 (discount)      │
│                 = RM   4.90 net                     │
└─────────────────────────────────────────────────────┘
```

## Side-by-Side Comparison

| Aspect                          | Before         | After                        |
| ------------------------------- | -------------- | ---------------------------- |
| **Captain Sets**                | RM 500 base    | RM 500 base                  |
| **Angler Sees as "Trip Price"** | RM 500         | RM 550 (includes commission) |
| **Commission Shown?**           | ✅ Yes (RM 50) | ❌ No (hidden)               |
| **Service Fee Rate**            | 1.5%           | 2%                           |
| **Service Fee Amount**          | RM 7.50        | RM 9.90                      |
| **Total (no promo)**            | RM 507.50      | RM 559.90                    |
| **Total (with 10% promo)**      | RM 507.50      | RM 504.90                    |
| **Captain Receives**            | RM 500         | RM 500                       |
| **Fishon Revenue**              | RM 7.50 net    | RM 4.90 net                  |

## Commission Cap Example

### Large Trip: RM 2,000 Base Price

#### Before

```
Captain Sets:           RM 2,000.00
Platform Fee (10%):     RM   200.00  ← NO CAP
Service Fee (1.5%):     RM    33.00
────────────────────────────────────
Total:                  RM 2,233.00

Captain Receives:       RM 2,000.00
Fishon Receives:        RM   233.00
```

#### After

```
Captain Sets:           RM 2,000.00
Commission (10%):       RM   100.00  ← CAPPED!
Display Price:          RM 2,100.00
Service Fee (2%):       RM    42.00
────────────────────────────────────
Total:                  RM 2,142.00

Captain Receives:       RM 2,000.00
Fishon Receives:        RM   142.00
```

**Savings for Angler:** RM 91 on large trips!

## Commission Cap Table

| Base Price | 10% Commission | Capped Amount | Displayed Price |
| ---------- | -------------- | ------------- | --------------- |
| RM 100     | RM 10          | RM 10         | RM 110          |
| RM 500     | RM 50          | RM 50         | RM 550          |
| RM 1,000   | RM 100         | RM 100        | RM 1,100        |
| RM 1,500   | RM 150         | **RM 100** ⚠️ | RM 1,600        |
| RM 2,000   | RM 200         | **RM 100** ⚠️ | RM 2,100        |
| RM 5,000   | RM 500         | **RM 100** ⚠️ | RM 5,100        |

**Cap applies at RM 1,000+ base price**

## Service Fee Comparison

| Base Price | Display Price | Before (1.5%) | After (2%) | Difference |
| ---------- | ------------- | ------------- | ---------- | ---------- |
| RM 100     | RM 110        | RM 1.65       | RM 2.20    | +RM 0.55   |
| RM 500     | RM 550        | RM 8.25       | RM 11.00   | +RM 2.75   |
| RM 1,000   | RM 1,100      | RM 16.50      | RM 22.00   | +RM 5.50   |
| RM 2,000   | RM 2,100      | RM 33.00      | RM 42.00   | +RM 9.00   |

## Promo Code Impact

### Example: RM 500 Base, 10% Promo Code

#### Before

```
Trip Base Price:         RM 500.00
Platform Fee (10%):      RM  50.00
────────────────────────────────────
Subtotal:                RM 550.00
Discount (10%):         -RM  55.00
────────────────────────────────────
Before Service Fee:      RM 495.00
Service Fee (1.5%):      RM   7.43
════════════════════════════════════
TOTAL:                   RM 502.43

Fishon's Perspective:
  Platform Fee:          RM  50.00
  Discount (from fee):  -RM  55.00
  Service Fee:           RM   7.43
  Net Revenue:           RM   2.43
```

#### After

```
Trip Price:              RM 550.00 (includes commission)
Discount (10%):         -RM  55.00
────────────────────────────────────
Before Service Fee:      RM 495.00
Service Fee (2%):        RM   9.90
════════════════════════════════════
TOTAL:                   RM 504.90

Fishon's Perspective:
  Commission:            RM  50.00
  Discount (from comm): -RM  55.00
  Service Fee:           RM   9.90
  Net Revenue:           RM   4.90
```

## Key Insights

### ✅ Benefits

1. **Simpler for Anglers**: No confusing "platform fee" line item
2. **Market Standard**: Most booking platforms hide commission
3. **Commission Cap**: Protects anglers on expensive trips
4. **Captain Unchanged**: Still receives full base price

### ⚠️ Considerations

1. **Slightly Higher Total**: Due to 2% service fee (up from 1.5%)
2. **Large Discounts**: When promo > commission, Fishon loses money
3. **Price Perception**: RM 550 vs RM 500 might look higher initially

### 🎯 Net Impact

- **Small trips (< RM 1,000)**: Angler pays ~2-3% more
- **Large trips (> RM 1,000)**: Angler saves significantly due to cap
- **With promos**: Competitive pricing maintained

## FAQ

### Q: Why hide the commission?

**A:** Industry standard. Most marketplaces (Airbnb, Booking.com) bundle fees into the listing price. Simpler for customers.

### Q: Won't higher displayed prices scare anglers away?

**A:** The difference is small (10% markup), and the total price is comparable to before. Plus, commission cap makes large trips cheaper.

### Q: What if a promo code gives more discount than the commission?

**A:** Fishon absorbs the difference. Example: RM 50 commission - RM 55 discount = -RM 5 loss. This is acceptable for customer acquisition.

### Q: How does this affect captain earnings?

**A:** Zero impact. Captains always receive their base price (RM 500 in examples).

### Q: Do we need to inform captains?

**A:** Yes, but emphasize it's a _display_ change only. Their earnings are unchanged.

---

**Last Updated:** 26 Nov 2025  
**Related Documents:**

- [Implementation Plan](./PRICING_UPDATE_PLAN.md)
- [Financial Calculation System](../fishon-captain/docs/config/FINANCIAL_CALCULATION_SYSTEM.md)
