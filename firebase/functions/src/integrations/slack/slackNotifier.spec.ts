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

  it('renders confirmation dialogs on approval and rejection buttons to prevent accidental clicks', () => {
    const blocks: any[] = buildPaymentApprovalBlocks({
      paymentId: 'pay_999',
      merchantReference: 'PIP5-S-TEST01',
      entityReference: 'PIP5-S-TEST01',
      entityType: 'ORDER',
      amountPaise: 47800,
      buyerName: 'Sneha Rao',
      buyerEmail: 'sneha@example.com',
      method: 'UPI',
      source: 'RECEIPT_UPLOAD',
    });

    const actionsBlock = blocks.find((b: any) => b.block_id === 'pip_payment_actions');
    expect(actionsBlock).toBeDefined();

    const approveButton = actionsBlock.elements.find((el: any) => el.action_id === 'pip_approve');
    expect(approveButton).toBeDefined();
    expect(approveButton.confirm).toBeDefined();
    expect(approveButton.confirm.title.text).toBe('Approve & Issue Entry Pass?');
    expect(approveButton.confirm.confirm.text).toBe('Yes, Approve');

    const rejectButton = actionsBlock.elements.find((el: any) => el.action_id === 'pip_reject');
    expect(rejectButton).toBeDefined();
    expect(rejectButton.confirm).toBeDefined();
    expect(rejectButton.confirm.title.text).toBe('Reject Payment Submission?');
    expect(rejectButton.confirm.confirm.text).toBe('Yes, Reject');
  });

  it('renders clickable signed receipt link when receiptUrl is provided', () => {
    const blocks: any[] = buildPaymentApprovalBlocks({
      paymentId: 'pay_999',
      merchantReference: 'PIP5-S-TEST01',
      entityReference: 'PIP5-S-TEST01',
      entityType: 'ORDER',
      amountPaise: 23900,
      buyerName: 'Sneha Rao',
      buyerEmail: 'sneha@example.com',
      method: 'UPI',
      storagePath: 'receipts/pay_999/receipt',
      receiptUrl: 'https://storage.googleapis.com/pip5-bucket/signed-receipt-url',
      source: 'RECEIPT_UPLOAD',
    });

    const receiptSection = blocks.find((b: any) =>
      b.text?.text?.includes('Receipt Evidence:')
    );
    expect(receiptSection).toBeDefined();
    expect(receiptSection.text.text).toContain(
      '<https://storage.googleapis.com/pip5-bucket/signed-receipt-url|🔍 *View Uploaded Screenshot (Click to Open)*>'
    );
  });
});

