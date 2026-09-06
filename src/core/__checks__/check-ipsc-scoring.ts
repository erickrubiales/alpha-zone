// Casos de aceite do motor IPSC (hit-test de zonas + Comstock). Sem Firestore.
//   npm run check:ipsc
// Usa a geometria REAL do IPSC Clássico (mesmas cotas do script add-ipsc-target.mjs).
import { hitTestZones, scoreShot, type ZonesGeometry } from '../target-geometry';
import {
  effectiveIpscResults,
  ipscMatchRanking,
  ipscStageRanking,
  type MatchLike,
  type ParticipantLike,
  type ResultLike,
} from '../ipsc-ranking';
import { formatHitFactor, formatTime } from '../format-num';
import {
  defaultPowerFactor,
  type IpscStage,
  rankMatch,
  rankStage,
  scoreRun,
  stageMaxPoints,
  type TargetResult,
} from '../ipsc-scoring';

// ── geometria do IPSC Clássico (cm do guia → % do canvas de 580 mm) ──
const S = 580, OX = 65, OY = 5;
const P = (x: number, y: number) => ({ x: ((x * 10 + OX) / S) * 100, y: ((y * 10 + OY) / S) * 100 });
const CUT = [[15, 0], [30, 0], [45, 19], [45, 38], [30, 57], [15, 57], [0, 38], [0, 19]].map(([x, y]) => P(x, y));
const D = [[15.242, 0.5], [29.758, 0.5], [44.5, 19.174], [44.5, 37.826], [29.758, 56.5], [15.242, 56.5], [0.5, 37.826], [0.5, 19.174]].map(([x, y]) => P(x, y));
const C = [[15.242, 0.5], [29.758, 0.5], [37.5, 19], [37.5, 33.6], [27.5, 45], [17.5, 45], [7.5, 33.6], [7.5, 19]].map(([x, y]) => P(x, y));
const A = [[20, 2.6], [25, 2.6], [30, 19], [30, 27.5], [25, 35], [20, 35], [15, 27.5], [15, 19]].map(([x, y]) => P(x, y));
const geo: ZonesGeometry = {
  shape: 'zones', version: 1, physicalSizeMm: S,
  sheet: { widthMm: 450, heightMm: 570, x0: 11.2, y0: 0.86, x1: 88.8, y1: 99.1 },
  outline: CUT, borderMm: 5,
  zones: [
    { code: 'A', label: 'Alpha', priority: 3, polygons: [{ points: A }] },
    { code: 'C', label: 'Charlie', priority: 2, polygons: [{ points: C }] },
    { code: 'D', label: 'Delta', priority: 1, polygons: [{ points: D }] },
  ],
  hardCover: [], labels: [],
};
const cm = (x: number, y: number) => P(x, y); // toque em cm do papelão
const BULLET = 9.01;                          // 9 mm

let fails = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

