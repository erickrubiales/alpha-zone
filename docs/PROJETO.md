# Alpha Zone — contexto, decisões e roteiro

> **Este arquivo substitui o histórico da conversa.** Ele foi escrito no fim da sessão
> em que o projeto nasceu, para que qualquer sessão futura (ou qualquer pessoa)
> retome sem depender do que foi dito. Se algo aqui divergir do código, o código manda —
> e este arquivo deve ser corrigido.
>
> Data: 2026-09-06.

---

## 1. O que é este projeto

O **Alpha Zone** é um app de **tiro prático (IPSC)** — treino, cronometragem, pontuação
Comstock, criador de pistas e torneios. Ele nasceu de um módulo que já existe e funciona
dentro de outro app, e está sendo extraído para virar **produto próprio**.

Existem **dois produtos**, que vão evoluir em paralelo:

| | **Alvos NG** (existente) | **Alpha Zone** (este) |
|---|---|---|
| Repositório | `C:\Users\erick\ng-loja-app` | `C:\Users\erick\alpha-zone` |
| O que é | e-commerce headless (WooCommerce) que ganhou módulo de treino | app de IPSC puro |
| Público | Brasil | internacional |
| Idioma | português | pt / en / es |
| Preço | grátis | **assinatura** (freemium) |
| Papel | agregar valor e trazer comprador para a loja | produto que se paga |
| Identidade | login WordPress (JWT → custom token Firebase) | **Firebase Auth direto** |
| Expo SDK | 56 | 57 |

O app da loja **mantém** o módulo IPSC em pt-BR, grátis. Ele não vai ser removido de lá —
serve para atrair comprador. Os dois apps convivem no mesmo aparelho.

**Isto não é "separar um módulo", é lançar um produto.** Duas exigências que o app da loja
nunca teve entram no caminho crítico: **cobrança pelas lojas** e **internacionalização**.

---

## 2. Decisões fechadas — não reabrir

1. **Login**: Firebase Auth direto (e-mail/senha + Google + Apple). Zero WordPress.
2. **Escopo**: treino individual + criador de pistas/croqui + torneios.
3. **Os dois apps evoluem.** O da loja mantém a versão pt-BR gratuita.
4. **Repositório novo**, com o núcleo de pontuação **espelhado** (não copiado à mão).
5. **Freemium**: treino grátis; torneios, croqui/criador, cronômetro e histórico longo na assinatura.
6. **Idiomas**: pt, en, es.
7. **Projeto Firebase novo**, isolado do da loja.
8. **Nome**: Alpha Zone (a zona A do alvo).
9. **Conta de desenvolvedor**: a mesma da Alvos NG (Apple Team ID `29XQZ253D3`).
10. **Build de iOS**: local, em Mac (há acesso a um).

### Identificadores

Escolhidos para **não colidir** com o app da loja — os dois vão estar no mesmo aparelho.

| | Alvos NG | **Alpha Zone** |
|---|---|---|
| bundle id (iOS) / package (Android) | `com.rubiales.nglojaapp` | `com.rubiales.alphazone` |
| scheme | `nglojaapp` | `alphazone` |
| slug | `ng-loja-app` | `alpha-zone` |
| projeto EAS | `3a7533ca-…` | **ainda não criado** |

---

## 3. Arquitetura

### 3.1 O núcleo espelhado — o mecanismo e o porquê

O motor de pontuação é **idêntico nos dois apps**. Ele mora num repositório próprio e é
copiado fisicamente para dentro de cada app por `git subtree`.

**Repositório**: `github.com/erickrubiales/ipsc-core` (privado)
**Espelhado em**: `src/core/` nos dois apps
**Cópia local do espelho**: `C:\Users\erick\ipsc-core`

Por que subtree e não as alternativas: *submodule* quebra no EAS Build (checkout raso) e em
clones sem `--recursive`; *pacote npm privado* exige publicar e versionar a cada ajuste do
motor e mata o hot-reload. Com subtree os arquivos estão fisicamente no repo — Metro,
TypeScript e EAS funcionam sem configuração nenhuma.

**Só `core/` é espelhado.** Telas e camada de dados **vão divergir** (pt-BR único vs 3 idiomas,
tudo grátis vs portões de assinatura) e tentar compartilhá-las produziria condicionais que
quebram os dois apps.

#### O que está no núcleo

