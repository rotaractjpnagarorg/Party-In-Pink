import { describe, it, expect } from 'vitest';
import {
  singleRegistrationSchema,
  bulkOrderCreateSchema,
  bulkAttendeeRowSchema,
  donationCreateSchema,
  paymentEvidenceSchema,
  cleanPhoneNumber,
} from './index.js';
import { AffiliationTypes, PaymentMethods } from '../constants/index.js';

describe('Zod Validation Schemas', () => {
  describe('Phone Number Cleaning', () => {
    it('normalizes +91 and 0 prefixes to 10 digits', () => {
      expect(cleanPhoneNumber('+91 9876543210')).toBe('9876543210');
      expect(cleanPhoneNumber('09876543210')).toBe('9876543210');
      expect(cleanPhoneNumber('98765-43210')).toBe('9876543210');
    });
  });

  describe('Single Registration Schema', () => {
    const validSingle = {
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      mobileNumber: '+91 9876543210',
      whatsappSameAsMobile: true,
      city: 'Bengaluru',
      affiliationType: AffiliationTypes.ROTARACT_CLUB,
      clubName: 'Rotaract Club of Bangalore South',
      riDistrict: '3191',
      discoverySource: 'Instagram',
      consents: {
        termsAndParticipation: true,
        photoVideoAcknowledgement: true,
        marketingUpdates: true,
      },
    };

    it('passes with valid single registration', () => {
      const result = singleRegistrationSchema.safeParse(validSingle);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mobileNumber).toBe('9876543210');
        expect(result.data.email).toBe('rahul.sharma@example.com');
      }
    });

    it('fails if required participation consent is missing', () => {
      const invalid = {
        ...validSingle,
        consents: {
          termsAndParticipation: false,
          photoVideoAcknowledgement: true,
          marketingUpdates: false,
        },
      };
      const result = singleRegistrationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('fails if affiliation is COMPANY but organisationName is omitted', () => {
      const invalid = {
        ...validSingle,
        affiliationType: AffiliationTypes.COMPANY,
        organisationName: '',
      };
      const result = singleRegistrationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('passes when affiliation is COMPANY and organisationName is provided', () => {
      const valid = {
        ...validSingle,
        affiliationType: AffiliationTypes.COMPANY,
        organisationName: 'Infosys Limited',
        departmentOrTeam: 'Digital Experience',
      };
      const result = singleRegistrationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('fails if whatsappSameAsMobile is false but whatsappNumber is missing or invalid', () => {
      const invalid = {
        ...validSingle,
        whatsappSameAsMobile: false,
        whatsappNumber: '123',
      };
      const result = singleRegistrationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Bulk Attendee Row Schema', () => {
    it('validates and cleans attendee row', () => {
      const row = {
        slNo: 1,
        fullName: 'Pooja Hegde',
        email: 'pooja@company.org',
        mobileNumber: '+919988776655',
        city: 'Bengaluru',
      };
      const result = bulkAttendeeRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mobileNumber).toBe('9988776655');
      }
    });

    it('rejects row with invalid email', () => {
      const row = {
        fullName: 'Pooja Hegde',
        email: 'not-an-email',
        mobileNumber: '9988776655',
      };
      const result = bulkAttendeeRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });
  });

  describe('Bulk Order Create Schema', () => {
    it('enforces minimum 5 participants', () => {
      const bulkPayload = {
        organisationType: AffiliationTypes.COMPANY,
        organisationName: 'Tech Corp',
        primaryContact: {
          fullName: 'Alice Manager',
          email: 'alice@techcorp.com',
          mobileNumber: '9876543210',
          whatsappSameAsMobile: true,
        },
        participantCount: 4,
      };
      const result = bulkOrderCreateSchema.safeParse(bulkPayload);
      expect(result.success).toBe(false);
    });

    it('passes when participant count is 5 or more', () => {
      const bulkPayload = {
        organisationType: AffiliationTypes.COMPANY,
        organisationName: 'Tech Corp',
        primaryContact: {
          fullName: 'Alice Manager',
          email: 'alice@techcorp.com',
          mobileNumber: '9876543210',
          whatsappSameAsMobile: true,
        },
        participantCount: 25,
      };
      const result = bulkOrderCreateSchema.safeParse(bulkPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Donation Schema', () => {
    it('enforces minimum donation of ₹100 (10,000 paise)', () => {
      const donation = {
        fullName: 'Sunil Kumar',
        email: 'sunil@example.com',
        mobileNumber: '9876543210',
        amountPaise: 5000, // ₹50 (below minimum)
      };
      const result = donationCreateSchema.safeParse(donation);
      expect(result.success).toBe(false);
    });

    it('passes with valid donation amount', () => {
      const donation = {
        fullName: 'Sunil Kumar',
        email: 'sunil@example.com',
        mobileNumber: '9876543210',
        amountPaise: 100000, // ₹1,000
      };
      const result = donationCreateSchema.safeParse(donation);
      expect(result.success).toBe(true);
    });
  });

  describe('Payment Evidence Schema', () => {
    it('validates UTR format and length', () => {
      const evidence = {
        paymentSessionId: 'sess_123',
        method: PaymentMethods.UPI,
        transactionReference: 'UPI/123456789012',
        source: 'RECEIPT_UPLOAD' as const,
      };
      const result = paymentEvidenceSchema.safeParse(evidence);
      expect(result.success).toBe(true);
    });

    it('rejects invalid characters in UTR', () => {
      const evidence = {
        paymentSessionId: 'sess_123',
        method: PaymentMethods.UPI,
        transactionReference: 'UTR with spaces <invalid>',
      };
      const result = paymentEvidenceSchema.safeParse(evidence);
      expect(result.success).toBe(false);
    });
  });
});
