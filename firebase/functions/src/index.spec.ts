import { describe, it, expect } from 'vitest';
import * as functionsModule from './index.js';

describe('@pip/functions baseline', () => {
  it('exports healthCheck Cloud Function', () => {
    expect(functionsModule.healthCheck).toBeDefined();
  });
});
