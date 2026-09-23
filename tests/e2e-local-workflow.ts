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
  const collections = await db.listCollections();
  await Promise.all(collections.map((collection) => db.recursiveDelete(collection)));
  await db
    .collection('events')
    .doc('PIP5')
    .set({
      ...DEFAULT_PIP5_CONFIG,
      updatedAt: new Date().toISOString(),
    });

  const single = await callable<any>('createSingleOrder', {
    fullName: 'Local E2E Attendee',
    email: 'single.e2e@example.com',
    mobileNumber: '9876543210',
    whatsappSameAsMobile: true,
    city: 'Bengaluru',
    affiliationType: 'INDEPENDENT',
    consents: {
      termsAndParticipation: true,
      photoVideoAcknowledgement: true,
      marketingUpdates: false,
    },
  });
  assert.equal(single.amountPaise, DEFAULT_PIP5_CONFIG.pricesPaise.singlePass);
  assert.equal(single.statusToken.length, 32);

  const singlePayment = await callable<any>('createPaymentSession', {
    statusToken: single.statusToken,
    method: 'UPI',
  });
  assert.equal(singlePayment.amountPaise, DEFAULT_PIP5_CONFIG.pricesPaise.singlePass);
  await callable('submitPaymentEvidence', {
    statusToken: single.statusToken,
    sessionId: singlePayment.sessionId,
    transactionReference: 'E2ESINGLE0001',
    source: 'MANUAL_ENTRY',
  });
  await processPaymentApproval({
    paymentId: singlePayment.sessionId,
    decision: 'APPROVE',
    actor: 'local-e2e-admin',
    source: 'ADMIN_DASHBOARD',
  });

  const singleStatus = await callable<any>('getPublicStatus', { token: single.statusToken });
  assert.equal(singleStatus.paymentStatus, 'VERIFIED');
  assert.equal(singleStatus.type, 'SINGLE');

  const donation = await callable<any>('createDonation', {
    fullName: 'Local E2E Donor',
    email: 'donor.e2e@example.com',
    mobileNumber: '9876543211',
    whatsappSameAsMobile: true,
    amountPaise: 10000,
    isAnonymousPublicly: false,
  });
  assert.equal(donation.statusToken.length, 32);
  const donationPayment = await callable<any>('createPaymentSession', {
    statusToken: donation.statusToken,
    method: 'NEFT',
  });
  await callable('submitPaymentEvidence', {
    statusToken: donation.statusToken,
    sessionId: donationPayment.sessionId,
    transactionReference: 'E2EDONATE0001',
    source: 'MANUAL_ENTRY',
  });
  await processPaymentApproval({
    paymentId: donationPayment.sessionId,
    decision: 'APPROVE',
    actor: 'local-e2e-admin',
    source: 'ADMIN_DASHBOARD',
  });
  const donationStatus = await callable<any>('getPublicStatus', { token: donation.statusToken });
  assert.equal(donationStatus.paymentStatus, 'VERIFIED');
  assert.equal(donationStatus.type, 'DONATION');

  const bulk = await callable<any>('createBulkOrder', {
    organisationType: 'COMPANY',
    organisationName: 'Local E2E Organisation',
    primaryContact: {
      fullName: 'Local E2E Organiser',
      email: 'bulk.e2e@example.com',
      mobileNumber: '9876543212',
      whatsappSameAsMobile: true,
    },
    participantCount: 5,
  });
  const attendees = Array.from({ length: 5 }, (_, index) => ({
    slNo: index + 1,
    fullName: `Bulk Attendee ${index + 1}`,
    email: `bulk${index + 1}.e2e@example.com`,
    mobileNumber: `98765432${20 + index}`,
    city: 'Bengaluru',
  }));
  const committed = await callable<any>('commitBulkAttendees', {
    statusToken: bulk.statusToken,
    attendees,
  });
  assert.equal(committed.participantCount, 5);
  const replay = await callable<any>('commitBulkAttendees', {
    statusToken: bulk.statusToken,
    attendees,
  });
  assert.equal(replay.participantCount, 5);
  const bulkPayment = await callable<any>('createPaymentSession', {
    statusToken: bulk.statusToken,
    method: 'RTGS',
  });
  assert.equal(bulkPayment.amountPaise, 5 * DEFAULT_PIP5_CONFIG.pricesPaise.bulkPass);

  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const [event, ticketJobs, emailJobs] = await Promise.all([
    db.collection('events').doc('PIP5').get(),
    db.collection('ticketJobs').get(),
    db.collection('emailJobs').get(),
  ]);
  assert.equal(event.data()?.capacity.registeredCount, 6);
  assert.equal(event.data()?.capacity.confirmedCount, 1);
  assert.equal(ticketJobs.size, 1);
  assert.equal(ticketJobs.docs[0]?.data().orderId != null, true);
  assert.equal(emailJobs.size >= 3, true);
  assert.equal(
    emailJobs.docs.every((job) =>
      ['QUEUED', 'SENDING', 'SENT', 'RETRYING', 'FAILED'].includes(job.data().status)
    ),
    true
  );

  console.log(
    JSON.stringify(
      {
        single: { reference: single.orderReference, status: singleStatus.paymentStatus },
        donation: { reference: donation.donationReference, status: donationStatus.paymentStatus },
        bulk: { reference: bulk.orderReference, attendees: committed.participantCount },
        capacity: event.data()?.capacity,
        ticketJobs: ticketJobs.docs.map((job) => ({ id: job.id, status: job.data().status })),
        emailJobs: emailJobs.docs.map((job) => ({ id: job.id, status: job.data().status })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
