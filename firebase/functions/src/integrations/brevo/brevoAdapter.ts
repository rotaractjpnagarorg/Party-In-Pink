import https from 'https';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from '../../config/secrets.js';

export interface SendEmailInput {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
  idempotencyKey?: string;
  attachment?: Array<{ url: string; name: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function postJSON(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ ok: boolean; status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = { raw };
        }
        resolve({
          ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
          status: res.statusCode ?? 500,
          json,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Brevo API timeout (15s)'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Sends transactional email via Brevo REST API v3.
 * Gracefully logs to console in staging/dev if API key is not set.
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = BREVO_API_KEY.value();
  const senderEmail = BREVO_SENDER_EMAIL.value();
  const senderName = BREVO_SENDER_NAME.value();

  if (!apiKey) {
    return {
      success: false,
      error: 'BREVO_API_KEY is not configured.',
    };
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        name: input.recipientName,
        email: input.recipientEmail,
      },
    ],
    subject: input.subject,
    htmlContent: input.htmlContent,
    textContent: input.textContent || undefined,
    tags: input.tags || ['pip5'],
    ...(input.attachment && input.attachment.length > 0 ? { attachment: input.attachment } : {}),
  };

  try {
    const response = await postJSON(
      BREVO_ENDPOINT,
      {
        'api-key': apiKey,
        accept: 'application/json',
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      },
      JSON.stringify(payload)
    );

    if (response.ok) {
      const messageId =
        response.json?.messageId || response.json?.messageIds?.[0] || `BREVO-${Date.now()}`;
      return {
        success: true,
        messageId,
      };
    } else {
      console.error('[Brevo Adapter] Send email failed:', response.json);
      return {
        success: false,
        error: response.json?.message || `HTTP ${response.status}`,
      };
    }
  } catch (err: any) {
    console.error('[Brevo Adapter] Network error:', err);
    return {
      success: false,
      error: err?.message || 'Network error communicating with Brevo',
    };
  }
}
