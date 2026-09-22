import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { generateReference, generateStatusToken } from '../utils/reference.js';
import {
  bulkOrderCreateSchema,
  REFERENCE_PREFIXES,
  DEFAULT_EVENT_CODE,
  EventStatuses,
  OrderStatuses,
  PaymentStatuses,
  getBulkPassPricePaise,
  type Order,
} from '@pip/shared';

export const createBulkOrder = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const parseResult = bulkOrderCreateSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Validation failed for bulk order initialization',
        parseResult.error.flatten().fieldErrors
      );
    }
    const data = parseResult.data;

    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event configuration not found');
    }

    const eventData = eventDoc.data()!;
    if (eventData.status !== EventStatuses.REGISTRATION_OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Registrations are not open for this event (Current state: ${eventData.status})`
      );
    }

    // Calculate pricing based on bulk pass pricing for the selected group type
    const unitPricePaise = getBulkPassPricePaise(data.organisationType);
    const totalAmountPaise = data.participantCount * unitPricePaise;

    const publicReference = generateReference(REFERENCE_PREFIXES.BULK);
    const statusToken = generateStatusToken();
    const orderRef = db.collection('orders').doc();
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: orderRef.id,
      publicReference,
      statusToken,
      type: 'BULK',
      buyer: {
        fullName: data.primaryContact.fullName,
        email: data.primaryContact.email,
        mobileNumber: data.primaryContact.mobileNumber,
        whatsappNumber: data.primaryContact.whatsappSameAsMobile
          ? data.primaryContact.mobileNumber
          : data.primaryContact.whatsappNumber || null,
      },
      organisationType: data.organisationType,
      organisationName: data.organisationName,
      riDistrict: data.riDistrict || null,
      participantCount: data.participantCount,
      unitPricePaise,
      totalAmountPaise,
      currency: 'INR',
      paymentStatus: PaymentStatuses.AWAITING_PAYMENT,
      orderStatus: OrderStatuses.DRAFT,
      reservationExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      capacityReleasedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await orderRef.set(newOrder);

    // Audit log
    await db.collection('auditLogs').add({
      actor: `PUBLIC_USER:${data.primaryContact.email}`,
      action: 'CREATE_BULK_ORDER_DRAFT',
      entityType: 'ORDER',
      entityId: orderRef.id,
      correlationId: publicReference,
      afterState: {
        publicReference,
        organisationName: data.organisationName,
        participantCount: data.participantCount,
        totalAmountPaise,
      },
      timestamp: nowIso,
    });

    return {
      success: true,
      orderId: orderRef.id,
      orderReference: publicReference,
      statusToken,
      unitPricePaise,
      totalAmountPaise,
      participantCount: data.participantCount,
      orderStatus: OrderStatuses.DRAFT,
    };
  }
);
