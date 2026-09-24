import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { PaymentStatuses, type Donation, type Order, type PaymentSession } from '@pip/shared';
import { db } from '../config/firebase.js';
import { validatePaymentEvidenceBinding } from './submitPaymentEvidence.js';
import { analyzeReceiptOnce } from './receiptOcrService.js';

const requestSchema = z.object({
  statusToken: z.string().min(1),
  sessionId: z.string().min(1),
  storagePath: z.string().min(1),
});

export const analyzePaymentReceipt = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request) => {
    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success)
      throw new HttpsError('invalid-argument', 'Valid receipt details are required.');
    const data = parsed.data;

    const orderSnapshot = await db
      .collection('orders')
      .where('statusToken', '==', data.statusToken)
      .limit(1)
      .get();

    let entityType: 'ORDER' | 'DONATION';
    let entityId: string;
    let entityPaymentSessionId: string | null | undefined;
    let entityAmountPaise: number;
    if (!orderSnapshot.empty && orderSnapshot.docs[0]) {
      const order = orderSnapshot.docs[0].data() as Order;
      entityType = 'ORDER';
      entityId = orderSnapshot.docs[0].id;
      entityPaymentSessionId = order.paymentSessionId;
      entityAmountPaise = order.totalAmountPaise;
    } else {
      const donationSnapshot = await db
        .collection('donations')
        .where('statusToken', '==', data.statusToken)
        .limit(1)
        .get();
      if (donationSnapshot.empty || !donationSnapshot.docs[0]) {
        throw new HttpsError('not-found', 'Order or donation not found.');
      }
      const donation = donationSnapshot.docs[0].data() as Donation;
      entityType = 'DONATION';
      entityId = donationSnapshot.docs[0].id;
      entityPaymentSessionId = donation.paymentSessionId;
      entityAmountPaise = donation.amountPaise;
    }

    const sessionDoc = await db.collection('paymentSessions').doc(data.sessionId).get();
    if (!sessionDoc.exists) throw new HttpsError('not-found', 'Payment session not found.');
    const session = sessionDoc.data() as PaymentSession;
    validatePaymentEvidenceBinding({
      session,
      requestedSessionId: data.sessionId,
      entityType,
      entityId,
      entityPaymentSessionId,
      entityAmountPaise,
      storagePath: data.storagePath,
    });

    const ocr = await analyzeReceiptOnce(data.sessionId, data.storagePath, session.amountPaise);

    // ── Post-scan comprehensive validation ──────────────────────────────
    const warnings: string[] = [];
    let isDuplicateUtr = false;
    let isAmountMismatch = false;
    let isPaymentStatusMissing = false;

    // 1. UTR Duplicate Check
    if (ocr.transactionReference) {
      const normalizedUtr = ocr.transactionReference.replace(/[^0-9A-Z]/gi, '').toUpperCase();
      if (normalizedUtr.length >= 6) {
        const utrDoc = await db.collection('paymentReferences').doc(normalizedUtr).get();
        if (utrDoc.exists) {
          const existingLock = utrDoc.data();
          if (
            typeof existingLock?.paymentId === 'string' &&
            existingLock.paymentId !== data.sessionId
          ) {
            const origDoc = await db
              .collection('paymentSessions')
              .doc(existingLock.paymentId)
              .get();
            const origStatus = origDoc.data()?.status;
            if (
              origStatus === PaymentStatuses.VERIFIED ||
              origStatus === PaymentStatuses.PAYMENT_SUBMITTED
            ) {
              isDuplicateUtr = true;
              warnings.push(
                `This UTR (${normalizedUtr}) has already been used for reference ${existingLock.entityReference || 'another registration'}. Please use the correct UTR from your payment receipt.`
              );
            }
          }
        }
      }
    }

    // 2. Amount Mismatch Check
    if (
      typeof ocr.extractedAmountPaise === 'number' &&
      ocr.extractedAmountPaise > 0 &&
      ocr.extractedAmountPaise !== session.amountPaise
    ) {
      isAmountMismatch = true;
      const expected = `₹${(session.amountPaise / 100).toFixed(2)}`;
      const found = `₹${(ocr.extractedAmountPaise / 100).toFixed(2)}`;
      warnings.push(
        `Amount mismatch: screenshot shows ${found} but expected ${expected}. Please ensure you paid the exact amount.`
      );
    }

    // 3. Payment Success Status Check
    if (!ocr.paymentStatusText) {
      isPaymentStatusMissing = true;
      warnings.push(
        'Could not detect a "Payment Successful" confirmation in the screenshot. Please ensure the full success screen is captured.'
      );
    }

    const isValid = !isDuplicateUtr && !isAmountMismatch;

    return {
      transactionReference: ocr.transactionReference,
      extractedAmountPaise: ocr.extractedAmountPaise,
      paymentStatusText: ocr.paymentStatusText,
      confidence: ocr.confidence,
      validation: {
        isValid,
        isDuplicateUtr,
        isAmountMismatch,
        isPaymentStatusMissing,
        expectedAmountPaise: session.amountPaise,
        warnings,
      },
    };
  }
);

