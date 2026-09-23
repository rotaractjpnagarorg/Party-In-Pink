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
  attemptCount?: number;
  nextAttemptAt?: string;
  result?: ReceiptOcrResult;
}

export function isSupportedReceiptImage(buffer: Buffer, _contentType?: string): boolean {
  if (buffer.length < 4) return false;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 24 && buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return true;
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }
  return false;
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
  const normalizedContentType = (metadata.contentType || '').toLowerCase();
  const isImageMime =
    /^image\/(jpeg|jpg|png|webp)$/.test(normalizedContentType) ||
    normalizedContentType === 'application/octet-stream' ||
    !normalizedContentType;
  if (!isImageMime || size <= 0 || size > 10 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Receipt must be a PNG, JPEG, or WebP image no larger than 10 MB.');
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
    const sameGeneration =
      analysis?.storagePath === storagePath && analysis.generation === generation;
    const attemptCount = sameGeneration ? analysis.attemptCount || 0 : 0;
    if (analysis?.state === 'FAILED' && sameGeneration) {
      if (attemptCount >= 3) {
        throw new HttpsError(
          'failed-precondition',
          'Receipt analysis failed repeatedly. Submit the payment for manual review.'
        );
      }
      if (analysis.nextAttemptAt && Date.parse(analysis.nextAttemptAt) > now.getTime()) {
        throw new HttpsError(
          'resource-exhausted',
          'Receipt analysis retry is temporarily delayed.'
        );
      }
    }
    transaction.update(sessionRef, {
      ocrAnalysis: {
        state: 'PROCESSING',
        storagePath,
        generation,
        claimId,
        attemptCount: attemptCount + 1,
        leaseExpiresAt: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString(),
      },
    });
    return { cached: null };
  });
  if (claim.cached) return claim.cached;

  try {
    const [fileBuffer] = await file.download();
    if (!isSupportedReceiptImage(fileBuffer, metadata.contentType || '')) {
      throw new HttpsError(
        'invalid-argument',
        'Receipt contents do not match a supported PNG, JPEG, or WebP image.'
      );
    }
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
          attemptCount: current.data()?.ocrAnalysis?.attemptCount || 1,
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
          attemptCount: current.data()?.ocrAnalysis?.attemptCount || 1,
          nextAttemptAt: new Date(
            Date.now() +
              30_000 * 2 ** Math.max(0, (current.data()?.ocrAnalysis?.attemptCount || 1) - 1)
          ).toISOString(),
          failedAt: new Date().toISOString(),
        },
      });
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Receipt analysis is temporarily unavailable.');
  }
}
