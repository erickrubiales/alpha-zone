# M2 — contas, contratos e lojas: guia de configuração

> Tudo o que o M2 (monetização ponta a ponta) precisa **fora do código**. São quatro frentes:
> Apple, Google Play, RevenueCat e Firebase. Faça na ordem da tabela abaixo, porque os itens
> lentos têm de começar primeiro. Fontes: ajuda do App Store Connect, docs da RevenueCat e do
> Firebase, conferidas em 2026-09-07.
>
> Regra de ouro: **nada de chave, JSON de service account ou segredo entra no repositório**.
> Tudo isso vai para o gerenciador de senhas e, no M2, para a configuração das Cloud Functions.

## Ordem e tempo

| # | o quê | onde | demora | bloqueia |
|---|---|---|---|---|
| 1 | Contrato de apps pagos + fiscal + banco | App Store Connect | **dias** (verificação bancária) | criar assinaturas na Apple, sandbox |
| 2 | Perfil de pagamentos (merchant) | Play Console | horas a dias (verificação) | criar assinaturas no Google |
| 3 | Firebase no plano Blaze | Firebase console | minutos | a Cloud Function do webhook |
| 4 | App criado nas duas lojas | App Store Connect + Play Console | minutos | assinaturas, credenciais |
| 5 | Credenciais para a RevenueCat | App Store Connect + Google Cloud + Play Console | minutos, mas **até 36 h para valer** no Google | RevenueCat ler as compras |
| 6 | RevenueCat: projeto, apps, entitlement `pro` | RevenueCat | minutos | o SDK no app |
| 7 | Assinaturas nas lojas + produtos na RevenueCat | as três | minutos | a compra em sandbox |
| 8 | Testadores de sandbox | App Store Connect + Play Console | minutos | o teste do M2 |

Comece por 1, 2 e 3 hoje. Os outros podem esperar o código do M2, mas nada impede de fazer
tudo de uma vez.

## Valores que você vai usar

| o quê | valor |
|---|---|
| Team ID (Apple) | `29XQZ253D3` |
| Bundle ID / package | `com.rubiales.alphazone` |
| Projeto Firebase / Google Cloud | `alpha-zone-app` |
| Entitlement (decisão fechada, um só) | `pro` |
| Produtos Apple (sugestão) | `alphazone_pro_monthly`, `alphazone_pro_yearly` |
| Produto Google (sugestão) | assinatura `alphazone_pro`, base plans `monthly` e `yearly` |
| Identificadores na RevenueCat | Apple: os mesmos ids; Google: `alphazone_pro:monthly` e `alphazone_pro:yearly` |
| Offering / pacotes | `default` com `$rc_monthly` e `$rc_annual` |
| Grupo de assinaturas (Apple) | `Alpha Zone Pro` |

⚠️ **Id de produto é para sempre.** Nas duas lojas, um id usado uma vez nunca mais pode ser
reutilizado, nem em outro app, nem depois de apagado. Errou o nome, o id morre. Por isso os
ids acima não trazem preço nem período de teste: essas coisas mudam, o id não.

## Decisões que só você toma

Não estão em nenhum documento. Decida antes da etapa 7:

- **Preço** mensal e anual (a Apple e o Google convertem por região a partir de um preço base).
- **Período grátis** de teste, se houver (7 dias é o padrão do mercado).
- **Nome nas lojas.** "Alpha Zone" pode já estar em uso na App Store; o nome tem de ser único.
  Tenha um plano B (por exemplo "Alpha Zone IPSC" ou "Alpha Zone Timer").

---

## Etapa 1 — Apple: contrato de apps pagos, impostos e banco

É o item mais lento de todo o projeto. Sem ele, **não dá para criar assinatura nem testar em
sandbox**: a compra falha com um erro genérico que não diz o motivo.

