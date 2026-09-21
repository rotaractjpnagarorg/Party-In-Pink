// Party In Pink 5.0 — Zod Runtime Validation Schemas

import { z } from 'zod';
import {
  AffiliationTypes,
  PaymentMethods,
  ApprovalDecisions,
  EventStatuses,
  AdminRoles,
  OrganisationRequiredAffiliations,
  getBulkMinParticipants,
} from '../constants/index.js';

export const cleanPhoneNumber = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const indianPhoneSchema = z
  .string()
  .trim()
  .transform(cleanPhoneNumber)
  .refine((val) => /^[6-9]\d{9}$/.test(val), {
    message: 'Please enter a valid 10-digit Indian mobile number',
  });

export const optionalIndianPhoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val ? cleanPhoneNumber(val) : null))
  .refine((val) => val === null || /^[6-9]\d{9}$/.test(val), {
    message: 'Please enter a valid 10-digit Indian phone number',
  });

// 1. Single Registration Schema
export const singleRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(100, 'Email cannot exceed 100 characters'),
    mobileNumber: indianPhoneSchema,
    whatsappSameAsMobile: z.boolean().default(true),
    whatsappNumber: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val ? cleanPhoneNumber(val) : null)),
    city: z.string().trim().max(50).optional().nullable(),
    affiliationType: z.nativeEnum(AffiliationTypes, {
      errorMap: () => ({ message: 'Please select a valid affiliation' }),
    }),
    clubName: z.string().trim().max(100).optional().nullable(),
    riDistrict: z.string().trim().max(20).optional().nullable(),
    organisationName: z.string().trim().max(100).optional().nullable(),
    departmentOrTeam: z.string().trim().max(50).optional().nullable(),
    discoverySource: z.string().trim().max(100).optional().nullable(),
    consents: z.object({
      termsAndParticipation: z.literal(true, {
        errorMap: () => ({ message: 'You must agree to event terms and participation' }),
      }),
      photoVideoAcknowledgement: z.literal(true, {
        errorMap: () => ({ message: 'You must acknowledge the photo and video consent' }),
      }),
      marketingUpdates: z.boolean().default(false),
    }),
  })
  .superRefine((data, ctx) => {
    // Validate conditional WhatsApp number
    if (!data.whatsappSameAsMobile) {
      if (!data.whatsappNumber || !/^[6-9]\d{9}$/.test(data.whatsappNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['whatsappNumber'],
          message: 'Please provide a valid 10-digit WhatsApp number when different from mobile',
        });
      }
    }

    // Validate conditional organisation name
    if (OrganisationRequiredAffiliations.includes(data.affiliationType as any)) {
      if (!data.organisationName || data.organisationName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organisationName'],
          message: 'Organisation/Company name is required for the selected affiliation',
        });
      }
    }
  });

export type SingleRegistrationInput = z.infer<typeof singleRegistrationSchema>;

// 2. Bulk Order Initialisation Schema
export const bulkOrderCreateSchema = z
  .object({
    organisationType: z.nativeEnum(AffiliationTypes, {
      errorMap: () => ({ message: 'Please select an organisation type' }),
    }),
    organisationName: z
      .string()
      .trim()
      .min(2, 'Organisation name must be at least 2 characters')
      .max(100),
    riDistrict: z.string().trim().max(20).optional().nullable(),
    primaryContact: z.object({
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email().max(100),
      mobileNumber: indianPhoneSchema,
      whatsappSameAsMobile: z.boolean().default(true),
      whatsappNumber: optionalIndianPhoneSchema,
    }),
    participantCount: z
      .number()
      .int()
      .min(5, 'Bulk registration requires at least 5 participants')
      .max(500, 'Bulk registration cannot exceed 500 participants per order'),
  })
  .superRefine((data, ctx) => {
    const minRequired = getBulkMinParticipants(data.organisationType);
    if (data.participantCount < minRequired) {
      const typeLabel =
        data.organisationType === AffiliationTypes.ROTARACT_UNIVERSITY
          ? 'Rotaract Club - University Based'
          : data.organisationType === AffiliationTypes.ROTARACT_COMMUNITY
          ? 'Rotaract Club - Community Based'
          : 'Group registration';
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participantCount'],
        message: `${typeLabel} requires a minimum of ${minRequired} passes.`,
      });
    }
  });

export type BulkOrderCreateInput = z.infer<typeof bulkOrderCreateSchema>;

