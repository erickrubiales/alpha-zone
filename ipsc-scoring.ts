// Motor de pontuação IPSC (Comstock) — funções PURAS, sem Firestore.
// Ver docs/ipsc-spec.md §6. A ZONA de cada impacto é a fonte da verdade; os pontos
// derivam do fator de potência (major/minor) e do "melhores N impactos" por alvo.
// Misses NÃO são impactos: derivam de requiredHits − impactos válidos.
import type { HitCode, ZonePolygon } from './target-geometry';

export const SCORING_VERSION = 1;

export type PowerFactor = 'major' | 'minor';
export type SlotKind = 'paper' | 'noshoot' | 'popper' | 'miniPopper' | 'plate';

/** Um alvo dentro da pista, na ordem de engajamento. */
export interface StageSlot {
  index: number;
  label: string;                 // 'T1', 'T2', 'P1', 'NS1'
  kind: SlotKind;
  targetModelId?: string;        // paper/noshoot → target_models shape 'zones'
  requiredHits: number;          // paper: 2 (Bill Drill: 6); metal: 1; noshoot: 0
  hardCover?: ZonePolygon[];     // overlay da pista sobre o alvo base (fase 2)
  requiredZones?: ('A' | 'C' | 'D')[]; // reservado (2 corpo + 1 cabeça) — fase 2
  /** Croqui da pista: posição do alvo em % do terreno (0–100, origem no topo-esquerda). */
  posX?: number;
  posY?: number;
  /**
   * Índice de outro slot que usa a MESMA folha física (ex.: Mozambique = corpo e cabeça
   * do mesmo alvo, pontuados separadamente). Só afeta a lista de material a levar.
   */
  sameTargetAs?: number;
}

/**
 * Terreno do croqui (vista de cima): tamanho real em metros e a caixa de início
 * (posição do atirador, também em % do terreno). Distâncias saem daqui.
 */
export interface StageLayout {
  widthM: number;
  depthM: number;
  startX: number;
  startY: number;
}

export const DEFAULT_STAGE_LAYOUT: StageLayout = { widthM: 20, depthM: 25, startX: 50, startY: 90 };

/** Distância (m) do alvo até a caixa de início; null se o alvo não está posicionado. */
export function slotDistanceM(layout: StageLayout, slot: { posX?: number; posY?: number }): number | null {
  if (slot.posX == null || slot.posY == null) return null;
  const dx = ((slot.posX - layout.startX) / 100) * layout.widthM;
  const dy = ((slot.posY - layout.startY) / 100) * layout.depthM;
  return Math.round(Math.hypot(dx, dy) * 10) / 10;
}

/**
 * Slots que representam uma FOLHA/alvo físico distinto — quem divide a folha com outro
 * (corpo e cabeça do mesmo papel, via `sameTargetAs`) não conta como alvo novo. Use isto
 * sempre que for exibir "N alvos" ou desenhar o croqui.
 */
export function physicalSlots<T extends { sameTargetAs?: number }>(slots: T[]): T[] {
  return slots.filter((s) => s.sameTargetAs == null);
}

/** Alvos com posição definida (o croqui só vale a pena quando há pelo menos um). */
export function hasLayout(stage: { slots: { posX?: number; posY?: number }[] }): boolean {
  return stage.slots.some((s) => s.posX != null && s.posY != null);
}

/** Pista / drill reutilizável (builtin, global ou do usuário). */
export interface IpscStage {
  id: string;
  name: string;
  source: 'builtin' | 'global' | 'user';
  version: number;
  description?: string;
  procedureText?: string;
  startPosition?: string;
  distanceM?: number;
  roundsMin: number;             // Σ requiredHits (paper + metal)
  maxPoints: number;             // roundsMin × 5
  slots: StageSlot[];
  tags?: string[];
  isActive: boolean;
  /** Croqui da pista (vista de cima). Ausente = drill sem posicionamento. */
  layout?: StageLayout;
}

export interface Hit {
  code: HitCode;
  xPct: number | null;           // null quando marcado pelo teclado (sem toque)
  yPct: number | null;
  seq: number;
}

export interface TargetResult {
  slotIndex: number;
  kind: SlotKind;
  hits: Hit[];
  down?: boolean;                // metal: true = caiu (5 pts); senão miss
}

