import { describe, expect, it } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { validateAdminRoleClaim } from './adminAuthorization.js';

describe('validateAdminRoleClaim', () => {
  it('rejects unauthenticated calls', () => {
    expect(() => validateAdminRoleClaim({ auth: undefined }, ['SUPER_ADMIN'])).toThrowError(
      HttpsError
    );
  });

  it('rejects authenticated users without an allowed role', () => {
    expect(() =>
      validateAdminRoleClaim(
        {
          auth: {
            uid: 'viewer-1',
            token: { role: 'VIEW_ONLY', email: 'viewer@example.com' },
          } as never,
        },
        ['SUPER_ADMIN', 'PAYMENT_APPROVER']
      )
    ).toThrowError(/cannot perform/i);
  });

  it('returns the authenticated admin for an allowed role', () => {
    const admin = validateAdminRoleClaim(
      {
        auth: {
          uid: 'approver-1',
          token: { role: 'PAYMENT_APPROVER', email: 'approver@example.com' },
        } as never,
      },
      ['SUPER_ADMIN', 'PAYMENT_APPROVER']
    );

    expect(admin).toEqual({
      uid: 'approver-1',
      email: 'approver@example.com',
      role: 'PAYMENT_APPROVER',
    });
  });
});
