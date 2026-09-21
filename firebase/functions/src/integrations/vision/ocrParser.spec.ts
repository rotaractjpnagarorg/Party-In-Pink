import { describe, it, expect } from 'vitest';
import { parseReceiptOcrText } from './ocrParser.js';

describe('Phase 6: Cloud Vision OCR Receipt Parser', () => {
  it('extracts 12-digit UTR and amount from sample Google Pay receipt', () => {
    const gpayReceiptText = `
      Google Pay
      Paid to Rotaract Club of Bangalore JP Nagar
      ₹199.00
      Completed • 18 Oct 2026, 7:15 AM
      UPI transaction ID: 429218273849
      To: rotaractjpnagar@sbi
      From: Samarth (State Bank of India)
      Google transaction ID: CICAgODVn_eZGw
    `;

    const result = parseReceiptOcrText(gpayReceiptText, 19900);
    expect(result.transactionReference).toBe('429218273849');
    expect(result.extractedAmountPaise).toBe(19900);
    expect(result.paymentStatusText).toMatch(/Completed|Paid/i);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('extracts UTR and amount from sample PhonePe receipt', () => {
    const phonePeText = `
      Transaction Successful
      18 Oct 2026 at 8:30 am
      Paid to
      ROTARACT CLUB OF BANGALORE JP NAGAR
      ₹745
      Debited from
      XXXXXX4012
      UTR: 429188374821
    `;

    const result = parseReceiptOcrText(phonePeText, 74500);
    expect(result.transactionReference).toBe('429188374821');
    expect(result.extractedAmountPaise).toBe(74500);
    expect(result.paymentStatusText).toMatch(/Transaction Successful/i);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('extracts standalone 12-digit reference if label is truncated', () => {
    const truncatedText = `
      Payment Successful
      ₹199
      State Bank of India
      429299881122
    `;

    const result = parseReceiptOcrText(truncatedText, 19900);
    expect(result.transactionReference).toBe('429299881122');
    expect(result.extractedAmountPaise).toBe(19900);
  });

  it('returns confidence 0 and null for empty or non-payment images', () => {
    const randomText = 'Random selfie image with scenery and flowers';
    const result = parseReceiptOcrText(randomText);
    expect(result.transactionReference).toBeNull();
    expect(result.extractedAmountPaise).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
