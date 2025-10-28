import { useState, useCallback, useEffect } from 'react';
import {
  autoPopulateValues,
  calculatePremiumBreakdown,
  BROKERAGE_SLABS,
  type AutoPopulateOptions,
  type CalculationResult,
} from '@/lib/brokerage-slabs';

export interface PremiumFormValues {
  sumInsured: string;
  grossPremium: string;
  ratePct: string;
  brokeragePct: string;
  vatPct: string;
  agentCommissionPct: string;
}

export interface UsePremiumCalculatorOptions {
  lobDefaultBrokerage?: number;
  lobMinPremium?: number;
  onCalculate?: (calculation: CalculationResult) => void;
}

export interface UsePremiumCalculatorReturn {
  values: PremiumFormValues;
  calculation: CalculationResult | null;
  suggestions: {
    brokerageSlab?: string;
    minPremiumWarning?: string;
  };
  updateValue: (field: keyof PremiumFormValues, value: string) => void;
  setValues: (values: Partial<PremiumFormValues>) => void;
  recalculate: () => void;
  reset: () => void;
  isValid: boolean;
}

const DEFAULT_VALUES: PremiumFormValues = {
  sumInsured: '',
  grossPremium: '',
  ratePct: '',
  brokeragePct: '',
  vatPct: '7.5',
  agentCommissionPct: '0',
};

/**
 * Hook for automatic premium calculation and form management
 */
export function usePremiumCalculator(
  options: UsePremiumCalculatorOptions = {}
): UsePremiumCalculatorReturn {
  const { lobDefaultBrokerage, lobMinPremium, onCalculate } = options;

  const [values, setValuesState] = useState<PremiumFormValues>(DEFAULT_VALUES);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [suggestions, setSuggestions] = useState<{
    brokerageSlab?: string;
    minPremiumWarning?: string;
  }>({});

  // Auto-calculate whenever key values change
  const recalculate = useCallback(() => {
    const sumInsured = parseFloat(values.sumInsured) || undefined;
    const grossPremium = parseFloat(values.grossPremium) || undefined;
    const ratePct = parseFloat(values.ratePct) || undefined;
    const brokeragePct = parseFloat(values.brokeragePct) || undefined;
    const vatPct = parseFloat(values.vatPct) || 7.5;
    const agentCommissionPct = parseFloat(values.agentCommissionPct) || 0;

    // Auto-populate missing values
    const result = autoPopulateValues({
      sumInsured,
      grossPremium,
      ratePct,
      brokeragePct,
      lobDefaultBrokerage,
      lobMinPremium,
    });

    if (result) {
      // Update form values with calculated ones (only if they were empty or changed)
      setValuesState((prev) => {
        const newState = { ...prev };
        
        // Only update if value is empty or needs calculation
        if (!prev.sumInsured || prev.sumInsured === '' || sumInsured !== result.sumInsured) {
          newState.sumInsured = result.sumInsured > 0 ? result.sumInsured.toFixed(2) : prev.sumInsured;
        }
        if (!prev.grossPremium || prev.grossPremium === '' || grossPremium !== result.grossPremium) {
          newState.grossPremium = result.grossPremium > 0 ? result.grossPremium.toFixed(2) : prev.grossPremium;
        }
        if (!prev.ratePct || prev.ratePct === '' || ratePct !== result.ratePct) {
          newState.ratePct = result.ratePct > 0 ? result.ratePct.toFixed(4) : prev.ratePct;
        }
        if (!prev.brokeragePct || prev.brokeragePct === '') {
          newState.brokeragePct = result.brokeragePct ? result.brokeragePct.toString() : prev.brokeragePct;
        }
        
        return newState;
      });

      // Recalculate with actual VAT and agent commission from form
      const finalCalc = calculatePremiumBreakdown(
        result.grossPremium,
        result.brokeragePct,
        {
          vatPct,
          agentCommissionPct,
        }
      );

      setCalculation(finalCalc);
      setSuggestions(result.suggestions);

      if (onCalculate) {
        onCalculate(finalCalc);
      }
    } else {
      // If we have gross premium and brokerage, at least calculate breakdown
      if (grossPremium && brokeragePct !== undefined) {
        const calc = calculatePremiumBreakdown(grossPremium, brokeragePct, {
          vatPct,
          agentCommissionPct,
        });
        setCalculation(calc);
        if (onCalculate) {
          onCalculate(calc);
        }
      }
    }
  }, [values, lobDefaultBrokerage, lobMinPremium, onCalculate]);

  // Update a single field
  const updateValue = useCallback((field: keyof PremiumFormValues, value: string) => {
    setValuesState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Bulk update values
  const setValues = useCallback((newValues: Partial<PremiumFormValues>) => {
    setValuesState((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(DEFAULT_VALUES);
    setCalculation(null);
    setSuggestions({});
  }, []);

  // Auto-recalculate on value changes (minimal debounce for Excel-like feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      recalculate();
    }, 100); // 100ms debounce - almost instant like Excel

    return () => clearTimeout(timer);
  }, [recalculate]);

  const isValid = !!(
    parseFloat(values.grossPremium) > 0 &&
    parseFloat(values.sumInsured) > 0
  );

  return {
    values,
    calculation,
    suggestions,
    updateValue,
    setValues,
    recalculate,
    reset,
    isValid,
  };
}
