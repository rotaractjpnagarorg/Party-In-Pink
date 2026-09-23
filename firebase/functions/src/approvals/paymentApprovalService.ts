import { db } from '../config/firebase.js';
import {
  DEFAULT_EVENT_CODE,
  PaymentStatuses,
  OrderStatuses,
  TicketStatuses,
  DonationStatuses,
  getDonationComplimentaryPasses,
  type Order,
} from '@pip/shared';
import { generateStatusToken } from '../utils/reference.js';
import { HttpsError } from 'firebase-functions/v2/https';

export interface ProcessApprovalInput {
  paymentId: string;
  decision: 'APPROVE' | 'REJECT' | 'REVIEW';
  actor: string;
  source: 'SLACK' | 'ADMIN_DASHBOARD';
  reason?: string | null;
  notes?: string | null;
}

export interface ProcessApprovalResult {
  success: boolean;
  paymentId: string;
  entityType: 'ORDER' | 'DONATION';
  entityId: string;
  decision: 'APPROVE' | 'REJECT' | 'REVIEW';
  newPaymentStatus: string;
  ticketJobId?: string;
  message: string;
}

/**
 * Single authoritative payment approval service for PiP 5.0.
 * Guaranteed idempotent and race-condition free via Firestore transactions.
 * Enforces APP-P0-001 (double-approval protection) and APP-P0-002 (approve/reject race protection).
 */
