# Alpha Zone

App de **tiro prático (IPSC)** — treino, cronometragem, pontuação Comstock, criador de pistas
e torneios. Produto **pago por assinatura**, para mercado internacional. Extraído de um módulo
que existe e funciona dentro do app da loja **Alvos NG** (`C:\Users\erick\ng-loja-app`), que
continua existindo com a versão pt-BR gratuita.

## Leia isto primeiro

📄 **[docs/PROJETO.md](docs/PROJETO.md)** — contexto completo, decisões fechadas, arquitetura,
estado de cada marco, armadilhas conhecidas e pendências. Ele substitui o histórico da conversa
em que o projeto nasceu. **Comece por lá.**

## Regras que não se negociam

1. **`src/core/` é ESPELHADO — nunca edite nada aqui dentro.** É um `git subtree` do
   repositório `ipsc-core`. Editar direto faz este app e o da loja divergirem em silêncio.
   Para mudar o motor: altere em `C:\Users\erick\ipsc-core`, rode `node tools/gen-manifest.mjs`,
   commite, e traga com `npm run core:pull`.

2. **Nada de ligação com a loja / WooCommerce / WordPress.** A identidade aqui é Firebase Auth
   direto. Se aparecer a necessidade de falar com o WordPress, é sinal de que algo foi portado
   errado.

3. **`entitlements` é coleção de topo**, nunca `users/{uid}/entitlements` — regras do Firestore
   combinam por OU e o cliente se auto-promoveria a assinante. Ver `firestore.rules`.

4. **A divisão grátis/pago mora só em `src/billing/entitlements.ts`.** O resto do app consome
   `useEntitlement(f)`. Um único entitlement `pro` na RevenueCat.

5. **Textos em pt-BR por enquanto.** A extração para i18n é o M7, depois das telas — portar e
   traduzir ao mesmo tempo impede saber se um bug é de porte ou de tradução.

6. **Ao portar da loja: copiar e deletar, nunca reescrever do zero.** Os componentes de gesto
   (alvo interativo, croqui) têm centenas de linhas já testadas na mão.

## Verificação

```sh
npm run check        # check:core (integridade do espelho) && check:ipsc (45 casos de aceite)
npx tsc --noEmit
npx expo start
```

## Estilo

- Comentários em **português**, explicando **por quê**, não o quê. Densidade igual à do código
  ao redor.
- Referências a arquivo em links markdown relativos, não em crase.
