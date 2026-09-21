import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { AdminRole } from '../middleware/adminAuthorization.js';

const allowedRoles: AdminRole[] = [
  'SUPER_ADMIN',
  'PAYMENT_APPROVER',
  'REGISTRATION_ADMIN',
  'TICKET_ADMIN',
  'FINANCE_VIEW',
  'VIEW_ONLY',
];
const uid = process.env.ADMIN_UID;
const role = process.env.ADMIN_ROLE as AdminRole | undefined;
if (!uid || !role || !allowedRoles.includes(role)) {
  throw new Error(`Set ADMIN_UID and ADMIN_ROLE (${allowedRoles.join(', ')}).`);
}

if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  initializeApp(
    serviceAccountJson
      ? { credential: cert(JSON.parse(serviceAccountJson)) }
      : { projectId: process.env.GCLOUD_PROJECT || 'pip5-rotaractjpnagar' }
  );
}

const auth = getAuth();
const db = getFirestore();
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...user.customClaims, role });
await db
  .collection('admins')
  .doc(uid)
  .set(
    {
      uid,
      email: user.email || null,
      displayName: user.displayName || null,
      role,
      active: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
console.log(
  `Provisioned ${user.email || uid} with role ${role}. Sign out/in to refresh the token.`
);
