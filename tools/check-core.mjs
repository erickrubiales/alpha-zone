#!/usr/bin/env node
// Trava automática do núcleo espelhado. Roda igual nos DOIS apps (ele mesmo é
// espelhado junto com o núcleo), então não existe versão divergente do verificador.
//
//   node src/core/tools/check-core.mjs      (npm run check:core)
//
// Verifica três coisas:
//
//   1. INTEGRIDADE — cada arquivo bate com o SHA-256 do CORE.manifest.json, não
//      falta nenhum e não sobra nenhum. É isso que prova que o núcleo é IDÊNTICO
//      ao do repositório ipsc-core, sem depender de disciplina de ninguém.
//   2. FECHAMENTO — nenhum .ts do núcleo importa nada de fora do núcleo. É essa
//      regra que mantém o núcleo copiável: se alguém importar '@/lib/…' aqui, o
//      espelho quebra no outro app e o CI avisa na hora.
//   3. VERSÃO — o coreVersion é derivado dos próprios hashes, então os dois apps
//      só exibem a mesma versão se estiverem realmente com o mesmo motor.
//
// As quebras de linha são normalizadas antes do hash (\r\n → \n): o núcleo tem de
// dar o mesmo resultado com qualquer core.autocrlf do Windows.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_NAME = 'CORE.manifest.json';

// '.github' é infraestrutura do repositório ipsc-core, não parte do motor: fica fora
// do manifesto (nos apps ele desce junto pelo subtree, inerte).
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules']);

/** Caminhos (relativos ao núcleo, sempre com '/') de tudo que o espelho carrega. */
export function listCoreFiles(dir = CORE_DIR, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...listCoreFiles(abs, rel));
    else if (rel !== MANIFEST_NAME) out.push(rel);
  }
  return out;
}

/** SHA-256 do conteúdo com quebras de linha normalizadas. */
export function hashFile(rel) {
  const text = readFileSync(join(CORE_DIR, rel), 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Versão derivada: muda sozinha a cada alteração real do motor. */
export function deriveVersion(files) {
  const h = createHash('sha256');
  for (const f of files) h.update(`${f}:${hashFile(f)}\n`);
  return h.digest('hex').slice(0, 12);
}

/** Especificadores importados por um arquivo (import, export-from, require, import()). */
function importsOf(rel) {
  const src = readFileSync(join(CORE_DIR, rel), 'utf8');
  const re = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;
  const out = [];
  for (let m; (m = re.exec(src)); ) out.push(m[1]);
  return out;
}

/** Regra de fechamento: só caminhos relativos, e resolvendo DENTRO do núcleo. */
export function closureErrors(files) {
  const errs = [];
  for (const rel of files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) {
    for (const spec of importsOf(rel)) {
      if (!spec.startsWith('./') && !spec.startsWith('../')) {
        errs.push(`${rel}: importa '${spec}' — o núcleo não pode depender de nada externo`);
        continue;
      }
      const target = resolve(dirname(join(CORE_DIR, rel)), spec);
      if (relative(CORE_DIR, target).startsWith('..')) {
        errs.push(`${rel}: importa '${spec}', que sai de src/core/`);
      }
    }
  }
  return errs;
}

function main() {
  const files = listCoreFiles();
  const problems = [];

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(CORE_DIR, MANIFEST_NAME), 'utf8'));
  } catch {
    console.error(`✗ ${MANIFEST_NAME} ausente ou inválido em src/core/.`);
    console.error('  Rode o gerador no repositório ipsc-core: node tools/gen-manifest.mjs');
    process.exit(1);
  }

  const expected = manifest.files ?? {};
  for (const rel of files) {
    if (!(rel in expected)) problems.push(`sobrando: ${rel} não está no manifesto`);
    else if (hashFile(rel) !== expected[rel]) problems.push(`ALTERADO: ${rel}`);
  }
  for (const rel of Object.keys(expected)) {
    if (!files.includes(rel)) problems.push(`faltando: ${rel}`);
  }

  const version = deriveVersion(files);
  if (problems.length === 0 && manifest.coreVersion !== version) {
    problems.push(`coreVersion divergente: manifesto ${manifest.coreVersion}, calculado ${version}`);
  }

  problems.push(...closureErrors(files));

  if (problems.length) {
    console.error('✗ núcleo divergente do espelho ipsc-core:\n');
    for (const p of problems) console.error(`  · ${p}`);
    console.error('\nO núcleo é espelhado: altere no repositório ipsc-core, regenere o manifesto');
    console.error('e traga com `git subtree pull --prefix src/core <ipsc-core> main --squash`.');
    process.exit(1);
  }

  console.log(`✓ núcleo íntegro e fechado — ${files.length} arquivos, coreVersion ${version}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
