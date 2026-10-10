import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/firebase.js';
import { processTicketJob } from '../tickets/ticketWorker.js';
import { processEmailJob } from '../communications/emailWorker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .secret.local
const secretPath = path.resolve(__dirname, '../../.secret.local');
if (fs.existsSync(secretPath)) {
  const content = fs.readFileSync(secretPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  });
}

async function main() {
  console.log('🚀 Starting Native Ticket Fulfilment for Pending Orders...');

  const pendingRefs = [
    { ref: 'PIP5-S-XC6M9N', name: 'Surekha GC' },
    { ref: 'PIP5-S-MKZZ73', name: 'Vageesh MN' },
    { ref: 'PIP5-S-PWPCSK', name: 'Roopashree HS' },
    { ref: 'PIP5-S-YB6TN7', name: 'Sanjay' },
    { ref: 'PIP5-S-35T7BV', name: 'Abhay Sirigeri', manualUtr: '074550403612' },
    { ref: 'PIP5-B-ARZ6TJ', name: 'Vijayanagar Club (7 passes)', manualUtr: '131018523004' },
  ];

  for (const item of pendingRefs) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing ${item.ref} (${item.name})...`);

    const snap = await db.collection('orders').where('publicReference', '==', item.ref).get();
    if (snap.empty || !snap.docs[0]) {
      console.error(`❌ Order not found: ${item.ref}`);
      continue;
    }

    const orderDoc = snap.docs[0];
    const orderId = orderDoc.id;
    const orderData = orderDoc.data();
    const nowIso = new Date().toISOString();

    // If manual approval needed (Abhay Sirigeri or Vijayanagar Club)
    if (item.manualUtr || orderData.paymentStatus !== 'VERIFIED') {
      console.log(`Verifying payment for ${item.ref} (UTR: ${item.manualUtr || orderData.utr})...`);
      await orderDoc.ref.update({
        paymentStatus: 'VERIFIED',
        orderStatus: 'CONFIRMED',
        utr: item.manualUtr || orderData.utr || null,
        updatedAt: nowIso,
      });

      if (orderData.paymentSessionId) {
        await db.collection('paymentSessions').doc(orderData.paymentSessionId).set(
          {
            status: 'VERIFIED',
            verification: {
              method: 'ADMIN_MANUAL',
              decision: 'APPROVE',
              verifiedBy: 'ADMIN:system-reconciliation',
              verifiedAt: nowIso,
              notes: `Bank verified transaction reference ${item.manualUtr}`,
            },
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
    }

    // Reset ticketJob to QUEUED
    await db.collection('ticketJobs').doc(orderId).set(
      {
        id: orderId,
        orderId,
        status: 'QUEUED',
        attempts: 0,
        leaseExpiresAt: null,
        lastError: null,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // Run native ticket issuance
    console.log(`Executing processTicketJob for ${orderId}...`);
    const jobResult = await processTicketJob(orderId);
    console.log(`Result for ${item.ref}:`, jobResult);

    // Process queued email jobs
    const emailSnap = await db
      .collection('emailJobs')
      .where('entityId', '==', orderId)
      .where('templateKey', '==', 'TICKET_ISSUED')
      .get();

    console.log(`Found ${emailSnap.size} ticket email job(s) for ${orderId}. Dispatching via Brevo...`);
    for (const emailDoc of emailSnap.docs) {
      if (emailDoc.data().status !== 'SENT') {
        await emailDoc.ref.update({ status: 'QUEUED', leaseExpiresAt: null });
      }
      console.log(`Sending email job ${emailDoc.id} to ${emailDoc.data().recipientEmail}...`);
      const emailResult = await processEmailJob(emailDoc.id);
      console.log(`Email result:`, emailResult);
    }
  }

  console.log('\n==================================================');
  console.log('✅ All pending passes fulfilled and dispatched successfully!');
}

main().catch(console.error);
