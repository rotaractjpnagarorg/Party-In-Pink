// Party In Pink 5.0 — Core Domain Constants & Enums

export const PIP_EDITION = '5.0' as const;
export const PIP_ORGANISATION = 'Rotaract Club of Bangalore JP Nagar' as const;
export const PIP_CURRENCY = 'INR' as const;
export const PIP_TIMEZONE = 'Asia/Kolkata' as const;

// Public reference prefixes (Document 05)
export const PREFIX_SINGLE_ORDER = 'PIP5-S-' as const;
export const PREFIX_BULK_ORDER = 'PIP5-B-' as const;
export const PREFIX_DONATION = 'PIP5-D-' as const;
export const PREFIX_PAYMENT_SESSION = 'PAY-' as const;

export const REFERENCE_PREFIXES = {
  SINGLE: PREFIX_SINGLE_ORDER,
  BULK: PREFIX_BULK_ORDER,
  DONATION: PREFIX_DONATION,
  PAYMENT: PREFIX_PAYMENT_SESSION,
} as const;

export const DEFAULT_EVENT_CODE = 'PIP5' as const;

export const OrderTypes = {
  SINGLE: 'SINGLE',
  BULK: 'BULK',
} as const;
export type OrderType = (typeof OrderTypes)[keyof typeof OrderTypes];

export const AffiliationTypes = {
  ROTARACT_CLUB: 'ROTARACT_CLUB',
  ROTARACT_UNIVERSITY: 'ROTARACT_UNIVERSITY',
  ROTARACT_COMMUNITY: 'ROTARACT_COMMUNITY',
  ROTARY_CLUB: 'ROTARY_CLUB',
  INTERACT_CLUB: 'INTERACT_CLUB',
  ROTARY_ALUMNI: 'ROTARY_ALUMNI',
  COMPANY: 'COMPANY',
  NGO_ASSOCIATION: 'NGO_ASSOCIATION',
  OTHER_ORGANISATION: 'OTHER_ORGANISATION',
  INDEPENDENT: 'INDEPENDENT',
} as const;
export type AffiliationType = (typeof AffiliationTypes)[keyof typeof AffiliationTypes];

export const RotaryFamilyAffiliations = [
  AffiliationTypes.ROTARACT_CLUB,
  AffiliationTypes.ROTARACT_UNIVERSITY,
  AffiliationTypes.ROTARACT_COMMUNITY,
  AffiliationTypes.ROTARY_CLUB,
  AffiliationTypes.INTERACT_CLUB,
  AffiliationTypes.ROTARY_ALUMNI,
] as const;

export function getBulkMinParticipants(organisationType?: string | null): number {
  if (organisationType === AffiliationTypes.ROTARACT_UNIVERSITY) {
    return 15;
  }
  return 10;
}

export function getBulkPassPricePaise(organisationType?: string | null): number {
  if (organisationType === AffiliationTypes.ROTARY_CLUB) {
    return 59900; // ₹599 for Rotary clubs
  }
  if (organisationType === AffiliationTypes.COMPANY) {
    return 39900; // ₹399 for corporate tickets
  }
  return 21900; // ₹219 for Rotaract, Interact, College, NGO, etc.
}

