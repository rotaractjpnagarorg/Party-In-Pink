// Party In Pink 5.0 — Domain Entity Types

import type {
  OrderType,
  AffiliationType,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  TicketStatus,
  EmailStatus,
  DonationStatus,
  EventStatus,
  AdminRole,
  ApprovalDecision,
} from '../constants/index.js';

export interface Consents {
  termsAndParticipation: boolean;
  photoVideoAcknowledgement: boolean;
  marketingUpdates: boolean;
}

export interface Attendee {
  id?: string;
  orderId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber?: string | null;
  city?: string | null;
  affiliationType: AffiliationType;
  clubName?: string | null;
  riDistrict?: string | null;
  organisationName?: string | null;
  departmentOrTeam?: string | null;
  discoverySource?: string | null;
  ticketStatus: TicketStatus;
  konfhubTicketId?: string | null;
  konfhubRegistrationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrimaryContact {
  fullName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber?: string | null;
}

export interface Order {
  id: string; // Firestore doc ID
  publicReference: string; // e.g. PIP5-S-XXXX / PIP5-B-XXXX
  statusToken: string; // Opaque security token for status view
  type: OrderType;
  buyer: PrimaryContact;
  organisationType?: AffiliationType | null;
  organisationName?: string | null;
  riDistrict?: string | null;
  participantCount: number;
  unitPricePaise: number;
  totalAmountPaise: number;
  currency: 'INR';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentSessionId?: string | null;
  reservationExpiresAt?: string | null;
  capacityReleasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEvidence {
  storagePath?: string | null;
  source: 'RECEIPT_UPLOAD' | 'MANUAL_ENTRY' | 'PASTED_TEXT';
  extractedAmountPaise?: number | null;
  transactionReference?: string | null; // UTR or RRN
  paymentStatusText?: string | null;
  ocrConfidence?: number | null; // 0.0 to 1.0
  submittedAt: string;
}

export interface PaymentVerification {
  method: 'SLACK_MANUAL' | 'ADMIN_MANUAL' | 'AUTOMATIC_FUTURE';
  decision: ApprovalDecision;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export interface PaymentSession {
  id: string; // Firestore doc ID
  merchantReference: string; // e.g. PAY-XXXX
  entityType: 'ORDER' | 'DONATION';
  entityId: string; // Order or Donation doc ID
  entityReference: string; // PIP5-S- / PIP5-B- / PIP5-D- reference
  method: PaymentMethod;
  amountPaise: number;
  currency: 'INR';
  status: PaymentStatus;
  expiresAt: string;
  evidence?: PaymentEvidence | null;
  verification?: PaymentVerification | null;
  normalizedUtr?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  id: string;
  publicReference: string; // e.g. PIP5-D-XXXX
  statusToken: string;
  donor: PrimaryContact;
  organisationName?: string | null;
  amountPaise: number;
  currency: 'INR';
  pan?: string | null;
  isAnonymousPublicly: boolean;
  complimentaryPassesCount?: number;
  paymentStatus: PaymentStatus;
  donationStatus: DonationStatus;
  paymentSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentApproval {
  id: string;
  paymentId: string;
  decision: ApprovalDecision;
  actor: string;
  source: 'SLACK' | 'ADMIN_DASHBOARD';
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface TicketJob {
  id: string;
  orderId: string;
  attendeeIds: string[];
  status: TicketStatus;
  attempts: number;
  maxAttempts: number;
  fulfilledAttendeeIds?: string[];
  leaseExpiresAt?: string | null;
  ticketEmailEnqueued?: boolean;
  providerResult?: Record<string, unknown> | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailJob {
  id: string;
  audience: 'SINGLE_ATTENDEE' | 'BULK_ORGANISER' | 'BULK_ATTENDEE' | 'DONOR';
  entityType: 'ORDER' | 'DONATION' | 'ATTENDEE';
  entityId: string;
  templateKey: string;
  recipientEmail: string;
  recipientName: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: EmailStatus;
  attempts: number;
  providerMessageId?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationRecord {
  id: string;
  entityId: string;
  templateKey: string;
  recipientEmail: string;
  status: EmailStatus;
  providerMessageId?: string | null;
  events: Array<{
    type: string;
    timestamp: string;
    details?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actor: string; // User ID, email, or 'SYSTEM' / 'SLACK:<user>'
  action: string;
  entityType: 'ORDER' | 'PAYMENT' | 'DONATION' | 'TICKET' | 'EVENT_CONFIG' | 'USER_ROLE';
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  correlationId: string;
  timestamp: string;
}

export interface EventConfig {
  code: string; // e.g. 'PIP5'
  edition: string; // '5.0'
  title: string;
  status: EventStatus;
  eventDate: string; // ISO 8601
  venue: string;
  venueMapUrl: string;
  pricesPaise: {
    singlePass: number;
    bulkPass: number;
    bulkMinParticipants: number;
  };
  capacity: {
    total: number;
    registeredCount: number;
    confirmedCount: number;
  };
  paymentDisplayConfig: {
    upiVpa: string;
    payeeName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
  donationConfig: {
    enabled: boolean;
    minAmountPaise: number;
    maxAmountPaise: number;
    presetsPaise: number[];
  };
  featureFlags: {
    ocrEnabled: boolean;
    slackApprovalEnabled: boolean;
    konfhubEnabled: boolean;
    brevoEnabled: boolean;
  };
  supportContact: {
    email: string;
    whatsapp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type PublicEventProjection = Pick<
  EventConfig,
  | 'code'
  | 'edition'
  | 'title'
  | 'status'
  | 'eventDate'
  | 'venue'
  | 'venueMapUrl'
  | 'pricesPaise'
  | 'paymentDisplayConfig'
  | 'donationConfig'
  | 'supportContact'
>;

export interface PublicOrderStatus {
  publicReference: string;
  statusToken: string;
  type: OrderType | 'DONATION';
  orderStatus: OrderStatus | DonationStatus;
  paymentStatus: PaymentStatus;
  participantCount: number;
  totalAmountPaise: number;
  currency: 'INR';
  buyerName: string;
  organisationName?: string | null;
  ticketsIssuedCount: number;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}
