"use client";

import React, { useEffect, useState } from 'react';

interface AutoCalculateIndicatorProps {
  isCalculating?: boolean;
  show?: boolean;
}

export function AutoCalculateIndicator({ 
  isCalculating = false,
  show = true 
}: AutoCalculateIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && isCalculating) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, isCalculating]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <svg 
          className="animate-spin h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">Calculating...</span>
      </div>
    </div>
  );
}

interface FieldHighlightProps {
  children: React.ReactNode;
  isAutoCalculated?: boolean;
  isUserInput?: boolean;
}

export function FieldHighlight({ 
  children, 
  isAutoCalculated = false,
  isUserInput = false 
}: FieldHighlightProps) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isAutoCalculated) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isAutoCalculated]);

  return (
    <div className={`
      transition-all duration-300
      ${flash ? 'ring-2 ring-green-400 ring-offset-2 rounded-lg' : ''}
      ${isAutoCalculated && !flash ? 'bg-green-50 dark:bg-green-950/20 rounded-lg' : ''}
      ${isUserInput ? 'bg-blue-50 dark:bg-blue-950/20 rounded-lg' : ''}
    `}>
      {children}
    </div>
  );
}

interface CalculationFlowArrowProps {
  from: 'sum' | 'premium' | 'rate';
  to: 'sum' | 'premium' | 'rate';
  active?: boolean;
}

export function CalculationFlowArrow({ from, to, active = false }: CalculationFlowArrowProps) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <svg 
        className="w-8 h-8 text-green-500 animate-bounce" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M13 7l5 5m0 0l-5 5m5-5H6" 
        />
      </svg>
    </div>
  );
}

interface ExcelLikeBadgeProps {
  type: 'auto-filled' | 'calculating' | 'calculated' | 'manual';
  children?: React.ReactNode;
}

export function ExcelLikeBadge({ type, children }: ExcelLikeBadgeProps) {
  const badges = {
    'auto-filled': {
      icon: '✓',
      text: children || 'Auto-filled',
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    },
    'calculating': {
      icon: '⟳',
      text: children || 'Calculating...',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse'
    },
    'calculated': {
      icon: '🔄',
      text: children || 'Calculated',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    },
    'manual': {
      icon: '✎',
      text: children || 'Manual entry',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  };

  const badge = badges[type];

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${badge.className}
    `}>
      <span>{badge.icon}</span>
      <span>{badge.text}</span>
    </span>
  );
}

interface FormulaDisplayProps {
  formula: string;
  result?: number;
  currency?: string;
}

export function FormulaDisplay({ formula, result, currency = 'NGN' }: FormulaDisplayProps) {
  return (
    <div className="mt-1 text-xs text-muted-foreground font-mono bg-secondary/30 px-2 py-1 rounded">
      <span className="opacity-75">{formula}</span>
      {result !== undefined && (
        <span className="ml-2 font-semibold text-primary">
          = {new Intl.NumberFormat('en-NG', { 
            style: 'currency', 
            currency 
          }).format(result)}
        </span>
      )}
    </div>
  );
}
