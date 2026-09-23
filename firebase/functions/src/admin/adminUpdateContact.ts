import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

const contactSchema = z
  .object({
    entityType: z.enum(['ORDER', 'DONATION']),
    entityId: z.string().min(1),
    attendeeId: z.string().min(1).optional(),
    fullName: z.string().trim().min(2).max(120).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    mobileNumber: z
      .string()
      .regex(/^[6-9]\d{9}$/)
      .optional(),
  })
  .refine((value) => value.fullName || value.email || value.mobileNumber, {
    message: 'At least one contact field must be supplied.',
  });

/** Repairs recipient contact data through an audited, role-gated server boundary. */
export const adminUpdateContact = onCall({ region: 'asia-south1', cors: true }, async (request) => {
  const parsed = contactSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      'invalid-argument',
      parsed.error.issues[0]?.message || 'Invalid contact details.'
    );
  }

  const { entityType, entityId, attendeeId, fullName, email, mobileNumber } = parsed.data;
  const admin = await requireAdminRole(
    request,
    entityType === 'DONATION' ? ['SUPER_ADMIN'] : ['SUPER_ADMIN', 'REGISTRATION_ADMIN']
  );
  const db = getFirestore();
  const entityRef = db.collection(entityType === 'ORDER' ? 'orders' : 'donations').doc(entityId);
  const auditRef = db.collection('auditLogs').doc();
  const nowIso = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const entitySnapshot = await transaction.get(entityRef);
    if (!entitySnapshot.exists) throw new HttpsError('not-found', `${entityType} not found.`);
    const entity = entitySnapshot.data()!;
    const contactKey = entityType === 'ORDER' ? 'buyer' : 'donor';
    const existingContact = entity[contactKey] || {};
    const targetAttendeeRef =
      entityType === 'ORDER' && (attendeeId || entity.type === 'SINGLE')
        ? attendeeId
          ? entityRef.collection('attendees').doc(attendeeId)
          : (await transaction.get(entityRef.collection('attendees').limit(1))).docs[0]?.ref
        : undefined;
    if (entityType === 'ORDER' && (attendeeId || entity.type === 'SINGLE') && !targetAttendeeRef) {
      throw new HttpsError('not-found', 'Order attendee not found.');
    }
    const updatedContact = {
      ...existingContact,
      ...(fullName ? { fullName } : {}),
      ...(email ? { email } : {}),
      ...(mobileNumber ? { mobileNumber } : {}),
    };
    transaction.update(entityRef, { [contactKey]: updatedContact, updatedAt: nowIso });

    if (entityType === 'ORDER' && (attendeeId || entity.type === 'SINGLE')) {
      transaction.update(targetAttendeeRef!, {
        ...(fullName ? { fullName } : {}),
        ...(email ? { email } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
        updatedAt: nowIso,
      });
    }

    transaction.set(auditRef, {
      id: auditRef.id,
      actor: `ADMIN:${admin.email}`,
      actorUid: admin.uid,
      action: 'UPDATE_CONTACT',
      entityType,
      entityId,
      attendeeId: attendeeId || null,
      beforeState: { contact: existingContact },
      afterState: { contact: updatedContact },
      timestamp: nowIso,
    });
  });

  return { success: true };
});
