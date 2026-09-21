import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../config/firebase.js';
import {
  PaymentStatuses,
  OrderStatuses,
  TicketStatuses,
  type Order,
  type TicketJob,
} from '@pip/shared';
import {
  issueKonfHubPasses,
  type KonfHubAttendee,
} from '../integrations/konfhub/konfhubAdapter.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';
import { konfHubSecrets } from '../config/secrets.js';
import {
  notifySlackTicketIssued,
  notifySlackTicketFailed,
} from '../integrations/slack/slackNotifier.js';

async function ensureTicketEmailJobs(
  order: Order,
  attendees: KonfHubAttendee[],
  nowIso: string,
  result?: import('../integrations/konfhub/konfhubAdapter.js').IssuePassesResult
): Promise<void> {
  const recipients =
    order.type === 'SINGLE'
      ? [
          {
            id: order.id,
            name: order.buyer.fullName,
            email: order.buyer.email,
            audience: 'SINGLE_ATTENDEE',
          },
        ]
      : [
          {
            id: 'organiser',
            name: order.buyer.fullName,
            email: order.buyer.email,
            audience: 'BULK_ORGANISER',
          },
          ...attendees.map((attendee) => ({
            id: attendee.id || attendee.email,
            name: attendee.fullName,
            email: attendee.email,
            audience: 'BULK_ATTENDEE',
          })),
        ];

  for (let start = 0; start < recipients.length; start += 200) {
    const chunk = recipients.slice(start, start + 200);
    const refs = chunk.map((recipient) =>
      db.collection('emailJobs').doc(`ticket-${order.id}-${recipient.id}`)
    );
    const existing = await db.getAll(...refs);
    const batch = db.batch();
    existing.forEach((snapshot, index) => {
      if (snapshot.exists) return;
      const recipient = chunk[index]!;
      const detail = result?.ticketDetails.find(
        (d) =>
          d.email.toLowerCase() === recipient.email.toLowerCase() ||
          (recipient.id && d.attendeeId === recipient.id)
      );
      const ticketPdfUrl =
        detail?.ticketPdfUrl ||
        (order.type === 'BULK' ? result?.ticketZipUrl : result?.ticketDetails[0]?.ticketPdfUrl) ||
        null;
      const registrationId =
        detail?.registrationId || result?.ticketDetails[0]?.registrationId || null;

      batch.set(snapshot.ref, {
        id: snapshot.id,
        audience: recipient.audience,
        entityType: 'ORDER',
        entityId: order.id,
        templateKey: 'TICKET_ISSUED',
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        priority: 'HIGH',
        status: 'QUEUED',
        attempts: 0,
        registrationId,
        ticketPdfUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });
    await batch.commit();
  }
}

/**
 * Executes ticket fulfilment for a given ticketJob ID.
 * Follows all authoritative invariants:
 * - Payment MUST be verified before issuing
 * - Payment status is NEVER un-verified even if KonfHub fails
 * - Batched 20-per-call chunking
 */
export async function processTicketJob(
  jobId: string
): Promise<{ success: boolean; message: string }> {
  const jobRef = db.collection('ticketJobs').doc(jobId);
  const nowIso = new Date().toISOString();
  const leaseExpiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // Claim the job before contacting KonfHub so trigger/admin/scheduled workers cannot overlap.
  const claim = await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    if (!jobDoc.exists) throw new Error(`Ticket job ${jobId} does not exist.`);
    const job = jobDoc.data() as TicketJob;
    if (job.status === TicketStatuses.ISSUED) return { job, alreadyIssued: true, busy: false };
    if (
      job.status === TicketStatuses.ISSUING &&
      job.leaseExpiresAt &&
      Date.parse(job.leaseExpiresAt) > Date.now()
    ) {
      return { job, alreadyIssued: false, busy: true };
    }

    transaction.update(jobRef, {
      status: TicketStatuses.ISSUING,
      leaseExpiresAt,
      updatedAt: nowIso,
    });
    return { job, alreadyIssued: false, busy: false };
  });

  if (claim.alreadyIssued) {
    return { success: true, message: `Ticket job ${jobId} already completed.` };
  }
  if (claim.busy) {
    return { success: false, message: `Ticket job ${jobId} is already being processed.` };
  }
  const job = claim.job;

  // 1. Load Order
  const orderRef = db.collection('orders').doc(job.orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    await jobRef.update({
      status: TicketStatuses.FAILED,
      lastError: `Associated order ${job.orderId} not found.`,
      updatedAt: nowIso,
    });
    return { success: false, message: `Order ${job.orderId} not found.` };
  }

  const order = orderDoc.data() as Order;

  // Authoritative Invariant: Verify payment status
  if (order.paymentStatus !== PaymentStatuses.VERIFIED) {
    console.warn(`[TicketWorker] Refusing to issue tickets for unverified order ${job.orderId}`);
    await jobRef.update({
      status: TicketStatuses.FAILED,
      lastError: `Cannot issue tickets for unverified order (current status: ${order.paymentStatus}).`,
      updatedAt: nowIso,
    });
    return { success: false, message: `Order payment not verified.` };
  }

  // 2. Fetch Attendees
  const attendeesSnapshot = await orderRef.collection('attendees').get();
  let allAttendees: KonfHubAttendee[] = [];

  if (!attendeesSnapshot.empty) {
    allAttendees = attendeesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        fullName: data.fullName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        whatsappNumber: data.whatsappNumber,
        clubName: data.clubName,
        organisationName: order.organisationName,
      };
    });
  } else {
    // Single order fallback: primary buyer is attendee
    allAttendees = [
      {
        id: order.id,
        fullName: order.buyer.fullName,
        email: order.buyer.email,
        mobileNumber: order.buyer.mobileNumber,
        whatsappNumber: order.buyer.whatsappNumber,
        clubName: (order as any).clubName || null,
        organisationName: order.organisationName,
      },
    ];
  }

  const fulfilledIds = new Set(job.fulfilledAttendeeIds || []);
  const attendeesToFulfill = allAttendees.filter(
    (attendee) => attendee.id && !fulfilledIds.has(attendee.id)
  );

  if (attendeesToFulfill.length === 0) {
    await ensureTicketEmailJobs(order, allAttendees, nowIso);
    const completionBatch = db.batch();
    completionBatch.update(jobRef, {
      status: TicketStatuses.ISSUED,
      ticketEmailEnqueued: true,
      leaseExpiresAt: null,
      lastError: null,
      updatedAt: nowIso,
    });
    completionBatch.update(orderRef, {
      orderStatus: OrderStatuses.CONFIRMED,
      fulfilmentStatus: 'FULFILLED',
      ticketCount: allAttendees.length,
      updatedAt: nowIso,
    });
    await completionBatch.commit();
    return {
      success: true,
      message: `All tickets for ${order.publicReference} were already issued.`,
    };
  }

  console.log(
    `[TicketWorker] Fulfilling passes for order ${order.publicReference} (${attendeesToFulfill.length} attendees)`
  );

  // 3. Invoke KonfHub Adapter
  let result;
  try {
    result = await issueKonfHubPasses({
      orderType: order.type,
      attendees: attendeesToFulfill,
      organisationName: order.organisationName,
      onChunkIssued: async (attendeeIds, details) => {
        attendeeIds.forEach((id) => fulfilledIds.add(id));
        await jobRef.update({
          status: TicketStatuses.ISSUING,
          fulfilledAttendeeIds: [...fulfilledIds],
          lastCompletedChunk: details,
          leaseExpiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected KonfHub error';
    await jobRef.update({
      status: TicketStatuses.REVIEW_REQUIRED,
      attempts: (job.attempts || 0) + 1,
      leaseExpiresAt: null,
      lastError: message,
      updatedAt: nowIso,
    });
    return {
      success: false,
      message: `KonfHub fulfilment requires review: ${message}`,
    };
  }

  const nextAttempts = (job.attempts || 0) + 1;
  const newlyFulfilledIds = result.ticketDetails.flatMap((detail) =>
    detail.attendeeId ? [detail.attendeeId] : []
  );
  newlyFulfilledIds.forEach((id) => fulfilledIds.add(id));
  const allFulfilled = allAttendees.every(
    (attendee) => attendee.id && fulfilledIds.has(attendee.id)
  );

  if (allFulfilled) {
    // Checkpoint provider results first so a crash can resume without reissuing passes.
    await jobRef.update({
      status: TicketStatuses.ISSUING,
      attempts: nextAttempts,
      fulfilledAttendeeIds: [...fulfilledIds],
      providerResult: {
        ...result,
        previouslyFulfilledCount: (job.fulfilledAttendeeIds || []).length,
      },
      updatedAt: nowIso,
    });

    // Update individual attendees
    const batch = db.batch();
    attendeesSnapshot.docs.forEach((doc) => {
      if (fulfilledIds.has(doc.id)) {
        const detail = result.ticketDetails.find(
          (d) =>
            d.attendeeId === doc.id ||
            d.email.toLowerCase() === doc.data().email?.toLowerCase()
        );
        batch.update(doc.ref, {
          ticketStatus: TicketStatuses.ISSUED,
          ...(detail?.registrationId ? { registrationId: detail.registrationId } : {}),
          ...(detail?.ticketPdfUrl ? { ticketPdfUrl: detail.ticketPdfUrl } : {}),
          updatedAt: nowIso,
        });
      }
    });
    await batch.commit();

    // Complete the job/order and enqueue exactly one delivery email atomically.
    await ensureTicketEmailJobs(order, allAttendees, nowIso, result);
    const completionBatch = db.batch();
    completionBatch.update(jobRef, {
      status: TicketStatuses.ISSUED,
      ticketEmailEnqueued: true,
      attempts: nextAttempts,
      fulfilledAttendeeIds: [...fulfilledIds],
      providerResult: {
        ...result,
        previouslyFulfilledCount: (job.fulfilledAttendeeIds || []).length,
      },
      leaseExpiresAt: null,
      lastError: null,
      updatedAt: nowIso,
    });
    completionBatch.update(orderRef, {
      orderStatus: OrderStatuses.CONFIRMED,
      fulfilmentStatus: 'FULFILLED',
      ticketCount: allAttendees.length,
      ...(result.ticketDetails[0]?.ticketPdfUrl
        ? { ticketPdfUrl: result.ticketDetails[0].ticketPdfUrl }
        : {}),
      ...(result.ticketZipUrl ? { ticketZipUrl: result.ticketZipUrl } : {}),
      updatedAt: nowIso,
    });
    await completionBatch.commit();

    // Post real-time ticket confirmation to Slack channel
    try {
      await notifySlackTicketIssued({
        orderReference: order.publicReference,
        buyerName: order.buyer.fullName,
        buyerEmail: order.buyer.email,
        ticketCount: allAttendees.length,
        registrationId: result.ticketDetails[0]?.registrationId || null,
      });
    } catch (slackErr) {
      console.warn('[TicketWorker] Slack ticket confirmation warning (non-blocking):', slackErr);
    }

    return {
      success: true,
      message: `Successfully issued ${allAttendees.length} KonfHub passes for ${order.publicReference}.`,
    };
  } else {
    // Preserve completed attendees. Ambiguous timeouts require human reconciliation before retry.
    const isMaxAttempts = nextAttempts >= (job.maxAttempts || 5);
    const hasAmbiguousFailure = result.errors.some((error) => error.ambiguous);
    const newStatus = hasAmbiguousFailure
      ? TicketStatuses.REVIEW_REQUIRED
      : isMaxAttempts
        ? TicketStatuses.FAILED
        : TicketStatuses.RETRYING;

    // Persist successful attendee IDs before secondary writes so retries never resubmit them.
    await jobRef.update({
      status: newStatus,
      attempts: nextAttempts,
      fulfilledAttendeeIds: [...fulfilledIds],
      providerResult: {
        ...result,
        previouslyFulfilledCount: (job.fulfilledAttendeeIds || []).length,
      },
      lastError: JSON.stringify(result.errors),
      leaseExpiresAt: null,
      updatedAt: nowIso,
    });

    const attendeeBatch = db.batch();
    attendeesSnapshot.docs.forEach((doc) => {
      if (newlyFulfilledIds.includes(doc.id)) {
        attendeeBatch.update(doc.ref, {
          ticketStatus: TicketStatuses.ISSUED,
          updatedAt: nowIso,
        });
      }
    });
    await attendeeBatch.commit();

    await orderRef.update({
      fulfilmentStatus: fulfilledIds.size > 0 ? 'PARTIAL' : 'PENDING',
      ticketCount: fulfilledIds.size,
      updatedAt: nowIso,
    });

    console.error(
      `[TicketWorker] KonfHub issuance failed for ${order.publicReference} (attempt ${nextAttempts}/${job.maxAttempts || 5}). Payment remains VERIFIED.`
    );

    // Notify Slack channel of fulfilment issue
    try {
      await notifySlackTicketFailed({
        orderReference: order.publicReference,
        buyerName: order.buyer.fullName,
        buyerEmail: order.buyer.email,
        ticketCount: allAttendees.length,
        error: result.errors[0]?.error ? String(result.errors[0].error) : 'KonfHub pass issuance encountered an issue',
      });
    } catch (slackErr) {
      console.warn('[TicketWorker] Slack ticket failure alert warning (non-blocking):', slackErr);
    }

    return {
      success: false,
      message: `KonfHub ticketing failed for ${order.publicReference}. Status set to ${newStatus}.`,
    };
  }
}

/**
 * Event-driven Cloud Function triggered on ticketJobs creation.
 */
export const onTicketJobCreated = onDocumentCreated(
  {
    document: 'ticketJobs/{jobId}',
    region: 'asia-south1',
    secrets: konfHubSecrets,
  },
  async (event) => {
    const jobId = event.params.jobId;
    console.log(`[TicketWorker] Received ticket creation event for job ${jobId}`);
    try {
      await processTicketJob(jobId);
    } catch (err) {
      console.error(`[TicketWorker] Unhandled error processing ticket job ${jobId}:`, err);
    }
  }
);

export const retryTicketJobs = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    maxInstances: 1,
    secrets: konfHubSecrets,
  },
  async () => {
    const retrySnapshot = await db
      .collection('ticketJobs')
      .where('status', '==', TicketStatuses.RETRYING)
      .limit(20)
      .get();

    for (const jobDoc of retrySnapshot.docs) {
      const job = jobDoc.data() as TicketJob;
      if ((job.attempts || 0) < (job.maxAttempts || 5)) {
        await processTicketJob(jobDoc.id);
      }
    }

    // A worker that dies after contacting KonfHub is ambiguous. Never auto-replay it.
    const issuingSnapshot = await db
      .collection('ticketJobs')
      .where('status', '==', TicketStatuses.ISSUING)
      .limit(20)
      .get();
    const now = Date.now();
    for (const jobDoc of issuingSnapshot.docs) {
      const job = jobDoc.data() as TicketJob;
      if (!job.leaseExpiresAt || Date.parse(job.leaseExpiresAt) <= now) {
        await jobDoc.ref.update({
          status: TicketStatuses.REVIEW_REQUIRED,
          lastError:
            'Worker lease expired during provider fulfilment. Reconcile KonfHub before retrying.',
          leaseExpiresAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
);

/**
 * Admin callable to manually trigger or retry a ticket fulfilment job.
 */
export const adminRetryTicket = onCall(
  {
    region: 'asia-south1',
    cors: true,
    secrets: konfHubSecrets,
  },
  async (request) => {
    await requireAdminRole(request, ['SUPER_ADMIN', 'TICKET_ADMIN']);
    const jobId = request.data?.jobId || request.data?.ticketJobId;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required to retry ticket fulfilment.');
    }

    try {
      const res = await processTicketJob(jobId);
      return res;
    } catch (err: any) {
      console.error(`[Admin Retry Ticket] Error retrying job ${jobId}:`, err);
      throw new HttpsError('internal', err?.message || 'Failed to retry ticket job.');
    }
  }
);
