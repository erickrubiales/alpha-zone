// Versão web/SSR do init do Firebase (no iOS/Android o Metro usa firebase.native.ts).
// No navegador a persistência padrão já mantém a sessão.
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig, firebaseEnabled } from './config';

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseEnabled) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export const firebaseAuth = auth;
export const firebaseDb = db;
export const firebaseStorage = storage;
