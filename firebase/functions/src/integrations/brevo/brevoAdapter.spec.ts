import { describe, it, expect } from 'vitest';
import { sendTransactionalEmail } from './brevoAdapter.js';

describe('Brevo Adapter', () => {
  it('fails closed when BREVO_API_KEY is not set', async () => {
    delete process.env.BREVO_API_KEY;

    const result = await sendTransactionalEmail({
      recipientEmail: 'test@example.com',
      recipientName: 'Test Recipient',
      subject: 'Test Subject',
      htmlContent: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });
});