| arquivo | o que faz |
|---|---|
| `target-geometry.ts` | zonas A/C/D em polígono, hit-test com "beliscar", `scoreShot` |
| `ipsc-scoring.ts` | Comstock (`scoreRun`), `stageMaxPoints`, `rankStage`, `rankMatch`, layout da pista |
| `ipsc-ranking.ts` | classificação de match sobre tipos estruturais (`MatchLike`, `ResultLike`, `ParticipantLike`) |
| `ipsc-drills-builtin.ts` | drills clássicos com croqui (El Presidente, Mozambique, …) |
| `format-num.ts` | formatação com separador decimal **parametrizado** (padrão `,`) |
| `__checks__/check-ipsc-scoring.ts` | **45 casos de aceite** |
| `tools/check-core.mjs` | a trava (ver abaixo) |
| `tools/gen-manifest.mjs` | regenera os hashes — só roda no repo `ipsc-core` |

#### As duas travas automáticas

`npm run check:core` roda o **mesmo** `tools/check-core.mjs` nos dois apps (ele é espelhado
junto com o núcleo, então não existe versão divergente do próprio verificador). Falha se:

1. **um byte divergir** do `CORE.manifest.json`, ou faltar/sobrar arquivo;
2. **algum `.ts` do núcleo importar algo de fora do núcleo** — é essa regra que o mantém copiável.

Os hashes normalizam `\r\n` → `\n` (a máquina tem `core.autocrlf=true`; sem isso o espelho
falharia entre Windows e o CI) e há um `.gitattributes` com `* text eol=lf` dentro do núcleo.
O `coreVersion` é derivado dos próprios hashes: os dois apps só mostram a mesma versão se
estiverem com o mesmo motor de verdade.

**As três sabotagens foram testadas e todas são pegas**: byte alterado, arquivo intruso,
import externo. E `gen-manifest.mjs` se recusa a rodar dentro de um app (senão bastaria
rodá-lo para "consertar" uma divergência e a trava não valeria nada).

#### Como alterar o motor

```sh
# 1) no repositório ipsc-core (C:\Users\erick\ipsc-core)
$EDITOR ipsc-scoring.ts
node tools/gen-manifest.mjs                       # regenera os hashes
npx tsx __checks__/check-ipsc-scoring.ts          # os casos de aceite
git commit -am "..." && git push

# 2) em CADA app (alpha-zone e ng-loja-app)
npm run core:pull            # git subtree pull --prefix src/core ipsc-core main --squash
npm run check                # check:core && check:ipsc
```

**Nunca editar `src/core/` dentro de um app.** Faz os dois divergirem em silêncio, que é
exatamente o risco que a separação em dois produtos cria.

### 3.2 Estrutura do Alpha Zone

```
src/
├── core/          ← SUBTREE de ipsc-core, zero imports externos  [PRONTO]
├── data/          ← Firebase: config.ts, firebase.ts, firebase.native.ts  [PRONTO]
├── auth/          ← Firebase Auth: contexto, e-mail, Google, Apple, perfil  [PRONTO]
├── billing/       ← entitlements.ts (o portão), RevenueCat, paywall  [M2]
├── i18n/          ← i18next + num.ts (decimal) + units.ts (m ↔ yd)  [M7]
├── components/    ← form.tsx pronto; alvo, croqui, cronômetro vêm no M4/M5
├── constants/     ← design.ts (paleta + fontes)  [PRONTO]
└── app/           ← Expo Router: (auth)/ e (app)/  [esqueleto pronto]
```

### 3.3 Freemium num arquivo só

`src/billing/entitlements.ts` será **o único lugar** onde a divisão grátis/pago existe:
lista de `Feature`, `FREE_FEATURES`, `FREE_HISTORY_DAYS`. O resto do app só consome
`useEntitlement(f)`, `<Gated feature="matches">` e `requirePro('drillEditor')`.

**Um único entitlement `pro` na RevenueCat** — não um por feature. O corte grátis/pago é
hipótese de negócio e vai mudar; mudar entitlement quebraria assinantes.

Regra de lint a criar: `react-native-purchases` só pode ser importado dentro de `src/billing/`.

**Reforço no servidor** (portão de cliente é contornável): webhook RevenueCat → Cloud Function
→ grava `entitlements/{uid}` + custom claim `pro` → regras exigem `request.auth.token.pro`.

⚠️ **`entitlements` TEM de ser coleção de topo**, nunca `users/{uid}/…`. Regras do Firestore
combinam por OU: um `allow write` no wildcard `users/{uid}/{document=**}` não pode ser
subtraído por uma regra posterior, e o cliente se auto-promoveria a assinante. Já está
codificado assim em `firestore.rules`.

---

## 4. Estado atual

### ✅ M0 — Fechar o núcleo (feito no repo da loja)

Feito na branch **`core/extract-ipsc-core`** do `ng-loja-app`, **ainda não mesclada em `main`
e ainda não publicada**. Nenhuma mudança de comportamento na loja.

