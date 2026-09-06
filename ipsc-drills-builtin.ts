// Drills clássicos de IPSC pré-cadastrados (constantes no app; MVP).
// Fontes brasileiras (CBTP/portais de tiro) citam Mozambique, Bill Drill e El Presidente
// como protocolos de treino usados no Brasil, com medidas em MÉTRICO. Cuidado ao definir
// distâncias: os originais são em jardas (El Presidente = 10 jd / 1 jd → 9 m / 90 cm).
// As distâncias dos demais ainda precisam de confirmação com o cliente (ver docs/ipsc-spec.md).
// Mesmo tipo IpscStage da futura coleção ipsc_drills — ids estáveis 'builtin:*'.
// A sessão congela um snapshot do drill (stageSnapshot), então mudar uma constante
// aqui NÃO altera sessões antigas; suba `version` ao mudar alvos/impactos/croqui.
import {
  DEFAULT_STAGE_LAYOUT,
  type IpscStage,
  type StageLayout,
  type StageSlot,
  stageMaxPoints,
  stageRoundsMin,
} from './ipsc-scoring';

export const IPSC_CLASSIC_TARGET_ID = 'ipsc-classic';

/** Posição no croqui a partir da distância (m) e do desvio lateral (m, + = direita). */
function at(layout: StageLayout, distanceM: number, lateralM = 0): { posX: number; posY: number } {
  return {
    posX: Math.round((layout.startX + (lateralM / layout.widthM) * 100) * 10) / 10,
    posY: Math.round((layout.startY - (distanceM / layout.depthM) * 100) * 10) / 10,
  };
}

function paper(
  index: number,
  requiredHits: number,
  pos?: { posX: number; posY: number },
  extra?: { label?: string; sameTargetAs?: number },
): StageSlot {
  return {
    index,
    label: extra?.label ?? `T${index + 1}`,
    kind: 'paper',
    targetModelId: IPSC_CLASSIC_TARGET_ID,
    requiredHits,
    ...(pos ?? {}),
    ...(extra?.sameTargetAs != null ? { sameTargetAs: extra.sameTargetAs } : {}),
  };
}

function drill(d: Omit<IpscStage, 'source' | 'isActive' | 'roundsMin' | 'maxPoints'>): IpscStage {
  const base: IpscStage = { ...d, source: 'builtin', isActive: true, roundsMin: 0, maxPoints: 0 };
  return { ...base, roundsMin: stageRoundsMin(base), maxPoints: stageMaxPoints(base) };
}

const L = DEFAULT_STAGE_LAYOUT; // 20 × 25 m, atirador em (50, 90)
const DEEP: StageLayout = { ...DEFAULT_STAGE_LAYOUT, depthM: 30 }; // pistas com alvos a 25 m

