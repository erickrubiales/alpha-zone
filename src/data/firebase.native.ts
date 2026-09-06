// Init do Firebase para iOS/Android (o Metro escolhe este arquivo no nativo).
//
// A persistência via AsyncStorage é o ponto crítico: sem ela o firebase/auth no
// React Native guarda a sessão só em memória e o usuário é deslogado a cada
// reinício do app — sem nenhum erro, o que torna o problema difícil de achar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig, firebaseEnabled } from './config';

// getReactNativePersistence só existe no bundle React Native do firebase/auth
// (o entry padrão não o declara nos tipos) — o Metro resolve em runtime.
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseEnabled) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  db = getFirestore(app);
  storage = getStorage(app);
}

export const firebaseAuth = auth;
export const firebaseDb = db;
export const firebaseStorage = storage;
