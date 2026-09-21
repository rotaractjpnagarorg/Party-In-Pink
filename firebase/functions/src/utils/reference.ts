import crypto from 'crypto';

// Non-ambiguous character set (excludes 0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an opaque, human-friendly reference string.
 * @param prefix e.g. 'PIP5-S-', 'PIP5-B-', 'PIP5-D-', 'PAY-'
 * @param length number of random characters to append (default 6)
 */
export function generateReference(prefix: string, length = 6): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    result += CHARSET[byte % CHARSET.length];
  }
  return `${prefix}${result}`;
}

/**
 * Generates an opaque, cryptographically secure status token for public read-only polling.
 */
export function generateStatusToken(): string {
  return crypto.randomBytes(16).toString('hex');
}
