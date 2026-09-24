import { db, storage } from '../firebase/functions/src/config/firebase.js';

const LIVE_FUNCTIONS_URL = 'https://asia-south1-pip5-rotaractjpnagar.cloudfunctions.net';

async function testLiveFunction() {
  console.log('Testing connection to live analyzePaymentReceipt...');
  const res = await fetch(`${LIVE_FUNCTIONS_URL}/analyzePaymentReceipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        statusToken: 'dummy-token',
        sessionId: 'dummy-session',
        storagePath: 'receipts/dummy/receipt',
      },
    }),
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

testLiveFunction().catch(console.error);