console.log('── hit-test de zonas (9 mm) ──');
check('centro do A → A', hitTestZones(cm(22.5, 20).x, cm(22.5, 20).y, geo, BULLET), 'A');
check('cabeça, dentro do A (22.5,5) → A', hitTestZones(cm(22.5, 5).x, cm(22.5, 5).y, geo, BULLET), 'A');
check('cabeça, fora do A (17,5) → C', hitTestZones(cm(17, 5).x, cm(17, 5).y, geo, BULLET), 'C');
check('faixa C esquerda (11,25) → C', hitTestZones(cm(11, 25).x, cm(11, 25).y, geo, BULLET), 'C');
check('faixa D esquerda (3,25) → D', hitTestZones(cm(3, 25).x, cm(3, 25).y, geo, BULLET), 'D');
// borda não pontuável tem só 0,5 cm: um furo de 9 mm (raio 0,45) centrado a 0,2 cm da borda
// ENCOSTA na linha do D (a 0,5 cm) → vale D pelo beliscar; com 4,5 mm (raio 0,225) não encosta → B.
check('borda (0.2,25) com 9 mm encosta no D → D', hitTestZones(cm(0.2, 25).x, cm(0.2, 25).y, geo, BULLET), 'D');
check('borda (0.2,25) com 4,5 mm → B', hitTestZones(cm(0.2, 25).x, cm(0.2, 25).y, geo, 4.5), 'B');
check('fora do papelão (-2,25) → null', hitTestZones(cm(-2, 25).x, cm(-2, 25).y, geo, BULLET), null);
check('fora do papelão, canto (2,2) → null', hitTestZones(cm(2, 2).x, cm(2, 2).y, geo, BULLET), null);
// beliscar: centro do furo 0,3 cm fora da linha do A (x=15) com bala de 9 mm (raio 0,45 cm) → toca o A
check('beliscar: 0,3 cm fora do A com 9 mm → A', hitTestZones(cm(14.7, 23).x, cm(14.7, 23).y, geo, BULLET), 'A');
check('sem beliscar: 0,3 cm fora do A com 4,5 mm → C', hitTestZones(cm(14.7, 23).x, cm(14.7, 23).y, geo, 4.5), 'C');
// hardcover: metade esquerda coberta
const hcGeo: ZonesGeometry = { ...geo, hardCover: [{ points: [P(0, 0), P(22.5, 0), P(22.5, 57), P(0, 57)] }] };
check('hardcover: impacto na área coberta → HC', hitTestZones(cm(10, 25).x, cm(10, 25).y, hcGeo, BULLET), 'HC');
check('hardcover: encostando na área visível (22.3,25) → A', hitTestZones(cm(22.3, 25).x, cm(22.3, 25).y, hcGeo, BULLET), 'A');
check('scoreShot dispatcher (zones) devolve zone', scoreShot(cm(3, 25).x, cm(3, 25).y, geo, BULLET).zone, 'D');

console.log('── Comstock ──');
const paper = (index: number, requiredHits = 2) => ({ index, label: `T${index + 1}`, kind: 'paper' as const, requiredHits });
const stage: IpscStage = {
  id: 'builtin:test', name: 'Teste', source: 'builtin', version: 1, roundsMin: 6, maxPoints: 30, isActive: true,
  slots: [paper(0), paper(1), paper(2)],
};
const hit = (code: 'A' | 'C' | 'D' | 'B' | 'HC' | 'NS', seq: number) => ({ code, xPct: null, yPct: null, seq });
const T = (slotIndex: number, codes: ('A' | 'C' | 'D' | 'B' | 'HC' | 'NS')[]): TargetResult => ({ slotIndex, kind: 'paper', hits: codes.map((c, i) => hit(c, i)) });

check('maxPoints 3 alvos × 2', stageMaxPoints(stage), 30);

