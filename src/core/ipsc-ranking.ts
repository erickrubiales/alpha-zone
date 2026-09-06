// Classificação de match IPSC — puro, sem Firestore.
// Estas quatro funções moravam em `lib/treino-tournaments.ts` (arquivo cheio de
// Firestore). Aqui elas trabalham sobre TIPOS ESTRUTURAIS: qualquer objeto com os
// campos abaixo serve, venha ele do app da loja ou do app IPSC. `treino-tournaments.ts`
// as re-exporta, então nenhuma chamada mudou.
//
// Só importa de './' — este arquivo faz parte do núcleo espelhado.
import { type IpscRunCore, type IpscStage, rankStage, stageMaxPoints } from './ipsc-scoring';

// ─── Tipos estruturais (o mínimo que o ranking precisa saber) ───────────────

/** O match: quais pistas e se resultados precisam de verificação para valer. */
export interface MatchLike {
  stages: IpscStage[];
  requireVerification: boolean;
  /** 'self' = cada um marca a própria passagem; só nesse modo a verificação filtra. */
  scoringMode: string;
}

/** Uma passagem registrada por um atirador numa pista. */
export interface ResultLike {
  id: string;
  participantUid: string;
  participantName: string;
  verified: boolean;
  createdAt: Date | null;
  stageId: string | null;
  ipsc: IpscRunCore | null;
}

/** Um inscrito. O ranking só precisa do uid; o objeto inteiro volta na linha. */
export interface ParticipantLike {
  uid: string;
}

// ─── Resultado que vale ─────────────────────────────────────────────────────

/**
 * Resultado que VALE para cada par (pista, atirador): o mais recente. Quando o torneio
 * exige verificação (modo self), só entram os verificados — refazer a pista substitui.
 */
export function effectiveIpscResults<R extends ResultLike>(t: MatchLike, results: R[]): Map<string, R> {
  const needsVerify = t.requireVerification && t.scoringMode === 'self';
  const out = new Map<string, R>();
  for (const r of results) {
    if (!r.stageId || !r.ipsc) continue;
    if (needsVerify && !r.verified) continue;
    const key = `${r.stageId}:${r.participantUid}`;
    const prev = out.get(key);
    if (!prev || (r.createdAt?.getTime() ?? 0) >= (prev.createdAt?.getTime() ?? 0)) out.set(key, r);
  }
  return out;
}

// ─── Classificação por pista ────────────────────────────────────────────────

export interface IpscStageRow {
  participantUid: string;
  participantName: string;
  hitFactor: number;
  netPoints: number;
  timeSec: number;
  /** 1 = melhor HF da pista. */
  pct: number;
  stagePoints: number;
  resultId: string;
  verified: boolean;
}

/** Classificação de UMA pista: melhor HF leva os pontos todos, o resto é proporcional. */
export function ipscStageRanking(t: MatchLike, stage: IpscStage, results: ResultLike[]): IpscStageRow[] {
  const eff = effectiveIpscResults(t, results);
  const rows = [...eff.values()].filter((r) => r.stageId === stage.id);
  const ranked = rankStage(
    stage,
    rows.map((r) => ({ participantUid: r.participantUid, hitFactor: r.ipsc!.hitFactor })),
  );
  const byUid = new Map(ranked.map((x) => [x.participantUid, x]));
  return rows
    .map((r) => {
      const k = byUid.get(r.participantUid);
      return {
        participantUid: r.participantUid,
        participantName: r.participantName,
        hitFactor: r.ipsc!.hitFactor,
        netPoints: r.ipsc!.netPoints,
        timeSec: r.ipsc!.timeSec,
        pct: k?.pct ?? 0,
        stagePoints: k?.stagePoints ?? 0,
        resultId: r.id,
        verified: r.verified,
      };
    })
    .sort((a, b) => b.stagePoints - a.stagePoints || b.hitFactor - a.hitFactor);
}

// ─── Classificação geral ────────────────────────────────────────────────────

export interface IpscMatchRow<P extends ParticipantLike = ParticipantLike> {
  participant: P;
  stagePoints: Record<string, number>;
  matchPoints: number;
  matchPct: number;
  stagesDone: number;
  stageWins: number;
}

/** Classificação geral do match: soma dos pontos de pista (desempate: pistas vencidas). */
export function ipscMatchRanking<P extends ParticipantLike>(
  t: MatchLike,
  participants: P[],
  results: ResultLike[],
): IpscMatchRow<P>[] {
  const perStage = new Map<string, IpscStageRow[]>();
  for (const st of t.stages) perStage.set(st.id, ipscStageRanking(t, st, results));
  const maxMatch = t.stages.reduce((a, st) => a + stageMaxPoints(st), 0);

  return participants
    .map((p) => {
      const stagePoints: Record<string, number> = {};
      let wins = 0;
      let done = 0;
      for (const st of t.stages) {
        const rows = perStage.get(st.id) ?? [];
        const mine = rows.find((r) => r.participantUid === p.uid);
        stagePoints[st.id] = mine?.stagePoints ?? 0;
        if (mine) done++;
        if (mine && rows[0]?.participantUid === p.uid && mine.hitFactor > 0) wins++;
      }
      const matchPoints = Math.round(Object.values(stagePoints).reduce((a, b) => a + b, 0) * 10000) / 10000;
      return {
        participant: p,
        stagePoints,
        matchPoints,
        matchPct: maxMatch > 0 ? matchPoints / maxMatch : 0,
        stagesDone: done,
        stageWins: wins,
      };
    })
    .sort((a, b) => b.matchPoints - a.matchPoints || b.stageWins - a.stageWins);
}

/** Pontos máximos do match (soma das pistas) — base do percentual. */
export function ipscMatchMaxPoints(t: MatchLike): number {
  return t.stages.reduce((a, st) => a + stageMaxPoints(st), 0);
}
