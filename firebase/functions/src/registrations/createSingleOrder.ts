import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { generateReference, generateStatusToken } from '../utils/reference.js';
import { enforcePublicRateLimit, getClientAddress } from '../middleware/publicRateLimit.js';
import {
  singleRegistrationSchema,
  REFERENCE_PREFIXES,
  DEFAULT_EVENT_CODE,
  EventStatuses,
  TicketStatuses,
  type Order,
  type Attendee,
} from '@pip/shared';

export const createSingleOrder = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    // 1. Validate payload against shared domain schema
    const parseResult = singleRegistrationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Validation failed for single registration',
        parseResult.error.flatten().fieldErrors
      );
    }
    const data = parseResult.data;
    await enforcePublicRateLimit(
      'create-single-order',
      getClientAddress(request.rawRequest),
      60,
      15 * 60 * 1000
    );

    // 2. Fetch active event configuration
    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);

    const publicReference = generateReference(REFERENCE_PREFIXES.SINGLE);
    const statusToken = generateStatusToken();
    const orderRef = db.collection('orders').doc();
    const attendeeRef = orderRef.collection('attendees').doc();
    const auditLogRef = db.collection('auditLogs').doc();
    const nowIso = new Date().toISOString();
    const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    let calculatedAmountPaise = 0;

    // 3. Create the order and its expiring capacity reservation atomically.
    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new HttpsError('not-found', 'Event configuration not found');
      }

      const eventData = eventDoc.data()!;

      // Enforce event status
      if (eventData.status !== EventStatuses.REGISTRATION_OPEN) {
        throw new HttpsError(
          'failed-precondition',
          `Registrations are not open for this event (Current state: ${eventData.status})`
        );
      }

      // registeredCount includes both confirmed seats and live payment reservations.
      const currentRegistered = Number(eventData.capacity?.registeredCount);
      const totalCapacity = Number(eventData.capacity?.total);
      if (
        !Number.isInteger(currentRegistered) ||
        currentRegistered < 0 ||
        !Number.isInteger(totalCapacity) ||
        totalCapacity < 1
      ) {
        throw new HttpsError('failed-precondition', 'Event capacity is not configured correctly.');
      }
      if (currentRegistered + 1 > totalCapacity) {
        throw new HttpsError('resource-exhausted', 'Event has reached maximum capacity.');
      }

      // Authoritative server-side price calculation (SEC-P0-002)
      calculatedAmountPaise = Number(eventData.pricesPaise?.singlePass);
      if (!Number.isInteger(calculatedAmountPaise) || calculatedAmountPaise <= 0) {
        throw new HttpsError('failed-precondition', 'Single-pass pricing is not configured correctly.');
      }

      // Construct Order document
      const newOrder: Order = {
        id: orderRef.id,
        publicReference,
        statusToken,
        type: 'SINGLE',
        buyer: {
          fullName: data.fullName,
          email: data.email,
          mobileNumber: data.mobileNumber,
          whatsappNumber: data.whatsappSameAsMobile
            ? data.mobileNumber
            : data.whatsappNumber || null,
        },
        participantCount: 1,
        unitPricePaise: calculatedAmountPaise,
        totalAmountPaise: calculatedAmountPaise,
        currency: 'INR',
        paymentStatus: 'AWAITING_PAYMENT',
        orderStatus: 'AWAITING_PAYMENT',
        reservationExpiresAt,
        capacityReleasedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Construct Attendee document
      const newAttendee: Attendee = {
        id: attendeeRef.id,
        orderId: orderRef.id,
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        whatsappNumber: data.whatsappSameAsMobile ? data.mobileNumber : data.whatsappNumber || null,
        city: data.city || null,
        affiliationType: data.affiliationType,
        clubName: data.clubName || null,
        riDistrict: data.riDistrict || null,
        organisationName: data.organisationName || null,
        departmentOrTeam: data.departmentOrTeam || null,
        discoverySource: data.discoverySource || null,
        ticketStatus: TicketStatuses.QUEUED,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Persist documents in transaction
      transaction.set(orderRef, newOrder);
      transaction.set(attendeeRef, newAttendee);
      transaction.update(eventRef, {
        'capacity.registeredCount': currentRegistered + 1,
        updatedAt: nowIso,
      });

      // Write immutable audit log
      transaction.set(auditLogRef, {
        id: auditLogRef.id,
        actor: `PUBLIC_USER:${data.email}`,
        action: 'CREATE_SINGLE_ORDER',
        entityType: 'ORDER',
        entityId: orderRef.id,
        correlationId: publicReference,
        afterState: {
          publicReference,
          amountPaise: calculatedAmountPaise,
          buyerEmail: data.email,
        },
        timestamp: nowIso,
      });
    });

    return {
      success: true,
      orderReference: publicReference,
      statusToken,
      amountPaise: calculatedAmountPaise,
      currency: 'INR' as const,
      orderStatus: 'AWAITING_PAYMENT' as const,
      nextAction: 'PAYMENT' as const,
    };
  }
);
