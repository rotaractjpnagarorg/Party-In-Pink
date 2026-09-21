import { describe, expect, it } from 'vitest';
import {
  normalizeBrevoEvent,
  shouldAdvanceBrevoStatus,
  verifyBrevoWebhookSecret,
} from './brevoWebhook.js';

describe('Brevo webhook security', () => {
  it('uses a fail-closed constant-time shared secret check', () => {
    expect(verifyBrevoWebhookSecret('configured-secret', 'configured-secret')).toBe(true);
    expect(verifyBrevoWebhookSecret('configured-secret', 'wrong-secret')).toBe(false);
    expect(verifyBrevoWebhookSecret(undefined, 'configured-secret')).toBe(false);
  });

  it('maps only supported provider events into internal statuses', () => {
    expect(normalizeBrevoEvent('delivered')).toBe('DELIVERED');
    expect(normalizeBrevoEvent('hard_bounce')).toBe('BOUNCED');
    expect(normalizeBrevoEvent('invented-state')).toBeNull();
  });

  it('does not regress terminal delivery state when events arrive out of order', () => {
    expect(shouldAdvanceBrevoStatus('SENT', 'DELIVERED')).toBe(true);
    expect(shouldAdvanceBrevoStatus('BOUNCED', 'DELIVERED')).toBe(true);
    expect(shouldAdvanceBrevoStatus('DELIVERED', 'SENT')).toBe(false);
    expect(shouldAdvanceBrevoStatus('BOUNCED', 'SENT')).toBe(false);
  });
});
