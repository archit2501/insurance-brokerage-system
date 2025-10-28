# 🎨 Brokerage Automation - Visual Workflow

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INSURANCE BROKERAGE AUTOMATION                        │
│                    3 SLABS: 9% | 15% | 20%                              │
└─────────────────────────────────────────────────────────────────────────┘

USER INPUT                AUTO-CALCULATION              INSTANT DISPLAY
═══════════════════════  ═══════════════════════════   ═══════════════════

┌──────────────────┐     ┌───────────────────────┐    ┌────────────────┐
│  Select Policy   │────>│  Load Policy Data:    │───>│  Auto-fill:    │
│  MEIBL/PL/2025/  │     │  • Sum Insured        │    │  ₦100,000,000  │
│  00001           │     │  • Gross Premium      │    │  ₦500,000      │
└──────────────────┘     │  • LOB Info           │    └────────────────┘
                         └───────────────────────┘

                                   ↓

┌──────────────────┐     ┌───────────────────────┐    ┌────────────────┐
│  Pick Slab:      │────>│  Calculate:           │───>│  Show:         │
│                  │     │                       │    │                │
│  ┌─────────┐    │     │  Brokerage Amount     │    │  ₦75,000       │
│  │   9%    │    │     │  = ₦500K × 15%        │    │                │
│  ├─────────┤    │     │                       │    │  VAT:          │
│  │  *15%*  │ ←──│─────│  VAT on Brokerage     │    │  ₦5,625        │
│  ├─────────┤    │     │  = ₦75K × 7.5%        │    │                │
│  │   20%   │    │     │                       │    │  Levies:       │
│  └─────────┘    │     │  NAICOM = ₦500K × 1%  │    │  ₦10,000       │
└──────────────────┘     │  NCRIB = ₦500K × 0.5% │    │                │
                         │  Ed Tax = ₦500K × 0.5%│    │  Net Due:      │
                         └───────────────────────┘    │  ₦409,375      │
                                                       └────────────────┘

                                   ↓

┌──────────────────────────────────────────────────────────────────────┐
│                         CLICK "CREATE NOTE"                          │
│                      ✅ All Values Validated                         │
│                      ✅ Saved to Database                            │
│                      ✅ Ready for Approval                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Split-Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Credit/Debit Note Creation                          │
├───────────────────────────────┬─────────────────────────────────────────┤
│                               │                                         │
│  📝 FORM (Left Side)          │  📊 LIVE CALCULATOR (Right Side)        │
│                               │                                         │
│  Note Type: [Credit Note  v]  │  ┌─────────────────────────────────┐  │
│                               │  │ Summary                         │  │
│  Client: [archit jain      v] │  │ ─────────────────────────────── │  │
│                               │  │ Gross Premium:   ₦5,000,000.00  │  │
│  Policy: [MEIBL/PL/2025/00v]  │  │ Brokerage Rate:         15%     │  │
│                               │  └─────────────────────────────────┘  │
│  Insurer: [f1insurance     v] │                                        │
│                               │  ┌─────────────────────────────────┐  │
│  Gross Premium:               │  │ Brokerage Breakdown             │  │
│  [5,000,000] ←────────────────┼──┤ ─────────────────────────────── │  │
│   Auto-filled from policy     │  │ Brokerage Amount:  ₦750,000.00  │  │
│                               │  │ VAT (7.5%):         ₦56,250.00  │  │
│  Brokerage Slab:              │  │ Net Brokerage:     ₦750,000.00  │  │
│  ┌─────┐  ┌─────┐  ┌─────┐  │  └─────────────────────────────────┘  │
│  │ 9%  │  │*15%*│  │ 20% │  │                                        │
│  └─────┘  └─────┘  └─────┘  │  ┌─────────────────────────────────┐  │
│    ↑                          │  │ Statutory Levies                │  │
│    Clicks here ───────────────┼──┤ ─────────────────────────────── │  │
│                               │  │ NAICOM Levy:        ₦50,000.00  │  │
│  VAT %: [7.5]                 │  │ NCRIB Levy:         ₦25,000.00  │  │
│                               │  │ Education Tax:      ₦25,000.00  │  │
│  Agent Comm %: [0]            │  │ Total Levies:      ₦100,000.00  │  │
│                               │  └─────────────────────────────────┘  │
│  ┌──────────────────────┐    │                                        │
│  │   CREATE NOTE        │    │  ┌─────────────────────────────────┐  │
│  └──────────────────────┘    │  │ Net Amount Due to Insurer       │  │
│                               │  │ ═════════════════════════════════│  │
│                               │  │ Gross Premium:    ₦5,000,000.00 │  │
│                               │  │ Less: Brokerage     -₦806,250.00│  │
│                               │  │ Less: Levies        -₦100,000.00│  │
│                               │  │ ─────────────────────────────────│  │
│                               │  │ NET PAYABLE:      ₦4,093,750.00 │  │
│                               │  └─────────────────────────────────┘  │
└───────────────────────────────┴─────────────────────────────────────────┘
```

---

## Data Flow

```
1. USER ACTION                    2. SYSTEM REACTION
   ═════════════                     ═══════════════════

