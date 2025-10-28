"use client";

import React from 'react';
import {
  BROKERAGE_SLAB_OPTIONS,
  formatCurrency,
  formatPercentage,
  type CalculationResult,
} from '@/lib/brokerage-slabs';

interface PremiumCalculatorDisplayProps {
  calculation: CalculationResult | null;
  currency?: string;
  showDetails?: boolean;
}

export function PremiumCalculatorDisplay({
  calculation,
  currency = 'NGN',
  showDetails = true,
}: PremiumCalculatorDisplayProps) {
  if (!calculation) {
    return (
      <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        Enter premium details to see calculations
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Gross Premium</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calculation.grossPremium, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Brokerage Rate</p>
            <p className="text-2xl font-bold text-primary">
              {formatPercentage(calculation.brokeragePct)}
            </p>
          </div>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Brokerage Breakdown */}
          <div className="rounded-md border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Brokerage Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Brokerage Amount</span>
                <span className="font-medium">
                  {formatCurrency(calculation.brokerageAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">
                  VAT on Brokerage ({formatPercentage(calculation.vatPct)})
                </span>
                <span className="font-medium">
                  {formatCurrency(calculation.vatOnBrokerage, currency)}
                </span>
              </div>
              {calculation.agentCommissionAmount > 0 && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                      Agent Commission ({formatPercentage(calculation.agentCommissionPct)})
                    </span>
                    <span className="font-medium text-amber-600">
                      -{formatCurrency(calculation.agentCommissionAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 bg-secondary/50 px-2 rounded">
                    <span className="text-sm font-medium">Net Brokerage</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(calculation.netBrokerage, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Levies */}
          {calculation.levies.total > 0 && (
            <div className="rounded-md border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Statutory Levies</h3>
              <div className="space-y-2">
                {calculation.levies.niacom > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">NAICOM Levy</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.levies.niacom, currency)}
                    </span>
                  </div>
                )}
                {calculation.levies.ncrib > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">NCRIB Levy</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.levies.ncrib, currency)}
                    </span>
                  </div>
                )}
                {calculation.levies.ed_tax > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Education Tax</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.levies.ed_tax, currency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-center py-1 font-medium">
                  <span className="text-sm">Total Levies</span>
                  <span>{formatCurrency(calculation.levies.total, currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Net Amount Due */}
          <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950 p-4">
            <h3 className="text-sm font-semibold mb-3 text-green-800 dark:text-green-200">
              Net Amount Due to Insurer
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Gross Premium</span>
                <span>{formatCurrency(calculation.grossPremium, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Less: Brokerage + VAT</span>
                <span className="text-red-600">
                  -{formatCurrency(calculation.brokerageAmount + calculation.vatOnBrokerage, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Less: Levies</span>
                <span className="text-red-600">
                  -{formatCurrency(calculation.levies.total, currency)}
                </span>
              </div>
              <div className="border-t-2 border-green-500 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800 dark:text-green-200">
                  Net Payable
                </span>
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(calculation.netAmountDue, currency)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface BrokerageSlabSelectorProps {
  value: string;
  onChange: (value: string) => void;
  suggestedValue?: number;
  disabled?: boolean;
}

export function BrokerageSlabSelector({
  value,
  onChange,
  suggestedValue,
  disabled = false,
}: BrokerageSlabSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Brokerage Slab</label>
      <div className="grid grid-cols-3 gap-2">
        {BROKERAGE_SLAB_OPTIONS.map((option) => {
          const isSelected = parseFloat(value) === option.value;
          const isSuggested = suggestedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value.toString())}
              className={`
                relative px-4 py-3 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-primary bg-primary text-primary-foreground font-semibold'
                  : 'border-border bg-background hover:border-primary/50'
                }
                ${isSuggested && !isSelected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {option.value}%
                </div>
                <div className="text-xs mt-1">
                  {option.label.split('(')[0].trim()}
                </div>
              </div>
              {isSuggested && !isSelected && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs px-2 py-0.5 rounded-full font-medium">
                  Suggested
                </span>
              )}
            </button>
          );
        })}
      </div>
      {suggestedValue && parseFloat(value) !== suggestedValue && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          💡 {suggestedValue}% slab is suggested based on premium amount
        </p>
      )}
    </div>
  );
}
