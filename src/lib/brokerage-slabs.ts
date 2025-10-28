/**
 * Brokerage Slabs Configuration and Automation
 * 
 * This module provides the brokerage slab system with automatic calculations
 * for premium, commission, VAT, levies, and net amounts.
 */

// Brokerage Slab Configuration
export const BROKERAGE_SLABS = {
  BASIC: 9,      // 9% brokerage
  STANDARD: 15,  // 15% brokerage
  PREMIUM: 20,   // 20% brokerage
} as const;

export type BrokerageSlabKey = keyof typeof BROKERAGE_SLABS;

export const BROKERAGE_SLAB_OPTIONS = [
  { value: BROKERAGE_SLABS.BASIC, label: 'Basic (9%)' },
  { value: BROKERAGE_SLABS.STANDARD, label: 'Standard (15%)' },
  { value: BROKERAGE_SLABS.PREMIUM, label: 'Premium (20%)' },
] as const;

// Standard rates
export const DEFAULT_VAT_PCT = 7.5;
export const DEFAULT_AGENT_COMMISSION_PCT = 0;

// Levy configuration (as percentage of gross premium)
export interface LevyRates {
  niacom: number;  // NAICOM levy (typically 1%)
  ncrib: number;   // NCRIB levy (typically 0.5%)
  ed_tax: number;  // Education tax (typically 0.5%)
}

export const DEFAULT_LEVIES: LevyRates = {
  niacom: 1.0,
  ncrib: 0.5,
  ed_tax: 0.5,
};

// Calculation results interface
export interface CalculationResult {
  grossPremium: number;
  brokeragePct: number;
  brokerageAmount: number;
  vatPct: number;
  vatOnBrokerage: number;
  agentCommissionPct: number;
  agentCommissionAmount: number;
  netBrokerage: number;
  levies: {
    niacom: number;
    ncrib: number;
    ed_tax: number;
    total: number;
  };
  netAmountDue: number;
  insurerNetAmount: number; // What insurer receives
}

/**
 * Calculate all financial values from gross premium and brokerage percentage
 */
export function calculatePremiumBreakdown(
  grossPremium: number,
  brokeragePct: number,
  options: {
    vatPct?: number;
    agentCommissionPct?: number;
    levyRates?: Partial<LevyRates>;
  } = {}
): CalculationResult {
  const {
    vatPct = DEFAULT_VAT_PCT,
    agentCommissionPct = DEFAULT_AGENT_COMMISSION_PCT,
    levyRates = DEFAULT_LEVIES,
  } = options;

  const levies = { ...DEFAULT_LEVIES, ...levyRates };

  // Round to 2 decimal places
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Calculate brokerage
  const brokerageAmount = round2((grossPremium * brokeragePct) / 100);

  // Calculate VAT on brokerage
  const vatOnBrokerage = round2((brokerageAmount * vatPct) / 100);

  // Calculate agent commission
  const agentCommissionAmount = round2((grossPremium * agentCommissionPct) / 100);

  // Net brokerage (after agent commission)
  const netBrokerage = round2(brokerageAmount - agentCommissionAmount);

  // Calculate levies (as percentage of gross premium)
  const levyAmounts = {
    niacom: round2((grossPremium * levies.niacom) / 100),
    ncrib: round2((grossPremium * levies.ncrib) / 100),
    ed_tax: round2((grossPremium * levies.ed_tax) / 100),
    total: 0,
  };
  levyAmounts.total = round2(
    levyAmounts.niacom + levyAmounts.ncrib + levyAmounts.ed_tax
  );

  // Net amount due to insurer (Gross Premium - Brokerage - VAT - Levies)
  const netAmountDue = round2(
    grossPremium - brokerageAmount - vatOnBrokerage - levyAmounts.total
  );

  // What insurer actually receives
  const insurerNetAmount = round2(grossPremium - brokerageAmount - levyAmounts.total);

  return {
    grossPremium: round2(grossPremium),
    brokeragePct,
    brokerageAmount,
    vatPct,
    vatOnBrokerage,
    agentCommissionPct,
    agentCommissionAmount,
    netBrokerage,
    levies: levyAmounts,
    netAmountDue,
    insurerNetAmount,
  };
}

/**
 * Calculate gross premium from sum insured and rate
 */
export function calculateGrossPremium(
  sumInsured: number,
  ratePct: number
): number {
  return Math.round(((sumInsured * ratePct) / 100) * 100) / 100;
}

/**
 * Calculate rate percentage from sum insured and gross premium
 */
export function calculateRate(
  sumInsured: number,
  grossPremium: number
): number {
  if (sumInsured === 0) return 0;
  return Math.round(((grossPremium / sumInsured) * 100) * 10000) / 10000;
}

/**
 * Suggest brokerage slab based on gross premium amount
 */
