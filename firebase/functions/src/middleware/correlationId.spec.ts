import { describe, it, expect, vi } from 'vitest';
import { getCorrelationId, sanitizeLogData, StructuredLogger } from './correlationId.js';

describe('Correlation ID & Structured Logger', () => {
  it('extracts existing correlation id from request headers', () => {
    const mockReq = {
      headers: {
        'x-correlation-id': 'custom-cid-12345',
      },
    } as unknown as Parameters<typeof getCorrelationId>[0];

    const id = getCorrelationId(mockReq);
    expect(id).toBe('custom-cid-12345');
  });

  it('generates a new unique correlation id when missing', () => {
    const id1 = getCorrelationId();
    const id2 = getCorrelationId();
    expect(id1).toMatch(/^corr_\d+_[a-f0-9]+$/);
    expect(id2).toMatch(/^corr_\d+_[a-f0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('redacts sensitive fields like PAN, passwords, secrets, tokens', () => {
    const raw = {
      donor: 'John Doe',
      pan: 'ABCDE1234F',
      secret: 'supersecret',
      nested: {
        token: 'auth-jwt',
        safeField: 'hello',
      },
    };

    const cleaned = sanitizeLogData(raw) as Record<string, unknown>;
    expect(cleaned.donor).toBe('John Doe');
    expect(cleaned.pan).toBe('[REDACTED]');
    expect(cleaned.secret).toBe('[REDACTED]');
    const nested = cleaned.nested as Record<string, unknown>;
    expect(nested.token).toBe('[REDACTED]');
    expect(nested.safeField).toBe('hello');
  });

  it('logs structured JSON with correlation ID and operation', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new StructuredLogger({ correlationId: 'test-123', operation: 'testOp' });

    logger.info('Test log', { orderId: 'ORD-1' });

    expect(consoleSpy).toHaveBeenCalled();
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const output = JSON.parse(firstCall![0] as string);
    expect(output.level).toBe('INFO');
    expect(output.message).toBe('Test log');
    expect(output.context.correlationId).toBe('test-123');
    expect(output.context.operation).toBe('testOp');
    expect(output.data.orderId).toBe('ORD-1');

    consoleSpy.mockRestore();
  });
});
