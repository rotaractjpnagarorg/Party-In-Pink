import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../firebase/functions/src/config/firebase.js';
import { processPaymentApproval } from '../firebase/functions/src/approvals/paymentApprovalService.js';

const now = '2026-09-20T00:00:00.000Z';

describe('payment approval workflow on Firestore emulator', () => {
  beforeEach(async () => {
    const collections = await db.listCollections();
    await Promise.all(collections.map((collection) => db.recursiveDelete(collection)));
    await db
      .collection('events')
      .doc('PIP5')
      .set({
        capacity: { total: 1000, registeredCount: 0, confirmedCount: 0 },
      });
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

  it('verifies standard donations without creating a ticket job', async () => {
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

  it('verifies wellwisher donations and queues 1 complimentary ticket job (Wellwisher Tier: ₹5,000 = 1 pass)', async () => {
    await db
      .collection('donations')
      .doc('donation-wellwisher')
      .set({
        id: 'donation-wellwisher',
        publicReference: 'PIP5-D-WELLWISHER1',
        amountPaise: 500000,
        paymentStatus: 'PAYMENT_SUBMITTED',
        donationStatus: 'PAYMENT_SUBMITTED',
        donor: { fullName: 'Wellwisher Sponsor', email: 'wellwisher@example.com' },
        paymentSessionId: 'payment-wellwisher',
        createdAt: now,
        updatedAt: now,
      });
    await db.collection('paymentSessions').doc('payment-wellwisher').set({
      id: 'payment-wellwisher',
      entityType: 'DONATION',
      entityId: 'donation-wellwisher',
      amountPaise: 500000, // ₹5,000 = 1 pass
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      updatedAt: now,
    });

    await processPaymentApproval({
      paymentId: 'payment-wellwisher',
      decision: 'APPROVE',
      actor: 'test-admin',
      source: 'ADMIN_DASHBOARD',
    });
    const [donation, ticketJobs, event] = await Promise.all([
      db.collection('donations').doc('donation-wellwisher').get(),
      db.collection('ticketJobs').get(),
      db.collection('events').doc('PIP5').get(),
    ]);
    expect(donation.data()?.donationStatus).toBe('VERIFIED');
    expect(ticketJobs.empty).toBe(false);
    expect(event.data()?.capacity.confirmedCount).toBe(1);
  });

  it('verifies sponsorship donations and queues complimentary ticket jobs (Silver Tier: 2 passes)', async () => {
    await db
      .collection('donations')
      .doc('donation-silver')
      .set({
        id: 'donation-silver',
        publicReference: 'PIP5-D-SILVER1',
        amountPaise: 1000000,
        paymentStatus: 'PAYMENT_SUBMITTED',
        donationStatus: 'PAYMENT_SUBMITTED',
        donor: { fullName: 'Silver Sponsor', email: 'silver@example.com' },
        paymentSessionId: 'payment-silver',
        createdAt: now,
        updatedAt: now,
      });
    await db.collection('paymentSessions').doc('payment-silver').set({
      id: 'payment-silver',
      entityType: 'DONATION',
      entityId: 'donation-silver',
      amountPaise: 1000000, // ₹10,000 = 2 passes
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      updatedAt: now,
    });

    await processPaymentApproval({
      paymentId: 'payment-silver',
      decision: 'APPROVE',
      actor: 'test-admin',
      source: 'ADMIN_DASHBOARD',
    });
    const [donation, ticketJobs, event] = await Promise.all([
      db.collection('donations').doc('donation-silver').get(),
      db.collection('ticketJobs').get(),
      db.collection('events').doc('PIP5').get(),
    ]);
    expect(donation.data()?.donationStatus).toBe('VERIFIED');
    expect(ticketJobs.empty).toBe(false);
    expect(event.data()?.capacity.confirmedCount).toBe(2);
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