export const DONATION_TIERS = [
  {
    tier: 'WELLWISHER',
    name: 'Wellwisher',
    amount: 5000,
    amountPaise: 500000,
    complimentaryPasses: 1,
    benefits: [
      '1 Complimentary Event Pass',
      'Major Wellwisher Acknowledgement',
      'Direct support for patient cancer care',
    ],
  },
  {
    tier: 'SILVER',
    name: 'Silver',
    amount: 10000,
    amountPaise: 1000000,
    complimentaryPasses: 2,
    benefits: [
      '2 Complimentary Event Passes',
      'Logo on event backdrop & social media',
      'Recognition and MC shout-out',
      'Pamphlet/deliverables distribution',
    ],
  },
  {
    tier: 'GOLD',
    name: 'Gold',
    amount: 15000,
    amountPaise: 1500000,
    complimentaryPasses: 5,
    benefits: [
      '5 Complimentary Event Passes',
      '3 minutes stage time',
      'Logo on event backdrop & social media',
      'Recognition and MC shout-out',
      'Pamphlet/deliverables distribution',
    ],
  },
  {
    tier: 'PLATINUM',
    name: 'Platinum',
    amount: 20000,
    amountPaise: 2000000,
    complimentaryPasses: 7,
    benefits: [
      '7 Complimentary Event Passes',
      '5 minutes stage time',
      'Logo on event backdrop & social media',
      'Recognition and MC shout-out',
      'Pamphlet/deliverables distribution',
    ],
  },
] as const;

export function getDonationComplimentaryPasses(amountPaise: number): number {
  if (amountPaise >= 2000000) return 7;
  if (amountPaise >= 1500000) return 5;
  if (amountPaise >= 1000000) return 2;
  if (amountPaise >= 500000) return 1;
  return 0;
}

export const OrganisationRequiredAffiliations = [
  AffiliationTypes.COMPANY,
  AffiliationTypes.NGO_ASSOCIATION,
  AffiliationTypes.OTHER_ORGANISATION,
] as const;

export const PaymentMethods = {
  UPI: 'UPI',
  NEFT: 'NEFT',
  IMPS: 'IMPS',
  RTGS: 'RTGS',
} as const;
export type PaymentMethod = (typeof PaymentMethods)[keyof typeof PaymentMethods];

export const PaymentStatuses = {
  CREATED: 'CREATED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  VERIFYING: 'VERIFYING',
  VERIFIED: 'VERIFIED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  DUPLICATE: 'DUPLICATE',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatuses)[keyof typeof PaymentStatuses];

export const OrderStatuses = {
  DRAFT: 'DRAFT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  FULFILMENT_PENDING: 'FULFILMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatuses)[keyof typeof OrderStatuses];

export const TicketStatuses = {
  QUEUED: 'QUEUED',
  ISSUING: 'ISSUING',
  ISSUED: 'ISSUED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  PARTIAL_FAILURE: 'PARTIAL_FAILURE',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
} as const;
export type TicketStatus = (typeof TicketStatuses)[keyof typeof TicketStatuses];

export const EmailStatuses = {
  QUEUED: 'QUEUED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  DEFERRED: 'DEFERRED',
  BOUNCED: 'BOUNCED',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
} as const;
export type EmailStatus = (typeof EmailStatuses)[keyof typeof EmailStatuses];

export const DonationStatuses = {
  CREATED: 'CREATED',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  VERIFIED: 'VERIFIED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  REFUNDED: 'REFUNDED',
} as const;
export type DonationStatus = (typeof DonationStatuses)[keyof typeof DonationStatuses];

export const EventStatuses = {
  ANNOUNCED: 'ANNOUNCED',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  REGISTRATION_PAUSED: 'REGISTRATION_PAUSED',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  EVENT_DAY: 'EVENT_DAY',
  COMPLETED: 'COMPLETED',
} as const;
export type EventStatus = (typeof EventStatuses)[keyof typeof EventStatuses];

export const AdminRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PAYMENT_APPROVER: 'PAYMENT_APPROVER',
  REGISTRATION_ADMIN: 'REGISTRATION_ADMIN',
  TICKET_ADMIN: 'TICKET_ADMIN',
  FINANCE_VIEW: 'FINANCE_VIEW',
  VIEW_ONLY: 'VIEW_ONLY',
} as const;
export type AdminRole = (typeof AdminRoles)[keyof typeof AdminRoles];

export const ApprovalDecisions = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REVIEW: 'REVIEW',
} as const;
export type ApprovalDecision = (typeof ApprovalDecisions)[keyof typeof ApprovalDecisions];
