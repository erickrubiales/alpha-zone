/**
 * Login com Google (SDK nativo, não WebView).
 *
 * O `webClientId` é o **client id da Web** do projeto, não o do Android nem o do
 * iOS: é ele que faz o Google emitir um idToken que o Firebase aceita. Trocar um
 * pelo outro devolve `DEVELOPER_ERROR`, sem mais explicação.
 *
 * No Android o login só funciona se o **SHA-1 do certificado que assinou o APK**
 * estiver cadastrado no projeto do Firebase. Como debug e release têm certificados
 * diferentes, o caso clássico é funcionar no dev build e quebrar no build assinado
 * — os dois SHA-1 precisam estar lá.
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth';

import { googleEnabled, googleWebClientId } from '@/data/config';
import { firebaseAuth } from '@/data/firebase';

let configured = false;

function ensureConfigured() {
  if (configured || !googleEnabled) return;
  GoogleSignin.configure({ webClientId: googleWebClientId });
  configured = true;
}

export { statusCodes as googleStatusCodes };

export async function signInWithGoogle(): Promise<UserCredential> {
  if (!firebaseAuth) throw new Error('Firebase não configurado.');
  if (!googleEnabled) throw new Error('Login do Google não configurado neste build.');

  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();

  // Desde a v13 o cancelamento não lança: volta `{ type: 'cancelled' }`. Sem este
  // desvio, quem fecha a folha do Google veria "não devolveu o token" como erro.
  // Lançar com o código de cancelamento faz `isCancelled()` silenciar a UI.
  if (result.type === 'cancelled') {
    throw Object.assign(new Error('Login cancelado.'), { code: statusCodes.SIGN_IN_CANCELLED });
  }

  const idToken = result.data.idToken;
  if (!idToken) throw new Error('O Google não devolveu o token de identidade.');

  return signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken));
}

/**
 * Encerra a sessão do lado do Google também. Sem isso o próximo login entra
 * direto na última conta, sem oferecer a troca — que parece um bug para quem
 * tem mais de uma conta Google no aparelho.
 */
export async function signOutGoogle(): Promise<void> {
  if (!configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Não impedir o logout do app por causa disso.
  }
}
