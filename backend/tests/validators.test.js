import { describe, it, expect } from 'vitest';
import { validateNUBAN, validateIBAN, normalizeE164, pctInRange } from '../src/utils/validators.js';

describe('validators', () => {
  it('validateNUBAN accepts 10 digits and rejects others', () => {
    expect(validateNUBAN('0123456789')).toBe(true);
    expect(validateNUBAN('123456789')).toBe(false);
    expect(validateNUBAN('12345678901')).toBe(false);
    expect(validateNUBAN('12345abcde')).toBe(false);
  });

  it('validateIBAN basic checks', () => {
    expect(validateIBAN('DE89370400440532013000')).toBe(true); // Known valid
    expect(validateIBAN('DE00370400440532013000')).toBe(false);
  });

  it('normalizeE164 ensures E.164 output', () => {
    expect(normalizeE164('+2348031234567')).toBe('+2348031234567');
    expect(normalizeE164('08031234567')).toMatch(/^\+/); // will format to E.164 for default country heuristics
  });

  it('pctInRange respects 0..100', () => {
    expect(pctInRange(0)).toBe(true);
    expect(pctInRange(100)).toBe(true);
    expect(pctInRange(50.5)).toBe(true);
    expect(pctInRange(-1)).toBe(false);
    expect(pctInRange(101)).toBe(false);
  });
});