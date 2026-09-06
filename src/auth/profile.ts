/**
 * Perfil do usuário em `users/{uid}` e captura do que a Apple entrega uma vez só.
 *
 * `ensureProfile` roda a cada login. Ela é deliberadamente conservadora: nunca
 * sobrescreve nome ou e-mail já gravados. Isso importa porque a Apple só manda
 * esses campos na primeira autorização — se um login posterior (que vem vazio)
 * pudesse sobrescrever, o nome do usuário sumiria no segundo acesso.
 */
import { updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebaseDb } from '@/data/firebase';

import type { AppleFirstGrant } from './apple';

function requireDb() {
  if (!firebaseDb) throw new Error('Firebase não configurado.');
  return firebaseDb;
}

export interface Profile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: Date | null;
}

export async function ensureProfile(user: User, grant?: AppleFirstGrant | null): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const cur = snap.data() ?? {};

  // Ordem de preferência: o que já está gravado > o que a Apple mandou agora >
  // o que o provedor pôs no objeto do Auth.
  const displayName = (cur.displayName as string) || grant?.displayName || user.displayName || '';
  const email = (cur.email as string) || grant?.email || user.email || '';

  await setDoc(
    ref,
    {
      displayName,
      email,
      photoURL: (cur.photoURL as string) || user.photoURL || '',
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Mantém o objeto do Auth em dia para a UI não precisar ler o Firestore só
  // para saber o nome de quem entrou.
  if (displayName && displayName !== user.displayName) {
    await updateProfile(user, { displayName }).catch(() => {});
  }

  if (grant?.authorizationCode) await stashAppleAuthorization(user.uid, grant.authorizationCode);
}

/**
 * Guarda o `authorizationCode` da Apple para a Cloud Function trocá-lo por um
 * refresh token — que é o que permite revogar o acesso na exclusão de conta (M8),
 * exigência da Apple para publicar.
 *
 * A coleção `apple_authorizations` é **somente escrita** pelas regras do Firestore
 * (`allow create, update: if request.auth.uid == uid; allow read: if false`): o
 * código não deve voltar para nenhum cliente. Ele expira em ~5 minutos, então a
 * função precisa consumi-lo por gatilho, não por rotina agendada.
 */
async function stashAppleAuthorization(uid: string, authorizationCode: string): Promise<void> {
  try {
    await setDoc(doc(requireDb(), 'apple_authorizations', uid), {
      authorizationCode,
      createdAt: serverTimestamp(),
      consumed: false,
    });
  } catch {
    // Falhar aqui não pode derrubar o login. A consequência é sentida só na
    // exclusão de conta, e o próximo login com a Apple tenta de novo.
  }
}
