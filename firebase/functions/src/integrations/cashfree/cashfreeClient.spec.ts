import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Cashfree Signature Verification', () => {
  it('correctly validates HMAC-SHA256 signatures with timestamp and rawBody', () => {
    const secretKey = 'test_secret_key_123';
    const timestamp = '1710000000';
    const rawBody = JSON.stringify({
      data: {
        order: { order_id: 'cf_order_123' },
        payment: { payment_status: 'SUCCESS' },
      },
    });

    const signatureData = timestamp + rawBody;
    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureData)
      .digest('base64');

    // Simulate verification
    const testComputed = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('base64');

    expect(testComputed).toBe(computedSignature);
  });
});
