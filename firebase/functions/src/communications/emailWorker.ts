import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { sendTransactionalEmail } from '../integrations/brevo/brevoAdapter.js';
import { renderEmail, type EmailTemplateData } from './emailTemplates.js';
import { BREVO_API_KEY, PUBLIC_WEB_URL } from '../config/secrets.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

export interface EmailJobDocument {
  id: string;
  audience: 'SINGLE_ATTENDEE' | 'BULK_ORGANISER' | 'BULK_ATTENDEE' | 'DONOR';
  entityType: 'ORDER' | 'DONATION';
  entityId: string;
  templateKey: 'TICKET_ISSUED' | 'PAYMENT_SUBMITTED' | 'DONATION_THANK_YOU';
  recipientEmail: string;
  recipientName: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'RETRYING' | 'FAILED';
  attempts?: number;
  maxAttempts?: number;
  providerMessageId?: string | null;
  lastError?: string | null;
  nextAttemptAt?: string | null;
  leaseExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function retryDelayMs(attempt: number): number {
  return Math.min(30 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

export async function processEmailJob(
  jobId: string
): Promise<{ success: boolean; message: string }> {
  const db = getFirestore();
  const jobRef = db.collection('emailJobs').doc(jobId);
  const now = new Date();
  const nowIso = now.toISOString();

  const claimedJob = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists) throw new Error(`Email job ${jobId} does not exist.`);
    const job = snapshot.data() as EmailJobDocument;
    if (job.status === 'SENT') return null;
    if (job.status !== 'QUEUED' && job.status !== 'RETRYING' && job.status !== 'SENDING')
      return null;
    if (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > now.getTime()) return null;
    if (
      job.status === 'SENDING' &&
      job.leaseExpiresAt &&
      Date.parse(job.leaseExpiresAt) > now.getTime()
    ) {
      return null;
    }
    transaction.update(jobRef, {
      status: 'SENDING',
      leaseExpiresAt: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
      updatedAt: nowIso,
    });
    return job;
  });

  if (!claimedJob)
    return { success: true, message: 'Email job does not currently require processing.' };
  const job = claimedJob;

