import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'PAYMENT_APPROVER'
  | 'REGISTRATION_ADMIN'
  | 'TICKET_ADMIN'
  | 'FINANCE_VIEW'
  | 'VIEW_ONLY';

export interface AuthorizedAdmin {
  uid: string;
  email: string;
  role: AdminRole;
}

export function validateAdminRoleClaim(
  request: Pick<CallableRequest<unknown>, 'auth'>,
  allowedRoles: readonly AdminRole[]
): AuthorizedAdmin {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Admin authentication is required.');
  const role = auth.token.role;
  if (typeof role !== 'string' || !allowedRoles.includes(role as AdminRole)) {
    throw new HttpsError('permission-denied', 'Your admin role cannot perform this action.');
  }
  return {
    uid: auth.uid,
    email: typeof auth.token.email === 'string' ? auth.token.email : auth.uid,
    role: role as AdminRole,
  };
}

/** Requires both an allowed claim and a currently active server-side admin profile. */
export async function requireAdminRole(
  request: Pick<CallableRequest<unknown>, 'auth'>,
  allowedRoles: readonly AdminRole[]
): Promise<AuthorizedAdmin> {
  const admin = validateAdminRoleClaim(request, allowedRoles);
  const profile = await getFirestore().collection('admins').doc(admin.uid).get();
  if (!profile.exists || profile.data()?.active !== true || profile.data()?.role !== admin.role) {
    throw new HttpsError(
      'permission-denied',
      'This admin account is inactive or its role is stale.'
    );
  }
  return admin;
}
