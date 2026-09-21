import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

const projectId = 'demo-pip5';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
    storage: { rules: readFileSync('firebase/storage.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'orders/order-1'), { publicReference: 'PIP5-S-TEST' });
    await setDoc(doc(context.firestore(), 'paymentSessions/payment-session-123'), {
      status: 'AWAITING_PAYMENT',
    });
    await setDoc(doc(context.firestore(), 'admins/admin-1'), {
      active: true,
      role: 'SUPER_ADMIN',
    });
    await setDoc(doc(context.firestore(), 'admins/approver-1'), {
      active: true,
      role: 'PAYMENT_APPROVER',
    });
    await setDoc(doc(context.firestore(), 'admins/inactive-admin'), {
      active: false,
      role: 'SUPER_ADMIN',
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore deny-by-default rules', () => {
  it('denies public order reads and all direct order writes', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(publicDb, 'orders/order-1')));
    await assertFails(setDoc(doc(publicDb, 'orders/order-2'), { paymentStatus: 'VERIFIED' }));
  });

  it('allows an authorized admin to read but never directly mutate orders', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1', { role: 'SUPER_ADMIN' }).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'orders/order-1')));
    await assertFails(setDoc(doc(adminDb, 'orders/order-1'), { paymentStatus: 'VERIFIED' }));
  });

  it('denies a deactivated admin even when the ID token still has a role claim', async () => {
    const inactiveDb = testEnv
      .authenticatedContext('inactive-admin', { role: 'SUPER_ADMIN' })
      .firestore();
    await assertFails(getDoc(doc(inactiveDb, 'orders/order-1')));
  });
});

describe('private receipt storage rules', () => {
  it('allows bounded image creation but denies overwrite and anonymous read', async () => {
    const publicStorage = testEnv.unauthenticatedContext().storage();
    const receipt = ref(publicStorage, 'receipts/payment-session-123/receipt.png');
    await assertSucceeds(
      uploadBytes(receipt, new Uint8Array([1, 2, 3]), { contentType: 'image/png' })
    );
    await assertFails(uploadBytes(receipt, new Uint8Array([4, 5]), { contentType: 'image/png' }));
    await assertFails(getBytes(receipt));
    await assertFails(
      uploadBytes(
        ref(publicStorage, 'receipts/nonexistent-session/receipt.png'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/png' }
      )
    );
  });

  it('allows only payment approvers to read receipts', async () => {
    const approverStorage = testEnv
      .authenticatedContext('approver-1', { role: 'PAYMENT_APPROVER' })
      .storage();
    const receipt = ref(approverStorage, 'receipts/payment-session-123/receipt.png');
    await assertSucceeds(getBytes(receipt));
    const inactiveStorage = testEnv
      .authenticatedContext('inactive-admin', { role: 'SUPER_ADMIN' })
      .storage();
    await assertFails(getBytes(ref(inactiveStorage, 'receipts/payment-session-123/receipt.png')));
  });
});
