import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { getCashfreeClient } from '../integrations/cashfree/cashfreeClient.js';
import { cashfreeSecrets } from '../config/secrets.js';
import { fulfillGatewayPayment } from './fulfillGatewayPayment.js';
import { PaymentStatuses } from '@pip/shared';

interface VerifyCashfreePaymentRequest {
  sessionId: string;
}

export const verifyCashfreePayment = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    secrets: cashfreeSecrets,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const data = request.data as VerifyCashfreePaymentRequest;
    if (!data?.sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    const sessionRef = db.collection('paymentSessions').doc(data.sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Payment session not found');
    }

    const session = sessionDoc.data() as any;

    if (session.status === PaymentStatuses.VERIFIED) {
      return {
        status: 'SUCCESS',
        verified: true,
        entityId: session.entityId,
        entityType: session.entityType,
      };
    }

    const cfOrderId = session.cashfreeOrderId;
    if (!cfOrderId) {
      throw new HttpsError(
        'failed-precondition',
        'No Cashfree order has been created for this session.'
      );
    }

    const client = getCashfreeClient();
    const payments = await client.getOrderPayments(cfOrderId);

    // Find successful payment
    const successfulPayment = payments.find(
      (p) => p.payment_status === 'SUCCESS'
    );

    if (!successfulPayment) {
      const order = await client.getOrder(cfOrderId);
      if (order.order_status === 'PAID') {
        // Order marked as PAID even if payment list is lagging
        const result = await fulfillGatewayPayment({
          sessionId: data.sessionId,
          gateway: 'CASHFREE',
          gatewayPaymentId: cfOrderId,
          gatewayOrderId: cfOrderId,
          amountPaise: session.amountPaise,
          paymentMethod: 'CASHFREE_GATEWAY',
        });
        return {
          status: 'SUCCESS',
          verified: true,
          entityId: result.entityId,
          entityType: result.entityType,
        };
      }

      return {
        status: 'PENDING',
        verified: false,
        message: 'No completed payment found on Cashfree yet.',
      };
    }

    // Fulfill payment
    const result = await fulfillGatewayPayment({
      sessionId: data.sessionId,
      gateway: 'CASHFREE',
      gatewayPaymentId: successfulPayment.cf_payment_id,
      gatewayOrderId: cfOrderId,
      amountPaise: session.amountPaise,
      paymentMethod: successfulPayment.payment_method ? JSON.stringify(successfulPayment.payment_method) : undefined,
      bankReference: successfulPayment.bank_reference,
      rawPayload: successfulPayment,
    });

    return {
      status: 'SUCCESS',
      verified: true,
      entityId: result.entityId,
      entityType: result.entityType,
    };
  }
);
