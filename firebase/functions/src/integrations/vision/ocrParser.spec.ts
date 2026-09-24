import { describe, it, expect } from 'vitest';
import { parseReceiptOcrText } from './ocrParser.js';

describe('parseReceiptOcrText', () => {
  it('handles empty or whitespace text', () => {
    const res = parseReceiptOcrText('');
    expect(res.transactionReference).toBeNull();
    expect(res.extractedAmountPaise).toBeNull();
    expect(res.paymentStatusText).toBeNull();
  });

  it('parses Google Pay receipt with UPI transaction ID', () => {
    const text = `
      Paid to Rotaract Club of Bangalore JP Nagar
      ₹239
      Completed
      24 Sep 2026, 7:15 pm
      UPI transaction ID
      426829104821
      To: rotaractbangalorejpnagar@hdfcbank
      From: John Doe (State Bank of India)
      Google transaction ID: CICAgPDLz_nZHA
    `;
    const res = parseReceiptOcrText(text, 23900);
    expect(res.transactionReference).toBe('426829104821');
    expect(res.extractedAmountPaise).toBe(23900);
    expect(res.paymentStatusText).toMatch(/Completed/i);
    expect(res.confidence).toBeGreaterThan(0.8);
  });

  it('parses PhonePe receipt with UTR and spaces in digits', () => {
    const text = `
      Payment Successful
      ₹ 239.00
      Paid to Party In Pink 5.0
      Transaction ID: T2409241915482910482142
      UTR: 4268 2910 4821
      Debited from: State Bank of India - 1234
    `;
    const res = parseReceiptOcrText(text, 23900);
    expect(res.transactionReference).toBe('426829104821');
    expect(res.extractedAmountPaise).toBe(23900);
    expect(res.paymentStatusText).toMatch(/Payment Successful/i);
  });

  it('parses Paytm receipt with UPI Ref No. and dot', () => {
    const text = `
      Money Sent Successfully
      To Rotaract Club
      ₹239
      UPI Ref No. 426829104821
      24 Sep 2026, 07:15 PM
    `;
    const res = parseReceiptOcrText(text, 23900);
    expect(res.transactionReference).toBe('426829104821');
    expect(res.extractedAmountPaise).toBe(23900);
  });

  it('parses Bank app receipt with RRN', () => {
    const text = `
      Transfer Successful
      Amount: INR 239.00
      Beneficiary: Rotaract Club of Bangalore JP Nagar
      RRN : 426829104821
    `;
    const res = parseReceiptOcrText(text, 23900);
    expect(res.transactionReference).toBe('426829104821');
    expect(res.extractedAmountPaise).toBe(23900);
  });

  it('parses standalone 12-digit number when label is missing', () => {
    const text = `
      Paid Successfully
      ₹239
      426829104821
      HDFC Bank
    `;
    const res = parseReceiptOcrText(text, 23900);
    expect(res.transactionReference).toBe('426829104821');
    expect(res.extractedAmountPaise).toBe(23900);
  });
});