- moveu `target-geometry.ts`, `ipsc-scoring.ts`, `ipsc-drills-builtin.ts` de `src/lib/` para `src/core/`, e os casos de aceite de `scripts/` para `src/core/__checks__/`
- extraiu 4 funções puras de classificação (`effectiveIpscResults`, `ipscStageRanking`, `ipscMatchRanking`, `ipscMatchMaxPoints`) de `treino-tournaments.ts` — que é cheio de Firestore — para `core/ipsc-ranking.ts`, sobre **tipos estruturais**. `treino-tournaments.ts` as re-exporta com os tipos concretos da loja, então **nenhuma chamada mudou**.
- extraiu `formatHitFactor`/`formatTime` para `core/format-num.ts` com o **separador decimal parametrizado** (default `','`), para o app internacional passar `'.'`.

Verificação: `check:ipsc` 45/45, `tsc --noEmit` limpo, `eslint` limpo nos arquivos tocados.

### ✅ M0.5 — Espelho verificável

- `github.com/erickrubiales/ipsc-core` criado (privado), com CI em `.github/workflows/check.yml` rodando `check:core` e `check:ipsc` em push e PR.
- `src/core/` é subtree nos **dois** apps, com `coreVersion` idêntico (`48511c65fa3e` na última verificação).
- Ida e volta comprovada: alteração no `ipsc-core` → push → `subtree pull` → checks passam nos dois.

> ⚠️ **O resultado do CI nunca foi conferido.** A chamada à API do GitHub travou num prompt
> de credencial. Conferir a aba Actions do `ipsc-core` — se falhar, provavelmente é a versão
> do Node no runner.

### 🔵 M1 — Identidade + build nativa (EM ANDAMENTO)

> **Pronto quando:** dev build em **iPhone e Android reais**; login pelos 3 métodos;
> matar e reabrir o app mantém a sessão; e-mail de redefinição de senha chega.

Ele vem antes de qualquer tela porque é o **único trecho com latência externa** (capabilities
da Apple, contrato de apps pagos). Falha aqui invalida o projeto inteiro, e é melhor
descobrir agora do que depois de portar 3.000 linhas de torneio.

**O que já está escrito** (commit `feat(m1): identidade Firebase…`):

| arquivo | conteúdo |
|---|---|
| `src/data/config.ts` | chaves via `EXPO_PUBLIC_FIREBASE_*` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| `src/data/firebase.native.ts` | **`initializeAuth` + `getReactNativePersistence(AsyncStorage)`** — portado verbatim da loja |
| `src/data/firebase.ts` | versão web |
| `src/auth/auth-context.tsx` | `useAuth()` com `user`, `ready`, e os 6 métodos |
| `src/auth/apple.ts` | nonce SHA-256, `signInWithCredential`, captura do primeiro grant |
| `src/auth/google.ts` | SDK nativo, `webClientId`, `signOutGoogle` |
| `src/auth/profile.ts` | `ensureProfile` (nunca sobrescreve nome/e-mail) + guarda do `authorizationCode` |
| `src/auth/auth-errors.ts` | códigos `auth/` → frases acionáveis |
| `src/app/_layout.tsx` | fontes, `AuthProvider`, guard por `Stack.Protected` |
| `src/app/(auth)/` | `sign-in`, `sign-up`, `reset` |
| `src/app/(app)/index.tsx` | home provisória que prova sessão + núcleo ligado |
| `firestore.rules` | regras iniciais (ver §3.3) |

**O que falta no M1:**

1. Criar o projeto Firebase e preencher `.env` (copiar de `.env.example`).
2. Baixar `google-services.json` (Android) e `GoogleService-Info.plist` (iOS) e referenciá-los no `app.json`.
3. Adicionar o `iosUrlScheme` do Google Sign-In no plugin (`app.json`), que vem do plist (`REVERSED_CLIENT_ID`).
4. `npx expo prebuild` e rodar dev build em aparelho real nas duas plataformas.
5. Publicar `firestore.rules` no projeto novo.
6. Testar os 4 critérios de saída.

---

## 5. Roteiro completo — a ordem é por RISCO, não por conveniência

