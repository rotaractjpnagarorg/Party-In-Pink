import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'pip5-rotaractjpnagar',
  });
}

export const db = getFirestore();
export const storage = getStorage();
