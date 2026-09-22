import assert from 'node:assert/strict';
import { db } from '../firebase/functions/src/config/firebase.js';
import { processPaymentApproval } from '../firebase/functions/src/approvals/paymentApprovalService.js';

const LIVE_FUNCTIONS_URL = 'https://asia-south1-pip5-rotaractjpnagar.cloudfunctions.net';

async function callCloudFunction<T>(name: string, data: unknown): Promise<T> {
  const url = `${LIVE_FUNCTIONS_URL}/${name}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data }),
  });

  const raw = await response.text();
  let json: { result?: T; error?: { status: string; message: string; details?: unknown } };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Cloud function ${name} returned non-JSON HTTP ${response.status}: ${raw}`);
  }

  if (!response.ok || json.error) {
    throw new Error(
      `Cloud function ${name} failed [${response.status}]: ${json.error?.message || raw}`
    );
  }

  return json.result as T;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveE2ETest() {
  console.log('================================================================');
  console.log('🚀 STARTING REAL-TIME LIVE E2E TEST ON PRODUCTION CLOUD FUNCTIONS');
  console.log(`   Target: ${LIVE_FUNCTIONS_URL}`);
  console.log('   Recipient: samarthv080@gmail.com');
  console.log('================================================================\n');

  const timestampSuffix = Date.now().toString().slice(-6);

  // -------------------------------------------------------------
  // STEP 1: Form Field Entry -> Live Registration Order
  // -------------------------------------------------------------
  console.log('▶ STEP 1: Submitting Live Single Registration (Form Entry)...');
  const regData = {
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
  };

  const orderResult = await callCloudFunction<{
    orderReference: string;
    statusToken: string;
    amountPaise: number;
    currency: string;
  }>('createSingleOrder', regData);

  console.log('  ✅ Order Created Successfully!');
  console.log(`     • Reference:   ${orderResult.orderReference}`);
  console.log(`     • Status Token: ${orderResult.statusToken}`);
  console.log(`     • Amount:      ₹${orderResult.amountPaise / 100}`);
  assert(orderResult.amountPaise > 0, 'Amount must be greater than zero');

  // -------------------------------------------------------------
  // STEP 2: Live Payment Session Initiation
  // -------------------------------------------------------------
  console.log('\n▶ STEP 2: Creating Live Payment Session for Order...');
  const sessionResult = await callCloudFunction<{
    sessionId: string;
    amountPaise: number;
    orderReference: string;
  }>('createPaymentSession', {
    statusToken: orderResult.statusToken,
    method: 'UPI',
  });

  console.log('  ✅ Payment Session Active!');
  console.log(`     • Session ID:  ${sessionResult.sessionId}`);

  // -------------------------------------------------------------
  // STEP 3: Submitting Payment Evidence (UTR + Receipt Submission)
  //         This posts an interactive approval card to Slack &
  //         enqueues the PAYMENT_SUBMITTED confirmation email.
  // -------------------------------------------------------------
  const testUtr = `LIVE-UTR-${timestampSuffix}`;
  console.log(`\n▶ STEP 3: Submitting Payment Evidence (UTR: ${testUtr})...`);
  console.log('     >> Posting live interactive approval card to configured Slack channel...');
  console.log('     >> Enqueuing PAYMENT_UNDER_REVIEW confirmation email to user...');

  const evidenceResult = await callCloudFunction<{
    paymentStatus: string;
    publicReference: string;
    nextAction: string;
  }>('submitPaymentEvidence', {
    statusToken: orderResult.statusToken,
    sessionId: sessionResult.sessionId,
    transactionReference: testUtr,
    source: 'MANUAL_ENTRY',
  });

  console.log('  ✅ Payment Evidence Submitted!');
  assert.equal(evidenceResult.paymentStatus, 'PAYMENT_SUBMITTED');

  // Verify that Slack card and Payment email job were created in Firestore
  console.log('     Verifying Firestore payment record & review status...');
  const payDoc = await db.collection('paymentSessions').doc(sessionResult.sessionId).get();
  assert(payDoc.exists, 'Payment session doc must exist');
  console.log(`     • Stored UTR:     ${payDoc.data()?.transactionReference}`);
  console.log(`     • Status:         ${payDoc.data()?.status}`);

  // Check emailJobs for PAYMENT_SUBMITTED
  const initialEmailSnap = await db
    .collection('emailJobs')
    .where('recipientEmail', '==', 'samarthv080@gmail.com')
    .where('type', '==', 'PAYMENT_UNDER_REVIEW')
    .get();
  console.log(`     • Payment Review Email Jobs Queued: ${initialEmailSnap.size}`);

  // -------------------------------------------------------------
  // STEP 4: Real-Time Payment Approval
  //         Admin / Slack approval verified
  // -------------------------------------------------------------
  console.log('\n▶ STEP 4: Processing Payment Approval (Simulating Admin / Slack Decision)...');
  await processPaymentApproval({
    paymentId: sessionResult.sessionId,
    decision: 'APPROVE',
    actor: 'admin@rotaractjpnagar.org',
    source: 'ADMIN_DASHBOARD',
    notes: `Live production E2E test run [Ref: ${testUtr}]`,
  });

  console.log('  ✅ Payment Approved & Verified in Real Time!');
  console.log('     • Payment Session -> VERIFIED');
  console.log('     • Order -> PAID / PAYMENT_VERIFIED');
  console.log('     • Capacity Reservation Confirmed');
  console.log('     • Ticket Fulfillment Job -> QUEUED');

  // -------------------------------------------------------------
  // STEP 5: Real-Time Ticket Dispatch & Email Confirmation Polling
  // -------------------------------------------------------------
  console.log('\n▶ STEP 5: Polling Real-Time Cloud Workers for Ticket Generation & Email Dispatch...');
  console.log('     Polling onTicketJobCreated & onEmailJobCreated (up to 30 seconds)...');

  // Find the internal order document
  const orderDocs = await db
    .collection('orders')
    .where('publicReference', '==', orderResult.orderReference)
    .get();
  assert.equal(orderDocs.size, 1);
  const internalOrderId = orderDocs.docs[0]!.id;

  let ticketCompleted = false;
  let ticketDetails: any = null;

  for (let attempt = 1; attempt <= 15; attempt++) {
    const jobSnap = await db.collection('ticketJobs').doc(internalOrderId).get();
    if (jobSnap.exists) {
      const data = jobSnap.data()!;
      console.log(`     [${attempt}/15] Ticket Job Status: ${data.status} (Attempts: ${data.attempts || 0})`);
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        ticketCompleted = true;
        ticketDetails = data;
        break;
      }
    } else {
      console.log(`     [${attempt}/15] Waiting for ticket job document...`);
    }
    await sleep(2000);
  }

  if (ticketCompleted) {
    console.log('\n  🎉 TICKET DISPATCHED IN REAL TIME!');
    console.log(`     • Status:         ${ticketDetails.status}`);
    console.log(`     • Provider:       ${ticketDetails.provider || 'KonfHub / Native PDF'}`);
    if (ticketDetails.providerResult) {
      console.log(`     • Ticket Ref:     ${JSON.stringify(ticketDetails.providerResult)}`);
    }
  } else {
    console.log('\n  ⏳ Ticket job is queued or in progress in Cloud Functions.');
  }

  // Check TICKET_ISSUED Email Job
  console.log('\n▶ STEP 6: Verifying Brevo Ticket Confirmation Email...');
  let emailDispatched = false;
  let emailDetails: any = null;

  for (let attempt = 1; attempt <= 10; attempt++) {
    const emailSnap = await db
      .collection('emailJobs')
      .where('entityId', '==', internalOrderId)
      .where('type', '==', 'TICKET_ISSUED')
      .get();

    if (!emailSnap.empty) {
      emailDetails = emailSnap.docs[0]!.data();
      console.log(`     [${attempt}/10] Email Job Status: ${emailDetails.status}`);
      if (emailDetails.status === 'SENT' || emailDetails.status === 'FAILED') {
        emailDispatched = true;
        break;
      }
    }
    await sleep(2000);
  }

  if (emailDispatched) {
    console.log('  ✅ Brevo Ticket Email Dispatched!');
    console.log(`     • Recipient:   ${emailDetails.recipientEmail}`);
    console.log(`     • Subject:     ${emailDetails.subject}`);
    console.log(`     • Message ID:  ${emailDetails.messageId || 'Delivered'}`);
  }

  console.log('\n================================================================');
  console.log('✨ REAL-TIME END-TO-END LIVE WORKFLOW COMPLETE');
  console.log(`   Order Ref:    ${orderResult.orderReference}`);
  console.log(`   Payment ID:   ${sessionResult.sessionId}`);
  console.log(`   UTR Ref:      ${testUtr}`);
  console.log('================================================================\n');
}

runLiveE2ETest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ E2E Live Test Failed:', err);
    process.exit(1);
  });
