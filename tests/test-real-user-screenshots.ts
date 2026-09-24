import fs from 'node:fs';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { parseReceiptOcrText } from '../firebase/functions/src/integrations/vision/ocrParser.js';

const client = new ImageAnnotatorClient({ projectId: 'pip5-rotaractjpnagar' });

const testImages = [
  {
    name: 'Samsung Wallet Screenshot (Expected: ₹239.00, UTR/Txn: 612802562666)',
    path: 'C:\\Users\\Samarth\\.gemini\\antigravity-ide\\brain\\e3a0b89e-2a6b-452f-bc02-ff0cbea2fd22\\.user_uploaded\\media_1790258982208.jpg',
    expectedAmountPaise: 23900,
    expectedUtr: '612802562666',
  },
  {
    name: 'PhonePe iOS Screenshot (Expected: ₹239, UTR: 873324500794)',
    path: 'C:\\Users\\Samarth\\.gemini\\antigravity-ide\\brain\\e3a0b89e-2a6b-452f-bc02-ff0cbea2fd22\\.user_uploaded\\media_1790258995665.png',
    expectedAmountPaise: 23900,
    expectedUtr: '873324500794',
  },
  {
    name: 'PhonePe Dark Screenshot (Expected: ₹1,000, UTR: 248156774183)',
    path: 'C:\\Users\\Samarth\\.gemini\\antigravity-ide\\brain\\e3a0b89e-2a6b-452f-bc02-ff0cbea2fd22\\.user_uploaded\\media_1790259003564.png',
    expectedAmountPaise: 100000,
    expectedUtr: '248156774183',
  },
];

async function runTests() {
  console.log('====================================================');
  console.log('🔍 TESTING REAL USER SCREENSHOTS WITH CLOUD VISION');
  console.log('====================================================\n');

  for (const img of testImages) {
    console.log(`▶ Testing: ${img.name}`);
    if (!fs.existsSync(img.path)) {
      console.error(`  ❌ File does not exist: ${img.path}`);
      continue;
    }

    const content = fs.readFileSync(img.path);
    const [result] = await client.textDetection({ image: { content } });
    const rawText = result.textAnnotations?.[0]?.description || '';

    console.log('--- Raw OCR text excerpt (first 250 chars) ---');
    console.log(rawText.slice(0, 250).replace(/\n/g, ' '));
    console.log('---------------------------------------------');

    const parsed = parseReceiptOcrText(rawText, img.expectedAmountPaise);

    console.log(`  • Extracted UTR / Txn ID: "${parsed.transactionReference}" (Expected: "${img.expectedUtr}")`);
    console.log(`  • Extracted Amount:       ₹${parsed.extractedAmountPaise ? parsed.extractedAmountPaise / 100 : 'null'} (Expected: ₹${img.expectedAmountPaise / 100})`);
    console.log(`  • Payment Status:         "${parsed.paymentStatusText}"`);
    console.log(`  • Confidence:             ${parsed.confidence}`);

    const utrMatch = parsed.transactionReference === img.expectedUtr;
    const amountMatch = parsed.extractedAmountPaise === img.expectedAmountPaise;

    if (utrMatch && amountMatch) {
      console.log('  ✅ SUCCESS: Both UTR and Amount perfectly matched!\n');
    } else {
      console.log(`  ⚠️ MISMATCH: UTR match = ${utrMatch}, Amount match = ${amountMatch}\n`);
    }
  }
}

runTests().catch(console.error);
