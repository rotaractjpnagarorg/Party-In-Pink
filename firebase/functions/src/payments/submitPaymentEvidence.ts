import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { notifySlackPaymentSubmitted } from '../integrations/slack/slackNotifier.js';
import {
  PaymentStatuses,
  OrderStatuses,
  DonationStatuses,
  type Order,
  type PaymentSession,
} from '@pip/shared';
import { SLACK_WEBHOOK_URL } from '../config/secrets.js';
import { analyzeReceiptOnce } from './receiptOcrService.js';

interface SubmitPaymentEvidenceRequest {
  statusToken: string;
  sessionId: string;
  transactionReference?: string; // 12-digit UTR
  storagePath?: string; // e.g. receipts/PAY-XXXX/receipt.jpg
  source?: 'RECEIPT_UPLOAD' | 'MANUAL_ENTRY' | 'PASTED_TEXT';
}

interface PaymentEvidenceBindingInput {
  session: PaymentSession;
  requestedSessionId: string;
  entityType: 'ORDER' | 'DONATION';
  entityId: string;
  entityPaymentSessionId?: string | null;
  entityAmountPaise: number;
  storagePath?: string;
  nowMs?: number;
}

export function validatePaymentEvidenceBinding(input: PaymentEvidenceBindingInput): void {
  const {
    session,
    requestedSessionId,
    entityType,
    entityId,
    entityPaymentSessionId,
    entityAmountPaise,
    storagePath,
    nowMs = Date.now(),
  } = input;

  if (
    session.id !== requestedSessionId ||
    session.entityType !== entityType ||
    session.entityId !== entityId ||
    entityPaymentSessionId !== requestedSessionId
  ) {
    throw new HttpsError(
      'permission-denied',
      'Payment session does not belong to this order or donation.'
    );
  }

  if (session.amountPaise !== entityAmountPaise) {
    throw new HttpsError(
      'failed-precondition',
      'Payment amount no longer matches the order or donation.'
    );
  }

  if (session.status !== PaymentStatuses.AWAITING_PAYMENT) {
    throw new HttpsError(
      'failed-precondition',
      `Payment evidence cannot be submitted in status ${session.status}.`
    );
  }

  const expiresAtMs = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
    throw new HttpsError(
      'deadline-exceeded',
      'This payment session has expired. Start a new payment session.'
    );
  }

  if (storagePath) {
    const expectedPrefix = `receipts/${requestedSessionId}/`;
    const fileName = storagePath.slice(expectedPrefix.length);
    if (
      !storagePath.startsWith(expectedPrefix) ||
      fileName !== 'receipt' ||
      fileName.includes('/') ||
      !/^[A-Za-z0-9._-]+$/.test(fileName)
    ) {
      throw new HttpsError(
        'permission-denied',
        'Receipt path does not belong to this payment session.'
      );
    }
  }
}

export function isDuplicatePaymentReference(
  existingPaymentId: unknown,
  currentPaymentId: string
): boolean {
  return typeof existingPaymentId === 'string' && existingPaymentId !== currentPaymentId;
}

