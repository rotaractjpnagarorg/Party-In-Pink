import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requireAdminRole } from '../middleware/adminAuthorization.js';

const checkInSchema = z.object({
  orderId: z.string().optional(),
  attendeeId: z.string().optional(),
  identifier: z.string().trim().min(1),
  forceOverride: z.boolean().optional().default(false),
});

/**
 * Gate Pass Scanner Check-in Endpoint.
 * Audited, role-gated server boundary to verify and record event gate check-ins.
 */
export const adminCheckInAttendee = onCall({ region: 'asia-south1', cors: true }, async (request) => {
  const parsed = checkInSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      'invalid-argument',
      parsed.error.issues[0]?.message || 'Invalid check-in details.'
    );
  }

  const { orderId, attendeeId, identifier, forceOverride } = parsed.data;
  const admin = await requireAdminRole(request, [
    'SUPER_ADMIN',
    'REGISTRATION_ADMIN',
    'TICKET_ADMIN',
    'PAYMENT_APPROVER',
    'FINANCE_VIEW',
    'VIEW_ONLY',
  ]);

  const db = getFirestore();
  const nowIso = new Date().toISOString();
  const auditRef = db.collection('auditLogs').doc();

  // 1. If explicit orderId and attendeeId are provided
  if (orderId && attendeeId) {
    const attRef = db.collection('orders').doc(orderId).collection('attendees').doc(attendeeId);
    const snap = await attRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Attendee record not found.');
    }

    const data = snap.data() || {};
    const isAlreadyCheckedIn = data.checkInStatus === 'CHECKED_IN';

    if (isAlreadyCheckedIn && !forceOverride) {
      return {
        success: false,
        alreadyCheckedIn: true,
        checkedInAt: data.checkedInAt || null,
        checkedInBy: data.checkedInBy || null,
        attendee: {
          id: snap.id,
          orderId,
          fullName: data.fullName || data.name || 'Attendee',
          email: data.email,
          phone: data.mobileNumber || data.phone,
          registrationId: data.registrationId || data.passId,
          bookingId: data.bookingId,
        },
      };
    }

    await attRef.update({
      checkInStatus: 'CHECKED_IN',
      checkedInAt: nowIso,
      checkedInBy: admin.email || admin.uid,
      updatedAt: nowIso,
    });

    await auditRef.set({
      id: auditRef.id,
      actor: `ADMIN:${admin.email || admin.uid}`,
      actorUid: admin.uid,
      action: 'GATE_CHECK_IN',
      orderId,
      attendeeId,
      timestamp: nowIso,
      forceOverride,
    });

    return {
      success: true,
      alreadyCheckedIn: false,
      checkedInAt: nowIso,
      checkedInBy: admin.email || admin.uid,
      attendee: {
        id: snap.id,
        orderId,
        fullName: data.fullName || data.name || 'Attendee',
        email: data.email,
        phone: data.mobileNumber || data.phone,
        registrationId: data.registrationId || data.passId,
        bookingId: data.bookingId,
      },
    };
  }

  // 2. Lookup by identifier across attendees subcollections
  const cleanId = identifier.trim().toLowerCase();
  const cleanUpper = identifier.trim().toUpperCase();

  // Search in collectionGroup('attendees')
  const attendeesGroup = db.collectionGroup('attendees');
  
  // Try registrationId
  let qSnap = await attendeesGroup.where('registrationId', '==', cleanUpper).limit(1).get();
  if (qSnap.empty) {
    // Try passId
    qSnap = await attendeesGroup.where('passId', '==', cleanUpper).limit(1).get();
  }
  if (qSnap.empty) {
    // Try bookingId
    qSnap = await attendeesGroup.where('bookingId', '==', cleanId).limit(1).get();
  }
  if (qSnap.empty) {
    // Try email
    qSnap = await attendeesGroup.where('email', '==', cleanId).limit(1).get();
  }

  if (qSnap.empty) {
    // Search in orders root by publicReference
    const orderSnap = await db.collection('orders').where('publicReference', '==', cleanUpper).limit(1).get();
    if (!orderSnap.empty && orderSnap.docs[0]) {
      const oDoc = orderSnap.docs[0];
      const oData = oDoc.data();
      const firstAttSnap = await oDoc.ref.collection('attendees').limit(1).get();
      if (!firstAttSnap.empty && firstAttSnap.docs[0]) {
        const aDoc = firstAttSnap.docs[0];
        const aData = aDoc.data();
        const isAlreadyCheckedIn = aData.checkInStatus === 'CHECKED_IN';
        if (isAlreadyCheckedIn && !forceOverride) {
          return {
            success: false,
            alreadyCheckedIn: true,
            checkedInAt: aData.checkedInAt || null,
            checkedInBy: aData.checkedInBy || null,
            attendee: {
              id: aDoc.id,
              orderId: oDoc.id,
              orderRef: oData.publicReference,
              fullName: aData.fullName || aData.name || oData.buyer?.fullName,
              email: aData.email || oData.buyer?.email,
              phone: aData.mobileNumber || aData.phone || oData.buyer?.mobileNumber,
              registrationId: aData.registrationId || aData.passId,
              bookingId: aData.bookingId,
            },
          };
        }

        await aDoc.ref.update({
          checkInStatus: 'CHECKED_IN',
          checkedInAt: nowIso,
          checkedInBy: admin.email || admin.uid,
          updatedAt: nowIso,
        });

        await auditRef.set({
          id: auditRef.id,
          actor: `ADMIN:${admin.email || admin.uid}`,
          actorUid: admin.uid,
          action: 'GATE_CHECK_IN',
          orderId: oDoc.id,
          attendeeId: aDoc.id,
          timestamp: nowIso,
          forceOverride,
        });

        return {
          success: true,
          alreadyCheckedIn: false,
          checkedInAt: nowIso,
          checkedInBy: admin.email || admin.uid,
          attendee: {
            id: aDoc.id,
            orderId: oDoc.id,
            orderRef: oData.publicReference,
            fullName: aData.fullName || aData.name || oData.buyer?.fullName,
            email: aData.email || oData.buyer?.email,
            phone: aData.mobileNumber || aData.phone || oData.buyer?.mobileNumber,
            registrationId: aData.registrationId || aData.passId,
            bookingId: aData.bookingId,
          },
        };
      }
    }

    throw new HttpsError('not-found', `No attendee found matching identifier: ${identifier}`);
  }

  const foundDoc = qSnap.docs[0];
  if (!foundDoc) {
    throw new HttpsError('not-found', `No attendee found matching identifier: ${identifier}`);
  }

  const foundData = foundDoc.data();
  const parentOrderRef = foundDoc.ref.parent.parent;
  const foundOrderId = parentOrderRef ? parentOrderRef.id : '';

  const isAlreadyCheckedIn = foundData.checkInStatus === 'CHECKED_IN';
  if (isAlreadyCheckedIn && !forceOverride) {
    return {
      success: false,
      alreadyCheckedIn: true,
      checkedInAt: foundData.checkedInAt || null,
      checkedInBy: foundData.checkedInBy || null,
      attendee: {
        id: foundDoc.id,
        orderId: foundOrderId,
        fullName: foundData.fullName || foundData.name || 'Attendee',
        email: foundData.email,
        phone: foundData.mobileNumber || foundData.phone,
        registrationId: foundData.registrationId || foundData.passId,
        bookingId: foundData.bookingId,
      },
    };
  }

  await foundDoc.ref.update({
    checkInStatus: 'CHECKED_IN',
    checkedInAt: nowIso,
    checkedInBy: admin.email || admin.uid,
    updatedAt: nowIso,
  });

  await auditRef.set({
    id: auditRef.id,
    actor: `ADMIN:${admin.email || admin.uid}`,
    actorUid: admin.uid,
    action: 'GATE_CHECK_IN',
    orderId: foundOrderId,
    attendeeId: foundDoc.id,
    timestamp: nowIso,
    forceOverride,
  });

  return {
    success: true,
    alreadyCheckedIn: false,
    checkedInAt: nowIso,
    checkedInBy: admin.email || admin.uid,
    attendee: {
      id: foundDoc.id,
      orderId: foundOrderId,
      fullName: foundData.fullName || foundData.name || 'Attendee',
      email: foundData.email,
      phone: foundData.mobileNumber || foundData.phone,
      registrationId: foundData.registrationId || foundData.passId,
      bookingId: foundData.bookingId,
    },
  };
});
