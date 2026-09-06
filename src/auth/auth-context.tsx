/**
 * Estado de autenticação do app.
 *
 * `ready` distingue "ainda não sei quem é" de "ninguém está logado" — sem essa
 * diferença o app pisca a tela de login por um instante a cada abertura, mesmo
 * com a sessão salva, porque o onAuthStateChanged demora um tique para responder.
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { firebaseAuth } from '@/data/firebase';

import { signInWithApple } from './apple';
import { signInWithGoogle, signOutGoogle } from './google';
import { ensureProfile } from './profile';

interface AuthValue {
  user: User | null;
  /** False enquanto a sessão salva ainda está sendo restaurada. */
  ready: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

function requireAuth() {
  if (!firebaseAuth) throw new Error('Firebase não configurado neste build.');
  return firebaseAuth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setReady(true); // sem Firebase o app roda deslogado em vez de travar
      return;
    }
    return onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,

      async signInEmail(email, password) {
        const cred = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
        await ensureProfile(cred.user);
      },

      async signUpEmail(name, email, password) {
        const cred = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
        const displayName = name.trim();
        if (displayName) await updateProfile(cred.user, { displayName }).catch(() => {});
        await ensureProfile(cred.user);
      },

      async signInGoogle() {
        const cred = await signInWithGoogle();
        await ensureProfile(cred.user);
      },

      async signInApple() {
        const { credential, firstGrant } = await signInWithApple();
        await ensureProfile(credential.user, firstGrant);
      },

      async resetPassword(email) {
        await sendPasswordResetEmail(requireAuth(), email.trim());
      },

      async signOut() {
        await signOutGoogle();
        await fbSignOut(requireAuth());
      },
    }),
    [user, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return v;
}