export const submitPaymentEvidence = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
    secrets: [SLACK_WEBHOOK_URL],
  },
  async (request) => {
    const data = request.data as SubmitPaymentEvidenceRequest;
    if (!data?.statusToken || !data?.sessionId) {
      throw new HttpsError('invalid-argument', 'statusToken and sessionId are required');
    }
    if (
      data.source !== undefined &&
      !['RECEIPT_UPLOAD', 'MANUAL_ENTRY', 'PASTED_TEXT'].includes(data.source)
    ) {
      throw new HttpsError('invalid-argument', 'Unsupported payment evidence source');
    }

    // 1. Validate Order or Donation exists for status token
    const orderSnapshot = await db
      .collection('orders')
      .where('statusToken', '==', data.statusToken)
      .limit(1)
      .get();

    let entityType: 'ORDER' | 'DONATION' = 'ORDER';
    let entityId = '';
    let entityReference = '';
    let buyerName = '';
    let buyerEmail = '';
    let entityPaymentSessionId: string | null | undefined;
    let entityAmountPaise = 0;

    if (!orderSnapshot.empty) {
      const orderDoc = orderSnapshot.docs[0]!;
      const order = orderDoc.data() as Order;
      if (order.paymentStatus === PaymentStatuses.VERIFIED) {
        throw new HttpsError('failed-precondition', 'Order payment is already verified');
      }
      entityType = 'ORDER';
      entityId = orderDoc.id;
      entityReference = order.publicReference;
      buyerName = order.buyer.fullName;
      buyerEmail = order.buyer.email;
      entityPaymentSessionId = order.paymentSessionId;
      entityAmountPaise = order.totalAmountPaise;
    } else {
      const donationSnapshot = await db
        .collection('donations')
        .where('statusToken', '==', data.statusToken)
        .limit(1)
        .get();

      if (donationSnapshot.empty) {
        throw new HttpsError('not-found', 'No order or donation found for status token');
      }

      const donationDoc = donationSnapshot.docs[0]!;
      const donation = donationDoc.data() as any;
      if (donation.paymentStatus === PaymentStatuses.VERIFIED) {
        throw new HttpsError('failed-precondition', 'Donation payment is already verified');
      }
      entityType = 'DONATION';
      entityId = donationDoc.id;
      entityReference = donation.publicReference;
      buyerName = donation.donor.fullName;
      buyerEmail = donation.donor.email;
      entityPaymentSessionId = donation.paymentSessionId;
      entityAmountPaise = donation.amountPaise;
    }

    // 2. Locate Payment Session
    const sessionRef = db.collection('paymentSessions').doc(data.sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Payment session not found');
    }
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

    let transactionRef = (data.transactionReference || '').trim();
    let ocrExtractedAmount: number | null = null;
    let ocrConfidence: number | null = null;
    let receiptVerified = false;

    // 3. Receipt verification & OCR extraction if storagePath provided
    if (data.storagePath) {
      receiptVerified = true;
      try {
        const ocrResult = await analyzeReceiptOnce(
          data.sessionId,
          data.storagePath,
          session.amountPaise
        );
        if (!transactionRef && ocrResult.transactionReference) {
          transactionRef = ocrResult.transactionReference;
        }
        ocrExtractedAmount = ocrResult.extractedAmountPaise;
        ocrConfidence = ocrResult.confidence;

        // Hard-reject amount mismatch detected by OCR
        if (
          typeof ocrExtractedAmount === 'number' &&
          ocrExtractedAmount > 0 &&
          ocrExtractedAmount !== session.amountPaise
        ) {
          const expected = `₹${(session.amountPaise / 100).toFixed(2)}`;
          const found = `₹${(ocrExtractedAmount / 100).toFixed(2)}`;
          throw new HttpsError(
            'failed-precondition',
            `Amount mismatch: uploaded screenshot shows ${found}, but this payment requires ${expected}. Submission blocked.`
          );
        }
      } catch (ocrErr) {
        if (ocrErr instanceof HttpsError) throw ocrErr;
        console.warn(
          'OCR text extraction failed; receipt remains available for manual review:',
          ocrErr
        );
      }
    }

    // Require either a transaction reference or an uploaded receipt image
    if (!transactionRef && !receiptVerified) {
      throw new HttpsError(
        'invalid-argument',
        'Please provide either a valid 12-digit UTR transaction reference or upload a payment receipt screenshot.'
      );
    }

    // Normalize UTR: uppercase, alphanumeric only
    const normalizedUtr = transactionRef.replace(/[^0-9A-Z]/gi, '').toUpperCase();

    // 4. Enforce UTR uniqueness lock in Firestore transaction (PAY-P0-002)
    const nowIso = new Date().toISOString();

    const submissionResult = await db.runTransaction(async (transaction) => {
      const entityRef = db
        .collection(entityType === 'ORDER' ? 'orders' : 'donations')
        .doc(entityId);
      const [freshSessionDoc, freshEntityDoc] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(entityRef),
      ]);
      if (!freshSessionDoc.exists || !freshEntityDoc.exists) {
        throw new HttpsError('not-found', 'Payment session or associated entity no longer exists.');
      }
      const freshSession = freshSessionDoc.data() as PaymentSession;
      const freshEntity = freshEntityDoc.data()!;
      if (freshEntity.statusToken !== data.statusToken) {
        throw new HttpsError(
          'permission-denied',
          'Status token no longer matches this payment entity.'
        );
      }
      validatePaymentEvidenceBinding({
        session: freshSession,
        requestedSessionId: data.sessionId,
        entityType,
        entityId,
        entityPaymentSessionId: freshEntity.paymentSessionId,
        entityAmountPaise:
          entityType === 'ORDER' ? freshEntity.totalAmountPaise : freshEntity.amountPaise,
        storagePath: data.storagePath,
      });

      let isDuplicateUtr = false;
      let duplicateEntityRef: string | null = null;
      if (normalizedUtr && normalizedUtr.length >= 6) {
        const utrRef = db.collection('paymentReferences').doc(normalizedUtr);
        const utrDoc = await transaction.get(utrRef);

        if (utrDoc.exists) {
          const existingLock = utrDoc.data();
          isDuplicateUtr = isDuplicatePaymentReference(existingLock?.paymentId, session.id);
          if (isDuplicateUtr) {
            duplicateEntityRef = existingLock?.entityReference || null;

            // Hard-reject if the original payment is already VERIFIED or actively submitted.
            // Only route to review for ambiguous states (e.g. REVIEW_REQUIRED).
            const origPaymentRef = db.collection('paymentSessions').doc(existingLock?.paymentId);
            const origPaymentDoc = await transaction.get(origPaymentRef);
            const origStatus = origPaymentDoc.data()?.status;
            if (
              origStatus === PaymentStatuses.VERIFIED ||
              origStatus === PaymentStatuses.PAYMENT_SUBMITTED
            ) {
              throw new HttpsError(
                'already-exists',
                `This UTR (${normalizedUtr}) has already been used for reference ${duplicateEntityRef || 'another registration'}. Please enter the correct UTR from your payment receipt.`
              );
            }
          }
        }

        // A reference already used by another payment is preserved as evidence
        // and routed to review. It must never replace the original lock.
        if (!isDuplicateUtr) {
          transaction.set(utrRef, {
            paymentId: session.id,
            entityId,
            entityReference,
            normalizedUtr,
            createdAt: nowIso,
          });
        }
      }

      const nextPaymentStatus = isDuplicateUtr
        ? PaymentStatuses.REVIEW_REQUIRED
        : PaymentStatuses.PAYMENT_SUBMITTED;

      // Update payment session to PAYMENT_SUBMITTED
      transaction.update(sessionRef, {
        status: nextPaymentStatus,
        normalizedUtr: normalizedUtr || null,
        evidence: {
          storagePath: data.storagePath || null,
          source: data.source || (data.storagePath ? 'RECEIPT_UPLOAD' : 'MANUAL_ENTRY'),
          transactionReference: normalizedUtr || null,
          extractedAmountPaise: ocrExtractedAmount,
          ocrConfidence,
          submittedAt: nowIso,
        },
        updatedAt: nowIso,
      });

      // Update Order or Donation to PAYMENT_SUBMITTED
      if (entityType === 'ORDER') {
        transaction.update(entityRef, {
          paymentStatus: nextPaymentStatus,
          orderStatus: isDuplicateUtr
            ? OrderStatuses.REVIEW_REQUIRED
            : OrderStatuses.PAYMENT_SUBMITTED,
          updatedAt: nowIso,
        });
      } else {
        transaction.update(entityRef, {
          paymentStatus: nextPaymentStatus,
          donationStatus: DonationStatuses.PAYMENT_SUBMITTED,
          updatedAt: nowIso,
        });
      }

      // Write audit log
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        id: auditRef.id,
        actor: `PUBLIC_USER:${buyerEmail}`,
        action: isDuplicateUtr
          ? 'SUBMIT_DUPLICATE_PAYMENT_REFERENCE_FOR_REVIEW'
          : 'SUBMIT_PAYMENT_EVIDENCE',
        entityType: 'PAYMENT',
        entityId: session.id,
        correlationId: entityReference,
        afterState: {
          publicReference: entityReference,
          paymentStatus: nextPaymentStatus,
          normalizedUtr: normalizedUtr || null,
          ocrConfidence,
        },
        timestamp: nowIso,
      });

      // Enqueue email job acknowledging payment evidence submission
      const emailJobRef = db.collection('emailJobs').doc();
      transaction.set(emailJobRef, {
        id: emailJobRef.id,
        audience: entityType === 'DONATION' ? 'DONOR' : 'SINGLE_ATTENDEE',
        entityType,
        entityId: session.entityId,
        templateKey: 'PAYMENT_SUBMITTED',
        recipientEmail: buyerEmail,
        recipientName: buyerName,
        priority: 'NORMAL',
        status: 'QUEUED',
        attempts: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return {
        status: nextPaymentStatus,
        isDuplicate: isDuplicateUtr,
        duplicateRef: duplicateEntityRef,
      };
    });

    // Notify Slack channel asynchronously
    try {
      await notifySlackPaymentSubmitted({
        paymentId: session.id,
        merchantReference: session.merchantReference,
        entityReference,
        entityType,
        amountPaise: session.amountPaise,
        buyerName,
        buyerEmail,
        method: session.method,
        utr: normalizedUtr,
        storagePath: data.storagePath,
        source: data.source || (data.storagePath ? 'RECEIPT_UPLOAD' : 'MANUAL_ENTRY'),
        ocrConfidence,
        statusToken: data.statusToken,
        isDuplicate: submissionResult.isDuplicate,
        duplicateRef: submissionResult.duplicateRef,
        ocrAmountPaise: ocrExtractedAmount,
        amountMismatch:
          typeof ocrExtractedAmount === 'number' &&
          ocrExtractedAmount > 0 &&
          ocrExtractedAmount !== session.amountPaise,
      });
    } catch (slackErr) {
      console.warn('Slack payment notification warning (non-blocking):', slackErr);
    }

    return {
      success: true,
      paymentStatus: submissionResult.status,
      orderStatus:
        submissionResult.status === PaymentStatuses.REVIEW_REQUIRED
          ? OrderStatuses.REVIEW_REQUIRED
          : OrderStatuses.PAYMENT_SUBMITTED,
      orderReference: entityReference,
      statusToken: data.statusToken,
      normalizedUtr: normalizedUtr || null,
      ocrConfidence,
    };
  }
);
