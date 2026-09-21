import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DEFAULT_PIP5_CONFIG } from '@pip/shared';
import { db } from '../firebase/functions/src/config/firebase.js';

const baseUrl = 'http://127.0.0.1:5001/demo-pip5/asia-south1';

async function callable<T>(name: string, data: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const rawBody = await response.text();
  let body: { result?: T; error?: { status: string; message: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error(`${name} returned HTTP ${response.status}: ${rawBody}`);
  }
  if (!response.ok || body.error || body.result === undefined) {
    throw new Error(`${name} failed: ${JSON.stringify(body.error || body)}`);
  }
  return body.result;
}

async function main() {
  console.log('=== [E2E Slack Ticketing Test] Starting Slack Approval Journey ===');

  // 1. Initialize Event Config
  await db
    .collection('events')
    .doc('PIP5')
    .set(
      {
        ...DEFAULT_PIP5_CONFIG,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  // 2. Create Single Order for Samarth Viswanath
  console.log('[1/5] Registering single order...');
  const order = await callable<any>('createSingleOrder', {
    fullName: 'Samarth Viswanath',
    email: 'samarthv080@gmail.com',
    mobileNumber: '9876543210',
    whatsappSameAsMobile: true,
    city: 'Bengaluru',
    affiliationType: 'INDEPENDENT',
    consents: {
      termsAndParticipation: true,
      photoVideoAcknowledgement: true,
      marketingUpdates: true,
    },
  });

  console.log(`[1/5] Order created: Reference = ${order.orderReference}`);

  // 3. Create Payment Session
  console.log('[2/5] Creating payment session...');
  const payment = await callable<any>('createPaymentSession', {
    statusToken: order.statusToken,
    method: 'UPI',
  });
  console.log(`[2/5] Payment Session ID = ${payment.sessionId}`);

  // 4. Submit Payment Evidence (This posts the interactive card to your Slack channel!)
  const txnRef = 'UPI-SLACK-' + Date.now().toString().slice(-6);
  console.log(`[3/5] Submitting payment evidence (TxnRef: ${txnRef})...`);
  console.log('      >> Check your Slack channel: an interactive approval card will be posted now!');
  const evidence = await callable<any>('submitPaymentEvidence', {
    statusToken: order.statusToken,
    sessionId: payment.sessionId,
    transactionReference: txnRef,
    source: 'MANUAL_ENTRY',
  });
  console.log(`[3/5] Evidence submitted. Payment Status = ${evidence.paymentStatus}`);

  // 5. Approve via Signed Slack Interaction Webhook
  console.log('[4/5] Simulating Slack [Approve & Issue Ticket] button click via signed webhook...');
  const signingSecret = process.env.SLACK_SIGNING_SECRET || 'test_slack_signing_secret';
  const teamId = process.env.SLACK_TEAM_ID || 'TTEST00001';
  const userId = process.env.SLACK_APPROVER_USER_ID || 'UTEST00001';

  const slackPayload = {
    type: 'block_actions',
    team: { id: teamId },
    user: { id: userId, username: 'samarth', name: 'Samarth Viswanath' },
    actions: [
      {
        action_id: 'pip_approve',
        block_id: 'pip_payment_actions',
        value: payment.sessionId,
      },
    ],
    message: {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `Reference: ${order.orderReference}` },
        },
      ],
    },
  };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = `payload=${encodeURIComponent(JSON.stringify(slackPayload))}`;
  const sigBase = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex')}`;

  const slackResponse = await fetch(`${baseUrl}/slackInteractions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': signature,
    },
    body: rawBody,
  });

  const slackResponseBody = await slackResponse.text();
  console.log(`[4/5] Slack interaction response status: ${slackResponse.status}`);
  assert.equal(slackResponse.status, 200, `Slack interaction failed: ${slackResponseBody}`);
  console.log(`[4/5] Payment verified via Slack! Ticket fulfillment job queued.`);

  // 6. Wait for Emulator triggers (onTicketJobCreated -> KonfHub capture -> onEmailJobCreated -> Brevo email)
  console.log('[5/5] Polling for KonfHub pass generation & Brevo email dispatch (up to 20s)...');
  const orderDocSnap = await db.collection('orders').where('publicReference', '==', order.orderReference).get();
  assert.equal(orderDocSnap.size, 1);
  const orderId = orderDocSnap.docs[0]!.id;

  let ticketJobData: any = null;
  for (let i = 0; i < 20; i++) {
    const snap = await db.collection('ticketJobs').doc(orderId).get();
    ticketJobData = snap.data();
    if (ticketJobData && (ticketJobData.status === 'ISSUED' || ticketJobData.status === 'REVIEW_REQUIRED')) {
      console.log(`[5/5] Ticket job reached status: ${ticketJobData.status} after ${i + 1}s`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Allow extra 2 seconds for email jobs and Slack follow-up notification
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 7. Verify Firestore collections
  const [orderSnap, paymentSnap, emailJobsSnap] = await Promise.all([
    db.collection('orders').doc(orderId).get(),
    db.collection('paymentSessions').doc(payment.sessionId).get(),
    db.collection('emailJobs').where('entityId', '==', orderId).get(),
  ]);

  const orderData = orderSnap.data();
  const paymentData = paymentSnap.data();

  console.log('\n' + '='.repeat(60));
  console.log('             SLACK APPROVAL & TICKETING REPORT              ');
  console.log('='.repeat(60));
  console.log(`Order Reference    : ${orderData?.publicReference}`);
  console.log(`Order Status       : ${orderData?.orderStatus}`);
  console.log(`Payment Status     : ${paymentData?.status}`);
  console.log(`Verified By        : ${paymentData?.verification?.verifiedBy}`);
  console.log(`Verification Method: ${paymentData?.verification?.method}`);
  console.log(`Buyer Email        : ${orderData?.buyer?.email}`);
  console.log('-'.repeat(60));
  console.log(`KonfHub Ticket Job : ${ticketJobData?.status}`);
  console.log(`KonfHub Pass IDs   : ${JSON.stringify(ticketJobData?.providerResult?.ticketDetails || [])}`);
  console.log('-'.repeat(60));
  console.log('Email Jobs (Brevo):');
  emailJobsSnap.docs.forEach((d, idx) => {
    const ej = d.data();
    console.log(`  [${idx + 1}] Template: ${ej.templateKey} | To: ${ej.recipientEmail} | Status: ${ej.status} | MsgId: ${ej.brevoMessageId || 'N/A'}`);
  });
  console.log('='.repeat(60));

  assert.equal(orderData?.orderStatus, 'CONFIRMED');
  assert.equal(paymentData?.status, 'VERIFIED');
  assert.equal(paymentData?.verification?.method, 'SLACK_MANUAL');
  assert.equal(paymentData?.verification?.verifiedBy, `SLACK:${userId}`);
  assert.equal(ticketJobData?.status, 'ISSUED');

  console.log('\n>>> SLACK APPROVAL & TICKETING WORKFLOW 100% VERIFIED! <<<\n');
}

main().catch((err) => {
  console.error('Fatal E2E Slack test error:', err);
  process.exit(1);
});
