import { describe, expect, it } from 'vitest';
import { isSupportedReceiptImage } from './receiptOcrService.js';

describe('receipt byte validation', () => {
  it('accepts matching PNG, complete JPEG, and WebP signatures', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16),
    ]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xd9]);
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP'),
    ]);

    expect(isSupportedReceiptImage(png, 'image/png')).toBe(true);
    expect(isSupportedReceiptImage(jpeg, 'image/jpeg')).toBe(true);
    expect(isSupportedReceiptImage(webp, 'image/webp')).toBe(true);
  });

  it('rejects spoofed, truncated, and MIME-mismatched data', () => {
    expect(isSupportedReceiptImage(Buffer.from('not an image'), 'image/png')).toBe(false);
    expect(isSupportedReceiptImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(
      false
    );
    expect(
      isSupportedReceiptImage(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(16).fill(0)]),
        'image/jpeg'
      )
    ).toBe(false);
  });
});
