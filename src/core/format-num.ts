// Formatação numérica do núcleo IPSC, com o separador decimal PARAMETRIZADO.
// O motor é o mesmo nos dois apps; o que muda é a localidade de quem lê:
// pt-BR usa vírgula (padrão), en-US usa ponto. Nenhuma chamada precisa passar
// o separador para manter o comportamento brasileiro.
//
// Sem imports — este arquivo faz parte do núcleo espelhado (ver CORE.manifest.json).

/** Separador decimal. `','` = pt-BR/es, `'.'` = en. */
export type DecimalSep = ',' | '.';

export const DEFAULT_DECIMAL_SEP: DecimalSep = ',';

/**
 * Arredonda para `places` casas e formata com o separador pedido.
 * Valor não finito vira zero: HF e tempo nascem de divisões (pontos/tempo), e um
 * "NaN" na tela do atirador é pior que um zero honesto.
 */
export function formatDecimal(value: number, places = 2, sep: DecimalSep = DEFAULT_DECIMAL_SEP): string {
  const v = Number.isFinite(value) ? value : 0;
  const f = 10 ** places;
  const s = (Math.round(v * f) / f).toFixed(places);
  return sep === '.' ? s : s.replace('.', sep);
}

/** Formata hit factor com 2 casas (ex.: 6,12 / 6.12). */
export function formatHitFactor(hf: number, sep: DecimalSep = DEFAULT_DECIMAL_SEP): string {
  return formatDecimal(hf, 2, sep);
}

/** Formata tempo em segundos com 2 casas (ex.: 8,20 / 8.20). */
export function formatTime(sec: number, sep: DecimalSep = DEFAULT_DECIMAL_SEP): string {
  return formatDecimal(sec, 2, sep);
}
