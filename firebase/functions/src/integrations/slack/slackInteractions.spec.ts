import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { isAuthorizedSlackActor, verifySlackSignature } from './slackInteractions.js';

describe('Slack interaction security', () => {
  it('verifies a current valid signature and rejects missing or malformed signatures', () => {
    const secret = 'test-signing-secret';
    const body = 'payload=%7B%22actions%22%3A%5B%5D%7D';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = `v0=${crypto
      .createHmac('sha256', secret)
      .update(`v0:${timestamp}:${body}`)
      .digest('hex')}`;

    expect(verifySlackSignature(secret, body, timestamp, signature)).toBe(true);
    expect(verifySlackSignature(undefined, body, timestamp, signature)).toBe(false);
    expect(verifySlackSignature(secret, body, timestamp, 'v0=short')).toBe(false);
  });

  it('rejects stale signed requests', () => {
    const secret = 'test-signing-secret';
    const timestamp = (Math.floor(Date.now() / 1000) - 301).toString();
    const body = 'payload=test';
    const signature = `v0=${crypto
      .createHmac('sha256', secret)
      .update(`v0:${timestamp}:${body}`)
      .digest('hex')}`;
    expect(verifySlackSignature(secret, body, timestamp, signature)).toBe(false);
  });

  it('requires the configured workspace and stable user ID allowlist', () => {
    expect(isAuthorizedSlackActor('T123', 'U456', 'T123', 'U111,U456')).toBe(true);
    expect(isAuthorizedSlackActor('T999', 'U456', 'T123', 'U111,U456')).toBe(false);
    expect(isAuthorizedSlackActor('T123', 'U999', 'T123', 'U111,U456')).toBe(false);
  });
});
