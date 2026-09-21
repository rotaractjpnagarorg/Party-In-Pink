import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { processPaymentApproval } from '../approvals/paymentApprovalService.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

const adminApproveSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  decision: z.enum(['APPROVE', 'REJECT', 'REVIEW']),
  reason: z.string().optional(),
  notes: z.string().optional(),
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

    const { paymentId, decision, reason, notes } = parseResult.data;

    try {
      const result = await processPaymentApproval({
        paymentId,
        decision,
        actor: `ADMIN:${admin.email}`,
        source: 'ADMIN_DASHBOARD',
        reason,
        notes,
      });

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
