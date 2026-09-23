import { describe, it, expect } from 'vitest';
import {
  PIP_EDITION,
  PIP_ORGANISATION,
  AffiliationTypes,
  getDonationComplimentaryPasses,
  getBulkMinParticipants,
} from './index.js';

describe('@pip/shared baseline', () => {
  it('exports valid edition and organisation constants', () => {
    expect(PIP_EDITION).toBe('5.0');
    expect(PIP_ORGANISATION).toContain('Rotaract Club of Bangalore JP Nagar');
  });

  it('correctly calculates complimentary passes for donations', () => {
    expect(getDonationComplimentaryPasses(50000)).toBe(0); // ₹500
    expect(getDonationComplimentaryPasses(500000)).toBe(1); // ₹5,000 (Wellwisher)
    expect(getDonationComplimentaryPasses(750000)).toBe(1); // ₹7,500
    expect(getDonationComplimentaryPasses(1000000)).toBe(2); // ₹10,000 (Silver)
    expect(getDonationComplimentaryPasses(1500000)).toBe(5); // ₹15,000 (Gold)
    expect(getDonationComplimentaryPasses(2000000)).toBe(7); // ₹20,000 (Platinum)
  });

  it('correctly returns bulk minimum participants for Rotaract clubs', () => {
    expect(getBulkMinParticipants(AffiliationTypes.ROTARACT_UNIVERSITY)).toBe(15);
    expect(getBulkMinParticipants(AffiliationTypes.ROTARACT_COMMUNITY)).toBe(10);
    expect(getBulkMinParticipants(AffiliationTypes.ROTARY_CLUB)).toBe(10);
    expect(getBulkMinParticipants(AffiliationTypes.COMPANY)).toBe(10);
  });
});
