/**
 * Mensagens de erro do Firebase Auth.
 *
 * Existe por uma diferença de fundo em relação ao app da loja: lá o login é do
 * WordPress e todo erro `auth/…` é ruído interno, então é escondido atrás de uma
 * mensagem genérica. Aqui o Firebase Auth É o login — esconder `auth/wrong-password`
 * deixaria o usuário sem saber sequer que errou a senha.
 *
 * Regra: código conhecido vira frase acionável; código desconhecido vira o fallback
 * (nunca o texto cru do Firebase, que vem em inglês e com o prefixo "Firebase:").
 */

/** Códigos que significam "você cancelou", e portanto NÃO devem virar alerta de erro. */
const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
  'ERR_REQUEST_CANCELED', // expo-apple-authentication
  'SIGN_IN_CANCELLED', // @react-native-google-signin
  '-5', // código de cancelamento do Google Sign-In no iOS
]);

const MESSAGES: Record<string, string> = {
  // ── credenciais ──
  // Com a proteção contra enumeração de e-mails ligada (padrão em projetos novos),
  // senha errada e usuário inexistente vêm os DOIS como 'invalid-credential'. A
  // mensagem não pode afirmar qual dos dois foi, sob pena de mentir.
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido. Confira o endereço.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/user-disabled': 'Esta conta foi desativada. Fale com o suporte.',

  // ── cadastro ──
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Tente entrar.',
  'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
  'auth/operation-not-allowed': 'Este método de login não está habilitado.',

  // ── sessão ──
  'auth/requires-recent-login': 'Por segurança, entre novamente antes de continuar.',
  'auth/id-token-expired': 'Sua sessão expirou. Entre novamente.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',

  // ── conta ligada a outro método ──
  'auth/account-exists-with-different-credential':
    'Este e-mail já tem conta com outro método de login. Entre pelo método original.',
  'auth/credential-already-in-use': 'Esta credencial já está ligada a outra conta.',

  // ── ambiente ──
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/internal-error': 'Falha no servidor de login. Tente novamente.',

  // ── Google Sign-In nativo ──
  DEVELOPER_ERROR:
    'Login do Google mal configurado neste build (confira o SHA-1 e o client id da Web).',
  PLAY_SERVICES_NOT_AVAILABLE: 'Google Play Services indisponível neste aparelho.',
};

/** Extrai o código de um erro do Firebase, do Google Sign-In ou do Apple. */
export function authErrorCode(e: unknown): string {
  const c = (e as { code?: unknown })?.code;
  return typeof c === 'string' || typeof c === 'number' ? String(c) : '';
}

/** True quando o usuário simplesmente desistiu — a UI deve ficar em silêncio. */
export function isCancelled(e: unknown): boolean {
  return CANCELLED.has(authErrorCode(e));
}

/**
 * Mensagem para mostrar ao usuário. Devolve `null` quando o erro é um cancelamento
 * (não há nada a dizer).
 */
export function authErrorMessage(
  e: unknown,
  fallback = 'Não foi possível concluir. Tente novamente.',
): string | null {
  if (isCancelled(e)) return null;
  return MESSAGES[authErrorCode(e)] ?? fallback;
}
