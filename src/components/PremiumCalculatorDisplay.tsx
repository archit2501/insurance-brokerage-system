import React from 'react';
import { PremiumCalculation } from '@/hooks/use-policy-premium-calculator';

interface PremiumCalculatorDisplayProps {
  calculation: PremiumCalculation | null;
  loading?: boolean;
  currency?: string;
}

export function PremiumCalculatorDisplay({
  calculation,
  loading,
  currency = 'NGN',
}: PremiumCalculatorDisplayProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Calculating premium...</span>
        </div>
      </div>
    );
  }

  if (!calculation) {
    return null;
  }

  const { breakdown, isUsingMinimum, rateBasis, appliedRate } = calculation;

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getRateBasisLabel = () => {
    switch (rateBasis) {
      case 'per_mille':
        return 'per ₦1,000';
      case 'percentage':
        return '%';
      case 'flat':
        return 'flat';
      default:
        return '%';
    }
  };

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 to-accent/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="text-lg">🧮</span>
          Premium Calculator
        </h3>
        {isUsingMinimum && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Minimum Applied
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Sum Insured:</span>
          <span className="font-medium">{formatCurrency(breakdown.sumInsured)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Rate:</span>
          <span className="font-medium">{appliedRate} {getRateBasisLabel()}</span>
        </div>

        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Calculated:</span>
            <span className={isUsingMinimum ? 'line-through text-muted-foreground' : 'font-medium'}>
              {formatCurrency(breakdown.calculatedAmount)}
            </span>
          </div>
        </div>

        {isUsingMinimum && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Minimum Required:</span>
            <span className="font-medium text-amber-700">{formatCurrency(breakdown.minimumRequired)}</span>
          </div>
        )}

        <div className="border-t border-border pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Suggested Premium:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(breakdown.finalPremium)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 This is a suggested premium based on LOB rates. You can adjust if needed.
        </p>
      </div>
    </div>
  );
}

export function PremiumCalculatorCompact({
  calculation,
  currency = 'NGN',
}: {
  calculation: PremiumCalculation | null;
  currency?: string;
}) {
  if (!calculation) return null;

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Suggested:</span>
      <span className="font-semibold text-primary">
        {formatCurrency(calculation.calculatedPremium)}
      </span>
      {calculation.isUsingMinimum && (
        <span className="text-xs text-amber-600">(minimum)</span>
      )}
    </div>
  );
}
