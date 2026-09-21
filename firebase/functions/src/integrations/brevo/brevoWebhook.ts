import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { BREVO_WEBHOOK_SECRET } from '../../config/secrets.js';

export function verifyBrevoWebhookSecret(
  configuredSecret: string | undefined,
  suppliedSecret: string | undefined
): boolean {
  if (!configuredSecret || !suppliedSecret) return false;
  const expected = Buffer.from(configuredSecret);
  const actual = Buffer.from(suppliedSecret);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function normalizeBrevoEvent(eventType: string): string | null {
  const normalized = eventType.trim().toLowerCase();
  const statusMap: Record<string, string> = {
    request: 'SENT',
    sent: 'SENT',
    delivered: 'DELIVERED',
    deferred: 'DEFERRED',
    soft_bounce: 'BOUNCED',
    hard_bounce: 'BOUNCED',
    blocked: 'BLOCKED',
    invalid: 'FAILED',
    error: 'FAILED',
  };
  return statusMap[normalized] || null;
}

export function shouldAdvanceBrevoStatus(current: string | undefined, next: string): boolean {
  const rank: Record<string, number> = {
    SENT: 1,
    DEFERRED: 2,
    BOUNCED: 3,
    BLOCKED: 3,
    FAILED: 3,
    DELIVERED: 4,
  };
  return (rank[next] || 0) >= (rank[current || ''] || 0);
}

/**
 * Brevo Delivery Webhook endpoint.
 * Receives delivery, bounce, block, and engagement notifications from Brevo SMTP.
 * Updates communications records in Firestore for auditability and delivery tracking.
 */
export const brevoWebhook = onRequest(
  {
    region: 'asia-south1',
    cors: false,
    secrets: [BREVO_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
      return;
    }

    const suppliedSecret =
      req.header('x-pip-webhook-secret') || req.header('x-brevo-webhook-secret');
    if (!verifyBrevoWebhookSecret(BREVO_WEBHOOK_SECRET.value(), suppliedSecret)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    try {
      const body = req.body;
      if (!body) {
        res.status(400).json({ error: 'Missing request body' });
        return;
      }

      // Handle both single event object and batch array of events
      const events = Array.isArray(body) ? body : [body];
      const db = getFirestore();
      const nowIso = new Date().toISOString();

      for (const item of events) {
        const eventType = item.event || item.type;
        const email = item.email || item.recipient;
        const messageId = item['message-id'] || item.messageId || item['message_id'];
        const reason = item.reason || item.description || null;

        if (!eventType || !messageId) {
          continue;
        }

        const normalizedStatus = normalizeBrevoEvent(eventType);
        if (!normalizedStatus) continue;

        // 1. Locate communication record by messageId
        let commDoc: FirebaseFirestore.DocumentSnapshot | null = null;

        if (messageId) {
          const snapshot = await db
            .collection('communications')
            .where('providerMessageId', '==', messageId)
            .limit(1)
            .get();

          if (!snapshot.empty && snapshot.docs[0]) {
            commDoc = snapshot.docs[0];
          }
        }

        if (commDoc && commDoc.exists) {
          const communication = commDoc.data();
          if (email && communication?.recipientEmail !== email) {
            console.warn(`[Brevo Webhook] Recipient mismatch for messageId "${messageId}".`);
            continue;
          }
          await db.runTransaction(async (transaction) => {
            const fresh = await transaction.get(commDoc!.ref);
            if (
              !fresh.exists ||
              !shouldAdvanceBrevoStatus(fresh.data()?.status, normalizedStatus)
            ) {
              return;
            }
            transaction.update(commDoc!.ref, {
              status: normalizedStatus,
              providerEvent: eventType,
              eventReason: reason,
              webhookReceivedAt: nowIso,
              updatedAt: nowIso,
            });
          });

          console.log(
            `[Brevo Webhook] Updated communication ${commDoc.id} for ${email}: status = ${normalizedStatus}`
          );
        } else {
          // Log unmatched event for diagnostic inspection
          console.warn(
            `[Brevo Webhook] No matching communication record found for messageId "${messageId}", email "${email}" (event: ${normalizedStatus})`
          );
        }
      }

      res.status(200).json({ success: true, processedCount: events.length });
    } catch (err: any) {
      console.error('[Brevo Webhook] Error processing payload:', err);
      res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  }
);
