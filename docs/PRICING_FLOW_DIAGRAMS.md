# Pricing Flow Diagrams

## Overall System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     FISHON CAPTAIN APP                      │
│                                                             │
│  Captain Dashboard                                          │
│  ┌──────────────────────────────────────┐                   │
│  │ Create/Edit Trip                     │                   │
│  │                                      │                   │
│  │ Base Price: [RM 500   ]              │                   │
│  │                                      │                   │
│  │ [Save Trip]                          │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                      │
│                      ▼                                      │
│              Stores: price = 500                            │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ Data sync (v_public_charters view)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     FISHON MARKET APP                       │
│                                                             │
│  System Calculation (Backend)                               │
│  ┌──────────────────────────────────────┐                   │
│  │ basePrice = 500                      │                   │
│  │ commission = min(500 * 0.10, 100)    │                   │
│  │           = 50                       │                   │
│  │ displayPrice = 500 + 50 = 550        │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                      │
│                      ▼                                      │
│  Angler View (Frontend)                                     │
│  ┌──────────────────────────────────────┐                   │
│  │ Charter Card                         │                   │
│  │                                      │                   │
│  │ [Charter Image]                      │                   │
│  │                                      │                   │
│  │ FROM RM 550 / day   ← Shows display  │                   │
│  │                       price          │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                      │
│                      │ Angler clicks "Book Now"             │
│                      ▼                                      │
│  Booking Breakdown                                          │
│  ┌──────────────────────────────────────┐                   │
│  │ Trip Price (1 day):    RM 550.00     │                   │
│  │ Service Fee (2%):      RM  11.00     │                   │
│  │ ═══════════════════════════════════  │                   │
│  │ Total:                 RM 561.00     │                   │
│  │                                      │                   │
│  │ [Pay Now]                            │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                      │
│                      ▼                                      │
│  Payment Processing                                         │
│  ┌──────────────────────────────────────┐                   │
│  │ SenangPay Integration                │                   │
│  │ Amount: RM 561.00                    │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                      │
│                      ▼                                      │
│  Database Storage                                           │
│  ┌──────────────────────────────────────┐                   │
│  │ Booking Record:                      │                   │
│  │   tripPrice: 500                     │                   │
│  │   platformFee: 50                    │                   │
│  │   serviceFee: 11                     │                   │
│  │   captainEarnings: 500               │                   │
│  │   finalPrice: 561                     │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ Webhook/Notification
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     FISHON CAPTAIN APP                      │
│                                                             │
│  Captain Earnings Dashboard                                 │
│  ┌──────────────────────────────────────┐                   │
│  │ Booking #12345                       │                   │
│  │                                      │                   │
│  │ Base Price:      RM 500.00           │                   │
│  │ Your Earnings:   RM 500.00           │                   │
│  │                                      │                   │
│  │ Status: PAID ✅                      │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Pricing Calculation Flow

```
START: Captain sets base price
         │
         ▼
┌──────────────────────────┐
│ basePrice = 500          │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Calculate Commission             │
│                                  │
│ raw = basePrice * 0.10           │
│ commission = min(raw, 100)       │
│                                  │
│ If basePrice ≤ 1000:             │
│   commission = basePrice * 0.10  │
│ If basePrice > 1000:             │
│   commission = 100 (CAPPED)      │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ displayPrice =           │
│   basePrice + commission │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ subtotal =               │
│   displayPrice * days    │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Apply Discount           │
│ (if promo code)          │
│                          │
│ afterDiscount =          │
│   subtotal - discount    │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ serviceFee =             │
│   afterDiscount * 0.02   │
│   (2% service fee)       │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ finalPrice =             │
│   afterDiscount +        │
│   serviceFee             │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ OUTPUT:                  │
│                          │
│ Captain Gets:            │
│   basePrice * days       │
│                          │
│ Fishon Gets:             │
│   commission +           │
│   serviceFee -           │
│   discount               │
│                          │
│ Angler Pays:             │
│   finalPrice             │
└──────────────────────────┘
```

---

## UI Component Flow