/** Núcleo de uma passagem — o MESMO tipo vale para stage_results de torneio (fase 2). */
export interface IpscRunCore {
  timeSec: number;
  timeSource: 'manual' | 'inapp' | 'bt';
  targets: TargetResult[];
  procedurals: { count: number; reasons?: string[] };
  extraPenaltyPoints?: number;
  powerFactor: PowerFactor;
  // derivados (gravados p/ exibir/ordenar; SEMPRE recomputáveis por scoreRun):
  points: number;
  penaltyPoints: number;
  misses: number;
  noShootHits: number;
  netPoints: number;
  hitFactor: number;
  scoringVersion: number;
}

export interface TargetScore {
  slotIndex: number;
  points: number;
  misses: number;
  noShootHits: number;
  countedHits: number[];         // valores dos impactos que contaram (melhores N)
  extraHits: number;             // impactos válidos além de N (ignorados)
}

export interface RunScore {
  points: number;
  penaltyPoints: number;
  misses: number;
  noShootHits: number;
  procedurals: number;
  netPoints: number;
  hitFactor: number;
  perTarget: TargetScore[];
  powerFactor: PowerFactor;
  scoringVersion: number;
}

export const ZONE_POINTS: Record<PowerFactor, Record<'A' | 'C' | 'D', number>> = {
  major: { A: 5, C: 4, D: 2 },
  minor: { A: 5, C: 3, D: 1 },
};
export const MISS_PENALTY = 10;
export const NO_SHOOT_PENALTY = 10;
export const PROCEDURAL_PENALTY = 10;
export const STEEL_POINTS = 5;
/** Máximo de impactos penalizados por no-shoot (regra 9.4.1.2 — confirmar edição CBTP). */
export const MAX_NS_HITS_PER_TARGET = 2;

const isMetal = (k: SlotKind) => k === 'popper' || k === 'miniPopper' || k === 'plate';
const round4 = (v: number) => Math.round(v * 10000) / 10000;
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/** Pontos máximos da pista (base do ranking): 5 por impacto exigido em papel/metal. */
export function stageMaxPoints(stage: IpscStage): number {
  return sum(stage.slots.filter((s) => s.kind === 'paper' || isMetal(s.kind)).map((s) => s.requiredHits)) * 5;
}

/** Σ impactos exigidos (papel + metal). */
export function stageRoundsMin(stage: IpscStage): number {
  return sum(stage.slots.filter((s) => s.kind === 'paper' || isMetal(s.kind)).map((s) => s.requiredHits));
}

/** Pontos de um código de zona no fator dado (B/HC/NS = 0). */
export function zonePoints(code: HitCode, pf: PowerFactor): number {
  return code === 'A' || code === 'C' || code === 'D' ? ZONE_POINTS[pf][code] : 0;
}

/**
 * Pontua uma passagem (Comstock).
 *  - papel: contam os `requiredHits` MELHORES impactos válidos (A/C/D); extras são
 *    ignorados (não penalizam); faltantes = miss (−10 cada, 0 pts).
 *  - metal: caiu = 5 pts; em pé = 1 miss.
 *  - no-shoot: cada impacto −10 (cap MAX_NS_HITS_PER_TARGET). Impacto 'NS' registrado
 *    num slot de papel (no-shoot sobreposto) também penaliza.
 *  - procedurais: −10 cada. Pontos líquidos nunca negativos. HF = líquido / tempo.
 */
