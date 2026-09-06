// Geometria dos alvos + pontuação de um toque — módulo PURO (sem Firestore), testável
// em Node. Duas geometrias: CIRCULAR (anéis concêntricos, bullseye) e ZONES (polígonos
// pontuados por zona — IPSC A/C/D). Ver docs/ipsc-spec.md §5.
// treino-targets.ts re-exporta tudo isto (imports antigos continuam válidos).

export interface Ring {
  score: number;
  radiusMm: number;
  isInner: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface CircularGeometry {
  shape: 'circular';
  center: { xPct: number; yPct: number };
  physicalSizeMm: number;
  rings: Ring[];
  /**
   * Máscara de silhueta (opcional): polígono em coordenadas normalizadas (0–100,
   * mesmo espaço do toque). Quando presente, o disparo só pontua se estiver DENTRO
   * dela; fora = 0. Dentro da silhueta mas fora de todos os anéis = 1.
   */
  silhouette?: { points: Point[] };
  /**
   * Múltiplos centros (opcional, ex.: alvo de 2 centros) — todos com os MESMOS anéis.
   * Quando presente, o disparo pontua pelo centro em que cair; fora de todos = 0.
   */
  centers?: { xPct: number; yPct: number }[];
}

/**
 * Código do impacto num alvo de zonas (IPSC): A/C/D pontuam conforme o fator de
 * potência; B = borda não pontuável (0, não conta impacto); HC = hardcover (miss);
 * NS = impacto em no-shoot (penalidade).
 */
export type HitCode = 'A' | 'C' | 'D' | 'B' | 'HC' | 'NS';

export interface ZonePolygon {
  points: Point[];
}

/**
 * Geometria por ZONAS poligonais (alvo IPSC de papel). Coordenadas em % do
 * quadrado do widget (0–100), como o toque. `physicalSizeMm` é o lado do
 * quadrado em mm (mesma semântica do circular → regra do "beliscar" idêntica).
 * Polígonos de zona PODEM se sobrepor (A dentro de C dentro de D): quem vence é
 * a maior `priority`. Fora do `outline` o toque é ignorado; dentro do outline
 * mas em nenhuma zona = borda não pontuável ('B').
 */
export interface ZonesGeometry {
  shape: 'zones';
  version: number;
  physicalSizeMm: number;
  /** Retângulo da folha/papelão dentro do quadrado (letterbox), em % + mm reais. */
  sheet: { widthMm: number; heightMm: number; x0: number; y0: number; x1: number; y1: number };
  /** Contorno do alvo (corte do papelão): fora = toque ignorado. */
  outline: Point[];
  /** Largura da borda não pontuável (informativo). */
  borderMm: number;
  zones: { code: 'A' | 'C' | 'D'; label: string; priority: number; polygons: ZonePolygon[] }[];
  /** Cobertura dura pré-cortada (opcional). Impacto ali = 'HC' (miss). */
  hardCover: ZonePolygon[];
  /** Posição das letras (para desenho por geometria, quando não há svg). */
  labels: { code: string; x: number; y: number }[];
}

export type TargetGeometry = CircularGeometry | ZonesGeometry;

/** Narrowing seguro para os consumidores que só entendem anéis (bullseye). */
export function asCircular(geo: TargetGeometry | null | undefined): CircularGeometry | null {
  return geo && geo.shape === 'circular' ? geo : null;
}

/** Teste ponto-dentro-do-polígono (ray casting), em coordenadas normalizadas. */
export function pointInPolygon(x: number, y: number, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Menor distância do ponto a qualquer aresta do polígono (mesmas unidades). */
export function distToPolygonEdge(x: number, y: number, pts: Point[]): number {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const ax = pts[j].x, ay = pts[j].y, bx = pts[i].x, by = pts[i].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < best) best = d;
  }
  return best;
}

/** Ponto dentro do polígono OU a bala (raio `tol`) encostando na sua borda. */
function touchesPolygon(x: number, y: number, pts: Point[], tol: number): boolean {
  return pointInPolygon(x, y, pts) || distToPolygonEdge(x, y, pts) <= tol;
}

/**
 * Hit-test de um toque num alvo de ZONAS (IPSC). Devolve só o CÓDIGO da zona —
 * os pontos dependem do fator (major/minor) e do "melhores N", decididos depois
 * em ipsc-scoring.scoreRun. `null` = toque fora do alvo (ignorar).
 *  1. fora do outline (sem tolerância) → null
 *  2. hardcover (do alvo + `extraHardCover` da pista): dentro e sem encostar na
 *     área visível → 'HC'
 *  3. zonas por priority desc (A > C > D): dentro OU encostando (beliscar) → code
 *  4. dentro do outline mas em nenhuma zona → 'B' (borda não pontuável)
 */