```
┌────────────────────────────────────────────────────────────┐
│ CHARTER LISTING PAGE                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ CharterCard│  │ CharterCard│  │ CharterCard│          │
│  ├────────────┤  ├────────────┤  ├────────────┤          │
│  │ [Image]    │  │ [Image]    │  │ [Image]    │          │
│  │            │  │            │  │            │          │
│  │ Charter A  │  │ Charter B  │  │ Charter C  │          │
│  │            │  │            │  │            │          │
│  │ FROM       │  │ FROM       │  │ FROM       │          │
│  │ RM 550     │◄─ displayPrice  │ RM 1,100   │          │
│  │            │  (base+comm)  │            │          │
│  └────────────┘  └────────────┘  └────────────┘          │
└────────────────────────────────────────────────────────────┘
         │
         │ User clicks Charter A
         ▼
┌────────────────────────────────────────────────────────────┐
│ CHARTER DETAIL PAGE                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  BookingWidget                                             │
│  ┌──────────────────────────────────────┐                 │
│  │ Select Date: [26 Nov 2025]           │                 │
│  │ Days: [1]                            │                 │
│  │ Guests: [2 adults, 0 children]       │                 │
│  │                                      │                 │
│  │ Available Trips:                     │                 │
│  │ ┌──────────────────────────────────┐ │                 │
│  │ │ Half Day Trip                    │ │                 │
│  │ │ 4 hours • up to 6 anglers        │ │                 │
│  │ │                                  │ │                 │
│  │ │               RM 550 ◄────────── │ │ displayPrice    │
│  │ │               total for 1 day    │ │                 │
│  │ │                                  │ │                 │
│  │ │ [Reserve Trip]                   │ │                 │
│  │ └──────────────────────────────────┘ │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘
         │
         │ User clicks "Reserve Trip"
         ▼
┌────────────────────────────────────────────────────────────┐
│ BOOKING CHECKOUT PAGE                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Booking Summary                                           │
│  ┌──────────────────────────────────────┐                 │
│  │ [Charter Images]                     │                 │
│  │                                      │                 │
│  │ Charter A • Half Day Trip            │                 │
│  │ 26 Nov 2025 • 1 day                  │                 │
│  │ 2 adults, 0 children                 │                 │
│  │                                      │                 │
│  │ ──────────────────────────────────   │                 │
│  │                                      │                 │
│  │ Trip Price (1 day):   RM 550.00 ◄─── displayPrice      │
│  │                                      │ (NO commission   │
│  │ Service Fee (2%):     RM  11.00     │  line shown!)    │
│  │ ════════════════════════════════     │                 │
│  │ Total:                RM 561.00     │                 │
│  │                                      │                 │
│  │ [Proceed to Payment]                 │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘
         │
         │ User proceeds to payment
         ▼
┌────────────────────────────────────────────────────────────┐
│ PAYMENT PREVIEW PAGE                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Pricing Snapshot                                          │
│  ┌──────────────────────────────────────┐                 │
│  │ Trip Price (1 day):   RM 550.00     │                 │
│  │ Service Fee (2%):     RM  11.00     │                 │
│  │ ════════════════════════════════     │                 │
│  │ Total:                RM 561.00     │                 │
│  └──────────────────────────────────────┘                 │
│                                                            │
│  Payment Method                                            │
│  ○ Credit/Debit Card                                       │
│  ○ FPX                                                     │
│  ○ E-Wallet                                                │
│                                                            │
│  [Confirm Payment]                                         │
└────────────────────────────────────────────────────────────┘
```

---

## Commission Cap Decision Tree

```
                    ┌─────────────────┐
                    │ Captain sets    │
                    │ Base Price      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Calculate:      │
                    │ 10% of base     │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
       ┌────────────────┐        ┌────────────────┐
       │ 10% ≤ RM 100?  │        │ 10% > RM 100?  │
       │                │        │                │
       │ (Base ≤ 1000)  │        │ (Base > 1000)  │
       └────────┬───────┘        └────────┬───────┘
                │                         │
                ▼                         ▼
       ┌────────────────┐        ┌────────────────┐
       │ Use 10% as is  │        │ Cap at RM 100  │
       └────────┬───────┘        └────────┬───────┘
                │                         │
                └──────────┬──────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ commission =   │
                  │ chosen amount  │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ displayPrice = │
                  │ base + comm    │
                  └────────────────┘

Examples:
─────────────────────────────────────────────
Base = RM 500
  ├─ 10% = RM 50
  ├─ 50 ≤ 100? YES
  └─ Commission = RM 50 ✅

Base = RM 1,000
  ├─ 10% = RM 100
  ├─ 100 ≤ 100? YES
  └─ Commission = RM 100 ✅

Base = RM 1,500
  ├─ 10% = RM 150
  ├─ 150 ≤ 100? NO
  └─ Commission = RM 100 (CAPPED) ⚠️

Base = RM 5,000
  ├─ 10% = RM 500
  ├─ 500 ≤ 100? NO
  └─ Commission = RM 100 (CAPPED) ⚠️
```

---

## Promo Code Application Flow

