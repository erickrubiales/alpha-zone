# ipsc-core — motor de pontuação IPSC

Núcleo **puro** compartilhado pelos apps que usam o motor IPSC. Sem Firestore, sem
React, sem rede: só geometria, pontuação Comstock e classificação.

| arquivo | o que faz |
|---|---|
| `target-geometry.ts` | zonas A/C/D em polígono, hit-test com "beliscar", `scoreShot` |
| `ipsc-scoring.ts` | Comstock (`scoreRun`), `stageMaxPoints`, `rankStage`, `rankMatch`, layout da pista |
| `ipsc-ranking.ts` | classificação de match sobre tipos estruturais (`MatchLike`, `ResultLike`) |
| `ipsc-drills-builtin.ts` | drills clássicos com croqui (El Presidente, Mozambique, …) |
| `format-num.ts` | formatação com separador decimal parametrizado (padrão `,`) |
| `__checks__/check-ipsc-scoring.ts` | 41 casos de aceite |

## Este diretório é ESPELHADO — não edite dentro de um app

O núcleo mora no repositório `ipsc-core` e é copiado para cada app por `git subtree`.
Editar aqui faz os dois apps divergirem em silêncio, que é exatamente o risco que a
separação em dois produtos cria.

**Para mudar o motor:**

O repositório é `github.com/erickrubiales/ipsc-core` (privado). Em cada app, registre
o remoto uma vez: `git remote add ipsc-core https://github.com/erickrubiales/ipsc-core.git`.

```sh
# no repositório ipsc-core
$EDITOR ipsc-scoring.ts
node tools/gen-manifest.mjs        # regenera os hashes
npx tsx __checks__/check-ipsc-scoring.ts
git commit -am "..." && git push

# em CADA app
git subtree pull --prefix src/core ipsc-core main --squash
npm run check:core && npm run check:ipsc
```

## Duas travas automáticas

`npm run check:core` (o mesmo `tools/check-core.mjs` espelhado nos dois apps) falha se:

1. **um byte divergir** do `CORE.manifest.json` — ou faltar/sobrar arquivo;
2. **algum `.ts` daqui importar algo de fora do núcleo** — é essa regra que o mantém
   copiável.

Os hashes normalizam `\r\n` → `\n`, então o resultado é o mesmo em qualquer
`core.autocrlf`. O `coreVersion` é derivado dos próprios hashes: dois apps só
mostram a mesma versão se estiverem com o mesmo motor de verdade.

## Regras para quem mexe aqui

- **Zero imports externos.** Nem `@/…`, nem `firebase`, nem `react`, nem `node:`.
  Dados entram por parâmetro, em tipos estruturais.
- **Nada de localidade fixa.** Separador decimal, unidades e textos são do app.
  Quem precisar formatar usa `format-num.ts` passando o separador.
- **Todo comportamento novo entra com caso de aceite** em `__checks__/`.
