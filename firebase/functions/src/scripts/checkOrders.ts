import { db } from '../config/firebase.js';

async function main() {
  const refs = ['PIP5-S-XC6M9N', 'PIP5-S-MKZZ73', 'PIP5-S-PWPCSK', 'PIP5-S-YB6TN7', 'PIP5-S-35T7BV', 'PIP5-B-ARZ6TJ'];
  for (const ref of refs) {
    const snap = await db.collection('orders').where('publicReference', '==', ref).get();
    if (snap.empty || !snap.docs[0]) {
      console.log('Order not found:', ref);
    } else {
      const doc = snap.docs[0];
      const d = doc.data();
      console.log(`=== ${ref} (${doc.id}) ===`);
      console.log('  Buyer:', d.buyer?.fullName, d.buyer?.email);
      console.log('  PaymentStatus:', d.paymentStatus);
      console.log('  OrderStatus:', d.orderStatus);
      console.log('  FulfilmentStatus:', d.fulfilmentStatus);
      console.log('  TicketCount:', d.ticketCount, 'ParticipantCount:', d.participantCount, 'TotalAmountPaise:', d.totalAmountPaise);
      console.log('  PaymentSessionId:', d.paymentSessionId);
      
      const tj = await db.collection('ticketJobs').doc(doc.id).get();
      if (tj.exists) {
        const tjd = tj.data()!;
        console.log('  TicketJob Status:', tjd.status, 'Attempts:', tjd.attempts, 'LastError:', tjd.lastError);
      } else {
        console.log('  TicketJob: NONE');
      }

      const attsSnap = await doc.ref.collection('attendees').get();
      console.log('  attendees subcollection size:', attsSnap.size);
      attsSnap.forEach(a => console.log('    att:', a.id, a.data().fullName, a.data().registrationId, a.data().ticketStatus));

      const emailJobsSnap = await db.collection('emailJobs').where('entityId', '==', doc.id).get();
      console.log('  emailJobs count:', emailJobsSnap.size);
      emailJobsSnap.forEach(ej => console.log('    job:', ej.id, ej.data().status, ej.data().registrationId, ej.data().recipientEmail));

      if (d.paymentSessionId) {
        const ps = await db.collection('paymentSessions').doc(d.paymentSessionId).get();
        if (ps.exists) {
          const psd = ps.data()!;
          console.log('  PaymentSession Status:', psd.status, 'Method:', psd.method, 'Verification:', psd.verification);
        } else {
          console.log('  PaymentSession: NOT FOUND');
        }
      }
    }
  }
}

main().catch(console.error);
