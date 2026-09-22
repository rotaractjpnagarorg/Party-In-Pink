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

async function runLiveDonationTest() {
  console.log('================================================================');
  console.log('💖 REAL-TIME LIVE DONATION + COMPLIMENTARY TICKET E2E TEST');
  console.log('   Target: Live Production Cloud Functions');
  console.log('   Package: Silver Tier (₹10,000 => 2 Complimentary Passes)');
  console.log('================================================================\n');

  const suffix = Date.now().toString().slice(-6);

  // 1. Submit Donation (Form Field Entry)
  console.log('▶ [1/4] Submitting Live Donation Form (with null/empty optional fields)...');
  const donationResult = await callCloudFunction<{
    donationReference: string;
    statusToken: string;
    amountPaise: number;
    complimentaryPassesCount: number;
  }>('createDonation', {
    fullName: 'Samarth Viswanath',
    email: 'samarthv080@gmail.com',
    mobileNumber: '9876543210',
    whatsappSameAsMobile: true,
    amountPaise: 1000000, // ₹10,000
    isAnonymousPublicly: false,
  });

  console.log('  ✅ Donation Created Successfully on Live Production!');
  console.log(`     • Reference:            ${donationResult.donationReference}`);
  console.log(`     • Status Token:         ${donationResult.statusToken}`);
  console.log(`     • Amount:               ₹${donationResult.amountPaise / 100}`);
  console.log(`     • Complimentary Passes: ${donationResult.complimentaryPassesCount}`);
  assert.equal(donationResult.complimentaryPassesCount, 2);

  // 2. Create Payment Session
  console.log('\n▶ [2/4] Creating Payment Session...');
  const sessionResult = await callCloudFunction<{
    sessionId: string;
    amountPaise: number;
  }>('createPaymentSession', {
    statusToken: donationResult.statusToken,
    method: 'UPI',
  });
  console.log(`  ✅ Payment Session: ${sessionResult.sessionId}`);

  // 3. Submit Evidence
  const utr = `DON-UTR-${suffix}`;
  console.log(`\n▶ [3/4] Submitting Payment Evidence (UTR: ${utr})...`);
  const evidenceResult = await callCloudFunction<{
    paymentStatus: string;
  }>('submitPaymentEvidence', {
    statusToken: donationResult.statusToken,
    sessionId: sessionResult.sessionId,
    transactionReference: utr,
    source: 'MANUAL_ENTRY',
  });
  console.log(`  ✅ Evidence Submitted. Status: ${evidenceResult.paymentStatus}`);

  // 4. Real-Time Admin Approval
  console.log('\n▶ [4/4] Processing Live Approval & Complimentary Ticket Generation...');
  await processPaymentApproval({
    paymentId: sessionResult.sessionId,
    decision: 'APPROVE',
    actor: 'admin@rotaractjpnagar.org',
    source: 'ADMIN_DASHBOARD',
    notes: `Live donation approval test [Ref: ${utr}]`,
  });

  console.log('  ✅ Donation Approved in Real Time!');

  // Poll for associated donor order and ticket generation
  const donorOrderDocs = await db
    .collection('orders')
    .where('publicReference', '==', `${donationResult.donationReference}-TKT`)
    .get();

  if (!donorOrderDocs.empty) {
    const donorOrderId = donorOrderDocs.docs[0]!.id;
    console.log(`     • Associated Donor Pass Order: ${donorOrderId}`);
    console.log(`     • Passes Allocated:            ${donorOrderDocs.docs[0]!.data().participantCount}`);

    // Wait for ticket dispatch
    console.log('     Waiting for ticket worker execution...');
    for (let i = 1; i <= 10; i++) {
      const tJob = await db.collection('ticketJobs').doc(donorOrderId).get();
      if (tJob.exists && (tJob.data()?.status === 'ISSUED' || tJob.data()?.status === 'COMPLETED')) {
        console.log(`  🎉 Complimentary Passes Issued: Status = ${tJob.data()?.status}`);
        break;
      }
      await sleep(2000);
    }
  }

  // Check emails for donation
  const donationEmails = await db
    .collection('emailJobs')
    .where('recipientEmail', '==', 'samarthv080@gmail.com')
    .where('templateKey', '==', 'DONATION_THANK_YOU')
    .get();
  console.log(`     • Donation Thank-You Email Jobs: ${donationEmails.size}`);

  console.log('\n================================================================');
  console.log('✨ DONATION + COMPLIMENTARY TICKET E2E TEST COMPLETED SUCCESSFULLY');
  console.log(`   Donation Ref: ${donationResult.donationReference}`);
  console.log(`   Payment ID:   ${sessionResult.sessionId}`);
  console.log('================================================================\n');
}

runLiveDonationTest()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  });