export function scoreRun(
  core: { targets: TargetResult[]; timeSec: number; procedurals: { count: number }; extraPenaltyPoints?: number },
  stage: IpscStage,
  pf: PowerFactor,
): RunScore {
  let points = 0;
  let penalties = 0;
  let misses = 0;
  let nsHits = 0;
  const perTarget: TargetScore[] = [];

  for (const slot of stage.slots) {
    const res: TargetResult = core.targets.find((t) => t.slotIndex === slot.index) ?? { slotIndex: slot.index, kind: slot.kind, hits: [] };
    let tPoints = 0;
    let tMiss = 0;
    let tNs = 0;
    let counted: number[] = [];
    let extra = 0;

    if (slot.kind === 'paper') {
      const vals = res.hits
        .filter((h) => h.code === 'A' || h.code === 'C' || h.code === 'D')
        .map((h) => zonePoints(h.code, pf))
        .sort((a, b) => b - a);
      counted = vals.slice(0, slot.requiredHits);
      extra = Math.max(0, vals.length - counted.length);
      tPoints = sum(counted);
      tMiss = Math.max(0, slot.requiredHits - counted.length);
      tNs = Math.min(res.hits.filter((h) => h.code === 'NS').length, MAX_NS_HITS_PER_TARGET);
    } else if (isMetal(slot.kind)) {
      if (res.down) tPoints = STEEL_POINTS;
      else tMiss = 1;
    } else if (slot.kind === 'noshoot') {
      tNs = Math.min(res.hits.length, MAX_NS_HITS_PER_TARGET);
    }

    points += tPoints;
    misses += tMiss;
    nsHits += tNs;
    penalties += tMiss * MISS_PENALTY + tNs * NO_SHOOT_PENALTY;
    perTarget.push({ slotIndex: slot.index, points: tPoints, misses: tMiss, noShootHits: tNs, countedHits: counted, extraHits: extra });
  }

  const procedurals = Math.max(0, core.procedurals?.count ?? 0);
  penalties += procedurals * PROCEDURAL_PENALTY + Math.max(0, core.extraPenaltyPoints ?? 0);
  const netPoints = Math.max(0, points - penalties);
  const hitFactor = core.timeSec > 0 ? round4(netPoints / core.timeSec) : 0;

  return { points, penaltyPoints: penalties, misses, noShootHits: nsHits, procedurals, netPoints, hitFactor, perTarget, powerFactor: pf, scoringVersion: SCORING_VERSION };
}

// ── Ranking (fase 2 — torneio; também "% do seu melhor HF" no treino) ──

export interface StageRankInput {
  participantUid: string;
  hitFactor: number;
  status?: 'ok' | 'dnf' | 'dq';
}

export interface StageRank {
  participantUid: string;
  hitFactor: number;
  pct: number;                   // 1 = melhor HF da pista
  stagePoints: number;           // maxPoints × pct
}

/** Ranking de uma pista: melhor HF = 100 % dos pontos da pista; demais proporcional. */
export function rankStage(stage: IpscStage, results: StageRankInput[]): StageRank[] {
  const valid = results.filter((r) => (r.status ?? 'ok') === 'ok');
  const bestHf = Math.max(0, ...valid.map((r) => r.hitFactor));
  const max = stageMaxPoints(stage);
  return valid
    .map((r) => ({
      participantUid: r.participantUid,
      hitFactor: r.hitFactor,
      pct: bestHf > 0 ? round4(r.hitFactor / bestHf) : 0,
      stagePoints: bestHf > 0 ? round4((max * r.hitFactor) / bestHf) : 0,
    }))
    .sort((a, b) => b.stagePoints - a.stagePoints);
}

export interface MatchRank {
  participantUid: string;
  stagePoints: Record<string, number>;
  matchPoints: number;
  matchPct: number;
  stageWins: number;
}

/** Ranking do match: soma dos pontos de pista; desempate por pistas vencidas. */
export function rankMatch(
  stages: IpscStage[],
  results: (StageRankInput & { stageId: string })[],
  participantUids: string[],
): MatchRank[] {
  const byStage = new Map(stages.map((s) => [s.id, rankStage(s, results.filter((r) => r.stageId === s.id))]));
  const maxMatch = sum(stages.map(stageMaxPoints));
  return participantUids
    .map((uid) => {
      const stagePoints: Record<string, number> = {};
      let wins = 0;
      for (const s of stages) {
        const ranks = byStage.get(s.id) ?? [];
        const mine = ranks.find((x) => x.participantUid === uid);
        stagePoints[s.id] = mine?.stagePoints ?? 0;
        if (mine && ranks[0]?.participantUid === uid && mine.hitFactor > 0) wins++;
      }
      const matchPoints = round4(sum(Object.values(stagePoints)));
      return { participantUid: uid, stagePoints, matchPoints, matchPct: maxMatch > 0 ? round4(matchPoints / maxMatch) : 0, stageWins: wins };
    })
    .sort((a, b) => b.matchPoints - a.matchPoints || b.stageWins - a.stageWins);
}

// ── utilidades ──

/** Fator de potência sugerido pelo calibre (heurística: ≥ 10 mm → major). Sempre confirmar. */
export function defaultPowerFactor(caliberMm: number): PowerFactor {
  return caliberMm >= 10 ? 'major' : 'minor';
}

// Formatação mora em format-num.ts (separador decimal parametrizado, padrão vírgula);
// re-exportada aqui para não mexer em nenhuma chamada existente.
export { type DecimalSep, formatDecimal, formatHitFactor, formatTime } from './format-num';
