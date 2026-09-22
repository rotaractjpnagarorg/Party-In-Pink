import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { generateReference } from '../utils/reference.js';
import {
  REFERENCE_PREFIXES,
  DEFAULT_EVENT_CODE,
  PaymentStatuses,
  type Order,
  type PaymentSession,
  type EventConfig,
} from '@pip/shared';

interface CreatePaymentSessionRequest {
  statusToken: string;
  method?: 'UPI' | 'NEFT' | 'IMPS' | 'RTGS';
}

export const createPaymentSession = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const data = request.data as CreatePaymentSessionRequest;
    if (!data?.statusToken) {
      throw new HttpsError('invalid-argument', 'statusToken is required');
    }

    // 1. Locate order or donation by statusToken
    const orderSnapshot = await db
      .collection('orders')
      .where('statusToken', '==', data.statusToken)
      .limit(1)
      .get();

    let entityType: 'ORDER' | 'DONATION' = 'ORDER';
    let entityId = '';
    let entityReference = '';
    let amountPaise = 0;
    let paymentStatus = '';
    let entityCollection: 'orders' | 'donations' = 'orders';

    if (!orderSnapshot.empty) {
      const orderDoc = orderSnapshot.docs[0]!;
      const order = orderDoc.data() as Order;
      entityType = 'ORDER';
      entityCollection = 'orders';
      entityId = orderDoc.id;
      entityReference = order.publicReference;
      amountPaise = order.totalAmountPaise;
      paymentStatus = order.paymentStatus;
    } else {
      // Look in donations collection
      const donationSnapshot = await db
        .collection('donations')
        .where('statusToken', '==', data.statusToken)
        .limit(1)
        .get();

      if (donationSnapshot.empty) {
        throw new HttpsError(
          'not-found',
          'No order or donation found for the provided status token'
        );
      }

      const donationDoc = donationSnapshot.docs[0]!;
      const donation = donationDoc.data() as any;
      entityType = 'DONATION';
      entityCollection = 'donations';
      entityId = donationDoc.id;
      entityReference = donation.publicReference;
      amountPaise = donation.amountPaise;
      paymentStatus = donation.paymentStatus;
    }

    if (
      paymentStatus !== PaymentStatuses.AWAITING_PAYMENT &&
      paymentStatus !== PaymentStatuses.REJECTED
    ) {
      throw new HttpsError(
        'failed-precondition',
        `A new payment session cannot be created while payment status is ${paymentStatus}.`
      );
    }

    // 2. Fetch event payment configuration
    const eventDoc = await db.collection('events').doc(DEFAULT_EVENT_CODE).get();
    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event configuration not found');
    }
    const eventData = eventDoc.data() as EventConfig;
    const paymentConfig = eventData.paymentDisplayConfig;

    const now = new Date();
    const nowIso = now.toISOString();

    // 3. Reuse an active session or create and link a new one atomically.
    const entityRef = db.collection(entityCollection).doc(entityId);
    const candidateSessionRef = db.collection('paymentSessions').doc();
    const paymentSession = await db.runTransaction(async (transaction): Promise<PaymentSession> => {
      const currentEntityDoc = await transaction.get(entityRef);
      if (!currentEntityDoc.exists) {
        throw new HttpsError('not-found', 'Order or donation no longer exists');
      }

      const currentEntity = currentEntityDoc.data()!;
      if (currentEntity.statusToken !== data.statusToken) {
        throw new HttpsError(
          'permission-denied',
          'Status token no longer matches this payment entity.'
        );
      }
      if (
        currentEntity.paymentStatus !== PaymentStatuses.AWAITING_PAYMENT &&
        currentEntity.paymentStatus !== PaymentStatuses.REJECTED
      ) {
        throw new HttpsError(
          'failed-precondition',
          `A new payment session cannot be created while payment status is ${currentEntity.paymentStatus}.`
        );
      }
      if (
        entityType === 'ORDER' &&
        (currentEntity.capacityReleasedAt ||
          !currentEntity.reservationExpiresAt ||
          Date.parse(currentEntity.reservationExpiresAt) <= now.getTime())
      ) {
        throw new HttpsError(
          'deadline-exceeded',
          'This registration reservation has expired. Please start a new registration.'
        );
      }

      const currentSessionId = currentEntity.paymentSessionId as string | undefined;
      if (currentSessionId) {
        const currentSessionRef = db.collection('paymentSessions').doc(currentSessionId);
        const currentSessionDoc = await transaction.get(currentSessionRef);
        if (currentSessionDoc.exists) {
          const currentSession = currentSessionDoc.data() as PaymentSession;
          const currentExpiry = Date.parse(currentSession.expiresAt);
          if (
            currentSession.entityType === entityType &&
            currentSession.entityId === entityId &&
            currentSession.amountPaise === amountPaise &&
            currentSession.status === PaymentStatuses.AWAITING_PAYMENT &&
            Number.isFinite(currentExpiry) &&
            currentExpiry > now.getTime()
          ) {
            return currentSession;
          }
        }
      }

      const merchantReference = generateReference(REFERENCE_PREFIXES.PAYMENT, 6);
      const defaultExpiry = now.getTime() + 30 * 60 * 1000;
      const expiresAt = new Date(
        entityType === 'ORDER'
          ? Math.min(defaultExpiry, Date.parse(currentEntity.reservationExpiresAt))
          : defaultExpiry
      ).toISOString();
      const newSession: PaymentSession = {
        id: candidateSessionRef.id,
        merchantReference,
        entityType,
        entityId,
        entityReference,
        method: data.method || 'UPI',
        amountPaise,
        currency: 'INR',
        status: PaymentStatuses.AWAITING_PAYMENT,
        expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      transaction.set(candidateSessionRef, newSession);
      transaction.update(entityRef, {
        paymentSessionId: candidateSessionRef.id,
        paymentStatus: PaymentStatuses.AWAITING_PAYMENT,
        ...(entityType === 'ORDER'
          ? { orderStatus: 'AWAITING_PAYMENT' }
          : { donationStatus: 'CREATED' }),
        updatedAt: nowIso,
      });
      return newSession;
    });

    const upiUri = `upi://pay?pa=${paymentConfig.upiVpa}&pn=${encodeURIComponent(
      paymentConfig.payeeName
    )}&am=${(paymentSession.amountPaise / 100).toFixed(2)}&cu=INR&tn=${paymentSession.merchantReference}`;

    return {
      sessionId: paymentSession.id,
      entityType,
      merchantReference: paymentSession.merchantReference,
      amountPaise: paymentSession.amountPaise,
      currency: 'INR',
      status: PaymentStatuses.AWAITING_PAYMENT,
      expiresAt: paymentSession.expiresAt,
      upiUri,
      paymentDisplayConfig: paymentConfig,
    };
  }
);
