import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function getCorrelationId(req?: Request): string {
  if (req) {
    const existing = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    if (existing && typeof existing === 'string' && existing.trim().length > 0) {
      return existing.trim();
    }
  }
  return `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

const REDACTED_KEYS = new Set([
  'pan',
  'password',
  'secret',
  'token',
  'apikey',
  'authorization',
  'card',
  'cvv',
]);

export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface LogContext {
  correlationId?: string;
  operation?: string;
  orderId?: string;
  paymentId?: string;
  actorId?: string;
  [key: string]: unknown;
}

export class StructuredLogger {
  private baseContext: LogContext;

  constructor(context: LogContext = {}) {
    this.baseContext = {
      correlationId: context.correlationId || getCorrelationId(),
      ...context,
    };
  }

  private formatMessage(
    level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT',
    message: string,
    data?: unknown
  ) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.baseContext,
      data: data ? sanitizeLogData(data) : undefined,
    };
    return JSON.stringify(entry);
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, error?: unknown, data?: unknown): void {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    console.error(
      this.formatMessage('ERROR', message, { error: errorDetails, ...((data as object) || {}) })
    );
  }

  audit(message: string, auditPayload: Record<string, unknown>): void {
    console.log(this.formatMessage('AUDIT', message, auditPayload));
  }

  child(context: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.baseContext,
      ...context,
    });
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = getCorrelationId(req);
  res.setHeader('x-correlation-id', correlationId);
  (req as unknown as { correlationId: string }).correlationId = correlationId;
  next();
}