export async function processPaymentApproval(
  input: ProcessApprovalInput
): Promise<ProcessApprovalResult> {
  const { paymentId, decision, actor, source, reason, notes } = input;
  const nowIso = new Date().toISOString();

  return await db.runTransaction(async (transaction) => {
    // 1. Fetch payment session
    const sessionRef = db.collection('paymentSessions').doc(paymentId);
    const sessionDoc = await transaction.get(sessionRef);

    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', `Payment session ${paymentId} not found.`);
    }

    const session = sessionDoc.data() as any;

    // 2. State machine checks (APP-P0-001, APP-P0-002)
    if (session.status === PaymentStatuses.VERIFIED) {
      throw new HttpsError(
        'already-exists',
        `Payment ${paymentId} has already been verified and approved by ${session.verification?.verifiedBy || 'another approver'}.`
      );
    }

    if (session.status === PaymentStatuses.REJECTED) {
      throw new HttpsError(
        'failed-precondition',
        `Payment ${paymentId} has already been rejected by ${session.verification?.verifiedBy || 'another approver'}.`
      );
    }

    if (
      session.status !== PaymentStatuses.PAYMENT_SUBMITTED &&
      session.status !== PaymentStatuses.REVIEW_REQUIRED
    ) {
      throw new HttpsError(
        'failed-precondition',
        `Cannot process approval for payment in status ${session.status}.`
      );
    }

    const entityType: 'ORDER' | 'DONATION' = session.entityType || 'ORDER';
    const entityId: string = session.entityId;
    const entityRef = db.collection(entityType === 'ORDER' ? 'orders' : 'donations').doc(entityId);
    const entityDoc = await transaction.get(entityRef);
    if (!entityDoc.exists) {
      throw new HttpsError('not-found', `${entityType} ${entityId} not found.`);
    }
    const entityData = entityDoc.data()!;
    if (entityData.paymentSessionId !== paymentId) {
      throw new HttpsError(
        'failed-precondition',
        'This payment session is no longer the active session for the order or donation.'
      );
    }
    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
    const eventDoc = decision === 'APPROVE' ? await transaction.get(eventRef) : null;
    if (decision === 'APPROVE' && !eventDoc?.exists) {
      throw new HttpsError('not-found', 'Event configuration not found.');
    }
    let ticketJobId: string | undefined = undefined;

    if (decision === 'APPROVE') {
      // Transition payment to VERIFIED
      transaction.update(sessionRef, {
        status: PaymentStatuses.VERIFIED,
        verification: {
          method: source === 'SLACK' ? 'SLACK_MANUAL' : 'ADMIN_MANUAL',
          decision: 'APPROVE',
          verifiedBy: actor,
          verifiedAt: nowIso,
          reason: reason || null,
          notes: notes || null,
        },
        updatedAt: nowIso,
      });

      if (entityType === 'ORDER') {
        const confirmedCount = Number(eventDoc!.data()?.capacity?.confirmedCount || 0);
        const registeredCount = Number(
          eventDoc!.data()?.capacity?.registeredCount || confirmedCount
        );
        const totalCapacity = Number(eventDoc!.data()?.capacity?.total || 0);
        const participantCount = Number(entityData.participantCount || 1);
        if (confirmedCount + participantCount > totalCapacity) {
          throw new HttpsError(
            'resource-exhausted',
            'Event capacity was reached before this payment could be approved.'
          );
        }
        transaction.update(eventRef, {
          'capacity.confirmedCount': confirmedCount + participantCount,
          // Normally this seat is already represented by an expiring reservation.
          // The max also safely migrates legacy orders created before reservations existed.
          'capacity.registeredCount': Math.max(registeredCount, confirmedCount + participantCount),
          updatedAt: nowIso,
        });
        transaction.update(entityRef, {
          paymentStatus: PaymentStatuses.VERIFIED,
          orderStatus: OrderStatuses.PAYMENT_VERIFIED,
          updatedAt: nowIso,
        });

        // Create Ticket Fulfilment Job (Invariant: Idempotent using orderId as key)
        const ticketJobRef = db.collection('ticketJobs').doc(entityId);
        ticketJobId = entityId;
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
      } else if (entityType === 'DONATION') {
        const passes = Number(
          entityData.complimentaryPassesCount ??
            getDonationComplimentaryPasses(Number(entityData.amountPaise || 0))
        );

        if (passes > 0) {
          const confirmedCount = Number(eventDoc!.data()?.capacity?.confirmedCount || 0);
          const registeredCount = Number(
            eventDoc!.data()?.capacity?.registeredCount || confirmedCount
          );
          const totalCapacity = Number(eventDoc!.data()?.capacity?.total || 0);
          if (confirmedCount + passes > totalCapacity) {
            throw new HttpsError(
              'resource-exhausted',
              'Event capacity was reached before complimentary passes could be allocated.'
            );
          }

          transaction.update(eventRef, {
            'capacity.confirmedCount': confirmedCount + passes,
            'capacity.registeredCount': Math.max(registeredCount, confirmedCount + passes),
            updatedAt: nowIso,
          });

          // Create an associated order for complimentary passes fulfillment
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

          // Create attendee docs under orderRef.collection('attendees')
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

          // Enqueue ticket fulfillment job
          const ticketJobRef = db.collection('ticketJobs').doc(donorOrderId);
          ticketJobId = donorOrderId;
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

        transaction.update(entityRef, {
          paymentStatus: PaymentStatuses.VERIFIED,
          donationStatus: DonationStatuses.VERIFIED,
          complimentaryPassesCount: passes,
          updatedAt: nowIso,
        });

        // Enqueue thank you email job for verified donor
        const emailJobRef = db.collection('emailJobs').doc();
        transaction.set(emailJobRef, {
          id: emailJobRef.id,
          audience: 'DONOR',
          entityType: 'DONATION',
          entityId,
          templateKey: 'DONATION_THANK_YOU',
          recipientEmail: entityData.donor?.email || '',
          recipientName: entityData.donor?.fullName || 'Valued Donor',
          priority: 'HIGH',
          status: 'QUEUED',
          attempts: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // Record in paymentApprovals collection
      const approvalRef = db.collection('paymentApprovals').doc();
      transaction.set(approvalRef, {
        id: approvalRef.id,
        paymentId,
        entityType,
        entityId,
        decision: 'APPROVE',
        actor,
        source,
        reason: reason || null,
        notes: notes || null,
        createdAt: nowIso,
      });

      // Immutable Audit Log
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        actor,
        action: 'PAYMENT_APPROVED',
        entityType: 'PAYMENT_SESSION',
        entityId: paymentId,
        timestamp: nowIso,
        details: {
          entityType,
          entityId,
          source,
          amountPaise: session.amountPaise,
          ticketJobCreated: !!ticketJobId,
        },
      });

      return {
        success: true,
        paymentId,
        entityType,
        entityId,
        decision: 'APPROVE',
        newPaymentStatus: PaymentStatuses.VERIFIED,
        ticketJobId,
        message: `Payment ${paymentId} successfully verified by ${actor}.`,
      };
    } else if (decision === 'REJECT') {
      // Transition payment to REJECTED
      transaction.update(sessionRef, {
        status: PaymentStatuses.REJECTED,
        verification: {
          method: source === 'SLACK' ? 'SLACK_MANUAL' : 'ADMIN_MANUAL',
          decision: 'REJECT',
          verifiedBy: actor,
          verifiedAt: nowIso,
          reason: reason || 'Bank transaction could not be reconciled',
          notes: notes || null,
        },
        updatedAt: nowIso,
      });

      // Release UTR lock if one exists so user or re-submission can use correct ref
      if (session.normalizedUtr) {
        const utrRef = db.collection('paymentReferences').doc(session.normalizedUtr);
        transaction.delete(utrRef);
      }

      if (entityType === 'ORDER') {
        transaction.update(entityRef, {
          paymentStatus: PaymentStatuses.REJECTED,
          orderStatus: OrderStatuses.REJECTED,
          updatedAt: nowIso,
        });
      } else if (entityType === 'DONATION') {
        transaction.update(entityRef, {
          paymentStatus: PaymentStatuses.REJECTED,
          updatedAt: nowIso,
        });
      }

      // Record in paymentApprovals collection
      const approvalRef = db.collection('paymentApprovals').doc();
      transaction.set(approvalRef, {
        id: approvalRef.id,
        paymentId,
        entityType,
        entityId,
        decision: 'REJECT',
        actor,
        source,
        reason: reason || 'Bank transaction could not be reconciled',
        notes: notes || null,
        createdAt: nowIso,
      });

      // Enqueue rejection email job to notify customer
      const customerEmail = entityData.buyer?.email || entityData.donor?.email || '';
      const customerName = entityData.buyer?.fullName || entityData.donor?.fullName || 'Valued Participant';
      if (customerEmail) {
        const rejectionEmailRef = db.collection('emailJobs').doc();
        transaction.set(rejectionEmailRef, {
          id: rejectionEmailRef.id,
          audience: entityType === 'ORDER' ? 'BUYER' : 'DONOR',
          entityType,
          entityId,
          templateKey: 'PAYMENT_REJECTED',
          recipientEmail: customerEmail,
          recipientName: customerName,
          priority: 'HIGH',
          status: 'QUEUED',
          attempts: 0,
          reason: reason || 'Bank transaction could not be reconciled with payment proof',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // Immutable Audit Log
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        actor,
        action: 'PAYMENT_REJECTED',
        entityType: 'PAYMENT_SESSION',
        entityId: paymentId,
        timestamp: nowIso,
        details: {
          entityType,
          entityId,
          source,
          reason,
        },
      });

      return {
        success: true,
        paymentId,
        entityType,
        entityId,
        decision: 'REJECT',
        newPaymentStatus: PaymentStatuses.REJECTED,
        message: `Payment ${paymentId} rejected by ${actor}.`,
      };
    } else {
      // REVIEW decision
      transaction.update(sessionRef, {
        status: PaymentStatuses.REVIEW_REQUIRED,
        updatedAt: nowIso,
        notes: notes || 'Flagged for financial review',
      });

      if (entityType === 'ORDER') {
        transaction.update(entityRef, {
          orderStatus: OrderStatuses.REVIEW_REQUIRED,
          updatedAt: nowIso,
        });
      }

      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        actor,
        action: 'PAYMENT_FLAGGED_FOR_REVIEW',
        entityType: 'PAYMENT_SESSION',
        entityId: paymentId,
        timestamp: nowIso,
        details: { entityType, entityId, notes },
      });

      return {
        success: true,
        paymentId,
        entityType,
        entityId,
        decision: 'REVIEW',
        newPaymentStatus: PaymentStatuses.REVIEW_REQUIRED,
        message: `Payment ${paymentId} flagged for review by ${actor}.`,
      };
    }
  });
}