```
                    ┌─────────────────┐
                    │ User enters     │
                    │ Promo Code      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Validate Code   │
                    │ via API         │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
       ┌────────────────┐        ┌────────────────┐
       │ Valid?         │        │ Invalid?       │
       │ Get discount   │        │ Show error     │
       │ amount         │        │ message        │
       └────────┬───────┘        └────────────────┘
                │
                ▼
       ┌────────────────┐
       │ Apply to       │
       │ displayPrice   │
       │ (not base!)    │
       └────────┬───────┘
                │
                ▼
       ┌────────────────────────────────┐
       │ Pricing Calculation            │
       │                                │
       │ displayPrice = base + comm     │
       │ subtotal = displayPrice * days │
       │ discount = subtotal * promo%   │
       │ afterDiscount = sub - discount │
       │ serviceFee = afterDisc * 0.02  │
       │ finalPrice = afterDisc + fee   │
       └────────┬───────────────────────┘
                │
                ▼
       ┌────────────────────────────────┐
       │ Show Updated Breakdown         │
       │                                │
       │ Trip Price:      RM 550.00     │
       │ Discount (10%): -RM  55.00 ✨  │
       │ Service Fee:     RM   9.90     │
       │ ──────────────────────────     │
       │ Total:           RM 504.90     │
       └────────────────────────────────┘

Key Point:
──────────
Discount applies to displayPrice (which includes commission),
NOT to basePrice.

Example:
  Base: RM 500
  Commission: RM 50
  Display: RM 550
  10% Promo: RM 55 discount (10% of 550, not 500)
```

---

## Database Storage Flow

```
┌──────────────────────────────────────────────────┐
│ BOOKING CREATED                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Calculate All Values First                      │
│ ┌────────────────────────────────────┐           │
│ │ basePrice = 500                    │           │
│ │ commission = 50                    │           │
│ │ displayPrice = 550                 │           │
│ │ days = 1                           │           │
│ │ discount = 0                       │           │
│ │ serviceFee = 11                    │           │
│ │ finalPrice = 561                   │           │
│ │ captainEarnings = 500              │           │
│ └────────────────────────────────────┘           │
│                     │                            │
│                     ▼                            │
│ Store in Database                                │
│ ┌────────────────────────────────────┐           │
│ │ Booking {                          │           │
│ │   id: "booking-123",               │           │
│ │   tripPrice: 500,      ◄── base    │           │
│ │   platformFee: 50,     ◄── comm    │           │
│ │   serviceFee: 11,      ◄── 2% fee  │           │
│ │   captainEarnings: 500,◄── captain │           │
│ │   finalPrice: 561,     ◄── angler  │           │
│ │   discount: { ... },               │           │
│ │   days: 1,                         │           │
│ │   status: "PENDING",               │           │
│ │   ...                              │           │
│ │ }                                  │           │
│ └────────────────────────────────────┘           │
└──────────────────────────────────────────────────┘
                     │
                     ├─────────────────┬────────────────┐
                     │                 │                │
                     ▼                 ▼                ▼
┌────────────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ANGLER SEES            │  │ CAPTAIN SEES   │  │ FISHON SEES    │
├────────────────────────┤  ├────────────────┤  ├────────────────┤
│                        │  │                │  │                │
│ Trip Price: RM 550     │  │ Base: RM 500   │  │ Revenue:       │
│  (from display calc)   │  │ Earnings: 500  │  │   Comm: +50    │
│                        │  │                │  │   Fee:  +11    │
│ Service Fee: RM 11     │  │ Status: PAID ✅│  │   Net:  +61    │
│                        │  │                │  │                │
│ Total: RM 561          │  │                │  │                │
└────────────────────────┘  └────────────────┘  └────────────────┘
```

---

## Money Flow

```
ANGLER PAYS RM 561
        │
        ▼
┌──────────────────────────┐
│ SenangPay (Gateway)      │
│ Takes: ~RM 11 (2% fee)   │
└──────────┬───────────────┘
           │
           │ Net: RM 550
           ▼
    ┌─────────────┐
    │ Fishon Holds│
    │ RM 550      │
    └──────┬──────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │ To Captain   │      │ To Fishon    │
    │ RM 500       │      │ RM 50        │
    │ (base price) │      │ (commission) │
    └──────────────┘      └──────────────┘

Summary:
────────
Angler:  -RM 561 (total paid)
Captain: +RM 500 (base price)
Fishon:  +RM  50 (commission, hidden from angler)
         +RM  11 (service fee, shown to angler)
         ───────
         +RM  61 (total revenue)

Note: If discount > commission, Fishon takes loss
Example: RM 50 commission - RM 55 discount = -RM 5 loss
```

---

**Last Updated:** 26 Nov 2025  
**Related Docs:**

- [Implementation Plan](./PRICING_UPDATE_PLAN.md)
- [Visual Comparison](./PRICING_COMPARISON.md)
- [Quick Reference](./PRICING_QUICK_REFERENCE.md)
