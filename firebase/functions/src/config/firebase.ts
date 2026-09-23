import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'pip5-rotaractjpnagar',
    storageBucket:
      process.env.STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      'pip5-rotaractjpnagar.firebasestorage.app',
  });
}

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
export const storage = getStorage();
