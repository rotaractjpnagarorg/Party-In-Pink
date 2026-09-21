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
  if (organisationType === AffiliationTypes.ROTARACT_COMMUNITY) {
    return 10;
  }
  return 5;
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
