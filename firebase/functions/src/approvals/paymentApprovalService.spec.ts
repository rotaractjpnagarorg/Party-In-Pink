import { describe, it, expect } from 'vitest';
import { buildPaymentApprovalBlocks } from '../integrations/slack/slackNotifier.js';

describe('Slack Notifier & Block Kit Builder', () => {
  it('generates correct Block Kit structure with interactive action buttons', () => {
    const blocks = buildPaymentApprovalBlocks({
      paymentId: 'pay_test_123',
      merchantReference: 'PAY-8921',
      entityReference: 'PIP5-S-9912',
      entityType: 'ORDER',
      amountPaise: 19900,
      buyerName: 'Pooja Sharma',
      buyerEmail: 'pooja@example.com',
      method: 'UPI',
      utr: '429182736451',
      storagePath: 'receipts/pay_test_123/receipt.png',
      source: 'RECEIPT_UPLOAD',
      ocrConfidence: 'HIGH',
      statusToken: 'tok_abc',
    });

    expect(blocks.length).toBeGreaterThanOrEqual(3);
    expect(blocks[0]?.type).toBe('header');
    expect((blocks[0] as any)?.text?.text).toContain('PiP Pay');

    // Section fields check
    const section = blocks[1] as any;
    expect(section?.type).toBe('section');
    expect(section?.fields.some((f: any) => f.text.includes('₹199.00'))).toBe(true);
    expect(section.fields.some((f: any) => f.text.includes('429182736451'))).toBe(true);
    expect(section.fields.some((f: any) => f.text.includes('Pooja Sharma'))).toBe(true);

    // Actions block check
    const actions = blocks.find((b: any) => b.type === 'actions') as any;
    expect(actions).toBeDefined();
    expect(actions.elements.length).toBe(3);
    expect(actions.elements[0].action_id).toBe('pip_approve');
    expect(actions.elements[1].action_id).toBe('pip_reject');
    expect(actions.elements[2].action_id).toBe('pip_review');
    expect(actions.elements[0].value).toBe('pay_test_123');
  });
});
