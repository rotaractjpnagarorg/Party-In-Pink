import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';

export function getClientAddress(rawRequest: {
  ip?: string;
  socket?: { remoteAddress?: string | null };
}): string {
  return rawRequest.ip || rawRequest.socket?.remoteAddress || 'unknown';
}

/** Fixed-window application quota. Edge/WAF quotas remain required in production. */
export async function enforcePublicRateLimit(
  action: string,
  identifier: string,
  limit: number,
  windowMs: number,
  cost = 1
): Promise<void> {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const key = createHash('sha256')
    .update(`${process.env.GCLOUD_PROJECT || 'pip5'}:${action}:${identifier}:${bucketStart}`)
    .digest('hex');
  const ref = db.collection('publicRateLimits').doc(key);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const used = snapshot.exists ? Number(snapshot.data()?.count || 0) : 0;
    if (used + cost > limit) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many requests. Please wait before trying again or contact event support.'
      );
    }
    transaction.set(
      ref,
      {
        action,
        count: used + cost,
        bucketStart: new Date(bucketStart).toISOString(),
        expiresAt: new Date(bucketStart + windowMs * 2).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      { merge: true }
    );
  });
}
