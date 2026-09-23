import { PUBLIC_WEB_URL, SLACK_WEBHOOK_URL } from '../../config/secrets.js';

const SLACK_REQUEST_TIMEOUT_MS = 8_000;

export interface SlackPaymentNotificationInput {
  paymentId: string;
  merchantReference: string;
  entityReference: string;
  entityType: 'ORDER' | 'DONATION';
  amountPaise: number;
  buyerName: string;
  buyerEmail: string;
  method: string;
  utr?: string | null;
  storagePath?: string | null;
  source: string;
  ocrConfidence?: number | string | null;
  statusToken?: string | null;
  isDuplicate?: boolean;
  duplicateRef?: string | null;
}

export function escapeSlackMrkdwn(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds Slack Block Kit interactive payment approval card.
 */
export function buildPaymentApprovalBlocks(input: SlackPaymentNotificationInput) {
  const amountFormatted = `₹${(input.amountPaise / 100).toFixed(2)}`;
  const baseUrl = PUBLIC_WEB_URL?.value?.() || 'https://pip.rotaractjpnagar.org';
  const statusUrl = input.statusToken
    ? `${baseUrl}/status?token=${input.statusToken}`
    : `${baseUrl}/status`;
  const isDonation = input.entityType === 'DONATION';
  const buyerName = escapeSlackMrkdwn(input.buyerName);
  const buyerEmail = escapeSlackMrkdwn(input.buyerEmail);
  const method = escapeSlackMrkdwn(input.method);
  const source = escapeSlackMrkdwn(input.source);
  const storagePath = escapeSlackMrkdwn(input.storagePath);

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `💳 PiP Pay: New ${isDonation ? 'Donation' : 'Ticket Payment'} Submitted`,
        emoji: true,
      },
    },
    ...(input.isDuplicate
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *WARNING: DUPLICATE PAYMENT REFERENCE DETECTED!*\nThis reference \`${input.utr || 'Screenshot'}\` was already used by ${input.duplicateRef ? `*${escapeSlackMrkdwn(input.duplicateRef)}*` : 'another registration'}! Marked as *UNDER REVIEW* — verify bank statement carefully before approving.`,
            },
          },
        ]
      : []),
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Reference:*\n<${statusUrl}|${input.entityReference}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Payable Amount:*\n*${amountFormatted}*`,
        },
        {
          type: 'mrkdwn',
          text: `*Payer / Registrant:*\n${buyerName}\n\`${buyerEmail}\``,
        },
        {
          type: 'mrkdwn',
          text: `*Type:*\n${isDonation ? 'Donation' : 'Event Ticket'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Bank Reference / UTR:*\n*${input.utr || 'Manual verification needed'}*`,
        },
        {
          type: 'mrkdwn',
          text: `*Method & Source:*\n${method} (${source}${input.ocrConfidence ? ` • OCR: ${escapeSlackMrkdwn(input.ocrConfidence)}` : ''})`,
        },
      ],
    },
    ...(input.storagePath
      ? [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📁 *Receipt Evidence:* \`${storagePath}\``,
              },
            ],
          },
        ]
      : []),
    {
      type: 'actions',
      block_id: 'pip_payment_actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: isDonation ? '✅ Approve Donation' : '✅ Approve & Issue Ticket',
            emoji: true,
          },
          style: 'primary',
          action_id: 'pip_approve',
          value: input.paymentId,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Reject Payment',
            emoji: true,
          },
          style: 'danger',
          action_id: 'pip_reject',
          value: input.paymentId,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔍 Flag for Review',
            emoji: true,
          },
          action_id: 'pip_review',
          value: input.paymentId,
        },
      ],
    },
  ];
}

/**
 * Dispatches an interactive Block Kit message to Slack.
 */
export async function notifySlackPaymentSubmitted(
  input: SlackPaymentNotificationInput
): Promise<boolean> {
  const webhookUrl = SLACK_WEBHOOK_URL.value();
  const blocks = buildPaymentApprovalBlocks(input);

  if (!webhookUrl) {
    console.error('[Slack Notifier] SLACK_WEBHOOK_URL is not configured.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        text: `PiP 5.0 Payment: ${input.entityReference} (${input.buyerName} - ₹${input.amountPaise / 100})`,
        blocks,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Slack Notifier] Failed to post to Slack (${response.status}):`, errorText);
      return false;
    }

    console.log(`[Slack Notifier] Notification sent to Slack for ${input.entityReference}`);
    return true;
  } catch (err) {
    console.error('[Slack Notifier] Network error posting to Slack:', err);
    return false;
  }
}

export interface SlackTicketNotificationInput {
  orderReference: string;
  buyerName: string;
  buyerEmail: string;
  ticketCount: number;
  registrationId?: string | null;
  error?: string | null;
}

export async function notifySlackTicketIssued(
  input: SlackTicketNotificationInput
): Promise<boolean> {
  const webhookUrl = SLACK_WEBHOOK_URL.value();
  if (!webhookUrl) return false;

  try {
    const text = `🎟️ *Tickets Delivered:* Pass for *${input.orderReference}* (${input.ticketCount} attendee${input.ticketCount > 1 ? 's' : ''}) generated on KonfHub and emailed to \`${input.buyerEmail}\`${input.registrationId ? ` (Pass ID: \`${input.registrationId}\`)` : ''}`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ text }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Slack Notifier] Failed to post ticket delivery update:', err);
    return false;
  }
}

export async function notifySlackTicketFailed(
  input: SlackTicketNotificationInput
): Promise<boolean> {
  const webhookUrl = SLACK_WEBHOOK_URL.value();
  if (!webhookUrl) return false;

  try {
    const text = `🚨 *Ticket Fulfilment Alert:* KonfHub pass issuance encountered an issue for *${input.orderReference}* (\`${input.buyerEmail}\`):\n\`${input.error || 'Unknown error'}\`\nPlease review in Admin Dashboard.`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ text }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Slack Notifier] Failed to post ticket failure alert:', err);
    return false;
  }
}
