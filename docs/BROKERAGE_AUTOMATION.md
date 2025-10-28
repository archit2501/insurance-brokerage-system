# Brokerage Automation System

## Overview

The brokerage automation system provides a seamless workflow for calculating premiums, commissions, VAT, levies, and net amounts with three predefined brokerage slabs: **9%**, **15%**, and **20%**.

## Features

### 1. **Brokerage Slabs**
- **Basic (9%)**: For premiums under ₦1,000,000
- **Standard (15%)**: For premiums between ₦1,000,000 and ₦10,000,000
- **Premium (20%)**: For premiums above ₦10,000,000

### 2. **Auto-Calculation**
The system automatically calculates:
- Gross Premium (from Sum Insured × Rate%)
- Brokerage Amount
- VAT on Brokerage (7.5%)
- Agent Commission
- Net Brokerage
- Statutory Levies (NAICOM, NCRIB, Education Tax)
- Net Amount Due to Insurer

### 3. **Smart Auto-Population**
When you enter any 2 of these 3 values, the third is calculated automatically:
- Sum Insured
- Gross Premium  
- Rate %

### 4. **Suggested Brokerage Slab**
Based on the gross premium amount, the system suggests the most appropriate brokerage slab.

## Usage

### Basic Import

```typescript
import {
  BROKERAGE_SLABS,
  calculatePremiumBreakdown,
  autoPopulateValues,
  formatCurrency,
} from '@/lib/brokerage-slabs';
```

### Using the Hook

```typescript
import { usePremiumCalculator } from '@/hooks/use-premium-calculator';

function MyComponent() {
  const {
    values,
    calculation,
    suggestions,
    updateValue,
    setValues,
    recalculate,
    isValid,
  } = usePremiumCalculator({
    lobDefaultBrokerage: 15, // Optional: LOB default
    lobMinPremium: 5000,     // Optional: LOB minimum
    onCalculate: (calc) => {
      console.log('New calculation:', calc);
    },
  });

  return (
    <div>
      <input
        type="number"
        value={values.sumInsured}
        onChange={(e) => updateValue('sumInsured', e.target.value)}
        placeholder="Sum Insured"
      />
      
      <input
        type="number"
        value={values.grossPremium}
        onChange={(e) => updateValue('grossPremium', e.target.value)}
        placeholder="Gross Premium"
      />

      {/* Automatically calculated values */}
      <div>
        <p>Rate: {values.ratePct}%</p>
        <p>Brokerage: {values.brokeragePct}%</p>
      </div>

      {/* Show calculation breakdown */}
      {calculation && (
        <div>
          <p>Brokerage Amount: {formatCurrency(calculation.brokerageAmount)}</p>
          <p>VAT: {formatCurrency(calculation.vatOnBrokerage)}</p>
          <p>Net Amount Due: {formatCurrency(calculation.netAmountDue)}</p>
        </div>
      )}

      {/* Show suggestions */}
      {suggestions.brokerageSlab && (
        <div className="alert">{suggestions.brokerageSlab}</div>
      )}
    </div>
  );
}
```

### Using Components

```typescript
import { 
  PremiumCalculatorDisplay, 
  BrokerageSlabSelector 
} from '@/components/PremiumCalculator';

function PolicyForm() {
  const { values, calculation, updateValue } = usePremiumCalculator();

  return (
    <div>
      {/* Brokerage Slab Selector */}
      <BrokerageSlabSelector
        value={values.brokeragePct}
        onChange={(value) => updateValue('brokeragePct', value)}
        suggestedValue={15} // Optional: highlight suggested slab
      />

      {/* Premium Calculator Display */}
      <PremiumCalculatorDisplay
        calculation={calculation}
        currency="NGN"
        showDetails={true}
      />
    </div>
  );
}
```

## Workflow Examples

### Example 1: Policy Creation

1. User selects **Client** → Auto-loads client details
2. User selects **Insurer** → Auto-loads insurer details
3. User selects **LOB** → Auto-loads default brokerage rate
4. User selects **Sub-LOB** → May override brokerage rate
5. User enters **Sum Insured**: `₦100,000,000`
6. User enters **Rate %**: `0.5%`
7. **System auto-calculates**:
   - Gross Premium: `₦500,000`
   - Suggests: Standard slab (15%)
   - Brokerage Amount: `₦75,000`
   - VAT: `₦5,625`
   - Levies: `₦10,000`
   - Net Amount Due: `₦409,375`

### Example 2: Credit Note Creation

1. User selects **Policy** → Auto-loads policy details
2. **System auto-fills**:
   - Client
   - Insurer
   - Gross Premium
   - Existing brokerage rate
3. User can adjust brokerage % if needed
4. **System recalculates** all amounts instantly

### Example 3: RFQ Quotation

1. User enters **Expected Sum Insured**
2. User gets quotes from insurers with different rates
3. User enters each **Rate %**
4. **System shows** side-by-side comparison:
   - Gross Premium for each
   - Brokerage breakdown
   - Net amounts

## API Integration

### Creating a Policy with Calculations

```typescript
// Calculate everything first
const result = autoPopulateValues({
  sumInsured: 100000000,
  ratePct: 0.5,
  brokeragePct: 15,
});

// Send to API
const response = await fetch('/api/policies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 1,
    insurerId: 2,
    lobId: 3,
    sumInsured: result.sumInsured,
    grossPremium: result.grossPremium,
    brokeragePct: result.brokeragePct,
    // ... other fields
  }),
});
```

## Customization

### Custom Brokerage Rates

You can allow custom rates outside the 3 slabs:

```typescript
const {values, updateValue} = usePremiumCalculator();

// Allow any value
<input
  type="number"
  value={values.brokeragePct}
  onChange={(e) => updateValue('brokeragePct', e.target.value)}
  min="0"
  max="100"
  step="0.1"
/>
```

### Custom Levy Rates

```typescript
import { calculatePremiumBreakdown } from '@/lib/brokerage-slabs';

const calculation = calculatePremiumBreakdown(
  1000000, // gross premium
  15,      // brokerage %
  {
    vatPct: 7.5,
    agentCommissionPct: 2,
    levyRates: {
      niacom: 1.5,  // Custom NAICOM rate
      ncrib: 0.75,  // Custom NCRIB rate
      ed_tax: 0.5,  // Custom Education Tax rate
    },
  }
);
```

## Benefits

1. **Zero Manual Calculation**: All math is automatic
2. **Instant Updates**: Change any value, see results immediately
3. **Error Prevention**: Consistent calculations across the system
4. **Transparency**: Users see complete breakdown
5. **Flexibility**: Support custom rates when needed
6. **Audit Trail**: All calculations are logged

## Testing

Run tests to verify calculations:

```bash
npm test src/lib/brokerage-slabs.test.ts
```

Example test cases:
- ₦1,000,000 premium @ 15% = ₦150,000 brokerage
- VAT calculation accuracy
- Levy calculations
- Auto-population scenarios

## Future Enhancements

- [ ] Commission split calculator for multiple agents
- [ ] Reinsurance premium calculation
- [ ] Historical rate comparison
- [ ] Bulk policy calculations
- [ ] Excel export with formulas
