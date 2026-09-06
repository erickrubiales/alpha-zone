# Alpha Zone

App de **tiro prático (IPSC)**: treino, cronometragem, pontuação Comstock, criador de pistas
e torneios. Produto pago por assinatura, para mercado internacional.

**Comece por [docs/PROJETO.md](docs/PROJETO.md)** — contexto, decisões fechadas, arquitetura,
estado de cada marco e armadilhas conhecidas. As regras inegociáveis estão em
[CLAUDE.md](CLAUDE.md).

## Rodar

```sh
npm install
cp .env.example .env            # e preencher (ver docs/PROJETO.md §4, M1)
npx expo prebuild               # gera android/ e ios/ (ambos fora do git)
npx expo run:android --device   # dev build num aparelho real
npx expo start                  # Metro para o dev build já instalado
```

O login usa SDKs nativos (Google e Apple), então **não roda no Expo Go** — só em dev build.

Os arquivos `google-services.json` e `GoogleService-Info.plist` ficam fora do git, ao lado
do `.env`. Para baixá-los de novo:

```sh
firebase apps:sdkconfig ANDROID 1:371270416807:android:c8f0dc92330064f56d9e82 -o google-services.json
firebase apps:sdkconfig IOS 1:371270416807:ios:2aaf9584d0abb89c6d9e82 -o GoogleService-Info.plist
```

## Verificar

```sh
npm run check        # check:core (integridade do espelho) && check:ipsc (45 casos de aceite)
npx tsc --noEmit
```

## Regras do Firestore

```sh
firebase deploy --only firestore:rules
```

## `src/core/` é espelhado — nunca editar aqui

É um `git subtree` de `ipsc-core`. Para mudar o motor, altere em `C:\Users\erick\ipsc-core`,
rode `node tools/gen-manifest.mjs`, commite, e traga com `npm run core:pull`.