┌─────────────────┐                ┌────────────────────────┐
│ Enters Sum      │──────────────> │ Suggests Slab          │
│ Insured         │                │ based on amount        │
│ ₦100,000,000    │                │ → Premium (20%)        │
└─────────────────┘                └────────────────────────┘
        │                                     │
        ↓                                     ↓
┌─────────────────┐                ┌────────────────────────┐
│ Enters Rate     │──────────────> │ Calculates             │
│ 0.5%            │                │ Gross Premium          │
│                 │                │ = ₦500,000             │
└─────────────────┘                └────────────────────────┘
        │                                     │
        ↓                                     ↓
┌─────────────────┐                ┌────────────────────────┐
│ Clicks          │──────────────> │ Recalculates:          │
│ "Standard 15%"  │                │ • Brokerage: ₦75K      │
│                 │                │ • VAT: ₦5.6K           │
│                 │                │ • Levies: ₦10K         │
│                 │                │ • Net: ₦409K           │
└─────────────────┘                └────────────────────────┘
        │                                     │
        ↓                                     ↓
┌─────────────────┐                ┌────────────────────────┐
│ Changes to 20%  │──────────────> │ INSTANT recalc:        │
│ Button          │                │ • Brokerage: ₦100K     │
│                 │                │ • VAT: ₦7.5K           │
│                 │  <300ms!       │ • Levies: ₦10K         │
│                 │                │ • Net: ₦382K           │
└─────────────────┘                └────────────────────────┘
```

---

## Calculation Formula Visualization

```
┌────────────────────────────────────────────────────────────┐
│                   PREMIUM BREAKDOWN                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Gross Premium: ₦5,000,000                                 │
│  ├─ Brokerage (15%):        ₦750,000   ┐                  │
│  │  └─ VAT on Brokerage:     ₦56,250   │→ Total: ₦806,250 │
│  │                                      │                  │
│  ├─ NAICOM Levy (1%):         ₦50,000  │                  │
│  ├─ NCRIB Levy (0.5%):        ₦25,000  │→ Total: ₦100,000 │
│  └─ Education Tax (0.5%):     ₦25,000  ┘                  │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  NET TO INSURER: ₦4,093,750                                │
│                                                            │
│  Formula:                                                  │
│  Net = Gross - (Brokerage + VAT) - Levies                 │
│  Net = 5,000,000 - 806,250 - 100,000                      │
│  Net = 4,093,750 ✓                                        │
└────────────────────────────────────────────────────────────┘
```

---

## Slab Selection Logic

```
Premium Amount              Suggested Slab        Visual Indicator
─────────────────────────  ────────────────────   ───────────────────

₦0 - ₦999,999
     ↓
┌─────────┐  ┌─────┐  ┌─────┐
│  *9%*   │  │ 15% │  │ 20% │  ← "Suggested" badge on 9%
│  Basic  │  │     │  │     │     (highlighted with ring)
└─────────┘  └─────┘  └─────┘


₦1,000,000 - ₦9,999,999
     ↓
