import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { db } from '../config/firebase.js';
import {
  DEFAULT_EVENT_CODE,
  EventStatuses,
  OrderStatuses,
  PaymentStatuses,
  TicketStatuses,
  bulkAttendeeRowSchema,
  getBulkMinParticipants,
  type Order,
  type Attendee,
} from '@pip/shared';

interface CommitBulkAttendeesRequest {
  statusToken: string;
  attendees: Array<{
    slNo?: number | string | null;
    fullName: string;
    email: string;
    mobileNumber: string;
    whatsappNumber?: string | null;
    city?: string | null;
  }>;
}

export function classifyBulkCommit(
  existingHash: string | undefined,
  existingCommitStatus: string | undefined,
  orderStatus: string,
  requestedHash: string
): 'NEW' | 'RESUME' | 'COMPLETE' | 'REJECT' {
  if (existingHash === requestedHash) {
    return existingCommitStatus === 'COMMITTED' ? 'COMPLETE' : 'RESUME';
  }
  return existingHash || orderStatus !== OrderStatuses.DRAFT ? 'REJECT' : 'NEW';
}

export const commitBulkAttendees = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true',
  },
  async (request) => {
    const data = request.data as CommitBulkAttendeesRequest;
    if (!data?.statusToken || !Array.isArray(data?.attendees)) {
      throw new HttpsError('invalid-argument', 'statusToken and attendees array are required');
    }
    if (data.attendees.length < 5 || data.attendees.length > 500) {
      throw new HttpsError(
        'invalid-argument',
        'Bulk registration must contain between 5 and 500 attendees.'
      );
    }

    // 1. Locate order by statusToken
    const orderSnapshot = await db
      .collection('orders')
      .where('statusToken', '==', data.statusToken)
      .limit(1)
      .get();

    if (orderSnapshot.empty) {
      throw new HttpsError('not-found', 'Order not found for status token');
    }

    const orderDoc = orderSnapshot.docs[0];
    if (!orderDoc) {
      throw new HttpsError('not-found', 'Order document reference unavailable');
    }

    const order = orderDoc.data() as Order;

    const minRequired = getBulkMinParticipants(order.organisationType);
    if (data.attendees.length < minRequired) {
      throw new HttpsError(
        'invalid-argument',
        `Bulk registration for ${order.organisationName || 'this organisation'} requires a minimum of ${minRequired} attendees.`
      );
    }

    // Reject if payment already verified
    if (order.paymentStatus === PaymentStatuses.VERIFIED) {
      throw new HttpsError(
        'failed-precondition',
        'Cannot modify attendees for an already verified and confirmed order'
      );
    }

    // 2. Validate all attendee rows
    const validatedAttendees: Attendee[] = [];
    const nowIso = new Date().toISOString();
    const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    for (let i = 0; i < data.attendees.length; i++) {
      const rawRow = data.attendees[i];
      const parseResult = bulkAttendeeRowSchema.safeParse(rawRow);
      if (!parseResult.success) {
        throw new HttpsError(
          'invalid-argument',
          `Row ${i + 1} validation failed: ${parseResult.error.issues[0]?.message}`
        );
      }

      const attendeeId = db.collection('orders').doc(order.id).collection('attendees').doc().id;
      validatedAttendees.push({
        id: attendeeId,
        orderId: order.id,
        fullName: parseResult.data.fullName,
        email: parseResult.data.email,
        mobileNumber: parseResult.data.mobileNumber,
        whatsappNumber: parseResult.data.whatsappNumber || null,
        city: parseResult.data.city || null,
        affiliationType: order.organisationType || 'OTHER_ORGANISATION',
        clubName: order.organisationName || null,
        riDistrict: order.riDistrict || null,
        organisationName: order.organisationName || null,
        ticketStatus: TicketStatuses.QUEUED,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const normalizedEmails = validatedAttendees.map((attendee) => attendee.email.toLowerCase());
    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      throw new HttpsError(
        'invalid-argument',
        'Each bulk attendee must have a unique email address.'
      );
    }

    const totalCount = validatedAttendees.length;
    const unitPricePaise = order.unitPricePaise || 21900;
    const totalAmountPaise = totalCount * unitPricePaise;
    const orderRef = db.collection('orders').doc(order.id);
    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
    const commitHash = createHash('sha256')
      .update(
        JSON.stringify(
          validatedAttendees.map((attendee) => ({
            fullName: attendee.fullName,
            email: attendee.email.toLowerCase(),
            mobileNumber: attendee.mobileNumber,
            whatsappNumber: attendee.whatsappNumber || null,
            city: attendee.city || null,
          }))
        )
      )
      .digest('hex');

    // 3. Claim this commit and its expiring capacity reservation once.
    const reservation = await db.runTransaction(async (transaction) => {
      const [freshOrderDoc, eventDoc] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(eventRef),
      ]);
      if (!freshOrderDoc.exists || !eventDoc.exists) {
        throw new HttpsError('not-found', 'Order or event configuration not found.');
      }

      const freshOrder = freshOrderDoc.data()!;
      const disposition = classifyBulkCommit(
        freshOrder.attendeeCommitHash,
        freshOrder.attendeeCommitStatus,
        freshOrder.orderStatus,
        commitHash
      );
      if (disposition === 'COMPLETE') {
        return {
          alreadyFinal: true,
          orderStatus: freshOrder.orderStatus,
        };
      }
      if (disposition === 'REJECT') {
        throw new HttpsError('failed-precondition', 'This bulk order has already been committed.');
      }
      if (disposition === 'RESUME') {
        if (
          freshOrder.orderStatus !== OrderStatuses.DRAFT ||
          freshOrder.capacityReleasedAt ||
          !freshOrder.reservationExpiresAt ||
          Date.parse(freshOrder.reservationExpiresAt) <= Date.now()
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This interrupted bulk registration can no longer be resumed.'
          );
        }
        return { alreadyFinal: false, orderStatus: freshOrder.orderStatus };
      }
      const eventData = eventDoc.data()!;
      if (eventData.status !== EventStatuses.REGISTRATION_OPEN) {
        throw new HttpsError('failed-precondition', 'Registrations are not currently open.');
      }

      const registeredCount = Number(eventData.capacity?.registeredCount || 0);
      const totalCapacity = Number(eventData.capacity?.total || 0);
      if (registeredCount + totalCount > totalCapacity) {
        throw new HttpsError(
          'resource-exhausted',
          'Not enough event capacity remains for this bulk order.'
        );
      }

      transaction.update(orderRef, {
        attendeeCommitHash: commitHash,
        attendeeCommitStatus: 'COMMITTING',
        participantCount: totalCount,
        totalAmountPaise,
        reservationExpiresAt,
        capacityReleasedAt: null,
        updatedAt: nowIso,
      });
      transaction.update(eventRef, {
        'capacity.registeredCount': registeredCount + totalCount,
        updatedAt: nowIso,
      });
      return { alreadyFinal: false, orderStatus: OrderStatuses.DRAFT };
    });

    if (!reservation.alreadyFinal) {
      // Deterministic IDs make interrupted writes safe to resume without duplicates.
      for (let start = 0; start < validatedAttendees.length; start += 400) {
        const writeBatch = db.batch();
        validatedAttendees.slice(start, start + 400).forEach((attendee) => {
          const attendeeId = createHash('sha256')
            .update(`${order.id}:${attendee.email.toLowerCase()}`)
            .digest('hex')
            .slice(0, 24);
          const attendeeRef = orderRef.collection('attendees').doc(attendeeId);
          writeBatch.set(attendeeRef, { ...attendee, id: attendeeId });
        });
        await writeBatch.commit();
      }

      const auditRef = db
        .collection('auditLogs')
        .doc(`bulk-${order.id}-${commitHash.slice(0, 16)}`);
      await db.runTransaction(async (transaction) => {
        const freshOrderDoc = await transaction.get(orderRef);
        if (
          !freshOrderDoc.exists ||
          freshOrderDoc.data()?.attendeeCommitHash !== commitHash ||
          freshOrderDoc.data()?.attendeeCommitStatus !== 'COMMITTING' ||
          freshOrderDoc.data()?.orderStatus !== OrderStatuses.DRAFT ||
          freshOrderDoc.data()?.capacityReleasedAt ||
          !freshOrderDoc.data()?.reservationExpiresAt ||
          Date.parse(freshOrderDoc.data()?.reservationExpiresAt) <= Date.now()
        ) {
          throw new HttpsError(
            'aborted',
            'Bulk order changed while attendees were being committed.'
          );
        }
        transaction.update(orderRef, {
          attendeeCommitStatus: 'COMMITTED',
          orderStatus: OrderStatuses.AWAITING_PAYMENT,
          paymentStatus: PaymentStatuses.AWAITING_PAYMENT,
          updatedAt: nowIso,
        });
        transaction.set(
          auditRef,
          {
            id: auditRef.id,
            actor: `PUBLIC_USER:${order.buyer.email}`,
            action: 'COMMIT_BULK_ATTENDEES',
            entityType: 'ORDER',
            entityId: order.id,
            correlationId: order.publicReference,
            afterState: {
              publicReference: order.publicReference,
              participantCount: totalCount,
              totalAmountPaise,
            },
            timestamp: nowIso,
          },
          { merge: true }
        );
      });
    }

    return {
      success: true,
      orderReference: order.publicReference,
      participantCount: totalCount,
      totalAmountPaise,
      orderStatus: reservation.alreadyFinal
        ? reservation.orderStatus
        : OrderStatuses.AWAITING_PAYMENT,
      nextAction: 'PAYMENT' as const,
    };
  }
);
