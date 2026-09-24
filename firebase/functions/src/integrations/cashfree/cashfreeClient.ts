import crypto from 'crypto';
import { CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV } from '../../config/secrets.js';

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone: string;
}

export interface CashfreeOrderMeta {
  return_url?: string;
  notify_url?: string;
  payment_methods?: string;
}

export interface CreateOrderPayload {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: CashfreeCustomerDetails;
  order_meta?: CashfreeOrderMeta;
  order_note?: string;
  order_tags?: Record<string, string>;
}

export interface CashfreeOrderResponse {
  cf_order_id?: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED';
  payment_session_id: string;
  entity: string;
  order_expiry_time?: string;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string;
  order_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_status: 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'PENDING' | 'CANCELLED';
  payment_time: string;
  payment_completion_time?: string;
  payment_message?: string;
  bank_reference?: string;
  payment_method?: Record<string, any>;
}

export class CashfreeClient {
  private appId: string;
  private secretKey: string;
  private isProduction: boolean;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || CASHFREE_APP_ID.value();
    this.secretKey = process.env.CASHFREE_SECRET_KEY || CASHFREE_SECRET_KEY.value();
    const env = (process.env.CASHFREE_ENV || CASHFREE_ENV.value() || '').toUpperCase();
    this.isProduction = env === 'PROD' || env === 'PRODUCTION' || this.secretKey.startsWith('cfsk_ma_prod_');
    this.baseUrl = this.isProduction
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    };
  }

  async createOrder(payload: CreateOrderPayload): Promise<CashfreeOrderResponse> {
    const url = `${this.baseUrl}/orders`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      throw new Error(
        `Cashfree Create Order Error (${res.status}): ${data.message || data.code || JSON.stringify(data)}`
      );
    }
    return data as CashfreeOrderResponse;
  }

  async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    const url = `${this.baseUrl}/orders/${encodeURIComponent(orderId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      throw new Error(
        `Cashfree Get Order Error (${res.status}): ${data.message || data.code || JSON.stringify(data)}`
      );
    }
    return data as CashfreeOrderResponse;
  }

  async getOrderPayments(orderId: string): Promise<CashfreePaymentEntity[]> {
    const url = `${this.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      throw new Error(
        `Cashfree Get Order Payments Error (${res.status}): ${data.message || data.code || JSON.stringify(data)}`
      );
    }
    return Array.isArray(data) ? (data as CashfreePaymentEntity[]) : [];
  }

  verifyWebhookSignature(signature: string, rawBody: string, timestamp: string): boolean {
    if (!signature || !timestamp || !rawBody) return false;
    const signatureData = timestamp + rawBody;
    const computed = crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureData)
      .digest('base64');
    return computed === signature;
  }
}

let cachedClient: CashfreeClient | null = null;
export function getCashfreeClient(): CashfreeClient {
  if (!cachedClient) {
    cachedClient = new CashfreeClient();
  }
  return cachedClient;
}
