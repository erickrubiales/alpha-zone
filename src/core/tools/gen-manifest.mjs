#!/usr/bin/env node
// Regenera o CORE.manifest.json. Roda SÓ no repositório ipsc-core.
//
//   node tools/gen-manifest.mjs
//
// A guarda é automática: o gerador só funciona quando o núcleo é a raiz de um
// repositório git (isto é, no ipsc-core). Dentro de um app o núcleo é uma
// subpasta, então o gerador se recusa — senão bastaria rodá-lo para "consertar"
// uma divergência e a trava não valeria nada.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CORE_DIR, MANIFEST_NAME, deriveVersion, hashFile, listCoreFiles } from './check-core.mjs';

if (!existsSync(join(CORE_DIR, '.git'))) {
  console.error('✗ este gerador só roda no repositório ipsc-core (o núcleo tem de ser a raiz do git).');
  console.error('  Num app, o núcleo é espelhado: altere lá e traga com `git subtree pull`.');
  process.exit(1);
}

const files = listCoreFiles();
const manifest = {
  _: 'Gerado por tools/gen-manifest.mjs. Não editar à mão — é a trava do espelho.',
  coreVersion: deriveVersion(files),
  files: Object.fromEntries(files.map((f) => [f, hashFile(f)])),
};

writeFileSync(join(CORE_DIR, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ ${MANIFEST_NAME} — ${files.length} arquivos, coreVersion ${manifest.coreVersion}`);
