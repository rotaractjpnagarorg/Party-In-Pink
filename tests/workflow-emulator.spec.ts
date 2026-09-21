import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../firebase/functions/src/config/firebase.js';
import { processPaymentApproval } from '../firebase/functions/src/approvals/paymentApprovalService.js';

const now = '2026-09-20T00:00:00.000Z';

describe('payment approval workflow on Firestore emulator', () => {
  beforeEach(async () => {
    const collections = await db.listCollections();
    await Promise.all(collections.map((collection) => db.recursiveDelete(collection)));
  });

  it('atomically verifies an order and queues one ticket job', async () => {
    await db
      .collection('events')
      .doc('PIP5')
      .set({
        capacity: { total: 1000, registeredCount: 0, confirmedCount: 0 },
      });
    await db
      .collection('orders')
      .doc('order-1')
      .set({
        id: 'order-1',
        publicReference: 'PIP5-S-ORDER1',
        paymentStatus: 'PAYMENT_SUBMITTED',
        orderStatus: 'PAYMENT_SUBMITTED',
        buyer: { fullName: 'Test Buyer', email: 'buyer@example.com' },
        paymentSessionId: 'payment-1',
        createdAt: now,
        updatedAt: now,
      });
    await db.collection('paymentSessions').doc('payment-1').set({
      id: 'payment-1',
      entityType: 'ORDER',
      entityId: 'order-1',
      amountPaise: 19900,
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      updatedAt: now,
    });

    const result = await processPaymentApproval({
      paymentId: 'payment-1',
      decision: 'APPROVE',
      actor: 'test-admin',
      source: 'ADMIN_DASHBOARD',
    });
    const [order, ticketJob, event] = await Promise.all([
      db.collection('orders').doc('order-1').get(),
      db.collection('ticketJobs').doc('order-1').get(),
      db.collection('events').doc('PIP5').get(),
    ]);
    expect(result.newPaymentStatus).toBe('VERIFIED');
    expect(order.data()?.orderStatus).toBe('PAYMENT_VERIFIED');
    expect(ticketJob.data()?.status).toBe('QUEUED');
    expect(event.data()?.capacity.confirmedCount).toBe(1);
  });

  it('verifies donations without ever creating a ticket job', async () => {
    await db
      .collection('donations')
      .doc('donation-1')
      .set({
        id: 'donation-1',
        publicReference: 'PIP5-D-DONATE1',
        paymentStatus: 'PAYMENT_SUBMITTED',
        donationStatus: 'PAYMENT_SUBMITTED',
        donor: { fullName: 'Test Donor', email: 'donor@example.com' },
        paymentSessionId: 'payment-2',
        createdAt: now,
        updatedAt: now,
      });
    await db.collection('paymentSessions').doc('payment-2').set({
      id: 'payment-2',
      entityType: 'DONATION',
      entityId: 'donation-1',
      amountPaise: 50000,
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      updatedAt: now,
    });

    await processPaymentApproval({
      paymentId: 'payment-2',
      decision: 'APPROVE',
      actor: 'test-admin',
      source: 'ADMIN_DASHBOARD',
    });
    const [donation, ticketJobs, emailJobs] = await Promise.all([
      db.collection('donations').doc('donation-1').get(),
      db.collection('ticketJobs').get(),
      db.collection('emailJobs').where('entityId', '==', 'donation-1').get(),
    ]);
    expect(donation.data()?.donationStatus).toBe('VERIFIED');
    expect(ticketJobs.empty).toBe(true);
    expect(emailJobs.size).toBe(1);
  });

  it('rejects approval of a superseded payment session', async () => {
    await db
      .collection('orders')
      .doc('order-stale')
      .set({
        id: 'order-stale',
        paymentSessionId: 'payment-current',
        paymentStatus: 'PAYMENT_SUBMITTED',
        buyer: { fullName: 'Test Buyer', email: 'buyer@example.com' },
        createdAt: now,
        updatedAt: now,
      });
    await db.collection('paymentSessions').doc('payment-stale').set({
      id: 'payment-stale',
      entityType: 'ORDER',
      entityId: 'order-stale',
      amountPaise: 19900,
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      processPaymentApproval({
        paymentId: 'payment-stale',
        decision: 'APPROVE',
        actor: 'test-admin',
        source: 'ADMIN_DASHBOARD',
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