// tudo A em 5,00 s
let r = scoreRun({ targets: [T(0, ['A', 'A']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 5, procedurals: { count: 0 } }, stage, 'minor');
check('6A minor: 30 pts, HF 6', [r.points, r.penaltyPoints, r.netPoints, r.hitFactor], [30, 0, 30, 6]);

// major vs minor no C e D
r = scoreRun({ targets: [T(0, ['C', 'D']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'major');
check('C+D major = 4+2 → 26 pts', r.points, 26);
r = scoreRun({ targets: [T(0, ['C', 'D']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'minor');
check('C+D minor = 3+1 → 24 pts', r.points, 24);

// melhores N: 3 impactos (A, C, D) em alvo de 2 → contam A+C; extra ignorado
r = scoreRun({ targets: [T(0, ['D', 'A', 'C']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'major');
check('melhores 2 de (D,A,C) major → A+C = 9; extra 1', [r.perTarget[0].points, r.perTarget[0].extraHits, r.perTarget[0].countedHits], [9, 1, [5, 4]]);

// miss: só 1 impacto no T1
r = scoreRun({ targets: [T(0, ['A']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'minor');
check('1 miss: 25 pts − 10 → net 15, HF 1.5', [r.points, r.misses, r.penaltyPoints, r.netPoints, r.hitFactor], [25, 1, 10, 15, 1.5]);

// alvo sem nenhum impacto = 2 misses
r = scoreRun({ targets: [T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'minor');
check('alvo ausente = 2 misses', [r.misses, r.penaltyPoints], [2, 20]);

// B e HC não são impactos válidos (viram miss)
r = scoreRun({ targets: [T(0, ['B', 'HC']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'minor');
check('B + HC no T1 = 2 misses', [r.perTarget[0].misses, r.perTarget[0].points], [2, 0]);

// no-shoot sobreposto no alvo de papel: 3 NS → cap 2 → −20
r = scoreRun({ targets: [T(0, ['A', 'A', 'NS', 'NS', 'NS']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 10, procedurals: { count: 0 } }, stage, 'minor');
check('3 NS no papel → cap 2 → −20', [r.noShootHits, r.penaltyPoints, r.netPoints], [2, 20, 10]);

// slot no-shoot dedicado
const stageNs: IpscStage = { ...stage, slots: [paper(0), { index: 1, label: 'NS1', kind: 'noshoot', requiredHits: 0 }] };
r = scoreRun({ targets: [T(0, ['A', 'A']), { slotIndex: 1, kind: 'noshoot', hits: [hit('A', 0)] }], timeSec: 4, procedurals: { count: 0 } }, stageNs, 'minor');
check('slot no-shoot com 1 impacto → −10; HF 0', [r.points, r.noShootHits, r.netPoints, r.hitFactor], [10, 1, 0, 0]);
check('maxPoints ignora no-shoot', stageMaxPoints(stageNs), 10);

// metal
const stageSteel: IpscStage = { ...stage, slots: [paper(0), { index: 1, label: 'P1', kind: 'popper', requiredHits: 1 }, { index: 2, label: 'PL1', kind: 'plate', requiredHits: 1 }] };
r = scoreRun({ targets: [T(0, ['A', 'A']), { slotIndex: 1, kind: 'popper', hits: [], down: true }, { slotIndex: 2, kind: 'plate', hits: [], down: false }], timeSec: 5, procedurals: { count: 0 } }, stageSteel, 'minor');
check('popper caiu = 5; plate em pé = miss', [r.points, r.misses, r.netPoints], [15, 1, 5]);
check('maxPoints com metal', stageMaxPoints(stageSteel), 20);

// procedurais e piso zero
r = scoreRun({ targets: [T(0, ['D', 'D']), T(1, ['D', 'D']), T(2, ['D', 'D'])], timeSec: 10, procedurals: { count: 2 } }, stage, 'minor');
check('6D minor (6) − 2 proc (20) → net 0 (piso), HF 0', [r.points, r.penaltyPoints, r.netPoints, r.hitFactor], [6, 20, 0, 0]);

// sem tempo → HF 0
r = scoreRun({ targets: [T(0, ['A', 'A']), T(1, ['A', 'A']), T(2, ['A', 'A'])], timeSec: 0, procedurals: { count: 0 } }, stage, 'minor');
check('tempo 0 → HF 0', r.hitFactor, 0);

// exemplo do estudo: 115 pts em 25,00 s = HF 4,6
const big: IpscStage = { ...stage, slots: Array.from({ length: 12 }, (_, i) => paper(i)) };
const bigTargets: TargetResult[] = Array.from({ length: 12 }, (_, i) => T(i, i < 11 ? ['A', 'A'] : ['A', 'A']));
r = scoreRun({ targets: bigTargets, timeSec: 25, procedurals: { count: 0 }, extraPenaltyPoints: 5 }, big, 'minor');
check('120 − 5 = 115 pts em 25 s → HF 4.6', [r.netPoints, r.hitFactor], [115, 4.6]);

console.log('── ranking ──');
const rk = rankStage(stage, [
  { participantUid: 'a', hitFactor: 6 },
  { participantUid: 'b', hitFactor: 3 },
  { participantUid: 'c', hitFactor: 0 },
  { participantUid: 'd', hitFactor: 9, status: 'dq' },
]);
check('melhor HF = 100% = maxPoints; metade = 50%', rk.map((x) => [x.participantUid, x.pct, x.stagePoints]), [['a', 1, 30], ['b', 0.5, 15], ['c', 0, 0]]);
const s2: IpscStage = { ...stage, id: 's2', slots: [paper(0), paper(1)] }; // max 20
const mr = rankMatch([stage, s2], [
  { stageId: stage.id, participantUid: 'a', hitFactor: 6 },
  { stageId: stage.id, participantUid: 'b', hitFactor: 3 },
  { stageId: 's2', participantUid: 'a', hitFactor: 2 },
  { stageId: 's2', participantUid: 'b', hitFactor: 4 },
], ['a', 'b']);
check('match: a = 30 + 10 = 40; b = 15 + 20 = 35', mr.map((x) => [x.participantUid, x.matchPoints, x.stageWins]), [['a', 40, 1], ['b', 35, 1]]);
check('matchPct a = 40/50', mr[0].matchPct, 0.8);

console.log('── util ──');
check('defaultPowerFactor 9 mm → minor', defaultPowerFactor(9.01), 'minor');
check('defaultPowerFactor .40 → major', defaultPowerFactor(10.17), 'major');

console.log('── formatação ──');
check('HF com vírgula (pt-BR, padrão)', formatHitFactor(6.123), '6,12');
check('HF com ponto (en)', formatHitFactor(6.123, '.'), '6.12');
check('tempo com vírgula', formatTime(8.2), '8,20');
check('não finito vira zero', [formatHitFactor(NaN), formatTime(Infinity)], ['0,00', '0,00']);

console.log('── torneio IPSC ──');
const S1: IpscStage = { ...stage, id: 's1' };                              // 3 alvos x 2 = máx 30
const S2: IpscStage = { ...stage, id: 's2', slots: [paper(0), paper(1)] }; // máx 20

// Fixtures nos TIPOS ESTRUTURAIS do núcleo — o ranking não sabe nada de Firestore.
const mkT = (over: Partial<MatchLike> = {}): MatchLike =>
  ({ stages: [S1, S2], scoringMode: 'self', requireVerification: false, ...over });

let seq = 0;
const mkR = (stageId: string, uid: string, hf: number, o: { verified?: boolean; at?: number } = {}): ResultLike =>
  ({
    id: 'r' + ++seq, participantUid: uid, participantName: uid.toUpperCase(),
    verified: o.verified ?? true, createdAt: new Date(o.at ?? seq * 1000),
    stageId, ipsc: { hitFactor: hf, netPoints: hf * 10, timeSec: 10 } as never,
  });

const mkP = (uid: string): ParticipantLike => ({ uid });

const tt = mkT();
check('refez a pista -> vale o HF mais recente',
  [...effectiveIpscResults(tt, [mkR('s1', 'a', 3, { at: 1000 }), mkR('s1', 'a', 6, { at: 2000 })]).values()].map((r) => r.ipsc!.hitFactor), [6]);

const tv = mkT({ requireVerification: true });
check('com verificacao -> ignora o nao verificado',
  [...effectiveIpscResults(tv, [mkR('s1', 'a', 9, { verified: false, at: 3000 }), mkR('s1', 'a', 4, { verified: true, at: 2000 })]).values()].map((r) => r.ipsc!.hitFactor), [4]);

check('pista: 1o leva 30 pts, 2o metade',
  ipscStageRanking(tt, S1, [mkR('s1', 'a', 6), mkR('s1', 'b', 3)]).map((r) => [r.participantUid, r.pct, r.stagePoints]),
  [['a', 1, 30], ['b', 0.5, 15]]);

const all = [mkR('s1', 'a', 6), mkR('s1', 'b', 3), mkR('s2', 'a', 2), mkR('s2', 'b', 4)];
const match = ipscMatchRanking(tt, [mkP('a'), mkP('b')], all);
check('match: a = 30+10 = 40; b = 15+20 = 35',
  match.map((m) => [m.participant.uid, m.matchPoints, m.stagesDone, m.stageWins]), [['a', 40, 2, 1], ['b', 35, 2, 1]]);
check('match: percentual de a = 40/50', match[0].matchPct, 0.8);

const partial = ipscMatchRanking(tt, [mkP('a'), mkP('c')], [mkR('s1', 'a', 6), mkR('s2', 'a', 2)]);
check('nao atirou -> 0 pts e 0 pistas', [partial[1].participant.uid, partial[1].matchPoints, partial[1].stagesDone], ['c', 0, 0]);

console.log(fails === 0 ? '\nTODOS OS CASOS PASSARAM' : `\n${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
