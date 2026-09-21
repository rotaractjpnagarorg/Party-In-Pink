import { describe, expect, it } from 'vitest';
import { classifyBulkCommit } from './commitBulkAttendees.js';

describe('bulk commit replay state machine', () => {
  it('resumes only an interrupted matching commit', () => {
    expect(classifyBulkCommit('hash', 'COMMITTING', 'DRAFT', 'hash')).toBe('RESUME');
  });

  it('treats a matching completed commit as read-only in every later order state', () => {
    expect(classifyBulkCommit('hash', 'COMMITTED', 'PAYMENT_SUBMITTED', 'hash')).toBe('COMPLETE');
    expect(classifyBulkCommit('hash', 'COMMITTED', 'CONFIRMED', 'hash')).toBe('COMPLETE');
  });

  it('rejects a different payload after reservation', () => {
    expect(classifyBulkCommit('old-hash', 'COMMITTED', 'AWAITING_PAYMENT', 'new-hash')).toBe(
      'REJECT'
    );
  });
});
