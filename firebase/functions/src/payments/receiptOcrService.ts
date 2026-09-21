import { randomUUID } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { db, storage } from '../config/firebase.js';
import { parseReceiptOcrText } from '../integrations/vision/ocrParser.js';

export interface ReceiptOcrResult {
  transactionReference: string | null;
  extractedAmountPaise: number | null;
  paymentStatusText: string | null;
  confidence: number;
}

interface CachedAnalysis {
  state: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  storagePath: string;
  generation: string;
  claimId?: string;
  leaseExpiresAt?: string;
  result?: ReceiptOcrResult;
}

export async function analyzeReceiptOnce(
  sessionId: string,
  storagePath: string,
  expectedAmountPaise: number
): Promise<ReceiptOcrResult> {
  const file = storage.bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'Uploaded receipt was not found.');
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size || 0);
  if (
    !/^image\/(jpeg|png)$/.test(metadata.contentType || '') ||
    size <= 0 ||
    size > 5 * 1024 * 1024
  ) {
    throw new HttpsError('invalid-argument', 'Receipt must be a PNG or JPEG no larger than 5 MB.');
  }

  const generation = String(metadata.generation || 'unknown');
  const claimId = randomUUID();
  const sessionRef = db.collection('paymentSessions').doc(sessionId);
  const now = new Date();
  const claim = await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) throw new HttpsError('not-found', 'Payment session not found.');
    const analysis = sessionSnapshot.data()?.ocrAnalysis as CachedAnalysis | undefined;
    if (
      analysis?.storagePath === storagePath &&
      analysis.generation === generation &&
      analysis.state === 'COMPLETED' &&
      analysis.result
    ) {
      return { cached: analysis.result };
    }
    if (
      analysis?.storagePath === storagePath &&
      analysis.generation === generation &&
      analysis.state === 'PROCESSING' &&
      analysis.leaseExpiresAt &&
      Date.parse(analysis.leaseExpiresAt) > now.getTime()
    ) {
      throw new HttpsError('resource-exhausted', 'Receipt analysis is already in progress.');
    }
    transaction.update(sessionRef, {
      ocrAnalysis: {
        state: 'PROCESSING',
        storagePath,
        generation,
        claimId,
        leaseExpiresAt: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString(),
      },
    });
    return { cached: null };
  });
  if (claim.cached) return claim.cached;

  try {
    const [fileBuffer] = await file.download();
    const vision = await import('@google-cloud/vision');
    const visionClient = new vision.ImageAnnotatorClient();
    const [visionResult] = await visionClient.textDetection({ image: { content: fileBuffer } });
    const rawText = visionResult.textAnnotations?.[0]?.description || '';
    const parsed = parseReceiptOcrText(rawText, expectedAmountPaise);
    const result: ReceiptOcrResult = {
      transactionReference: parsed.transactionReference,
      extractedAmountPaise: parsed.extractedAmountPaise,
      paymentStatusText: parsed.paymentStatusText,
      confidence: parsed.confidence,
    };
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(sessionRef);
      if (current.data()?.ocrAnalysis?.claimId !== claimId) return;
      transaction.update(sessionRef, {
        ocrAnalysis: {
          state: 'COMPLETED',
          storagePath,
          generation,
          result,
          completedAt: new Date().toISOString(),
        },
      });
    });
    return result;
  } catch (error) {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(sessionRef);
      if (current.data()?.ocrAnalysis?.claimId !== claimId) return;
      transaction.update(sessionRef, {
        ocrAnalysis: {
          state: 'FAILED',
          storagePath,
          generation,
          failedAt: new Date().toISOString(),
        },
      });
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Receipt analysis is temporarily unavailable.');
  }
}
