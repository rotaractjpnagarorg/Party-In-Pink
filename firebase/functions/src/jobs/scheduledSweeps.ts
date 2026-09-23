import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { StructuredLogger } from '../middleware/correlationId.js';
import { DEFAULT_EVENT_CODE } from '@pip/shared';

const logger = new StructuredLogger({ operation: 'scheduledSweeps' });

/**
 * Sweeps expired payment sessions older than their expiration window.
 * Runs every 15 minutes.
 */
export const expireStalePaymentSessions = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    maxInstances: 1,
  },
  async () => {
    const db = getFirestore();
    const nowIso = new Date().toISOString();
    logger.info('Starting expireStalePaymentSessions sweep', { timestamp: nowIso });

    try {
      const snapshot = await db
        .collection('paymentSessions')
        .where('status', 'in', ['CREATED', 'AWAITING_PAYMENT'])
        .where('expiresAt', '<=', nowIso)
        .limit(500)
        .get();

      if (snapshot.empty) {
        logger.info('No expired payment sessions found.');
      }

      logger.info(`Found ${snapshot.size} expired payment sessions to mark as EXPIRED.`);

      let expiredSessionCount = 0;
      for (const sessionSnapshot of snapshot.docs) {
        await db.runTransaction(async (transaction) => {
          const freshSession = await transaction.get(sessionSnapshot.ref);
          if (!freshSession.exists) return;
          const session = freshSession.data()!;
          if (
            !['CREATED', 'AWAITING_PAYMENT'].includes(session.status) ||
            !session.expiresAt ||
            session.expiresAt > nowIso
          )
            return;
          transaction.update(sessionSnapshot.ref, {
            status: 'EXPIRED',
            expiredAt: nowIso,
            updatedAt: nowIso,
          });
          expiredSessionCount += 1;
        });
      }
      logger.info(`Successfully expired ${expiredSessionCount} payment sessions.`);

      // Expire registrations that never reached payment submission.
      const expiredOrders = await db
        .collection('orders')
        .where('orderStatus', 'in', ['DRAFT', 'AWAITING_PAYMENT', 'REJECTED'])
        .where('reservationExpiresAt', '<=', nowIso)
        .limit(500)
        .get();
      for (const orderSnapshot of expiredOrders.docs) {
        await db.runTransaction(async (transaction) => {
          const orderRef = orderSnapshot.ref;
          const eventRef = db.collection('events').doc(DEFAULT_EVENT_CODE);
          const [orderDoc, eventDoc] = await Promise.all([
            transaction.get(orderRef),
            transaction.get(eventRef),
          ]);
          if (!orderDoc.exists) return;
          const order = orderDoc.data()!;
          if (
            order.capacityReleasedAt ||
            !['DRAFT', 'AWAITING_PAYMENT', 'REJECTED'].includes(order.orderStatus) ||
            !order.reservationExpiresAt ||
            order.reservationExpiresAt > nowIso
          )
            return;
          if (!eventDoc.exists) {
            throw new Error('Event configuration missing while releasing capacity.');
          }
          const participantCount = Number(order.participantCount || 1);
          const registeredCount = Number(eventDoc.data()?.capacity?.registeredCount || 0);
          const confirmedCount = Number(eventDoc.data()?.capacity?.confirmedCount || 0);
          transaction.update(orderRef, {
            orderStatus: 'CANCELLED',
            paymentStatus: 'EXPIRED',
            capacityReleasedAt: nowIso,
            updatedAt: nowIso,
          });
          transaction.update(eventRef, {
            'capacity.registeredCount': Math.max(
              confirmedCount,
              registeredCount - participantCount
            ),
            updatedAt: nowIso,
          });
        });
      }
      logger.info(`Expired ${expiredOrders.size} abandoned registration reservations.`);

      const expiredRateLimits = await db
        .collection('publicRateLimits')
        .where('expiresAt', '<=', nowIso)
        .limit(400)
        .get();
      if (!expiredRateLimits.empty) {
        const cleanupBatch = db.batch();
        expiredRateLimits.docs.forEach((snapshot) => cleanupBatch.delete(snapshot.ref));
        await cleanupBatch.commit();
      }
      logger.info(`Deleted ${expiredRateLimits.size} expired public rate-limit buckets.`);
    } catch (err) {
      logger.error('Error during expireStalePaymentSessions sweep', err);
    }
  }
);

/**
 * Daily operational metrics summary logger.
 * Runs daily at midnight IST.
 */
export const dailySummaryJob = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    maxInstances: 1,
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startIso = oneDayAgo.toISOString();

    logger.info('Starting dailySummaryJob metric rollup', { windowStart: oneDayAgo.toISOString() });

    try {
      // 1. Orders verified in last 24 hours
      const verifiedOrdersSnap = await db
        .collection('orders')
        .where('paymentStatus', '==', 'VERIFIED')
        .where('updatedAt', '>=', startIso)
        .limit(5000)
        .get();

      let totalPaise = 0;
      let totalAttendees = 0;
      verifiedOrdersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        totalPaise += Number(data.totalAmountPaise || 0);
        totalAttendees += Number(data.participantCount || 1);
      });

      // 2. Donations in last 24 hours
      const verifiedDonationsSnap = await db
        .collection('donations')
        .where('paymentStatus', '==', 'VERIFIED')
        .where('updatedAt', '>=', startIso)
        .limit(5000)
        .get();

      let totalDonationPaise = 0;
      verifiedDonationsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        totalDonationPaise += Number(data.amountPaise || 0);
      });

      // 3. Pending payment approvals
      const pendingApprovalsSnap = await db
        .collection('paymentSessions')
        .where('status', 'in', ['PAYMENT_SUBMITTED', 'VERIFYING'])
        .limit(5000)
        .get();

      const summary = {
        windowEnd: now.toISOString(),
        windowStart: oneDayAgo.toISOString(),
        verifiedOrdersCount: verifiedOrdersSnap.size,
        verifiedAttendeesCount: totalAttendees,
        verifiedOrdersRevenueINR: totalPaise / 100,
        verifiedDonationsCount: verifiedDonationsSnap.size,
        verifiedDonationsAmountINR: totalDonationPaise / 100,
        pendingApprovalsQueueLength: pendingApprovalsSnap.size,
      };

      logger.audit('Daily Operational Summary Metrics', summary);

      // Save summary doc for historical dashboard tracking
      const dateKey = now.toISOString().split('T')[0] || 'unknown-date';
      await db
        .collection('dailySummaries')
        .doc(dateKey)
        .set({
          ...summary,
          createdAt: Timestamp.now(),
        });
    } catch (err) {
      logger.error('Error executing dailySummaryJob', err);
    }
  }
);