// 3. Bulk Attendee Row Schema (XLSX row)
export const bulkAttendeeRowSchema = z.object({
  slNo: z.union([z.number(), z.string()]).optional().nullable(),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full Name must be at least 2 characters')
    .max(100, 'Full Name cannot exceed 100 characters'),
  email: z.string().trim().toLowerCase().email('Valid email address required').max(100),
  mobileNumber: indianPhoneSchema,
  whatsappNumber: optionalIndianPhoneSchema,
  city: z.string().trim().max(50).optional().nullable(),
});

export type BulkAttendeeRowInput = z.infer<typeof bulkAttendeeRowSchema>;

// 4. Donation Creation Schema
export const donationCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(100),
  mobileNumber: indianPhoneSchema,
  whatsappSameAsMobile: z.boolean().default(true),
  whatsappNumber: optionalIndianPhoneSchema,
  amountPaise: z
    .number()
    .int()
    .min(10000, 'Minimum donation is ₹100 (10,000 paise)')
    .max(5000000, 'Maximum donation per transaction is ₹50,000'),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .nullable(),
  isAnonymousPublicly: z.boolean().default(false),
  organisationName: z.string().trim().max(100).optional().nullable(),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;

// 5. Payment Submission / Evidence Schema
export const paymentEvidenceSchema = z.object({
  paymentSessionId: z.string().trim().min(1, 'Payment session ID is required'),
  method: z.nativeEnum(PaymentMethods),
  transactionReference: z
    .string()
    .trim()
    .min(6, 'Reference / UTR must be at least 6 characters')
    .max(50, 'Reference / UTR cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_./:-]+$/, 'Reference contains invalid characters'),
  storagePath: z.string().trim().optional().nullable(),
  extractedAmountPaise: z.number().int().positive().optional().nullable(),
  source: z.enum(['RECEIPT_UPLOAD', 'MANUAL_ENTRY', 'PASTED_TEXT']).default('RECEIPT_UPLOAD'),
});

export type PaymentEvidenceInput = z.infer<typeof paymentEvidenceSchema>;

// 6. Payment Approval Action Schema (Admin / Slack)
export const paymentApprovalSchema = z.object({
  paymentSessionId: z.string().trim().min(1),
  decision: z.nativeEnum(ApprovalDecisions),
  reason: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type PaymentApprovalInput = z.infer<typeof paymentApprovalSchema>;

// 7. Event Configuration Schema
export const eventConfigSchema = z.object({
  code: z.string().trim().min(2).max(10),
  edition: z.string().trim().min(1).max(10),
  title: z.string().trim().min(5).max(100),
  status: z.nativeEnum(EventStatuses),
  eventDate: z.string().datetime(),
  venue: z.string().trim().min(5).max(200),
  venueMapUrl: z.string().url(),
  pricesPaise: z.object({
    singlePass: z.number().int().positive(),
    bulkPass: z.number().int().positive(),
    bulkMinParticipants: z.number().int().positive(),
  }),
  capacity: z.object({
    total: z.number().int().positive(),
    registeredCount: z.number().int().nonnegative(),
    confirmedCount: z.number().int().nonnegative(),
  }),
  paymentDisplayConfig: z.object({
    upiVpa: z.string().trim().min(3),
    payeeName: z.string().trim().min(2),
    bankName: z.string().trim().min(2),
    accountNumber: z.string().trim().min(5),
    ifscCode: z.string().trim().length(11),
    branch: z.string().trim().min(2),
  }),
  donationConfig: z.object({
    enabled: z.boolean(),
    minAmountPaise: z.number().int().positive(),
    maxAmountPaise: z.number().int().positive(),
    presetsPaise: z.array(z.number().int().positive()),
  }),
  featureFlags: z.object({
    ocrEnabled: z.boolean(),
    slackApprovalEnabled: z.boolean(),
    konfhubEnabled: z.boolean(),
    brevoEnabled: z.boolean(),
  }),
  supportContact: z.object({
    email: z.string().email(),
    whatsapp: z.string(),
  }),
});

export type EventConfigInput = z.infer<typeof eventConfigSchema>;

// 8. Admin User Schema
export const adminUserSchema = z.object({
  uid: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1),
  role: z.nativeEnum(AdminRoles),
  active: z.boolean().default(true),
});

export type AdminUserInput = z.infer<typeof adminUserSchema>;
