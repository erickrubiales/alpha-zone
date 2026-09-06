// Complemento dinâmico do app.json. Só existe para o que depende de arquivos que
// ficam FORA do git (mesma natureza do .env): os configs de plataforma do Firebase.
//
// O plugin do Google Sign-In exige `iosUrlScheme`, que é o REVERSED_CLIENT_ID do
// GoogleService-Info.plist. Copiar esse valor à mão para o app.json é um passo a
// mais que quebra em silêncio quando o plist é baixado de novo (o id muda se o
// app iOS for recriado no console). Ler do próprio plist elimina a duplicata.
//
// Sem o plist, o plugin é omitido com aviso em vez de derrubar o prebuild: o
// Android é gerado no Windows sem os arquivos do iOS, e o plugin valida o scheme
// mesmo quando só o Android está sendo gerado.
//
// É .js, e não .ts, de propósito: um app.config.ts precisa de @types/node, e o
// TypeScript 6 só o inclui listado em `types` — o que traria os globais do Node
// (setTimeout → NodeJS.Timeout etc.) para todo o código React Native.
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ANDROID_SERVICES = './google-services.json';
const IOS_SERVICES = './GoogleService-Info.plist';
const GOOGLE_SIGNIN_PLUGIN = '@react-native-google-signin/google-signin';

function has(file) {
  return existsSync(resolve(__dirname, file));
}

/** REVERSED_CLIENT_ID do plist, ou null se o arquivo não existe ou não o traz. */
function iosUrlScheme() {
  if (!has(IOS_SERVICES)) return null;
  const plist = readFileSync(resolve(__dirname, IOS_SERVICES), 'utf8');
  const m = plist.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
  return (m && m[1].trim()) || null;
}

function pluginName(p) {
  return Array.isArray(p) ? String(p[0]) : String(p);
}

/**
 * @param {import('expo/config').ConfigContext} ctx
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = ({ config }) => {
  const plugins = (config.plugins ?? []).filter((p) => pluginName(p) !== GOOGLE_SIGNIN_PLUGIN);

  const scheme = iosUrlScheme();
  if (scheme) {
    plugins.push([GOOGLE_SIGNIN_PLUGIN, { iosUrlScheme: scheme }]);
  } else {
    // O plist só traz REVERSED_CLIENT_ID depois que o login do Google é ativado
    // no console do Firebase — baixar antes disso produz um plist sem o campo.
    console.warn(
      `[app.config] ${IOS_SERVICES} ausente ou sem REVERSED_CLIENT_ID: ` +
        'o plugin do Google Sign-In foi omitido e o login do Google NÃO vai funcionar no iOS.',
    );
  }

  return {
    ...config,
    ios: { ...config.ios, ...(has(IOS_SERVICES) ? { googleServicesFile: IOS_SERVICES } : {}) },
    android: { ...config.android, ...(has(ANDROID_SERVICES) ? { googleServicesFile: ANDROID_SERVICES } : {}) },
    plugins,
  };
};
