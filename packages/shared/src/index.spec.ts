import { describe, it, expect } from 'vitest';
import { PIP_EDITION, PIP_ORGANISATION } from './index.js';

describe('@pip/shared baseline', () => {
  it('exports valid edition and organisation constants', () => {
    expect(PIP_EDITION).toBe('5.0');
    expect(PIP_ORGANISATION).toContain('Rotaract Club of Bangalore JP Nagar');
  });
});
