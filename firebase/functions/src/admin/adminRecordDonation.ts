import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import {
  DEFAULT_EVENT_CODE,
  REFERENCE_PREFIXES,
  PaymentStatuses,
  DonationStatuses,
  OrderStatuses,
  TicketStatuses,
  getDonationComplimentaryPasses,
  type Donation,
  type Order,
} from '@pip/shared';
import { generateReference, generateStatusToken } from '../utils/reference.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';
import { processEmailJob } from '../communications/emailWorker.js';
import { BREVO_API_KEY } from '../config/secrets.js';

const recordDonationSchema = z.object({
  fullName: z.string().trim().min(2, 'Full Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().email('Valid email address is required'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  amountRupees: z.number().min(1, 'Amount must be at least ₹1'),
  paymentMethod: z.enum(['CASH', 'DIRECT_UPI', 'BANK_TRANSFER']).default('DIRECT_UPI'),
  referenceOrNotes: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .refine((val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: 'Invalid PAN format (e.g. ABCDE1234F)',
    })
    .transform((v) => (v ? v : null)),
  organisationName: z.string().trim().max(150).optional().nullable().transform((v) => (v ? v : null)),
  sendThankYouEmail: z.boolean().default(true),
  allocatePasses: z.boolean().default(true),
});

/**
 * Super Admin / Finance Admin callable to record offline donations (Cash, Direct UPI, Bank Transfer)
 * and trigger immediate Thank You emails and optional complimentary passes.
 */
export const adminRecordDonation = onCall(
  {
    region: 'asia-south1',
    cors: true,
    secrets: [BREVO_API_KEY],
  },
  async (request) => {
    const admin = await requireAdminRole(request, [
      'SUPER_ADMIN',
      'PAYMENT_APPROVER',
      'REGISTRATION_ADMIN',
    ]);

    const parsed = recordDonationSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        'invalid-argument',
        parsed.error.issues[0]?.message || 'Invalid donation parameters'
      );
    }

    const {
      fullName,
      email,
      mobileNumber,
      amountRupees,
      paymentMethod,
      referenceOrNotes,
      pan,
      organisationName,
      sendThankYouEmail,
      allocatePasses,
    } = parsed.data;

    const db = getFirestore();
    const nowIso = new Date().toISOString();
    const amountPaise = Math.round(amountRupees * 100);
    const passes = allocatePasses ? getDonationComplimentaryPasses(amountPaise) : 0;
    const publicReference = generateReference(REFERENCE_PREFIXES.DONATION);
    const statusToken = generateStatusToken();

    const donationRef = db.collection('donations').doc();
    const donationId = donationRef.id;
    const sessionRef = db.collection('paymentSessions').doc();
    const sessionId = sessionRef.id;
    const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
    const auditRef = db.collection('auditLogs').doc();
    const approvalRef = db.collection('paymentApprovals').doc();

    let emailJobId: string | null = null;

    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new HttpsError('not-found', 'Event configuration not found.');
      }

      // Check capacity if passes are to be allocated
      if (passes > 0) {
        const confirmedCount = Number(eventDoc.data()?.capacity?.confirmedCount || 0);
        const registeredCount = Number(
          eventDoc.data()?.capacity?.registeredCount || confirmedCount
        );
        const totalCapacity = Number(eventDoc.data()?.capacity?.total || 0);
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

        // Create associated order for complimentary passes
        const donorOrderId = `DONOR_${donationId}`;
        const orderRef = db.collection('orders').doc(donorOrderId);
        const orderData: Order = {
          id: donorOrderId,
          publicReference: `${publicReference}-TKT`,
          statusToken,
          type: passes > 1 ? 'BULK' : 'SINGLE',
          buyer: {
            fullName,
            email,
            mobileNumber: mobileNumber || '0000000000',
            whatsappNumber: mobileNumber || null,
          },
          organisationName: organisationName || null,
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

        // Create attendee docs
        for (let i = 1; i <= passes; i++) {
          const attRef = orderRef.collection('attendees').doc(`pass_${i}`);
          const attendeeName = i === 1 ? fullName : `${fullName} - Guest ${i}`;
          transaction.set(
            attRef,
            {
              id: `pass_${i}`,
              orderId: donorOrderId,
              fullName: attendeeName,
              email,
              mobileNumber: mobileNumber || '0000000000',
              whatsappNumber: mobileNumber || null,
              organisationName: organisationName || null,
              ticketStatus: TicketStatuses.QUEUED,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }

        // Enqueue ticket job
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

      // Create Donation document
      const donationData: Donation = {
        id: donationId,
        publicReference,
        statusToken,
        donor: {
          fullName,
          email,
          mobileNumber: mobileNumber || '0000000000',
          whatsappNumber: mobileNumber || null,
        },
        organisationName: organisationName || null,
        amountPaise,
        currency: 'INR',
        pan: pan || null,
        isAnonymousPublicly: false,
        complimentaryPassesCount: passes,
        paymentStatus: PaymentStatuses.VERIFIED,
        donationStatus: DonationStatuses.VERIFIED,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      (donationData as any).paymentMethod = paymentMethod;
      (donationData as any).paymentSessionId = sessionId;
      (donationData as any).recordedBy = `ADMIN:${admin.email}`;
      (donationData as any).referenceOrNotes = referenceOrNotes || null;

      transaction.set(donationRef, donationData);

      // Create PaymentSession document
      transaction.set(sessionRef, {
        id: sessionId,
        merchantReference: `OFFLINE-${donationId.slice(0, 8).toUpperCase()}`,
        entityType: 'DONATION',
        entityId: donationId,
        entityReference: publicReference,
        method: paymentMethod,
        amountPaise,
        currency: 'INR',
        status: PaymentStatuses.VERIFIED,
        evidence: {
          source: 'ADMIN_MANUAL_ENTRY',
          transactionReference: referenceOrNotes || `${paymentMethod}_ENTRY`,
          notes: referenceOrNotes || null,
          submittedAt: nowIso,
        },
        verification: {
          method: 'ADMIN_MANUAL',
          decision: 'APPROVE',
          verifiedBy: `ADMIN:${admin.email}`,
          verifiedAt: nowIso,
          notes: `Recorded as offline ${paymentMethod} by ${admin.email}`,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // Create Payment Approval record
      transaction.set(approvalRef, {
        id: approvalRef.id,
        paymentId: sessionId,
        entityType: 'DONATION',
        entityId: donationId,
        decision: 'APPROVE',
        actor: `ADMIN:${admin.email}`,
        source: 'ADMIN_DASHBOARD',
        notes: `Offline ${paymentMethod} donation entry`,
        createdAt: nowIso,
      });

      // Audit Log
      transaction.set(auditRef, {
        id: auditRef.id,
        actor: `ADMIN:${admin.email}`,
        actorUid: admin.uid,
        action: 'RECORD_OFFLINE_DONATION',
        entityType: 'DONATION',
        entityId: donationId,
        timestamp: nowIso,
        details: {
          publicReference,
          amountRupees,
          amountPaise,
          paymentMethod,
          donorName: fullName,
          donorEmail: email,
          passes,
          sendThankYouEmail,
        },
      });

      // Enqueue Thank You Email
      if (sendThankYouEmail) {
        const emailRef = db.collection('emailJobs').doc();
        emailJobId = emailRef.id;
        transaction.set(emailRef, {
          id: emailRef.id,
          audience: 'DONOR',
          entityType: 'DONATION',
          entityId: donationId,
          templateKey: 'DONATION_THANK_YOU',
          recipientEmail: email,
          recipientName: fullName,
          priority: 'HIGH',
          status: 'QUEUED',
          attempts: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // If email was enqueued, trigger processing immediately
    let emailSent = false;
    if (emailJobId) {
      try {
        const sendResult = await processEmailJob(emailJobId);
        emailSent = sendResult.success;
      } catch (emailErr) {
        console.warn(`[adminRecordDonation] Immediate email dispatch warning:`, emailErr);
      }
    }

    return {
      success: true,
      donationId,
      publicReference,
      amountFormatted: `₹${amountRupees.toLocaleString('en-IN')}`,
      complimentaryPassesCount: passes,
      emailSent,
      message: `Donation recorded successfully (${publicReference})${emailSent ? ' and thank-you email sent.' : '.'}`,
    };
  }
);
