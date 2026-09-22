import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import { generateReference, generateStatusToken } from '../utils/reference.js';
import {
  DEFAULT_EVENT_CODE,
  REFERENCE_PREFIXES,
  PaymentStatuses,
  DonationStatuses,
  getDonationComplimentaryPasses,
  type Donation,
} from '@pip/shared';

const donationInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Full Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Valid email address is required'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (6-9)'),
  whatsappSameAsMobile: z.boolean().default(true),
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val ? val : null)),
  amountPaise: z
    .number()
    .int('Amount must be an integer')
    .min(10000, 'Minimum donation is ₹100 (10,000 paise)'),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: 'Invalid PAN format (e.g. ABCDE1234F)',
    })
    .transform((val) => (val ? val : null)),
  isAnonymousPublicly: z.boolean().default(false),
  organisationName: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val ? val : null)),
});

/**
 * Creates a donation intent for cancer awareness and patient care.
 * Automatically allocates complimentary passes based on official sponsorship/donation tier.
 */
export const createDonation = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    cors: true,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const parseResult = donationInputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        parseResult.error.issues[0]?.message || 'Invalid donation parameters'
      );
    }

    const data = parseResult.data;
    const nowIso = new Date().toISOString();
    const publicReference = generateReference(REFERENCE_PREFIXES.DONATION);
    const statusToken = generateStatusToken();
    const complimentaryPassesCount = getDonationComplimentaryPasses(data.amountPaise);

    const donationRef = db.collection('donations').doc();
    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);

    const donationData: Donation = {
      id: donationRef.id,
      publicReference,
      statusToken,
      donor: {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        mobileNumber: data.mobileNumber.trim(),
        whatsappNumber: data.whatsappSameAsMobile
          ? data.mobileNumber.trim()
          : data.whatsappNumber?.trim() || null,
      },
      organisationName: data.organisationName?.trim() || null,
      amountPaise: data.amountPaise,
      currency: 'INR',
      pan: data.pan?.trim().toUpperCase() || null,
      isAnonymousPublicly: data.isAnonymousPublicly,
      complimentaryPassesCount,
      paymentStatus: PaymentStatuses.AWAITING_PAYMENT,
      donationStatus: DonationStatuses.CREATED,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.runTransaction(async (transaction) => {
      const eventSnapshot = await transaction.get(eventRef);
      if (!eventSnapshot.exists) {
        throw new HttpsError('not-found', 'Event configuration not found.');
      }
      const donationConfig = eventSnapshot.data()?.donationConfig;
      if (!donationConfig?.enabled) {
        throw new HttpsError('failed-precondition', 'Donations are not currently enabled.');
      }
      if (
        data.amountPaise < Number(donationConfig.minAmountPaise) ||
        data.amountPaise > Number(donationConfig.maxAmountPaise)
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Donation amount is outside the currently configured limits.'
        );
      }
      transaction.set(donationRef, donationData);

      // Audit log entry
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        actor: `DONOR:${data.email.trim().toLowerCase()}`,
        action: 'DONATION_INTENT_CREATED',
        entityType: 'DONATION',
        entityId: donationRef.id,
        timestamp: nowIso,
        details: {
          publicReference,
          amountPaise: data.amountPaise,
          complimentaryPassesCount,
          isAnonymous: data.isAnonymousPublicly,
        },
      });
    });

    return {
      success: true,
      donationId: donationRef.id,
      donationReference: publicReference,
      statusToken,
      amountPaise: data.amountPaise,
      complimentaryPassesCount,
      currency: 'INR',
      nextAction: 'PAYMENT',
    };
  }
);