export function hitTestZones(
  xPct: number,
  yPct: number,
  geo: ZonesGeometry,
  bulletDiameterMm: number,
  extraHardCover: ZonePolygon[] = [],
): HitCode | null {
  if (!pointInPolygon(xPct, yPct, geo.outline)) return null;
  const shave = (bulletDiameterMm / 2 / geo.physicalSizeMm) * 100;
  for (const hc of [...geo.hardCover, ...extraHardCover]) {
    if (pointInPolygon(xPct, yPct, hc.points) && distToPolygonEdge(xPct, yPct, hc.points) > shave) return 'HC';
  }
  const zones = [...geo.zones].sort((a, b) => b.priority - a.priority);
  for (const z of zones) {
    if (z.polygons.some((p) => touchesPolygon(xPct, yPct, p.points, shave))) return z.code;
  }
  return 'B';
}


export interface ShotScore {
  score: number;
  isInnerTen: boolean;
  /** Só em alvos de zonas: código do impacto (A/C/D/B/HC/NS). Ausente no bullseye. */
  zone?: HitCode;
}

/**
 * Pontos "de exibição" de um código de zona quando ainda não há fator/pista:
 * usa a tabela MAJOR (A=5, C=4, D=2). A pontuação real do IPSC é decidida por
 * ipsc-scoring.scoreRun (fator + melhores N + penalidades).
 */
const ZONE_DISPLAY_POINTS: Record<HitCode, number> = { A: 5, C: 4, D: 2, B: 0, HC: 0, NS: 0 };

/**
 * Dispatcher: pontua um toque conforme a geometria. Circular → scoreCircular
 * (intacto). Zones → hitTestZones; toque fora do alvo devolve score 0 sem `zone`.
 */
export function scoreShot(xPct: number, yPct: number, geo: TargetGeometry, bulletDiameterMm: number): ShotScore {
  if (geo.shape === 'circular') return scoreCircular(xPct, yPct, geo, bulletDiameterMm);
  const zone = hitTestZones(xPct, yPct, geo, bulletDiameterMm);
  if (!zone) return { score: 0, isInnerTen: false };
  return { score: ZONE_DISPLAY_POINTS[zone], isInnerTen: false, zone };
}

/**
 * Pontuação de um disparo em (xPct, yPct) sobre geometria circular, com a
 * regra do "beliscar": a borda do furo (raio da bala) conta pro anel maior.
 * Porta de ScoreCalculator._calculateCircular do app Flutter.
 */
export function scoreCircular(
  xPct: number,
  yPct: number,
  geo: CircularGeometry,
  bulletDiameterMm: number,
  extraTolPct = 0,
): ShotScore {
  // Tolerância: raio da bala (regra do "beliscar") + folga extra de toque, pra
  // que encostar na linha já conte o anel maior.
  const shave = (bulletDiameterMm / 2 / geo.physicalSizeMm) * 100 + extraTolPct;
  const sorted = [...geo.rings].sort((a, b) => a.radiusMm - b.radiusMm);
  // Suporta múltiplos centros (alvo de 2 centros): pontua pelo centro em que caiu
  // (o de maior pontuação, já que os anéis não se sobrepõem).
  const centers = geo.centers && geo.centers.length ? geo.centers : [geo.center];
  let ringScore: ShotScore | null = null;
  for (const ctr of centers) {
    const dist = Math.hypot(xPct - ctr.xPct, yPct - ctr.yPct);
    for (const ring of sorted) {
      const radiusPct = (ring.radiusMm / geo.physicalSizeMm) * 100;
      if (dist <= radiusPct + shave) {
        if (!ringScore || ring.score > ringScore.score) ringScore = { score: ring.score, isInnerTen: ring.isInner };
        break;
      }
    }
  }

  // Alvo silhueta: só pontua dentro da máscara; fora = 0. Dentro da silhueta mas
  // fora de todos os anéis vale 1 (o disparo acertou o corpo, mas fora dos círculos).
  if (geo.silhouette) {
    if (!pointInPolygon(xPct, yPct, geo.silhouette.points)) return { score: 0, isInnerTen: false };
    return ringScore ?? { score: 1, isInnerTen: false };
  }

  return ringScore ?? { score: 0, isInnerTen: false };
}

/** Raio (% do widget) de um anel — usado pra desenhar e dimensionar a marca. */
export function ringRadiusPct(geo: CircularGeometry, ring: Ring): number {
  return (ring.radiusMm / geo.physicalSizeMm) * 100;
}
