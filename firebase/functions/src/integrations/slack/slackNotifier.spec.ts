import { describe, expect, it } from 'vitest';
import { buildPaymentApprovalBlocks, escapeSlackMrkdwn } from './slackNotifier.js';

describe('Slack payment notification rendering', () => {
  it('escapes Slack link and mention control characters', () => {
    expect(escapeSlackMrkdwn('<!channel> <https://evil.test|review> &')).toBe(
      '&lt;!channel&gt; &lt;https://evil.test|review&gt; &amp;'
    );

    const blocks = buildPaymentApprovalBlocks({
      paymentId: 'payment-1',
      merchantReference: 'PAY-1',
      entityReference: 'PIP5-S-1',
      entityType: 'ORDER',
      amountPaise: 23900,
      buyerName: '<!channel>',
      buyerEmail: '<https://evil.test|finance@example.com>',
      method: 'UPI',
      source: 'MANUAL_ENTRY',
    });
    const serialized = JSON.stringify(blocks);
    expect(serialized).not.toContain('<!channel>');
    expect(serialized).not.toContain('<https://evil.test');
    expect(serialized).toContain('&lt;!channel&gt;');
  });
});
