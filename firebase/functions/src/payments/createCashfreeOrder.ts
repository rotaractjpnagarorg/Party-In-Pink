import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { getCashfreeClient } from '../integrations/cashfree/cashfreeClient.js';
import { cashfreeSecrets } from '../config/secrets.js';
import { PaymentStatuses } from '@pip/shared';

interface CreateCashfreeOrderRequest {
  sessionId: string;
}

export const createCashfreeOrder = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    secrets: cashfreeSecrets,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const data = request.data as CreateCashfreeOrderRequest;
    if (!data?.sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    const sessionRef = db.collection('paymentSessions').doc(data.sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Payment session not found');
    }

    const session = sessionDoc.data() as any;
    if (
      session.status !== PaymentStatuses.AWAITING_PAYMENT &&
      session.status !== PaymentStatuses.REJECTED
    ) {
      throw new HttpsError(
        'failed-precondition',
        `Cannot create gateway order for session in status ${session.status}`
      );
    }

    // Check expiry
    const now = Date.now();
    const expiry = Date.parse(session.expiresAt);
    if (Number.isFinite(expiry) && expiry <= now) {
      throw new HttpsError('deadline-exceeded', 'Payment session has expired');
    }

    // Fetch entity (order or donation) for customer info
    const entityCollection = session.entityType === 'ORDER' ? 'orders' : 'donations';
    const entityDoc = await db.collection(entityCollection).doc(session.entityId).get();
    if (!entityDoc.exists) {
      throw new HttpsError('not-found', `${session.entityType} record not found`);
    }

    const entity = entityDoc.data() as any;
    let customerName = 'Guest Attendee';
    let customerEmail = 'tickets@rotaractjpnagar.org';
    let customerPhone = '9999999999';

    if (session.entityType === 'ORDER' && entity.buyer) {
      customerName = entity.buyer.fullName || customerName;
      customerEmail = entity.buyer.email || customerEmail;
      customerPhone = (entity.buyer.mobileNumber || customerPhone).replace(/\D/g, '').slice(-10);
    } else if (session.entityType === 'DONATION' && entity.donor) {
      customerName = entity.donor.fullName || customerName;
      customerEmail = entity.donor.email || customerEmail;
      customerPhone = (entity.donor.mobileNumber || customerPhone).replace(/\D/g, '').slice(-10);
    }
    if (customerPhone.length < 10) {
      customerPhone = '9999999999';
    }

    const client = getCashfreeClient();

    // If an order was already created and is still active, return existing payment_session_id
    if (session.cashfreeOrderId && session.cashfreePaymentSessionId) {
      try {
        const existingOrder = await client.getOrder(session.cashfreeOrderId);
        if (existingOrder && existingOrder.order_status === 'ACTIVE') {
          return {
            orderId: existingOrder.order_id,
            paymentSessionId: existingOrder.payment_session_id,
          };
        }
      } catch {
        // Create a fresh order if existing cannot be retrieved
      }
    }

    const cleanRef = (session.merchantReference || 'PAY').replace(/[^a-zA-Z0-9_-]/g, '');
    const cfOrderId = `cf_${cleanRef}_${Date.now().toString().slice(-4)}`;
    const amountInRupees = Number((session.amountPaise / 100).toFixed(2));

    const statusToken = entity.statusToken || session.entityId;
    const returnUrl = `https://pip.rotaractjpnagar.org/status/${encodeURIComponent(statusToken)}?cf_order_id={order_id}`;

    const cfOrder = await client.createOrder({
      order_id: cfOrderId,
      order_amount: amountInRupees,
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${session.entityId}`.slice(0, 50),
        customer_name: customerName.slice(0, 100),
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: `Party In Pink Entry Pass (${session.merchantReference})`,
    });

    await sessionRef.update({
      cashfreeOrderId: cfOrder.order_id,
      cashfreePaymentSessionId: cfOrder.payment_session_id,
      cashfreeOrderStatus: cfOrder.order_status,
      updatedAt: new Date().toISOString(),
    });

    return {
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
    };
  }
);
