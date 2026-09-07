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
 * — os dois SHA-1 precisam estar lá. E o debug do prebuild do Expo é o
 * `android/app/debug.keystore`, não o `~/.android/debug.keystore`.
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

/**
 * Códigos do módulo nativo → códigos que `auth-errors.ts` entende.
 *
 * No Android o módulo rejeita com o status code do Play Services em string
 * ("10" = DEVELOPER_ERROR, "7" = NETWORK_ERROR, "12501" = cancelado); no iOS são
 * outros números. `statusCodes` já carrega o valor certo de cada plataforma para
 * os casos que ele cobre; DEVELOPER_ERROR e NETWORK_ERROR ele não expõe, por isso
 * os literais. Traduzir aqui mantém `auth-errors.ts` sem saber de plataforma.
 */
function normalizeGoogleError(e: unknown): unknown {
  const code = String((e as { code?: unknown })?.code ?? '');
  const withCode = (c: string) => Object.assign(e instanceof Error ? e : new Error(String(e)), { code: c });

  if (code === statusCodes.SIGN_IN_CANCELLED) return withCode('SIGN_IN_CANCELLED');
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return withCode('PLAY_SERVICES_NOT_AVAILABLE');
  if (code === '10') return withCode('DEVELOPER_ERROR');
  if (code === '7') return withCode('auth/network-request-failed');
  return e;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  if (!firebaseAuth) throw new Error('Firebase não configurado.');
  if (!googleEnabled) throw new Error('Login do Google não configurado neste build.');

  ensureConfigured();

  let result: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    result = await GoogleSignin.signIn();
  } catch (e) {
    throw normalizeGoogleError(e);
  }

  // Desde a v13 o cancelamento não lança: volta `{ type: 'cancelled' }`. Sem este
  // desvio, quem fecha a folha do Google veria "não devolveu o token" como erro.
  // O código é o literal (não `statusCodes.SIGN_IN_CANCELLED`, que no Android é
  // "12501") para bater com a lista de cancelamentos de `auth-errors.ts`.
  if (result.type === 'cancelled') {
    throw Object.assign(new Error('Login cancelado.'), { code: 'SIGN_IN_CANCELLED' });
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
