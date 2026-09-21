import { describe, it, expect } from 'vitest';
import {
  toPaise,
  toRupees,
  formatINR,
  calculateSingleOrderTotal,
  calculateBulkOrderTotal,
} from './money.js';

describe('Monetary Utilities (Integer Paise Rule)', () => {
  it('correctly converts rupees to integer paise without floating point issues', () => {
    expect(toPaise(199)).toBe(19900);
    expect(toPaise(149.5)).toBe(14950);
    expect(toPaise(0)).toBe(0);
  });

  it('correctly converts integer paise to rupees', () => {
    expect(toRupees(19900)).toBe(199);
    expect(toRupees(14950)).toBe(149.5);
  });

  it('throws error when non-integer paise is passed', () => {
    expect(() => toRupees(199.5)).toThrow(/Paise value must be an integer/);
  });

  it('formats integer paise as INR currency string', () => {
    const formatted = formatINR(19900);
    expect(formatted).toContain('199');
    expect(formatted).toContain('₹');
  });

  it('calculates single order total in paise', () => {
    expect(calculateSingleOrderTotal(1, 19900)).toBe(19900);
    expect(calculateSingleOrderTotal(2, 19900)).toBe(39800);
  });

  it('calculates bulk order total and enforces minimum participants', () => {
    expect(calculateBulkOrderTotal(5, 14900, 5)).toBe(74500);
    expect(calculateBulkOrderTotal(10, 14900, 5)).toBe(149000);
    expect(() => calculateBulkOrderTotal(4, 14900, 5)).toThrow(/Bulk orders require at least 5/);
  });
});
