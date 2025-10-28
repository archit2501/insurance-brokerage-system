import React from 'react';

export function PremiumCalculatorGuide() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Auto Premium Calculator</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The system automatically calculates the premium based on:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Selected Line of Business (LOB) rate table</li>
            <li>Sum Insured amount</li>
            <li>Sub-LOB overrides (if applicable)</li>
            <li>Minimum premium requirements</li>
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed pt-2">
            ✨ <strong>Pro tip:</strong> Enter the Sum Insured first to see the calculated premium. 
            You can still override it manually if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
