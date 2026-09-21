import { describe, expect, it } from 'vitest';
import { PaymentStatuses, type PaymentSession } from '@pip/shared';
import { validatePaymentEvidenceBinding } from './submitPaymentEvidence.js';

const baseSession: PaymentSession = {
  id: 'session-1',
  merchantReference: 'PAY-123456',
  entityType: 'ORDER',
  entityId: 'order-1',
  entityReference: 'PIP5-S-ABC123',
  method: 'UPI',
  amountPaise: 19900,
  currency: 'INR',
  status: PaymentStatuses.AWAITING_PAYMENT,
  expiresAt: '2030-01-01T00:00:00.000Z',
  createdAt: '2029-12-31T23:00:00.000Z',
  updatedAt: '2029-12-31T23:00:00.000Z',
};

describe('validatePaymentEvidenceBinding', () => {
  const valid = {
    session: baseSession,
    requestedSessionId: 'session-1',
    entityType: 'ORDER' as const,
    entityId: 'order-1',
    entityPaymentSessionId: 'session-1',
    entityAmountPaise: 19900,
    storagePath: 'receipts/session-1/receipt.png',
    nowMs: Date.parse('2029-12-31T23:30:00.000Z'),
  };

  it('accepts a current session bound to the same entity and receipt path', () => {
    expect(() => validatePaymentEvidenceBinding(valid)).not.toThrow();
  });

  it('rejects a session belonging to another entity', () => {
    expect(() => validatePaymentEvidenceBinding({ ...valid, entityId: 'order-2' })).toThrow(
      /does not belong/i
    );
  });

  it('rejects a receipt path outside the session directory', () => {
    expect(() =>
      validatePaymentEvidenceBinding({ ...valid, storagePath: 'receipts/session-2/receipt.png' })
    ).toThrow(/Receipt path/i);
  });

  it('rejects expired and already-submitted sessions', () => {
    expect(() =>
      validatePaymentEvidenceBinding({ ...valid, nowMs: Date.parse('2030-01-01T00:00:01.000Z') })
    ).toThrow(/expired/i);
    expect(() =>
      validatePaymentEvidenceBinding({
        ...valid,
        session: { ...baseSession, status: PaymentStatuses.PAYMENT_SUBMITTED },
      })
    ).toThrow(/cannot be submitted/i);
  });
});