  try {
    let reference = job.entityId;
    let amountFormatted: string | undefined;
    let ticketCount: number | undefined;
    let statusUrl: string | undefined;
    let pan: string | null = null;
    let utr: string | null = null;
    const baseUrl = PUBLIC_WEB_URL.value().replace(/\/$/, '');

    let registrationId: string | null = (job as any).registrationId || null;
    let ticketPdfUrl: string | null = (job as any).ticketPdfUrl || null;
    let bookingId: string | null = (job as any).bookingId || null;

    if (job.entityType === 'ORDER') {
      const orderSnap = await db.collection('orders').doc(job.entityId).get();
      if (!orderSnap.exists) throw new Error('Associated order was not found.');
      const order = orderSnap.data()!;
      reference = order.publicReference || job.entityId;
      if (order.totalAmountPaise) {
        amountFormatted = `₹${(order.totalAmountPaise / 100).toLocaleString('en-IN')}`;
      }
      ticketCount = order.participantCount || 1;
      if (order.statusToken) statusUrl = `${baseUrl}/status/${order.statusToken}`;
      if (!ticketPdfUrl && order.ticketPdfUrl) ticketPdfUrl = order.ticketPdfUrl;

      if (!registrationId || !bookingId) {
        const attSnap = await db
          .collection('attendees')
          .where('orderId', '==', job.entityId)
          .where('email', '==', job.recipientEmail)
          .limit(1)
          .get();
        if (!attSnap.empty) {
          const att = attSnap.docs[0]?.data();
          if (!registrationId) registrationId = att?.registrationId || att?.id || null;
          if (!bookingId) bookingId = att?.bookingId || null;
          if (!ticketPdfUrl && att?.ticketPdfUrl) ticketPdfUrl = att.ticketPdfUrl;
        } else {
          // fallback to first attendee
          const anyAttSnap = await db
            .collection('attendees')
            .where('orderId', '==', job.entityId)
            .limit(1)
            .get();
          if (!anyAttSnap.empty) {
            const att = anyAttSnap.docs[0]?.data();
            if (!registrationId) registrationId = att?.registrationId || att?.id || null;
            if (!bookingId) bookingId = att?.bookingId || null;
            if (!ticketPdfUrl && att?.ticketPdfUrl) ticketPdfUrl = att.ticketPdfUrl;
          }
        }
      }
    } else {
      const donationSnap = await db.collection('donations').doc(job.entityId).get();
      if (!donationSnap.exists) throw new Error('Associated donation was not found.');
      const donation = donationSnap.data()!;
      reference = donation.publicReference || job.entityId;
      if (donation.amountPaise) {
        amountFormatted = `₹${(donation.amountPaise / 100).toLocaleString('en-IN')}`;
      }
      ticketCount = donation.complimentaryPassesCount || 0;
      pan = donation.pan || null;
      if (donation.statusToken) statusUrl = `${baseUrl}/status/${donation.statusToken}`;
    }

    const sessionsSnap = await db
      .collection('paymentSessions')
      .where('entityId', '==', job.entityId)
      .limit(1)
      .get();
    if (!sessionsSnap.empty && sessionsSnap.docs[0]) {
      utr = sessionsSnap.docs[0].data().evidence?.transactionReference || null;
    }

    if (registrationId && registrationId.startsWith('KH-EXISTING')) {
      registrationId = reference;
    }

    const templateData: EmailTemplateData = {
      recipientName: job.recipientName || 'Valued Participant',
      reference,
      amountFormatted,
      ticketCount,
      statusUrl,
      pan,
      utr,
      registrationId,
      bookingId,
      ticketPdfUrl,
    };
    const { subject, html, text } = renderEmail(job.templateKey, templateData);

    const attachment =
      job.templateKey === 'TICKET_ISSUED' && ticketPdfUrl
        ? [{ url: ticketPdfUrl, name: `PartyInPink5_${reference}_Ticket.pdf` }]
        : undefined;

    const result = await sendTransactionalEmail({
      recipientEmail: job.recipientEmail,
      recipientName: job.recipientName || 'Participant',
      subject,
      htmlContent: html,
      textContent: text,
      tags: ['pip5', job.templateKey.toLowerCase()],
      idempotencyKey: `pip5-email-${jobId}`,
      attachment,
    });

    const nextAttempts = (job.attempts || 0) + 1;
    if (!result.success) throw new Error(result.error || 'Unknown Brevo error');

    const commRef = db.collection('communications').doc(`email-${jobId}`);
    const successBatch = db.batch();
    successBatch.update(jobRef, {
      status: 'SENT',
      attempts: nextAttempts,
      providerMessageId: result.messageId || null,
      lastError: null,
      nextAttemptAt: null,
      leaseExpiresAt: null,
      updatedAt: nowIso,
    });
    successBatch.set(
      commRef,
      {
        id: commRef.id,
        jobId,
        entityType: job.entityType,
        entityId: job.entityId,
        templateKey: job.templateKey,
        recipientEmail: job.recipientEmail,
        recipientName: job.recipientName,
        provider: 'BREVO',
        providerMessageId: result.messageId || null,
        status: 'SENT',
        subject,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );
    await successBatch.commit();
    return { success: true, message: `Email sent to ${job.recipientEmail}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected email worker failure';
    const nextAttempts = (job.attempts || 0) + 1;
    const maxAttempts = job.maxAttempts || 5;
    const failed = nextAttempts >= maxAttempts;
    await jobRef.update({
      status: failed ? 'FAILED' : 'RETRYING',
      attempts: nextAttempts,
      lastError: message,
      nextAttemptAt: failed
        ? null
        : new Date(Date.now() + retryDelayMs(nextAttempts)).toISOString(),
      leaseExpiresAt: null,
      updatedAt: new Date().toISOString(),
    });
    return { success: false, message };
  }
}

export const onEmailJobCreated = onDocumentCreated(
  {
    document: 'emailJobs/{jobId}',
    region: 'asia-south1',
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    if (event.data) await processEmailJob(event.params.jobId);
  }
);

export const retryEmailJobs = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    maxInstances: 1,
    secrets: [BREVO_API_KEY],
  },
  async () => {
    const jobs = getFirestore().collection('emailJobs');
    const [retrying, sending] = await Promise.all([
      jobs.where('status', '==', 'RETRYING').limit(50).get(),
      // processEmailJob transactionally ignores live leases and reclaims stale/missing ones.
      jobs.where('status', '==', 'SENDING').limit(50).get(),
    ]);
    for (const job of [...retrying.docs, ...sending.docs]) await processEmailJob(job.id);
  }
);

const retrySchema = z.object({ jobId: z.string().min(1) });

export const adminRetryEmail = onCall(
  { region: 'asia-south1', cors: true, secrets: [BREVO_API_KEY] },
  async (request) => {
    await requireAdminRole(request, ['SUPER_ADMIN', 'REGISTRATION_ADMIN']);
    const parsed = retrySchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Email job ID is required.');
    const jobRef = getFirestore().collection('emailJobs').doc(parsed.data.jobId);
    const job = await jobRef.get();
    if (!job.exists) throw new HttpsError('not-found', 'Email job not found.');
    await jobRef.update({
      status: 'RETRYING',
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      leaseExpiresAt: null,
      updatedAt: new Date().toISOString(),
    });
    return processEmailJob(parsed.data.jobId);
  }
);

const resendSchema = z.object({
  entityType: z.enum(['ORDER', 'DONATION']),
  entityId: z.string().min(1),
});

export const adminResendConfirmation = onCall(
  { region: 'asia-south1', cors: true, secrets: [BREVO_API_KEY] },
  async (request) => {
    await requireAdminRole(request, ['SUPER_ADMIN', 'REGISTRATION_ADMIN']);
    const parsed = resendSchema.safeParse(request.data);
    if (!parsed.success)
      throw new HttpsError('invalid-argument', 'Valid entity type and ID are required.');
    const { entityType, entityId } = parsed.data;
    const collectionName = entityType === 'ORDER' ? 'orders' : 'donations';
    const entityDoc = await getFirestore().collection(collectionName).doc(entityId).get();
    if (!entityDoc.exists) throw new HttpsError('not-found', `${entityType} not found.`);
    const entity = entityDoc.data()!;
    const recipient = entityType === 'ORDER' ? entity.buyer : entity.donor;
    const templateKey = entityType === 'ORDER' ? 'TICKET_ISSUED' : 'DONATION_THANK_YOU';
    const nowIso = new Date().toISOString();
    const jobRef = getFirestore().collection('emailJobs').doc();
    await jobRef.set({
      id: jobRef.id,
      audience:
        entityType === 'ORDER'
          ? entity.type === 'BULK'
            ? 'BULK_ORGANISER'
            : 'SINGLE_ATTENDEE'
          : 'DONOR',
      entityType,
      entityId,
      templateKey,
      recipientEmail: recipient.email,
      recipientName: recipient.fullName,
      priority: 'HIGH',
      status: 'QUEUED',
      attempts: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return { success: true, jobId: jobRef.id };
  }
);
