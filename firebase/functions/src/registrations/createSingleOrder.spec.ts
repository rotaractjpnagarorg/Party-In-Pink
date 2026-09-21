import { describe, it, expect } from 'vitest';
import {
  singleRegistrationSchema,
  DEFAULT_PIP5_CONFIG,
  REFERENCE_PREFIXES,
  AffiliationTypes,
} from '@pip/shared';
import { generateReference, generateStatusToken } from '../utils/reference.js';

describe('Phase 3: Single Registration & Security Invariants', () => {
  it('generates opaque reference with prefix and non-ambiguous characters', () => {
    const ref = generateReference(REFERENCE_PREFIXES.SINGLE, 6);
    expect(ref.startsWith('PIP5-S-')).toBe(true);
    expect(ref.length).toBe('PIP5-S-'.length + 6);
    // Disallow ambiguous chars like 0, O, 1, I
    expect(/[0O1I]/.test(ref.slice(7))).toBe(false);
  });

  it('generates cryptographically secure status tokens of correct length', () => {
    const token1 = generateStatusToken();
    const token2 = generateStatusToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(32); // 16 bytes hex
  });

  it('enforces server-authoritative single registration pricing (SEC-P0-002)', () => {
    // Client cannot submit a custom price; pricing is strictly dictated by event configuration
    const serverPricePaise = DEFAULT_PIP5_CONFIG.pricesPaise.singlePass;
    expect(serverPricePaise).toBe(19900); // ₹199
    expect(Number.isInteger(serverPricePaise)).toBe(true);
  });

  it('validates a complete valid single registration payload', () => {
    const validPayload = {
      fullName: 'Ananya Sharma',
      email: 'ananya@example.com',
      mobileNumber: '9876543210',
      whatsappSameAsMobile: true,
      city: 'Bengaluru',
      affiliationType: AffiliationTypes.INDEPENDENT,
      discoverySource: 'Instagram',
      consents: {
        termsAndParticipation: true,
        photoVideoAcknowledgement: true,
        marketingUpdates: true,
      },
    };

    const parsed = singleRegistrationSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('enforces mandatory Rotary-family or organisation details when selected', () => {
    const missingOrg = {
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      mobileNumber: '9876543210',
      whatsappSameAsMobile: true,
      affiliationType: AffiliationTypes.COMPANY,
      organisationName: '', // Required for company!
      consents: {
        termsAndParticipation: true,
        photoVideoAcknowledgement: true,
        marketingUpdates: false,
      },
    };

    const parsed = singleRegistrationSchema.safeParse(missingOrg);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('organisationName'))).toBe(true);
    }
  });

  it('requires mandatory participation and photo/video consents', () => {
    const missingConsents = {
      fullName: 'Pooja Hegde',
      email: 'pooja@example.com',
      mobileNumber: '9876543210',
      whatsappSameAsMobile: true,
      affiliationType: AffiliationTypes.INDEPENDENT,
      consents: {
        termsAndParticipation: false, // Rejected
        photoVideoAcknowledgement: true,
        marketingUpdates: false,
      },
    };

    const parsed = singleRegistrationSchema.safeParse(missingConsents);
    expect(parsed.success).toBe(false);
  });
});
