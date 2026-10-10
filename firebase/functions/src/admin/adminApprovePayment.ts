import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { processPaymentApproval } from '../approvals/paymentApprovalService.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

const adminApproveSchema = z.object({
  paymentId: z.string().nullable().optional(),
  orderId: z.string().nullable().optional(),
  decision: z.enum(['APPROVE', 'REJECT', 'REVIEW']),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Admin callable to approve, reject, or flag a payment from the Admin Dashboard.
 * Dual approval counterpart to the Slack integration.
 */
export const adminApprovePayment = onCall(
  {
    region: 'asia-south1',
    cors: true,
  },
  async (request) => {
    const admin = await requireAdminRole(request, ['SUPER_ADMIN', 'PAYMENT_APPROVER']);

    const parseResult = adminApproveSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        parseResult.error.issues[0]?.message || 'Invalid approval arguments'
      );
    }

    const { paymentId, orderId, decision, reason, notes } = parseResult.data;

    if (!paymentId && !orderId) {
      throw new HttpsError('invalid-argument', 'Either paymentId or orderId is required.');
    }

    try {
      const result = await processPaymentApproval({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        decision,
        actor: `ADMIN:${admin.email}`,
        source: 'ADMIN_DASHBOARD',
        reason: reason || undefined,
        notes: notes || undefined,
      });

      if (decision === 'APPROVE' && result.ticketJobId) {
        try {
          const { processTicketJob } = await import('../tickets/ticketWorker.js');
          await processTicketJob(result.ticketJobId);
        } catch (tErr) {
          console.warn('[Admin Approve Payment] Immediate ticket processing deferred to queue worker:', tErr);
        }
      }

      return result;
    } catch (err: any) {
      console.error('[Admin Approve Payment] Error:', err);
      if (err instanceof HttpsError) {
        throw err;
      }
      throw new HttpsError('internal', err?.message || 'Failed to process admin approval.');
    }
  }
);