export function suggestBrokerageSlab(grossPremium: number): number {
  if (grossPremium >= 10000000) {
    // 10M and above -> Premium 20%
    return BROKERAGE_SLABS.PREMIUM;
  } else if (grossPremium >= 1000000) {
    // 1M to 10M -> Standard 15%
    return BROKERAGE_SLABS.STANDARD;
  } else {
    // Below 1M -> Basic 9%
    return BROKERAGE_SLABS.BASIC;
  }
}

/**
 * Get slab name from percentage
 */
export function getSlabName(brokeragePct: number): string {
  switch (brokeragePct) {
    case BROKERAGE_SLABS.BASIC:
      return 'Basic (9%)';
    case BROKERAGE_SLABS.STANDARD:
      return 'Standard (15%)';
    case BROKERAGE_SLABS.PREMIUM:
      return 'Premium (20%)';
    default:
      return `Custom (${brokeragePct}%)`;
  }
}

/**
 * Format currency (NGN by default)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'NGN',
  locale: string = 'en-NG'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Validate minimum premium requirement
 */
export function validateMinimumPremium(
  grossPremium: number,
  minPremium: number
): { valid: boolean; message?: string } {
  if (grossPremium < minPremium) {
    return {
      valid: false,
      message: `Gross premium (${formatCurrency(grossPremium)}) is below minimum required (${formatCurrency(minPremium)})`,
    };
  }
  return { valid: true };
}

/**
 * Calculate commission split for multiple agents
 */
export function calculateCommissionSplit(
  totalCommission: number,
  splits: Array<{ agentId: number; percentage: number }>
): Array<{ agentId: number; percentage: number; amount: number }> {
  return splits.map((split) => ({
    ...split,
    amount: Math.round(((totalCommission * split.percentage) / 100) * 100) / 100,
  }));
}

/**
 * Auto-populate form data based on reference values
 */
export interface AutoPopulateOptions {
  sumInsured?: number;
  grossPremium?: number;
  ratePct?: number;
  brokeragePct?: number;
  lobDefaultBrokerage?: number;
  lobMinPremium?: number;
}

export interface AutoPopulateResult {
  sumInsured: number;
  grossPremium: number;
  ratePct: number;
  brokeragePct: number;
  calculation: CalculationResult;
  suggestions: {
    brokerageSlab?: string;
    minPremiumWarning?: string;
  };
}

/**
 * Auto-calculate and populate all related values
 */
export function autoPopulateValues(
  options: AutoPopulateOptions
): AutoPopulateResult | null {
  const {
    sumInsured,
    grossPremium,
    ratePct,
    brokeragePct,
    lobDefaultBrokerage,
    lobMinPremium,
  } = options;

  // Need at least 2 of 3 values: sumInsured, grossPremium, ratePct
  let finalSumInsured = sumInsured || 0;
  let finalGrossPremium = grossPremium || 0;
  let finalRatePct = ratePct || 0;

  // Calculate missing value
  if (sumInsured && grossPremium && !ratePct) {
    finalRatePct = calculateRate(sumInsured, grossPremium);
  } else if (sumInsured && ratePct && !grossPremium) {
    finalGrossPremium = calculateGrossPremium(sumInsured, ratePct);
  } else if (grossPremium && ratePct && !sumInsured) {
    finalSumInsured = Math.round(((grossPremium / ratePct) * 100) * 100) / 100;
  } else if (!sumInsured && !grossPremium && !ratePct) {
    return null; // Need at least some values
  }

  // Determine brokerage percentage
  let finalBrokeragePct = brokeragePct;
  if (!finalBrokeragePct) {
    if (lobDefaultBrokerage) {
      finalBrokeragePct = lobDefaultBrokerage;
    } else {
      finalBrokeragePct = suggestBrokerageSlab(finalGrossPremium);
    }
  }

  // Calculate all financial values
  const calculation = calculatePremiumBreakdown(finalGrossPremium, finalBrokeragePct);

  // Generate suggestions
  const suggestions: AutoPopulateResult['suggestions'] = {};

  // Suggest brokerage slab
  const suggestedSlab = suggestBrokerageSlab(finalGrossPremium);
  if (suggestedSlab !== finalBrokeragePct) {
    suggestions.brokerageSlab = `Consider ${getSlabName(suggestedSlab)} based on premium amount`;
  }

  // Check minimum premium
  if (lobMinPremium && finalGrossPremium < lobMinPremium) {
    suggestions.minPremiumWarning = `Premium is below LOB minimum of ${formatCurrency(lobMinPremium)}`;
  }

  return {
    sumInsured: finalSumInsured,
    grossPremium: finalGrossPremium,
    ratePct: finalRatePct,
    brokeragePct: finalBrokeragePct,
    calculation,
    suggestions,
  };
}
