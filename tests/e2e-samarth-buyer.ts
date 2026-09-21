import assert from 'node:assert/strict';
import { DEFAULT_PIP5_CONFIG } from '@pip/shared';
import { db } from '../firebase/functions/src/config/firebase.js';
import { processPaymentApproval } from '../firebase/functions/src/approvals/paymentApprovalService.js';

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
  console.log('=== [E2E Live Buyer Test] Starting Journey for samarthv080@gmail.com ===');

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
  console.log('[1/5] Registering single order for Samarth Viswanath...');
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

  console.log(`[1/5] Order created: Reference = ${order.orderReference}, StatusToken = ${order.statusToken}`);
  assert.equal(order.amountPaise, 19900);

  // 3. Create Payment Session
  console.log('[2/5] Creating payment session...');
  const payment = await callable<any>('createPaymentSession', {
    statusToken: order.statusToken,
    method: 'UPI',
  });
  console.log(`[2/5] Payment Session ID = ${payment.sessionId}`);

  // 4. Submit Payment Evidence
  const txnRef = 'UPI-SAMARTH-' + Date.now().toString().slice(-6);
  console.log(`[3/5] Submitting payment evidence (TxnRef: ${txnRef})...`);
  const evidence = await callable<any>('submitPaymentEvidence', {
    statusToken: order.statusToken,
    sessionId: payment.sessionId,
    transactionReference: txnRef,
    source: 'MANUAL_ENTRY',
  });
  console.log(`[3/5] Evidence submitted. Payment Status = ${evidence.paymentStatus}`);

  // 5. Approve Payment as Admin
  console.log('[4/5] Approving payment as Admin...');
  await processPaymentApproval({
    paymentId: payment.sessionId,
    decision: 'APPROVE',
    actor: 'admin@rotaractjpnagar.org',
    source: 'ADMIN_DASHBOARD',
    notes: 'Approved live buyer E2E verification test',
  });
  console.log('[4/5] Payment approved. Triggering asynchronous KonfHub & Brevo workers in emulator...');

  // 6. Wait for Emulator triggers (onTicketJobCreated -> KonfHub capture, onEmailJobCreated -> Brevo email)
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

  // Allow extra 2 seconds for email job to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 7. Verify all collections in Firestore (Admin Dashboard View)
  const [orderSnap, paymentSnap, attendeesSnap, emailJobsSnap] = await Promise.all([
    db.collection('orders').doc(orderId).get(),
    db.collection('payments').doc(payment.sessionId).get(),
    db.collection('attendees').where('orderId', '==', orderId).get(),
    db.collection('emailJobs').where('entityId', '==', orderId).get(),
  ]);

  const orderData = orderSnap.data();
  const paymentData = paymentSnap.data();
  const attendeesData = attendeesSnap.docs.map((d) => d.data());
  const emailJobsData = emailJobsSnap.docs.map((d) => d.data());

  console.log('\n============================================================');
  console.log('             ADMIN DASHBOARD VERIFICATION REPORT             ');
  console.log('============================================================');
  console.log(`Order Reference    : ${orderData?.publicReference}`);
  console.log(`Order Status       : ${orderData?.orderStatus}`);
  console.log(`Payment Status     : ${orderData?.paymentStatus}`);
  console.log(`Buyer Name         : ${orderData?.buyer?.fullName}`);
  console.log(`Buyer Email        : ${orderData?.buyer?.email}`);
  console.log(`Payment Amount     : Rs. ${(orderData?.totalAmountPaise || 0) / 100}`);
  console.log(`Txn Reference      : ${paymentData?.evidence?.transactionReference}`);
  console.log(`Approved By        : ${paymentData?.verification?.verifiedBy}`);
  console.log(`Approved At        : ${paymentData?.verification?.verifiedAt}`);
  console.log('------------------------------------------------------------');
  console.log(`KonfHub Ticket Job : ${ticketJobData?.status}`);
  if (ticketJobData?.providerResult) {
    console.log(`Passes Fulfilled   : ${ticketJobData.providerResult.issuedCount} of ${ticketJobData.providerResult.totalAttendees}`);
    console.log(`KonfHub Ticket IDs : ${JSON.stringify(ticketJobData.providerResult.ticketDetails)}`);
  }
  if (ticketJobData?.lastError) {
    console.log(`Ticket Job Error   : ${ticketJobData.lastError}`);
  }
  console.log('------------------------------------------------------------');
  console.log('Attendees:');
  attendeesData.forEach((att, idx) => {
    console.log(`  [${idx + 1}] ${att.fullName} (${att.email}) - Ticket Status: ${att.ticketStatus}`);
  });
  console.log('------------------------------------------------------------');
  console.log('Email Jobs (Brevo):');
  emailJobsData.forEach((job, idx) => {
    console.log(`  [${idx + 1}] Template: ${job.templateKey} | To: ${job.recipientEmail} | Status: ${job.status} | MsgId: ${job.providerMessageId || 'N/A'}`);
  });
  console.log('============================================================\n');

  // Verify assertions
  assert.equal(orderData?.paymentStatus, 'VERIFIED');
  assert.equal(ticketJobData?.status, 'ISSUED', `Expected ticket job to be ISSUED, but got: ${ticketJobData?.status}`);
  assert.ok(emailJobsData.length >= 1, 'Expected at least one email job');
  console.log('>>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

main().catch((err) => {
  console.error('E2E Test encountered an error:', err);
  process.exitCode = 1;
});
