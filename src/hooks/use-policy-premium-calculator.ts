import { useState, useEffect, useCallback } from 'react';

export interface LobRateInfo {
  minPremium: number;
  defaultBrokeragePct: number;
  defaultVatPct: number;
  rateBasis: string | null; // 'per_mille' | 'percentage' | 'flat' | null
  ratingInputs: any; // JSON with rate table
}

export interface PremiumCalculation {
  calculatedPremium: number;
  appliedRate: number;
  rateBasis: string;
  minPremium: number;
  isUsingMinimum: boolean;
  breakdown: {
    sumInsured: number;
    rate: number;
    calculatedAmount: number;
    minimumRequired: number;
    finalPremium: number;
  };
}

interface UsePolicyPremiumCalculatorProps {
  lobId?: number;
  subLobId?: number;
  sumInsured?: number;
  onCalculate?: (calculation: PremiumCalculation | null) => void;
}

export function usePolicyPremiumCalculator({
  lobId,
  subLobId,
  sumInsured,
  onCalculate,
}: UsePolicyPremiumCalculatorProps) {
  const [lobRate, setLobRate] = useState<LobRateInfo | null>(null);
  const [calculation, setCalculation] = useState<PremiumCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch LOB rate information
  useEffect(() => {
    if (!lobId) {
      setLobRate(null);
      setCalculation(null);
      setError(null);
      return;
    }

    const fetchLobRate = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
        const url = subLobId 
          ? `/api/lobs/${lobId}/sublobs/${subLobId}/rates`
          : `/api/lobs/${lobId}/rates`;

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('Failed to fetch rate information');
        }

        const data = await res.json();
        setLobRate(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching rate information');
        setLobRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLobRate();
  }, [lobId, subLobId]);

  // Calculate premium whenever inputs change
  useEffect(() => {
    if (!lobRate || !sumInsured || sumInsured <= 0) {
      setCalculation(null);
      if (onCalculate) onCalculate(null);
      return;
    }

    const calculate = (): PremiumCalculation => {
      const { minPremium, rateBasis, ratingInputs } = lobRate;
      
      let calculatedPremium = 0;
      let appliedRate = 0;
      let effectiveRateBasis = rateBasis || 'percentage';

      // Parse rating inputs if available
      const rates = ratingInputs ? (typeof ratingInputs === 'string' ? JSON.parse(ratingInputs) : ratingInputs) : null;
      
      // Default rate from rating inputs or fallback
      if (rates && rates.defaultRate) {
        appliedRate = parseFloat(rates.defaultRate);
      } else if (rates && rates.rate) {
        appliedRate = parseFloat(rates.rate);
      } else {
        // Fallback: estimate 2% for percentage, 20 per mille for per_mille
        appliedRate = effectiveRateBasis === 'per_mille' ? 20 : 2;
      }

      // Calculate based on rate basis
      switch (effectiveRateBasis) {
        case 'per_mille':
          // Rate per 1,000 of sum insured
          calculatedPremium = (sumInsured / 1000) * appliedRate;
          break;
        
        case 'percentage':
          // Rate as percentage of sum insured
          calculatedPremium = (sumInsured * appliedRate) / 100;
          break;
        
        case 'flat':
          // Flat rate regardless of sum insured
          calculatedPremium = appliedRate;
          break;
        
        default:
          // Default to percentage
          calculatedPremium = (sumInsured * appliedRate) / 100;
      }

      // Ensure minimum premium is met
      const finalPremium = Math.max(calculatedPremium, minPremium);
      const isUsingMinimum = finalPremium === minPremium && calculatedPremium < minPremium;

      const result: PremiumCalculation = {
        calculatedPremium: finalPremium,
        appliedRate,
        rateBasis: effectiveRateBasis,
        minPremium,
        isUsingMinimum,
        breakdown: {
          sumInsured,
          rate: appliedRate,
          calculatedAmount: calculatedPremium,
          minimumRequired: minPremium,
          finalPremium,
        },
      };

      setCalculation(result);
      if (onCalculate) onCalculate(result);
      return result;
    };

    calculate();
  }, [lobRate, sumInsured, onCalculate]);

  const recalculate = useCallback(() => {
    if (lobRate && sumInsured && sumInsured > 0) {
      // Trigger recalculation by updating state
      setCalculation((prev) => ({ ...prev! }));
    }
  }, [lobRate, sumInsured]);

  return {
    lobRate,
    calculation,
    loading,
    error,
    recalculate,
    canCalculate: !!lobRate && !!sumInsured && sumInsured > 0,
  };
}
