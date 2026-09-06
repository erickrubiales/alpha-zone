/**
 * Configuração do projeto Firebase do Alpha Zone.
 *
 * Os valores vêm de EXPO_PUBLIC_FIREBASE_* (.env em dev, eas.json / variáveis do
 * build em produção). NÃO são segredos: a chave pública do Firebase identifica o
 * projeto, quem protege os dados são as regras do Firestore. O que é segredo
 * (service account, chave da RevenueCat) só existe nas Cloud Functions.
 *
 * Projeto próprio, isolado do app da loja: nenhum usuário, coleção ou regra é
 * compartilhada entre os dois.
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** True quando o Firebase está configurado (apiKey + projectId presentes). */
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/**
 * OAuth **Web client ID** do projeto (Firebase → Authentication → Google → ID do
 * cliente da Web). É esse que o Google Sign-In nativo usa para emitir o idToken
 * que o Firebase aceita — o client id do Android/iOS NÃO serve aqui, e trocar um
 * pelo outro produz um "DEVELOPER_ERROR" sem explicação.
 */
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export const googleEnabled = Boolean(googleWebClientId);
