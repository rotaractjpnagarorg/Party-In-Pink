import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { db, storage } from '../config/firebase.js';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

const schema = z.object({ paymentId: z.string().min(1) });

export const adminGetReceiptUrl = onCall({ region: 'asia-south1', cors: true }, async (request) => {
  await requireAdminRole(request, ['SUPER_ADMIN', 'PAYMENT_APPROVER']);
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Payment ID is required.');

  const session = await db.collection('paymentSessions').doc(parsed.data.paymentId).get();
  if (!session.exists) throw new HttpsError('not-found', 'Payment session not found.');
  const storagePath = session.data()?.evidence?.storagePath;
  if (
    typeof storagePath !== 'string' ||
    !storagePath.startsWith(`receipts/${parsed.data.paymentId}/`)
  ) {
    throw new HttpsError('not-found', 'No receipt is attached to this payment.');
  }

  const file = storage.bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'Receipt file no longer exists.');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const [url] = await file.getSignedUrl({ action: 'read', expires: expiresAt });
  return { url, expiresAt: new Date(expiresAt).toISOString() };
});
