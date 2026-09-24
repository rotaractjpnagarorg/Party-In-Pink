import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { PIP_EDITION } from '@pip/shared';

// Bounded concurrency and resources for cost control per Document 03
setGlobalOptions({
  region: 'asia-south1',
  maxInstances: 10,
});

export const healthCheck = onRequest((_req, res) => {
  res.status(200).json({
    status: 'healthy',
    edition: PIP_EDITION,
    timestamp: new Date().toISOString(),
  });
});

// Single Registrations
export { createSingleOrder } from './registrations/createSingleOrder.js';

// Status
export { getPublicStatus } from './events/getPublicStatus.js';

// Bulk Registrations
export { createBulkOrder } from './bulk/createBulkOrder.js';
export { validateBulkUpload } from './bulk/validateBulkUpload.js';
export { commitBulkAttendees } from './bulk/commitBulkAttendees.js';

// PiP Pay Orchestration & Evidence Submission
export { createPaymentSession } from './payments/createPaymentSession.js';
export { analyzePaymentReceipt } from './payments/analyzePaymentReceipt.js';
export { submitPaymentEvidence } from './payments/submitPaymentEvidence.js';

// Approvals: Slack Custom App & Admin Dual Approval
export { slackInteractions } from './integrations/slack/slackInteractions.js';
export { adminApprovePayment } from './admin/adminApprovePayment.js';
export { adminGetReceiptUrl } from './admin/adminGetReceiptUrl.js';
export { adminUpdateContact } from './admin/adminUpdateContact.js';

// Ticketing Fulfilment Worker & Retry
export { onTicketJobCreated, retryTicketJobs, adminRetryTicket } from './tickets/ticketWorker.js';

// Donations Flow (Phase 9)
export { createDonation } from './donations/createDonation.js';

// Brevo Lifecycle Email Integration (Phase 10)
export {
  onEmailJobCreated,
  retryEmailJobs,
  adminRetryEmail,
  adminResendConfirmation,
} from './communications/emailWorker.js';
export { brevoWebhook } from './integrations/brevo/brevoWebhook.js';

// Scheduled Sweeps & Observability (Phase 12)
export { expireStalePaymentSessions, dailySummaryJob } from './jobs/scheduledSweeps.js';

// Cashfree Payment Gateway Integration
export { createCashfreeOrder } from './payments/createCashfreeOrder.js';
export { verifyCashfreePayment } from './payments/verifyCashfreePayment.js';
export { cashfreeWebhook } from './integrations/cashfree/cashfreeWebhook.js';

