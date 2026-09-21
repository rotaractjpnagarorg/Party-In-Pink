import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_PIP5_CONFIG } from '@pip/shared';

if (getApps().length === 0) {
  initializeApp({
    projectId: 'pip5-rotaractjpnagar',
  });
}

const db = getFirestore();

async function seed() {
  console.log('Seeding PiP 5.0 event configuration into Firestore...');
  const eventRef = db.collection('events').doc(DEFAULT_PIP5_CONFIG.code);
  await eventRef.set(DEFAULT_PIP5_CONFIG, { merge: true });
  console.log(`Successfully seeded event: events/${DEFAULT_PIP5_CONFIG.code}`);

  // Verify read
  const snapshot = await eventRef.get();
  console.log('Verified Firestore record:', snapshot.id, snapshot.data()?.title);
}

seed().catch((err) => {
  console.error('Failed to seed event:', err);
  process.exit(1);
});