| # | Objetivo | Pronto quando |
|---|---|---|
| ~~M0~~ | ~~Fechar o núcleo no repo atual~~ | ✅ |
| ~~M0.5~~ | ~~Espelho verificável~~ | ✅ |
| **M1** | **Identidade + build nativa** | dev build em iPhone e Android reais; login pelos 3 métodos; matar/reabrir mantém sessão; reset de senha chega |
| **M2** | **Monetização ponta a ponta** | compra em sandbox abre o portão; expiração acelerada fecha; escrita direta via REST em `tournaments` **falha** sem `pro` |
| M3 | Núcleo + dados, sem UI | testes de regras no emulador: A não lê nada de B; não-pro não cria torneio; ninguém escreve `entitlements` |
| **M4** | **Treino individual (o produto grátis)** | sessão completa no aparelho; para os mesmos impactos e tempo, HF/pontos **idênticos** ao app da loja; bipe toca no silencioso |
| M5 | Criador de pistas + croqui `[PRO]` | não-pro vê paywall; pro cria drill, distâncias batem, regra recusa escrita sem claim |
| **M6** | Torneios `[PRO]` — **maior marco de UI** | dois aparelhos, duas contas: A cria e compartilha código, B entra pelo link e atira; rankings batem com `check:ipsc` |
| M7 | i18n + unidades | **passe de pseudo-locale**: nenhuma string fora de `⟦…⟧`, nenhum estouro de layout. Em `en-US`, distância em yd e HF com ponto — **dado no Firestore continua em metros** |
| M8 | Conformidade | conta descartável criada, populada e apagada: dados somem dos 3 escopos, login Apple **pede consentimento de novo** |
| M9 | Submissão | TestFlight externo e Play closed testing verdes |

**Por que M1/M2 antes de qualquer tela**: são os únicos itens com dependência externa de
prazo (capabilities da Apple, contrato de apps pagos, RTDN do Google — semanas de latência).

**Por que M7 depois das telas**: portar e traduzir ao mesmo tempo é a receita para não saber
se um bug é de porte ou de tradução. Portar verbatim em pt-BR, fazer funcionar, depois
extrair com lint `no-literal-string` subindo de `warn` para `error` arquivo a arquivo.

---

## 6. Armadilhas conhecidas

Estas custaram tempo ou vão custar. Estão aqui para não custar duas vezes.

1. **Firebase Auth no React Native perde a sessão** se não usar `initializeAuth` com
   `getReactNativePersistence(AsyncStorage)`. Falha silenciosa: o usuário é deslogado a cada
   reinício, sem erro nenhum. Já resolvido em `src/data/firebase.native.ts`.

2. **A Apple manda `fullName` e `email` SÓ na primeira autorização.** Da segunda vez em
   diante vêm vazios, para sempre. Por isso `ensureProfile` nunca sobrescreve o que já está
   gravado. Já resolvido.

3. **Revogação do token da Apple.** A exclusão de conta precisa revogar o acesso, e a revogação
   usa um refresh token que só se obtém trocando o `authorizationCode` (válido ~5 min). Por
   isso ele é capturado **já no M1** e guardado em `apple_authorizations/{uid}` — coleção
   **somente escrita** pelas regras. Falta a Cloud Function que o consome (M8).

4. **Google Sign-In**: usar o **client id da WEB**, não o do Android/iOS — o errado devolve
   `DEVELOPER_ERROR` sem explicação. E o **SHA-1 do certificado de release** precisa estar no
   Firebase, senão funciona no dev build e quebra no build assinado.

5. **`errors.ts` da loja esconde todo erro `auth/`** (linha ~31). Lá faz sentido (o login é do
   WordPress); aqui deixaria o usuário sem saber que errou a senha. Por isso o Alpha Zone tem
   `src/auth/auth-errors.ts` próprio. **Não portar o `errors.ts` da loja para cá.**

6. **Proteção contra enumeração de e-mails** (padrão em projetos Firebase novos) faz senha
   errada e usuário inexistente virarem os dois `auth/invalid-credential`. A mensagem não pode
   afirmar qual foi — já tratado.

7. **Latência do custom claim (até 1 h)**: o usuário paga e a feature não abre. Forçar
   `getIdToken(true)` no listener da RevenueCat e a UI ler `entitlements/{uid}`.

8. **Corrida no limite de vagas**: o `acceptInvite` da loja checa no cliente. Aqui, entrar em
   torneio tem de virar Cloud Function transacional `joinByCode`.

9. **`interactive-target.tsx` é o único porte com risco real** — 664 linhas, das quais ~500 são
   gestos sutis já testados na mão. **Copiar e deletar** (remover `CircularFace`, `scoreColor`,
   foto/calibração), **nunca reescrever do zero**.

10. **Escopo de torneios é ~3× maior do que parece** (~3.000 linhas, telas bimodais que atendem
    precisão e IPSC). Começar por `torneios.tsx` (255 l., 4 pontos de IPSC) para calibrar a taxa
    de corte antes de encarar `torneio-detalhe.tsx` (944 l., 54 pontos). `torneio-sessao.tsx`
    (314 l.) **se descarta** — zero menções a IPSC, verificado.