export const BUILTIN_DRILLS: IpscStage[] = [
  drill({
    id: 'builtin:el-presidente',
    name: 'El Presidente',
    version: 3,
    // Medidas em métrico como se usa no Brasil: 9 m e 90 cm entre alvos (conversão das
    // 10 jardas / 1 jarda do exercício original) — não os 10 m / 1 m arredondados.
    description: '3 alvos a 9 m, 90 cm entre eles. 2 tiros em cada, recarga, 2 em cada (12 disparos).',
    startPosition: 'De costas para os alvos, mãos em rendição, arma no coldre.',
    procedureText: 'Ao sinal: girar, sacar, 2 tiros em cada alvo, recarga obrigatória, 2 tiros em cada alvo. Referência de tempo: ~10 s (atirador avançado, ~5 s).',
    distanceM: 9,
    layout: L,
    slots: [paper(0, 4, at(L, 9, -0.9)), paper(1, 4, at(L, 9, 0)), paper(2, 4, at(L, 9, 0.9))],
    tags: ['clássico', 'recarga', 'transição'],
  }),
  drill({
    id: 'builtin:bill-drill',
    name: 'Bill Drill',
    version: 2,
    description: '1 alvo a 7 m. 6 tiros o mais rápido possível mantendo A.',
    startPosition: 'De frente, mãos relaxadas ao lado do corpo, arma no coldre.',
    procedureText: 'Ao sinal: sacar e disparar 6 tiros no alvo.',
    distanceM: 7,
    layout: L,
    slots: [paper(0, 6, at(L, 7))],
    tags: ['clássico', 'saque', 'controle de recuo'],
  }),
  drill({
    id: 'builtin:blake-drill',
    name: 'Blake Drill',
    version: 2,
    description: '3 alvos a 7 m. 2 tiros em cada, sem recarga (6 disparos).',
    startPosition: 'De frente, mãos relaxadas ao lado do corpo, arma no coldre.',
    procedureText: 'Ao sinal: sacar, 2 tiros em cada alvo, da esquerda para a direita.',
    distanceM: 7,
    layout: L,
    slots: [paper(0, 2, at(L, 7, -1.5)), paper(1, 2, at(L, 7, 0)), paper(2, 2, at(L, 7, 1.5))],
    tags: ['clássico', 'transição'],
  }),
  drill({
    id: 'builtin:accelerator',
    name: 'Accelerator',
    version: 2,
    description: '3 alvos escalonados (10, 15 e 25 m). 2 tiros em cada, recarga, 2 em cada (12 disparos).',
    startPosition: 'De frente, mãos relaxadas ao lado do corpo, arma no coldre.',
    procedureText: 'Ao sinal: sacar, 2 tiros em cada alvo (do mais perto ao mais longe), recarga, 2 tiros em cada alvo.',
    distanceM: 15,
    layout: DEEP,
    slots: [paper(0, 4, at(DEEP, 10, -3)), paper(1, 4, at(DEEP, 15, 0)), paper(2, 4, at(DEEP, 25, 3))],
    tags: ['clássico', 'recarga', 'distância'],
  }),
  drill({
    id: 'builtin:mozambique',
    name: 'Mozambique Drill',
    version: 1,
    description: '1 alvo a 7 m: 2 tiros no corpo + 1 na cabeça (3 disparos).',
    startPosition: 'De frente, mãos relaxadas ao lado do corpo, arma no coldre.',
    procedureText:
      'Ao sinal: sacar, 2 tiros no corpo do alvo e 1 na cabeça. No app, marque os 2 do corpo no slot "Corpo" e o da cabeça no slot "Cabeça" — é a mesma folha.',
    distanceM: 7,
    layout: L,
    // Mesma folha física: o corpo e a cabeça viram slots separados para que a exigência
    // "2 no corpo + 1 na cabeça" seja pontuada de verdade (faltou na cabeça = miss).
    slots: [
      paper(0, 2, at(L, 7), { label: 'Corpo' }),
      paper(1, 1, at(L, 7), { label: 'Cabeça', sameTargetAs: 0 }),
    ],
    tags: ['clássico', 'saque', 'precisão'],
  }),
  drill({
    id: 'builtin:four-aces',
    name: 'Four Aces',
    version: 2,
    description: '1 alvo a 7 m. 2 tiros, recarga, 2 tiros (4 disparos) — busque 4 A.',
    startPosition: 'De frente, mãos relaxadas ao lado do corpo, arma no coldre.',
    procedureText: 'Ao sinal: sacar, 2 tiros, recarga obrigatória, 2 tiros.',
    distanceM: 7,
    layout: L,
    slots: [paper(0, 4, at(L, 7))],
    tags: ['clássico', 'recarga', 'saque'],
  }),
];

export function getBuiltinDrill(id: string): IpscStage | null {
  return BUILTIN_DRILLS.find((d) => d.id === id) ?? null;
}

/** Quantos alvos de papel (por targetModelId) o drill precisa — "o que levar". */
export function drillShoppingList(stage: IpscStage): { targetModelId: string; qty: number }[] {
  const map = new Map<string, number>();
  for (const s of stage.slots) {
    // Slot que divide a folha com outro (corpo/cabeça) não soma um alvo novo.
    if (s.sameTargetAs != null) continue;
    if ((s.kind === 'paper' || s.kind === 'noshoot') && s.targetModelId) map.set(s.targetModelId, (map.get(s.targetModelId) ?? 0) + 1);
  }
  return [...map.entries()].map(([targetModelId, qty]) => ({ targetModelId, qty }));
}
