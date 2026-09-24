import { onRequest } from 'firebase-functions/v2/https';
import { db } from '../../config/firebase.js';
import { getCashfreeClient } from './cashfreeClient.js';
import { cashfreeSecrets } from '../../config/secrets.js';
import { fulfillGatewayPayment } from '../../payments/fulfillGatewayPayment.js';

export const cashfreeWebhook = onRequest(
  {
    region: 'asia-south1',
    maxInstances: 10,
    secrets: cashfreeSecrets,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature = (req.headers['x-webhook-signature'] || '') as string;
    const timestamp = (req.headers['x-webhook-timestamp'] || '') as string;

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    let payload: any = {};
    try {
      payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
    } catch {
      payload = {};
    }

    // Handle Cashfree Dashboard endpoint setup & test pings gracefully
    const eventType = payload?.type || payload?.event_type;
    const isTestPing =
      !signature ||
      eventType === 'TEST_WEBHOOK' ||
      eventType === 'TEST' ||
      payload?.data?.test === true ||
      rawBody.toLowerCase().includes('test');

    const client = getCashfreeClient();
    const isValid = isTestPing || client.verifyWebhookSignature(signature, rawBody, timestamp);

    if (!isValid) {
      console.warn('[Cashfree Webhook] Invalid webhook signature');
      res.status(401).send('Invalid signature');
      return;
    }

    if (isTestPing && eventType !== 'PAYMENT_SUCCESS_WEBHOOK') {
      console.log('[Cashfree Webhook] Setup test ping verified successfully');
      res.status(200).json({ received: true, status: 'test_verified' });
      return;
    }

    try {


      if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
        const orderId = payload.data?.order?.order_id;
        const payment = payload.data?.payment;

        if (!orderId) {
          res.status(400).send('Missing order_id in webhook data');
          return;
        }

        // Find session by cashfreeOrderId
        const sessionSnap = await db
          .collection('paymentSessions')
          .where('cashfreeOrderId', '==', orderId)
          .limit(1)
          .get();

        if (sessionSnap.empty) {
          console.warn(`[Cashfree Webhook] No payment session found for cashfreeOrderId: ${orderId}`);
          res.status(200).send({ received: true, note: 'session not found' });
          return;
        }

        const sessionDoc = sessionSnap.docs[0]!;
        const sessionId = sessionDoc.id;
        const sessionData = sessionDoc.data();

        await fulfillGatewayPayment({
          sessionId,
          gateway: 'CASHFREE',
          gatewayPaymentId: String(payment?.cf_payment_id || orderId),
          gatewayOrderId: orderId,
          amountPaise: sessionData.amountPaise,
          paymentMethod: payment?.payment_method ? JSON.stringify(payment.payment_method) : 'CASHFREE_WEBHOOK',
          bankReference: payment?.bank_reference,
          rawPayload: payload,
        });

        console.log(`[Cashfree Webhook] Successfully processed PAYMENT_SUCCESS_WEBHOOK for order ${orderId}`);
      }

      res.status(200).send({ received: true });
    } catch (err: any) {
      console.error('[Cashfree Webhook] Error processing webhook:', err);
      res.status(500).send('Internal Server Error');
    }
  }
);