11. **Revisão das lojas para app de tiro, e pago** — risco maior que qualquer técnico. Nada de
    venda ou link para armas/munição (isso fica no app da loja); posicionar como cronometragem e
    pontuação de esporte de precisão; conta demo nas notas de revisão; não agendar lançamento
    sem folga.

12. **Assinatura sobrevive à exclusão da conta** — texto explícito + deep link para o
    gerenciamento da loja, senão vira disputa de cobrança.

13. **Shell no Windows**: heredocs e regex são mastigados com frequência. Escrever scripts com
    a ferramenta de escrita de arquivo, ou heredoc entre aspas. E o Python daqui **não entende
    caminhos MSYS** (`/c/Users/...`) — usar `C:/Users/...`.

14. **Git Credential Manager trava** em push/fetch para o `ipsc-core`. Autenticar uma vez pelo
    navegador resolve.

---

## 7. Como verificar

```sh
npm run check          # check:core (integridade + fechamento) && check:ipsc (45 casos)
npx tsc --noEmit
npx expo start         # dev
```

- **Motor**: `check:ipsc` roda nos **dois** repos com o mesmo `coreVersion`; `check:core`
  garante que os arquivos são idênticos.
- **Paridade de pontuação** (M4): mesma sessão (mesmos impactos, mesmo tempo) nos dois apps →
  HF, pontos e penalidades idênticos. É o teste que prova que o porte não alterou o motor.
- **Regras**: `@firebase/rules-unit-testing` no emulador — isolamento entre usuários,
  `tournaments.create` sem `pro`, escrita em `entitlements`.
- **Assinatura**: compra em sandbox iOS (a renovação acelerada permite ver a expiração fechar
  o portão no mesmo dia) e internal testing no Android.
- **i18n**: pseudo-locale `zz` (strings envolvidas em `⟦…⟧` e alongadas 35%) revela num passe só
  o que não foi extraído e o que estoura o layout.
- **Torneio**: dois aparelhos com duas contas — único jeito de exercitar o ranking relativo.
- **Exclusão de conta**: criar, popular os 3 escopos, apagar, e conferir que o login Apple volta
  a pedir consentimento.

---

## 8. Fora do escopo

Shot timer Bluetooth (sem hardware para validar o protocolo), importar PDF de briefing da CBTP
para desenhar o croqui, push, e **qualquer ligação com a loja / WooCommerce**.

---

## 9. Pendências fora deste repositório

**No `ng-loja-app`:**
- A branch `core/extract-ipsc-core` **não foi mesclada nem publicada**. São 6 commits.
- Publicar o AAB `alvos-ng-1.2.0-vc10.aab`.
- Build iOS no Mac: `npx expo prebuild -p ios --clean` + `cd ios && pod install`, e conferir
  `grep -i ExpoAudio ios/Podfile.lock` (o erro "Cannot find native module 'ExpoAudio'" era build
  nativo desatualizado).
- Marcar a versão 1.2.0 no painel "App Alvos NG" do WordPress.
- Subir o `ng-headless.php` que está na Área de Trabalho para
  `wp-content/mu-plugins/` (traz o CEP→UF offline que corrigiu o frete, contadores IPSC no
  dashboard e o rótulo "IPSC (beta)" no feedback).

**Contas e serviços (é o que tem latência — começar por aqui):**
1. **Firebase**: projeto novo → apps iOS e Android → baixar os arquivos de config → ativar
   E-mail/senha, Google e Apple em Authentication → publicar `firestore.rules`.
2. **Apple Developer**: App ID `com.rubiales.alphazone` com a capability **Sign in with Apple**,
   mais o Services ID e a Key que o Firebase pede.
3. **Google Play Console**: registrar o app (sem subir nada) e pôr o **SHA-1** no Firebase.
4. **Contrato de apps pagos** + dados bancários e fiscais na Apple. **É o item mais demorado** e
   bloqueia o M2 inteiro.
5. **RevenueCat**: conta, projeto, um entitlement chamado `pro`.

---

## 10. Onde estão as coisas

| | caminho |
|---|---|
| Este app | `C:\Users\erick\alpha-zone` |
| App da loja | `C:\Users\erick\ng-loja-app` |
| Espelho do núcleo (local) | `C:\Users\erick\ipsc-core` |
| Espelho do núcleo (remoto) | `github.com/erickrubiales/ipsc-core` (privado) |
| Especificação do IPSC | `ng-loja-app/docs/ipsc-spec.md` |
| WordPress (staging) | `http://localhost/alvos_ng` em `C:\Ampps` |
