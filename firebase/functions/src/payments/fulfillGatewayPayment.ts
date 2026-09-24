import { db } from '../config/firebase.js';
import {
  PaymentStatuses,
  OrderStatuses,
} from '@pip/shared';
import { notifySlackPaymentSubmitted } from '../integrations/slack/slackNotifier.js';

export interface GatewayFulfillmentInput {
  sessionId: string;
  gateway: 'CASHFREE' | 'RAZORPAY';
  gatewayPaymentId: string;
  gatewayOrderId: string;
  amountPaise: number;
  paymentMethod?: string;
  bankReference?: string;
  rawPayload?: any;
}

/**
 * Handles incoming successful gateway payment notification.
 * Per business requirements:
 * Gateway payments are marked as PAYMENT_SUBMITTED and routed to Slack
 * for admin review and approval before digital ticket pass issuance.
 */
export async function fulfillGatewayPayment(input: GatewayFulfillmentInput): Promise<{
  success: boolean;
  alreadyVerified: boolean;
  entityId: string;
  entityType: 'ORDER' | 'DONATION';
}> {
  const sessionRef = db.collection('paymentSessions').doc(input.sessionId);
  const nowIso = new Date().toISOString();

  let entityId = '';
  let entityType: 'ORDER' | 'DONATION' = 'ORDER';
  let buyerName = '';
  let buyerEmail = '';
  let publicRef = '';
  let statusToken = '';
  let merchantRef = '';
  let alreadyProcessed = false;

  await db.runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists) {
      throw new Error(`Payment session ${input.sessionId} not found`);
    }

    const session = sessionDoc.data() as any;
    entityId = session.entityId;
    entityType = session.entityType || 'ORDER';
    merchantRef = session.merchantReference || input.sessionId;

    if (
      session.status === PaymentStatuses.VERIFIED ||
      session.status === PaymentStatuses.PAYMENT_SUBMITTED
    ) {
      alreadyProcessed = true;
      return;
    }

    const entityRef = db.collection(entityType === 'ORDER' ? 'orders' : 'donations').doc(entityId);
    const entityDoc = await transaction.get(entityRef);
    if (!entityDoc.exists) {
      throw new Error(`${entityType} ${entityId} not found`);
    }

    const entityData = entityDoc.data()!;
    publicRef = entityData.publicReference || entityId;
    statusToken = entityData.statusToken || session.entityId;

    if (entityType === 'ORDER') {
      buyerName = entityData.buyer?.fullName || 'Attendee';
      buyerEmail = entityData.buyer?.email || '';

      transaction.update(entityRef, {
        paymentStatus: PaymentStatuses.PAYMENT_SUBMITTED,
        orderStatus: OrderStatuses.PAYMENT_SUBMITTED,
        updatedAt: nowIso,
      });
    } else {
      buyerName = entityData.donor?.fullName || 'Donor';
      buyerEmail = entityData.donor?.email || '';

      transaction.update(entityRef, {
        paymentStatus: PaymentStatuses.PAYMENT_SUBMITTED,
        donationStatus: 'PAYMENT_SUBMITTED',
        updatedAt: nowIso,
      });
    }

    transaction.update(sessionRef, {
      status: PaymentStatuses.PAYMENT_SUBMITTED,
      submittedAt: nowIso,
      gatewayPaymentDetails: {
        gateway: input.gateway,
        paymentId: input.gatewayPaymentId,
        orderId: input.gatewayOrderId,
        method: input.paymentMethod || 'UNKNOWN',
        bankReference: input.bankReference || null,
        paidAt: nowIso,
      },
      updatedAt: nowIso,
    });
  });

  if (!alreadyProcessed) {
    try {
      await notifySlackPaymentSubmitted({
        paymentId: input.sessionId,
        merchantReference: merchantRef,
        entityReference: publicRef,
        entityType,
        amountPaise: input.amountPaise,
        buyerName,
        buyerEmail,
        method: `${input.gateway} (${input.paymentMethod || 'Online'})`,
        utr: input.bankReference || input.gatewayPaymentId,
        source: `${input.gateway} Payment Gateway`,
        statusToken,
      });
      console.log(
        `[fulfillGatewayPayment] Dispatched interactive Slack approval card for ${entityType} ${publicRef} (session: ${input.sessionId})`
      );
    } catch (err) {
      console.error('[fulfillGatewayPayment] Failed to send Slack approval card:', err);
    }
  }

  return {
    success: true,
    alreadyVerified: alreadyProcessed,
    entityId,
    entityType,
  };
}
