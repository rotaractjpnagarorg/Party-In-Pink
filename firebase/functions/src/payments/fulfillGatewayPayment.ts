import { db } from '../config/firebase.js';
import {
  PaymentStatuses,
  OrderStatuses,
  TicketStatuses,
  DEFAULT_EVENT_CODE,
  type Order,
  getDonationComplimentaryPasses,
} from '@pip/shared';
import { generateStatusToken } from '../utils/reference.js';

import { SLACK_WEBHOOK_URL } from '../config/secrets.js';

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

export async function fulfillGatewayPayment(input: GatewayFulfillmentInput): Promise<{
  success: boolean;
  alreadyVerified: boolean;
  entityId: string;
  entityType: 'ORDER' | 'DONATION';
}> {
  const sessionRef = db.collection('paymentSessions').doc(input.sessionId);
  const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
  const nowIso = new Date().toISOString();

  let entityId = '';
  let entityType: 'ORDER' | 'DONATION' = 'ORDER';
  let buyerName = '';
  let buyerEmail = '';
  let publicRef = '';
  let alreadyVerified = false;

  await db.runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists) {
      throw new Error(`Payment session ${input.sessionId} not found`);
    }

    const session = sessionDoc.data() as any;
    entityId = session.entityId;
    entityType = session.entityType || 'ORDER';

    if (session.status === PaymentStatuses.VERIFIED) {
      alreadyVerified = true;
      return;
    }

    const entityRef = db.collection(entityType === 'ORDER' ? 'orders' : 'donations').doc(entityId);
    const entityDoc = await transaction.get(entityRef);
    if (!entityDoc.exists) {
      throw new Error(`${entityType} ${entityId} not found`);
    }

    const entityData = entityDoc.data()!;
    publicRef = entityData.publicReference || entityId;

    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists) {
      throw new Error('Event configuration not found');
    }

    if (entityType === 'ORDER') {
      buyerName = entityData.buyer?.fullName || 'Attendee';
      buyerEmail = entityData.buyer?.email || '';
      const confirmedCount = Number(eventDoc.data()?.capacity?.confirmedCount || 0);
      const registeredCount = Number(eventDoc.data()?.capacity?.registeredCount || confirmedCount);
      const participantCount = Number(entityData.participantCount || 1);

      transaction.update(eventRef, {
        'capacity.confirmedCount': confirmedCount + participantCount,
        'capacity.registeredCount': Math.max(registeredCount, confirmedCount + participantCount),
        updatedAt: nowIso,
      });

      transaction.update(entityRef, {
        paymentStatus: PaymentStatuses.VERIFIED,
        orderStatus: OrderStatuses.PAYMENT_VERIFIED,
        updatedAt: nowIso,
      });

      // Enqueue ticket job
      const ticketJobRef = db.collection('ticketJobs').doc(entityId);
      transaction.set(
        ticketJobRef,
        {
          id: entityId,
          orderId: entityId,
          status: TicketStatuses.QUEUED,
          attempts: 0,
          maxAttempts: 5,
          providerResult: null,
          lastError: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } else {
      buyerName = entityData.donor?.fullName || 'Donor';
      buyerEmail = entityData.donor?.email || '';

      transaction.update(entityRef, {
        paymentStatus: PaymentStatuses.VERIFIED,
        donationStatus: 'COMPLETED',
        updatedAt: nowIso,
      });

      const passes = Number(
        entityData.complimentaryPassesCount ??
          getDonationComplimentaryPasses(Number(entityData.amountPaise || 0))
      );

      if (passes > 0) {
        const confirmedCount = Number(eventDoc.data()?.capacity?.confirmedCount || 0);
        const registeredCount = Number(eventDoc.data()?.capacity?.registeredCount || confirmedCount);

        transaction.update(eventRef, {
          'capacity.confirmedCount': confirmedCount + passes,
          'capacity.registeredCount': Math.max(registeredCount, confirmedCount + passes),
          updatedAt: nowIso,
        });

        const donorOrderId = `DONOR_${entityId}`;
        const orderRef = db.collection('orders').doc(donorOrderId);
        const orderData: Order = {
          id: donorOrderId,
          publicReference: `${entityData.publicReference || entityId}-TKT`,
          statusToken: entityData.statusToken || generateStatusToken(),
          type: passes > 1 ? 'BULK' : 'SINGLE',
          buyer: {
            fullName: entityData.donor?.fullName || 'Valued Donor',
            email: entityData.donor?.email || '',
            mobileNumber: entityData.donor?.mobileNumber || '',
            whatsappNumber: entityData.donor?.whatsappNumber || null,
          },
          organisationName: entityData.organisationName || null,
          participantCount: passes,
          unitPricePaise: 0,
          totalAmountPaise: 0,
          currency: 'INR',
          paymentStatus: PaymentStatuses.VERIFIED,
          orderStatus: OrderStatuses.PAYMENT_VERIFIED,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        transaction.set(orderRef, orderData, { merge: true });

        for (let i = 1; i <= passes; i++) {
          const attRef = orderRef.collection('attendees').doc(`pass_${i}`);
          const attendeeName =
            i === 1
              ? entityData.donor?.fullName || 'Valued Donor'
              : `${entityData.donor?.fullName || 'Donor Guest'} - Guest ${i}`;
          transaction.set(
            attRef,
            {
              id: `pass_${i}`,
              orderId: donorOrderId,
              fullName: attendeeName,
              email: entityData.donor?.email || '',
              mobileNumber: entityData.donor?.mobileNumber || '',
              whatsappNumber: entityData.donor?.whatsappNumber || null,
              organisationName: entityData.organisationName || null,
              ticketStatus: TicketStatuses.QUEUED,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }

        const ticketJobRef = db.collection('ticketJobs').doc(donorOrderId);
        transaction.set(
          ticketJobRef,
          {
            id: donorOrderId,
            orderId: donorOrderId,
            status: TicketStatuses.QUEUED,
            attempts: 0,
            maxAttempts: 5,
            providerResult: null,
            lastError: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
    }

    transaction.update(sessionRef, {
      status: PaymentStatuses.VERIFIED,
      verification: {
        method: 'GATEWAY_AUTO',
        decision: 'APPROVE',
        verifiedBy: input.gateway,
        verifiedAt: nowIso,
        reference: input.gatewayPaymentId || input.bankReference || input.gatewayOrderId,
        notes: `Auto-verified by ${input.gateway} Payment Gateway`,
      },
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

  if (!alreadyVerified) {
    try {
      const webhookUrl = SLACK_WEBHOOK_URL.value();
      if (webhookUrl) {
        const text = `⚡ *Instant Payment Confirmed (${input.gateway})*\n• *Order:* ${publicRef} (${entityType})\n• *Amount:* ₹${(input.amountPaise / 100).toFixed(2)}\n• *Payer:* ${buyerName} (<mailto:${buyerEmail}|${buyerEmail}>)\n• *Payment ID:* \`${input.gatewayPaymentId}\`\n• *Ticket Status:* Fulfilment enqueued automatically! 🎉`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      }
    } catch (err) {
      console.error('[fulfillGatewayPayment] Failed to send Slack alert:', err);
    }
  }

  return {
    success: true,
    alreadyVerified,
    entityId,
    entityType,
  };
}
