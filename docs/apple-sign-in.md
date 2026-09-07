# Sign in with Apple — guia de configuração

> Item 3 do M1. Tudo acontece em dois sites: o portal da Apple e o console do Firebase.
> Leva uns 30 minutos. Faça na ordem, porque cada etapa usa o resultado da anterior.
>
> Conta: a mesma da Alvos NG (Apple Developer Program, Team ID `29XQZ253D3`).
> Referências: ajuda da Apple em *Certificates, Identifiers & Profiles* e o guia do Firebase
> "Authenticate Using Apple on Apple platforms". Conferidos em 2026-09-07.

## Por que isso é obrigatório

A Apple **reprova** na revisão qualquer app que ofereça login de terceiro (o nosso tem Google)
sem oferecer também o Sign in with Apple. E o Firebase só aceita o token da Apple se o projeto
souber quem somos: um App ID com a capability, um Services ID, uma chave privada. A quarta
etapa, o relay de e-mail, não é para o login em si: é para o **e-mail de redefinição de senha
chegar** a quem escolheu "Ocultar meu e-mail" na Apple.

## Valores que você vai usar

| o quê | valor |
|---|---|
| Team ID | `29XQZ253D3` |
| Bundle ID (App ID) | `com.rubiales.alphazone` |
| Projeto Firebase | `alpha-zone-app` |
| Domínio do Firebase | `alpha-zone-app.firebaseapp.com` |
| Return URL | `https://alpha-zone-app.firebaseapp.com/__/auth/handler` |
| Remetente dos e-mails do Firebase | `noreply@alpha-zone-app.firebaseapp.com` |
| Services ID (sugestão, você escolhe) | `com.rubiales.alphazone.signin` |
| Nome da chave (sugestão) | `Alpha Zone Sign in with Apple` |

## O que você sai daqui com

- [ ] App ID `com.rubiales.alphazone` com **Sign in with Apple** marcado
- [ ] Services ID `com.rubiales.alphazone.signin` apontando para a Return URL do Firebase
- [ ] Arquivo `AuthKey_XXXXXXXXXX.p8` guardado no gerenciador de senhas + o **Key ID**
- [ ] `noreply@alpha-zone-app.firebaseapp.com` registrado no relay de e-mail
- [ ] Provedor **Apple** ligado no console do Firebase com Services ID, Team ID, Key ID e chave

---

## Etapa 1 — App ID com a capability