┌─────┐  ┌─────────┐  ┌─────┐
│ 9%  │  │  *15%*  │  │ 20% │  ← "Suggested" badge on 15%
│     │  │Standard │  │     │     (highlighted with ring)
└─────┘  └─────────┘  └─────┘


₦10,000,000+
     ↓
┌─────┐  ┌─────┐  ┌─────────┐
│ 9%  │  │ 15% │  │  *20%*  │  ← "Suggested" badge on 20%
│     │  │     │  │ Premium │     (highlighted with ring)
└─────┘  └─────┘  └─────────┘
```

---

## Real-Time Update Flow

```
Time: 0ms                 100ms                300ms                 301ms
─────────────────────────────────────────────────────────────────────────

User types                Calculator                                Display
"5000000"                 waits...                                  updates!
   │                         │                                         │
   ├─ onChange event        │                                         │
   │  triggered             │                                         │
   │                        │                                         │
   └────────────────────────┼─> useEffect                            │
                            │   starts                                │
                            │   debounce timer                        │
                            │                                         │
                            │   (User might still                     │
                            │    be typing...)                        │
                            │                                         │
                            └────────────────> Timer expires          │
                                               Recalculate()          │
                                               - Parse values         │
                                               - Auto-populate        │
                                               - Calculate breakdown  │
                                               - Set state            │
                                                      │               │
                                                      └───────────────┘
                                                      React re-render
                                                      Display updates
                                                      ✨ Smooth!
```

---

## Mobile-Responsive Layout

```
DESKTOP (1024px+)                MOBILE (< 768px)
───────────────────              ────────────────

┌─────────┬─────────┐           ┌───────────────┐
│  FORM   │  CALC   │           │     FORM      │
│         │         │           │               │
│  Input  │  Live   │           │   Inputs      │
│  Input  │  Break  │           │   Slabs       │
│  Slabs  │  -down  │           │               │
└─────────┴─────────┘           ├───────────────┤
                                │  CALCULATOR   │
                                │  (Collapsible)│
                                │               │
                                │   Breakdown   │
                                │   Display     │
                                └───────────────┘
```

---

## Component Hierarchy

```
<NotesPageEnhanced>
    │
    ├─ <form onSubmit={createNote}>
    │   │
    │   ├─ <select> Client
    │   ├─ <select> Policy
    │   ├─ <select> Insurer
    │   ├─ <input> Gross Premium
    │   │
    │   └─ <BrokerageSlabSelector>
    │       ├─ <button> 9%
    │       ├─ <button> 15%  ← User clicks
    │       └─ <button> 20%
    │
    └─ <PremiumCalculatorDisplay>
        ├─ Summary Card
        │   ├─ Gross Premium
        │   └─ Brokerage Rate
        │
        ├─ Brokerage Breakdown
        │   ├─ Brokerage Amount
        │   ├─ VAT on Brokerage
        │   └─ Net Brokerage
        │
        ├─ Statutory Levies
        │   ├─ NAICOM
        │   ├─ NCRIB
        │   └─ Education Tax
        │
        └─ Net Amount Due
            ├─ Calculation steps
            └─ Final amount (highlighted)
```

---

## Success Flow

```
START
  │
  ↓
Select Policy  ─────> Policy data loads
  │                   (auto-fill values)
  ↓                          │
Enter/Verify Premium         │
  │                          │
  ↓                          ↓
Click Slab Button ──────> Calculator updates
  (9%, 15%, or 20%)         (instant feedback)
  │                          │
  ↓                          ↓
Review Breakdown  ←──────── All values shown
  │                          • Brokerage
  ↓                          • VAT
Looks Good?                  • Levies
  │                          • Net
  ↓                                  
Click "Create Note"
  │
  ↓
✅ Success!
  │
  ↓
Note appears in list below
  │
  ↓
Ready for Approval/Issue
  │
  ↓
END
```

---

**Visual Summary**: The system provides a **split-screen experience** where the left side has your form inputs, and the right side shows a **live calculator** that updates in real-time as you enter values. Three big buttons (9%, 15%, 20%) make selecting the brokerage slab intuitive and fast!
