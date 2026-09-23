import { onRequest } from 'firebase-functions/v2/https';
import crypto from 'crypto';
import { processPaymentApproval } from '../../approvals/paymentApprovalService.js';
import {
  SLACK_APPROVER_USER_IDS,
  SLACK_SIGNING_SECRET,
  SLACK_TEAM_ID,
} from '../../config/secrets.js';

export function isAuthorizedSlackActor(
  actualTeamId: string | undefined,
  actualUserId: string | undefined,
  expectedTeamId: string | undefined,
  approverIdsCsv: string | undefined
): boolean {
  if (!actualTeamId || !actualUserId) return false;
  const targetTeam = expectedTeamId;
  if (actualTeamId !== targetTeam) return false;

  const targetApprovers = approverIdsCsv;
  // Approval authority must always be explicit. Missing configuration and a
  // wildcard are deployment errors, not permission to approve payments.
  if (!targetApprovers || targetApprovers.trim() === '*') return false;

  const approverIds = new Set(
    targetApprovers
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return approverIds.has(actualUserId);
}

/**
 * Validates Slack webhook request signatures using HMAC-SHA256.
 */
export function verifySlackSignature(
  signingSecret: string | undefined,
  rawBody: Buffer | string | undefined,
  timestamp: string | string[] | undefined,
  slackSignature: string | string[] | undefined
): boolean {
  if (!signingSecret) {
    return false;
  }

  if (!rawBody || !timestamp || !slackSignature) {
    return false;
  }

  const rawTs = Array.isArray(timestamp) ? timestamp[0] : timestamp;
  if (!rawTs) return false;
  const tsNum = parseInt(rawTs, 10);
  const now = Math.floor(Date.now() / 1000);

  // Replay attack protection (5 minute window)
  if (Math.abs(now - tsNum) > 300) {
    return false;
  }

  const sigString = `v0:${tsNum}:${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(sigString).digest('hex');
  const expectedSignature = `v0=${hmac}`;

  const sig = Array.isArray(slackSignature) ? slackSignature[0] : slackSignature;
  if (!sig) return false;
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expectedSignature);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

/**
 * Slack Interactive Webhook Endpoint.
 * Receives button clicks (Approve / Reject / Review) from the Finance channel.
 */
export const slackInteractions = onRequest(
  {
    region: 'asia-south1',
    cors: false,
    secrets: [SLACK_SIGNING_SECRET],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signingSecret = SLACK_SIGNING_SECRET.value();
    const timestamp = req.headers['x-slack-request-timestamp'];
    const signature = req.headers['x-slack-signature'];

    // Verify signature
    const isValid = verifySlackSignature(signingSecret, req.rawBody, timestamp, signature);
    if (!isValid) {
      console.error('[Slack Interactions] Invalid Slack signature rejected.');
      res.status(401).send('Invalid signature');
      return;
    }

    let payload: any = null;
    try {
      // Slack sends interactive payloads as application/x-www-form-urlencoded with 'payload' parameter
      payload = req.body;
      if (typeof req.body === 'object' && req.body.payload) {
        payload = JSON.parse(req.body.payload);
      } else if (typeof req.body === 'string') {
        const parsed = new URLSearchParams(req.body);
        const payloadStr = parsed.get('payload');
        if (payloadStr) {
          payload = JSON.parse(payloadStr);
        }
      }

      if (!payload || !payload.actions || payload.actions.length === 0) {
        res.status(400).send('Missing action payload');
        return;
      }

      if (
        !isAuthorizedSlackActor(
          payload.team?.id,
          payload.user?.id,
          SLACK_TEAM_ID.value(),
          SLACK_APPROVER_USER_IDS.value()
        )
      ) {
        res.status(403).send('Slack user is not authorized to approve payments');
        return;
      }

      const action = payload.actions[0];
      const paymentId = action.value;
      const actionId = action.action_id;
      const slackUserId = payload.user.id as string;
      const slackUser = payload.user?.username || payload.user?.name || slackUserId;
      const actor = `SLACK:${slackUserId}`;

      let decision: 'APPROVE' | 'REJECT' | 'REVIEW';
      if (actionId === 'pip_approve') {
        decision = 'APPROVE';
      } else if (actionId === 'pip_reject') {
        decision = 'REJECT';
      } else if (actionId === 'pip_review') {
        decision = 'REVIEW';
      } else {
        res.status(400).send(`Unknown action ${actionId}`);
        return;
      }

      console.log(
        `[Slack Interactions] Processing ${decision} for payment ${paymentId} by ${actor}`
      );

      // Call authoritative payment approval service
      await processPaymentApproval({
        paymentId,
        decision,
        actor,
        source: 'SLACK',
        notes: `Processed via Slack interaction by @${slackUser}`,
      });

      // Prepare resolution status badge
      const nowFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      let statusBadge = '';
      if (decision === 'APPROVE') {
        statusBadge = `✅ *PAYMENT VERIFIED & APPROVED* by *@${slackUser}* on ${nowFormatted}\n🎟️ Ticket fulfillment initiated. Attendee pass generation queued.`;
      } else if (decision === 'REJECT') {
        statusBadge = `❌ *PAYMENT REJECTED* by *@${slackUser}* on ${nowFormatted}\n⚠️ Payment reference released. Automated rejection notice emailed to buyer.`;
      } else {
        statusBadge = `⚠️ *FLAGGED FOR REVIEW* by *@${slackUser}* on ${nowFormatted}\nUnder investigation with finance desk.`;
      }

      // Preserve existing sections, strip action buttons block entirely, and attach resolution status
      const existingBlocks = payload.message?.blocks || [];
      const updatedBlocks = existingBlocks
        .filter((b: any) => b.block_id !== 'pip_payment_actions' && b.type !== 'actions')
        .concat([
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: statusBadge,
            },
          },
        ]);

      // 1. Asynchronously update Slack message in-place via response_url (required for incoming webhooks)
      if (payload.response_url) {
        try {
          const slackResp = await fetch(payload.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              replace_original: true,
              text: `Payment ${paymentId}: ${decision} by @${slackUser}`,
              blocks: updatedBlocks,
            }),
          });
          console.log(`[Slack Interactions] response_url updated (HTTP ${slackResp.status})`);
        } catch (fetchErr) {
          console.error('[Slack Interactions] Failed to POST to response_url:', fetchErr);
        }
      }

      // 2. Also respond with HTTP 200 payload
      res.status(200).json({
        replace_original: true,
        text: `Payment ${paymentId}: ${decision} by @${slackUser}`,
        blocks: updatedBlocks,
      });
    } catch (err: any) {
      console.error('[Slack Interactions] Error handling interaction:', err);

      const errorMessage = err?.message || 'Failed to process approval action.';
      const isAlreadyResolved =
        err?.code === 'already-exists' ||
        err?.code === 'failed-precondition' ||
        typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('already been');

      // If already resolved, strip the action buttons from Slack so no further clicks can occur
      if (isAlreadyResolved && payload?.response_url) {
        const existingBlocks = payload.message?.blocks || [];
        const cleanBlocks = existingBlocks
          .filter((b: any) => b.block_id !== 'pip_payment_actions' && b.type !== 'actions')
          .concat([
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `ℹ️ *Action Already Completed:*\n${errorMessage}`,
              },
            },
          ]);

        try {
          await fetch(payload.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              replace_original: true,
              text: errorMessage,
              blocks: cleanBlocks,
            }),
          });
        } catch (postErr) {
          console.error('[Slack Interactions] Failed to update response_url on error:', postErr);
        }
      }

      res.status(200).json({
        response_type: 'ephemeral',
        replace_original: false,
        text: `⚠️ Error processing approval: ${errorMessage}`,
      });
    }
  }
);
