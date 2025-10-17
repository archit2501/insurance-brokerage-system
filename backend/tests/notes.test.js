import { describe, it, expect } from 'vitest';
import { calcAmounts } from '../src/routes/notes.js';

describe('notes calcAmounts', () => {
  it('computes brokerage, VAT, agent commission, net brokerage, and net amount', () => {
    const out = calcAmounts({ gross_premium: 100000, brokerage_pct: 10, vat_pct: 7.5, agent_commission_pct: 2, levy_niacom: 50, levy_ncrib: 25, levy_ed_tax: 10 });
    expect(out.brokerage).toBe(10000);
    expect(out.vatOnBrokerage).toBe(750);
    expect(out.agentComm).toBe(2000);
    expect(out.netBrokerage).toBe(8000);
    // net = gross - brokerage - vat - levies
    expect(out.netAmountDue).toBe(100000 - 10000 - 750 - (50 + 25 + 10));
  });

  it('handles zeros and missing optional values', () => {
    const out = calcAmounts({ gross_premium: 50000, brokerage_pct: 0 });
    expect(out.brokerage).toBe(0);
    expect(out.vatOnBrokerage).toBe(0);
    expect(out.agentComm).toBe(0);
    expect(out.netBrokerage).toBe(0);
    expect(out.netAmountDue).toBe(50000);
  });
});