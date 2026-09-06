/**
 * Sign in with Apple.
 *
 * Duas armadilhas que só aparecem depois, quando não dá mais para consertar:
 *
 * 1. **`fullName` e `email` só vêm na PRIMEIRA autorização.** Da segunda vez em
 *    diante a Apple devolve os campos vazios, para sempre. Quem não grava no
 *    primeiro login fica com uma base de usuários sem nome e sem e-mail.
 *
 * 2. **O `authorizationCode` é a única porta para revogar o token depois.** A
 *    Apple exige que a exclusão de conta revogue o acesso; a revogação usa um
 *    refresh token que só se obtém trocando esse código (válido por ~5 minutos).
 *    Por isso ele é capturado já aqui, no M1, e não lá no M8 — no M8 seria tarde.
 *
 * O nonce evita replay: manda-se o SHA-256 para a Apple e o valor cru para o
 * Firebase, que refaz o hash e compara.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth';

import { firebaseAuth } from '@/data/firebase';

/** O que a Apple entregou de uma vez só e não repete. */
export interface AppleFirstGrant {
  /** Nome montado a partir de givenName + familyName; vazio se não veio. */
  displayName: string;
  /** Pode ser o relay privaterelay.appleid.com quando o usuário escolheu esconder. */
  email: string;
  /** Trocável por refresh token para a revogação exigida na exclusão de conta. */
  authorizationCode: string;
}

export function appleAvailableAsync(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

function randomNonce(bytes = 32): string {
  return Array.from(Crypto.getRandomBytes(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signInWithApple(): Promise<{
  credential: UserCredential;
  firstGrant: AppleFirstGrant | null;
}> {
  if (!firebaseAuth) throw new Error('Firebase não configurado.');

  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!apple.identityToken) throw new Error('A Apple não devolveu o token de identidade.');

  const provider = new OAuthProvider('apple.com');
  const credential = await signInWithCredential(
    firebaseAuth,
    provider.credential({ idToken: apple.identityToken, rawNonce }),
  );

  // Só na primeira autorização estes campos vêm preenchidos.
  const name = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(' ').trim();
  const firstGrant: AppleFirstGrant | null =
    name || apple.email || apple.authorizationCode
      ? { displayName: name, email: apple.email ?? '', authorizationCode: apple.authorizationCode ?? '' }
      : null;

  return { credential, firstGrant };
}