Onde: [developer.apple.com/account](https://developer.apple.com/account) → **Certificates,
Identifiers & Profiles** → **Identifiers** (barra lateral).

1. Procure `com.rubiales.alphazone` na lista. O Xcode pode já ter criado quando você abrir o
   projeto com assinatura automática.
   - **Se existe**: clique nele, marque **Sign in with Apple**, clique **Save**. Pronto, pule
     para a etapa 2.
   - **Se não existe**: siga abaixo.
2. Clique no **+** (canto superior esquerdo) → **App IDs** → **Continue**.
3. Tipo **App** → **Continue**.
4. **Description**: `Alpha Zone`. (Só aparece para você no portal.)
5. **Explicit App ID** e, no **Bundle ID**, `com.rubiales.alphazone`. Tem de ser **idêntico**
   ao `bundleIdentifier` do `app.json`.
6. Na lista de **Capabilities**, marque **Sign in with Apple**. Ao lado dele aparece um botão
   **Edit**; deixe como está (*Enable as a primary App ID*).
7. **Continue** → confira → **Register**.

Confira: ao abrir o App ID, a linha *Sign in with Apple* tem o check marcado.

---

## Etapa 2 — Services ID

É a identidade que o Firebase usa nos fluxos que passam pelo servidor dele. A doc do Firebase
pede mesmo para apps só iOS, então não pule.

Onde: **Identifiers** → **+**.

1. Selecione **Services IDs** → **Continue**.
2. **Description**: `Alpha Zone`. **Este texto é o que o usuário vê** na tela de consentimento
   da Apple nos fluxos web, então use o nome do produto, não algo técnico.
3. **Identifier**: `com.rubiales.alphazone.signin`. Não pode ser igual ao Bundle ID; a
   convenção é o bundle com um sufixo.
4. **Continue** → **Register**.
5. Volte à lista e **clique no Services ID** recém-criado.
6. Marque **Sign in with Apple** e clique **Configure**.
7. No modal:
   - **Primary App ID**: escolha `com.rubiales.alphazone`.
   - **Domains and Subdomains**: `alpha-zone-app.firebaseapp.com`
   - **Return URLs**: `https://alpha-zone-app.firebaseapp.com/__/auth/handler`
     (são **dois** underscores antes de `auth`).
8. **Done** (fecha o modal) → **Continue** → **Save**. O **Save** é o que grava; o Done sozinho
   não salva nada.

Não precisa subir arquivo nenhum no servidor para verificar o domínio, a Apple não exige.

Anote: Services ID = `com.rubiales.alphazone.signin`.

---

## Etapa 3 — Chave privada (.p8)

Onde: **Keys** (barra lateral) → **+**.

1. **Key Name**: `Alpha Zone Sign in with Apple`.
2. Marque **Sign in with Apple** e clique **Configure** ao lado.
3. **Primary App ID**: `com.rubiales.alphazone` → **Save**.
4. **Continue** → confira → **Register** (em algumas versões da tela aparece **Confirm**).
5. **Download**. Baixa um arquivo `AuthKey_XXXXXXXXXX.p8`.
6. **Done**.

⚠️ **O download é único.** A Apple não guarda a chave: se perder o arquivo, o botão Download
fica desabilitado para sempre e você tem de revogar e criar outra (limite de 2 chaves por App
ID). Guarde o `.p8` no gerenciador de senhas agora. **Nunca no repositório**: `*.p8` já está no
`.gitignore`, e não é para tirar de lá.

O **Key ID** são os 10 caracteres do nome do arquivo (`AuthKey_` + Key ID + `.p8`). Ele também
aparece **abaixo do nome da chave** quando você clica nela na lista de Keys.

Essa mesma chave vai ser usada no M8, na Cloud Function que revoga o token da Apple quando o
usuário apaga a conta. Não crie uma segunda para isso.

---

## Etapa 4 — Relay de e-mail privado

Quem escolhe "Ocultar meu e-mail" no login da Apple ganha um endereço
`xxxx@privaterelay.appleid.com`. A Apple **só encaminha** e-mails para esses endereços se o
remetente estiver registrado aqui. Sem isso, o e-mail de redefinição de senha do Firebase é
descartado em silêncio, e o critério de saída "e-mail de reset chega" falha só para esses
usuários, o que é difícil de perceber.

Onde: **Services** (barra lateral) → **Sign in with Apple for Email Communication** →
**Configure**.

1. Em **Email Sources**, clique no **+**.
2. Escolha registrar **e-mails individuais** (não domínio; o domínio `firebaseapp.com` não é
   nosso) e informe `noreply@alpha-zone-app.firebaseapp.com`.
3. **Next** → confira → **Register**.
4. A tabela mostra se o remetente **passou no SPF**. Se aparecer como reprovado, os e-mails
   vão bater e voltar. Nesse caso a saída é usar domínio próprio para os e-mails do Firebase
   (console → Authentication → Templates → personalizar domínio) e registrar esse domínio aqui.

---

## Etapa 5 — Ligar o provedor no Firebase

Onde: [console do Firebase](https://console.firebase.google.com/project/alpha-zone-app/authentication/providers)
→ **Authentication** → aba **Sign-in method** → **Add new provider** → **Apple**.

1. **Enable**.
2. **Services ID**: `com.rubiales.alphazone.signin`.
3. Expanda **OAuth code flow configuration**:
   - **Apple team ID**: `29XQZ253D3`
   - **Key ID**: os 10 caracteres da etapa 3
   - **Private key**: abra o `.p8` num editor de texto e cole **o conteúdo inteiro**,
     incluindo as linhas `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`.
4. **Save**.

A página mostra a URL de callback do projeto. Ela tem de ser a mesma Return URL da etapa 2.

---

## Etapa 6 — No Mac, na hora do build

No código não há nada a fazer: `usesAppleSignIn: true` no `app.json` faz o `prebuild` gerar o
entitlement `com.apple.developer.applesignin`.

No Xcode (`ios/AlphaZone.xcworkspace`), em **Signing & Capabilities**, escolha o Team
`29XQZ253D3` com assinatura automática. Como a capability está no App ID, o Xcode a inclui no
provisioning profile sozinho. Se aparecer *"Provisioning profile doesn't include the
com.apple.developer.applesignin entitlement"*, a etapa 1 não foi salva.

```sh
npx expo prebuild -p ios
npx expo run:ios --device
```

---

## Como testar (só em iPhone real)

1. O botão **Continuar com a Apple** aparece só no iOS; no Android ele some de propósito.
2. **Primeiro login**: a folha da Apple pede nome e e-mail. Teste pelo menos uma vez com
   **Ocultar meu e-mail**, para exercitar o relay.
3. Confira no Firestore: `users/{uid}` com `displayName` e `email` preenchidos, e
   `apple_authorizations/{uid}` com o `authorizationCode` (é o que o M8 vai consumir).
4. **Saia e entre de novo**: a Apple não manda mais nome nem e-mail (armadilha 2 do PROJETO.md).
   O perfil tem de continuar com os valores do primeiro login.
5. **Mate o app e reabra**: continua logado.
6. Para a Apple voltar a mandar nome e e-mail (ou para repetir o teste do zero): no iPhone,
   **Ajustes → [seu nome] → Iniciar sessão com a Apple → Alpha Zone → Parar de usar o ID
   Apple**. É o mesmo gesto que valida a exclusão de conta no M8.

## Erros que aparecem nessa fase

| sintoma | causa provável |
|---|---|
| botão da Apple não aparece no iPhone | entitlement ausente: `prebuild` rodou sem `usesAppleSignIn`, ou iOS anterior ao 13 |
| erro de provisioning profile no Xcode | etapa 1 sem salvar, ou Team errado em Signing |
| `auth/invalid-credential` logo após a folha da Apple | Bundle ID do build diferente do App ID, ou provedor Apple desligado no Firebase |
| login funciona mas `users/{uid}` fica sem nome e e-mail | não era o primeiro login; use o passo 6 do teste para resetar |
| e-mail de reset não chega para conta `@privaterelay.appleid.com` | etapa 4 faltando ou SPF reprovado |
| a folha da Apple abre e fecha sem erro | o usuário cancelou (`ERR_REQUEST_CANCELED`); a UI silencia por design |