Onde: [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Business** (menu
superior) → aba **Agreements**. Só o **Account Holder** da conta enxerga e assina.

1. Na linha **Paid Apps**, clique **View and Agree to Terms**. Pode pedir o código de dois
   fatores. Leia, marque, **Agree**. Não tem volta.
2. A linha Paid Apps passa a exigir três blocos, cada um com seu status:
   - **Contact Info**: contatos Legal, Senior Management, Finance, Technical, Marketing. Pode
     ser a mesma pessoa em todos.
   - **Tax Info**: o formulário fiscal dos EUA, obrigatório para todo mundo. Pessoa física fora
     dos EUA preenche o **W-8BEN**; empresa, o **W-8BEN-E**. Depois aparecem formulários de
     outras regiões (Austrália, Brasil, Japão…); só o dos EUA é obrigatório para começar.
   - **Bank Info**: conta bancária que recebe em BRL. A Apple pede banco, agência, conta e
     CPF/CNPJ do titular. O status da conta passa por **Pending → Clear**, e "Clear" pode levar
     alguns dias.
3. Pronto quando a linha **Paid Apps** mostra **Active** e o banco mostra **Clear**.

Como a conta é a mesma da Alvos NG, que é gratuita, é provável que nada disso exista ainda.
Confira o status antes de qualquer outra coisa.

---

## Etapa 2 — Google Play: perfil de pagamentos

Onde: [play.google.com/console](https://play.google.com/console) → **Setup** (menu lateral)
→ **Payments profile**.

1. Clique em criar/associar um perfil de pagamentos do Google (é a conta de "merchant").
2. Preencha os dados do negócio (nome, endereço, CPF/CNPJ) e a conta bancária em BRL.
3. O Google pode pedir verificação de identidade. Responda logo; enquanto não verifica, as
   assinaturas não podem ser vendidas.

Pronto quando a página do perfil de pagamentos não mostra nenhum aviso pendente.

Observação: a conta de desenvolvedor já é usada pela Alvos NG, então a verificação de conta de
desenvolvedor (a que exige testes fechados de 14 dias em contas novas) não deve aparecer.

---

## Etapa 3 — Firebase no plano Blaze

O reforço no servidor do M2 é uma **Cloud Function**, e Functions não existem no plano
gratuito. O Blaze continua grátis dentro das cotas do Spark; o que passa disso é cobrado, e para
este app o custo é centavos.

Onde: [console do Firebase](https://console.firebase.google.com/project/alpha-zone-app/usage)
→ ⚙️ **Configurações do projeto** → **Uso e faturamento** → **Detalhes e configurações** →
**Modificar plano** → **Blaze**.

1. Escolha uma conta de faturamento do Google Cloud existente ou crie uma (cartão de crédito).
2. Ao concluir, o console oferece **definir um alerta de orçamento**. Defina, por exemplo, R$ 50
   por mês. O alerta não bloqueia nada, só avisa por e-mail; serve para pegar um loop de
   função descontrolado antes da fatura.

Pronto quando a página de uso mostra **Blaze**.

---

## Etapa 4 — Criar o app nas duas lojas

### App Store Connect

Onde: **Apps** → **+** → **New App**.

- **Platforms**: iOS.
- **Name**: o nome escolhido (único na App Store; se recusar, é o plano B).
- **Primary Language**: português (Brasil). Muda depois, no M7.
- **Bundle ID**: escolha `com.rubiales.alphazone` na lista. Ele aparece porque o App ID foi
  registrado no guia da Apple. Se não aparecer, aquela etapa 1 não foi salva.
- **SKU**: `alphazone`. É interno, nunca muda, ninguém vê.
- **User Access**: Full Access.

Não precisa preencher a ficha da loja agora. O registro existe só para pendurar as assinaturas
e as credenciais.

### Play Console

Onde: **All apps** → **Create app**.

- **App name**: o mesmo nome.
- **Default language**: Português (Brasil).
- **App or game**: App. **Free or paid**: **Free**. A assinatura mora dentro do app; marcar
  "paid" cobraria pelo download, e isso não se desfaz depois.
- Aceite as declarações e crie.

Ainda no Play Console, com o app criado: **Setup → App signing** deixa o Google gerenciar a
chave de upload (padrão). O **SHA-1 de release** que vai para o Firebase (armadilha 4 do
PROJETO.md) é o da **App signing key** mostrada nessa tela, não o da sua chave de upload:

```sh
firebase apps:android:sha:create 1:371270416807:android:c8f0dc92330064f56d9e82 <SHA1-da-app-signing-key>
```

O Play Console **não deixa criar assinatura antes de subir um build** em alguma faixa. Isso
fica para a hora do código do M2 (etapa 7).

---

## Etapa 5 — Credenciais para a RevenueCat

### Apple: In-App Purchase Key

Onde: App Store Connect → **Users and Access** → aba **Integrations** → **In-App Purchase**.

1. Clique **Generate In-App Purchase Key** (ou **+** se já houver alguma). Nome:
   `RevenueCat`.
2. **Download** do `.p8`. ⚠️ Só uma vez, como a chave do Sign in with Apple. Guarde no
   gerenciador de senhas.
3. Anote o **Key ID** (na lista) e o **Issuer ID** (no topo da mesma página). Se o Issuer ID não
   aparecer, crie antes uma chave qualquer na aba **App Store Connect API**; ele passa a
   aparecer.

Se a RevenueCat pedir também o **App-Specific Shared Secret**: está em **Apps → Alpha Zone →
App Information → App-Specific Shared Secret → Manage**. É um fallback para recibos antigos;
gere e cole se for solicitado.

### Google: service account + APIs (é o mais chato, siga na ordem)

Onde: [console.cloud.google.com](https://console.cloud.google.com), projeto **alpha-zone-app**
(é o mesmo projeto do Firebase; não crie outro).

1. **APIs e serviços → Biblioteca**: ative, uma por uma, **Google Play Android Developer API**,
   **Google Play Developer Reporting API**, **Cloud Pub/Sub API**, **Cloud Resource Manager
   API** e **Identity and Access Management (IAM) API**.
2. **IAM e administrador → Contas de serviço → Criar conta de serviço**. Nome `revenuecat`.
   Papéis: **Editor do Pub/Sub** e **Leitor do Monitoring**. Concluir.
3. Na conta criada: aba **Chaves → Adicionar chave → Criar nova chave → JSON**. Baixa um
   `.json`. Guarde no gerenciador de senhas; **jamais no repositório**.
4. Anote o e-mail da conta de serviço (`revenuecat@alpha-zone-app.iam.gserviceaccount.com`).
5. **Play Console → Users and permissions → Invite new users**: cole esse e-mail. Em **App
   permissions**, adicione o Alpha Zone e marque exatamente estas quatro:
   - *View app information and download bulk reports (read-only)*
   - *View financial data, orders, and cancellation survey responses*
   - *Manage orders and subscriptions*
   - *Manage store presence*
   Envie o convite.
6. ⚠️ **Até 36 horas para o Google propagar.** Nesse intervalo a RevenueCat mostra a
   credencial como inválida mesmo estando certa. Não recrie nada; espere.

### Google: notificações em tempo real (RTDN)

Sem isso a RevenueCat só descobre renovação e cancelamento por polling, e o portão demora a
fechar.

1. Google Cloud, projeto `alpha-zone-app` → **Pub/Sub → Tópicos → Criar tópico**. Nome:
   `play-rtdn`.
2. No tópico, **Permissões → Conceder acesso**: principal
   `google-play-developer-notifications@system.gserviceaccount.com`, papel **Publicador do
   Pub/Sub**.
3. Play Console → **Monetize with Play → Monetization setup** (o nome do menu varia) →
   **Real-time developer notifications** → Topic name: `projects/alpha-zone-app/topics/play-rtdn`
   → **Send test notification** tem de dar certo → Save.

---

## Etapa 6 — RevenueCat: projeto, apps e o entitlement `pro`

Onde: [app.revenuecat.com](https://app.revenuecat.com). Crie a conta com o e-mail do projeto.

1. **Create new project**: `Alpha Zone`.
2. **Apps → + New app → App Store**: nome `Alpha Zone iOS`, Bundle ID `com.rubiales.alphazone`.
   Na aba **In-app purchase key configuration**: envie o `.p8` da etapa 5 e o **Issuer ID**.
   Salve; a RevenueCat valida na hora.
3. **Apps → + New app → Play Store**: nome `Alpha Zone Android`, package
   `com.rubiales.alphazone`. Em **Service account credentials JSON**: envie o `.json`. Se
   acusar inválido antes de 36 h, é a propagação, não você.
4. **Product catalog → Entitlements → + New**: identificador **`pro`**, descrição "Assinatura
   Alpha Zone". **Um só**, é decisão fechada no PROJETO.md: entitlement por feature quebraria
   assinantes quando o corte grátis/pago mudar.
5. **Project settings → API keys**: anote as duas **chaves públicas de SDK**, uma por app
   (`appl_…` e `goog_…`). Elas vão para o `.env` como `EXPO_PUBLIC_REVENUECAT_IOS_KEY` e
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`; são públicas por natureza, como as do Firebase.
   A **chave secreta** (`sk_…`) é só para o servidor e não sai do gerenciador de senhas.

Os produtos, a offering e o webhook entram na etapa 7, porque dependem das assinaturas
existirem nas lojas.

---

## Etapa 7 — Assinaturas nas lojas e produtos na RevenueCat

### Apple

Onde: App Store Connect → **Apps → Alpha Zone → Subscriptions** (menu lateral, seção
Monetization).

1. **+** em Subscription Groups. Reference Name `Alpha Zone Pro`. O grupo é o que permite o
   usuário trocar entre mensal e anual sem pagar duas vezes.
2. Dentro do grupo, **+** para cada assinatura:
   - Reference Name `Alpha Zone Pro mensal`, Product ID `alphazone_pro_monthly`, duração 1 mês.
   - Reference Name `Alpha Zone Pro anual`, Product ID `alphazone_pro_yearly`, duração 1 ano.
3. Em cada uma: **Subscription Prices** (preço base; a Apple calcula os outros países),
   **Localization** (nome de exibição e descrição, é o que o usuário vê), e opcionalmente
   **Introductory Offers** para o período grátis.
4. **Review Information** pede uma **captura de tela do paywall**. Sem ela o produto fica em
   *Missing Metadata* e não carrega no sandbox. Coloque uma captura provisória do paywall do M2
   assim que ele existir; o status tem de ser **Ready to Submit**.
5. No grupo, **Localization** do próprio grupo (nome que aparece em Ajustes → Assinaturas).

### Google

Só depois de **subir um build** numa faixa. Na hora do código do M2:

```sh
npx expo prebuild -p android
cd android && ./gradlew bundleRelease     # gera o .aab assinado com a chave de upload
```

Play Console → **Testing → Internal testing → Create new release** → envie o `.aab` → salve.
Não precisa publicar; o build existir já libera os produtos.

Então **Monetize with Play → Products → Subscriptions → Create subscription**:

- Product ID `alphazone_pro`, nome `Alpha Zone Pro`.
- **Add base plan** `monthly`: auto-renewing, 1 mês, preço. **Activate**.
- **Add base plan** `yearly`: auto-renewing, 1 ano, preço. **Activate**.
- Período grátis, se houver, é uma **offer** dentro do base plan.

### RevenueCat

1. **Product catalog → Products → + New**: para o app iOS, `alphazone_pro_monthly` e
   `alphazone_pro_yearly`; para o app Android, `alphazone_pro:monthly` e `alphazone_pro:yearly`
   (formato `assinatura:base_plan`, obrigatório para produtos criados depois de 2023). Os ids
   têm de ser **idênticos** aos das lojas, letra por letra.
2. **Entitlements → pro → Attach**: anexe os quatro produtos. ⚠️ Produto sem entitlement é
   compra que não abre nada; a RevenueCat avisa, mas não impede.
3. **Offerings → + New**: identificador `default`. Dentro, **+ New package**: `$rc_monthly` com
   os dois produtos mensais (iOS e Android) e `$rc_annual` com os dois anuais. Marque a offering
   como **Current**. O app pede "a offering atual" e recebe os pacotes certos por plataforma.
4. **Integrations → Webhooks → + New** (quando a Cloud Function do M2 existir):
   - URL: a da função, no formato `https://<região>-alpha-zone-app.cloudfunctions.net/revenuecatWebhook`.
   - **Authorization header**: gere uma string aleatória longa e guarde no gerenciador de
     senhas; a função vai recusar qualquer chamada sem ela.
   - Environment: **sandbox e produção**. Scope: todo o projeto.
   - Eventos que interessam: `INITIAL_PURCHASE`, `RENEWAL`, `EXPIRATION`, `CANCELLATION`,
     `BILLING_ISSUE`, `PRODUCT_CHANGE`, `TRANSFER`. A RevenueCat espera **200 em até 60 s** e
     tenta de novo 5 vezes (5, 10, 20, 40, 80 min); a função precisa ser idempotente pelo `id`
     do evento.

---

## Etapa 8 — Testadores de sandbox

### Apple

Onde: App Store Connect → **Users and Access** → aba **Sandbox** → **Testers** → **+**.

- Use um e-mail que você controla e que **não seja Apple ID de ninguém** (um alias
  `seuemail+sandbox1@gmail.com` funciona). Confirme pelo link que chega.
- No iPhone: **Ajustes → Desenvolvedor → Conta Apple do Sandbox** (iOS 18+) ou **Ajustes →
  App Store → Conta Sandbox** (iOS 17 e anteriores). Entre com o testador. Não saia da sua conta
  normal.
- Renovação acelerada: 1 mês = **5 min**, 1 ano = **1 h**, no máximo 12 renovações por dia.
  É isso que permite ver a expiração fechar o portão no mesmo dia (critério de saída do M2).

### Google

Onde: Play Console → **Setup → License testing**.

- Adicione o Gmail do aparelho de teste à lista. Só **uma** conta Google logada no aparelho,
  senão o Play se confunde.
- Na faixa **Internal testing**, copie o **link de opt-in** e abra no aparelho com essa conta.
  Sem o opt-in os produtos não carregam, sem erro nenhum.
- O aparelho precisa de PIN/biometria; sem bloqueio de tela a compra falha com erro genérico.
- O app instalado tem de ser **assinado com a chave de release** (o build da faixa ou o
  `bundleRelease` local), não o de debug.
- Renovação acelerada: 1 mês = **5 min**, 1 ano = **30 min**.

---

## Checklist final: o que precisa existir antes do código do M2

- [ ] Apple: **Paid Apps = Active**, banco **Clear**
- [ ] Google: perfil de pagamentos sem pendência
- [ ] Firebase: plano **Blaze** com alerta de orçamento
- [ ] App criado no App Store Connect e no Play Console
- [ ] In-App Purchase Key (`.p8` + Issuer ID) enviada à RevenueCat, status válido
- [ ] Service account JSON enviada à RevenueCat, válida (depois das 36 h)
- [ ] RTDN: tópico `play-rtdn` com "Send test notification" ok
- [ ] RevenueCat: entitlement `pro`; chaves públicas `appl_…` e `goog_…` anotadas
- [ ] Decididos: preço mensal e anual, período grátis, nome nas lojas

O que fica para a hora do código: subir o `.aab` interno, criar as assinaturas nas duas lojas,
produtos + offering na RevenueCat, o webhook, e os testadores de sandbox.

## O que vai para onde (e o que nunca vai para o repo)

| item | destino |
|---|---|
| `appl_…`, `goog_…` (chaves públicas de SDK) | `.env` (fora do git), como as do Firebase |
| segredo do header do webhook | configuração das Cloud Functions (`firebase functions:secrets:set`) |
| `sk_…` da RevenueCat | gerenciador de senhas; hoje nem precisa ser usada |
| `.p8` da In-App Purchase Key, `.json` da service account | gerenciador de senhas; sobem só pelo painel da RevenueCat |
| e-mails e senhas dos testadores de sandbox | gerenciador de senhas |
