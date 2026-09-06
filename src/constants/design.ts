// Paleta e fontes do Alpha Zone.
//
// As CHAVES são exatamente as do app da loja de propósito: é o que permite portar
// componentes (alvo interativo, croqui, cronômetro) sem reescrever estilo. O que
// muda é o valor — identidade própria, já que os dois apps convivem no mesmo
// aparelho e não podem parecer o mesmo produto.
import { useScheme } from '@/lib/theme-pref';

/** Famílias de fonte (carregadas no root layout). */
export const Fonts = {
  heading: 'Archivo_800ExtraBold',
  headingBold: 'Archivo_700Bold',
  body: 'HankenGrotesk_400Regular',
  bodyMed: 'HankenGrotesk_500Medium',
  bodySemi: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
} as const;

export interface DesignPalette {
  bg: string;
  card: string;
  field: string;
  border: string;
  text: string;
  textSec: string;
  muted: string;
  faint: string;
  accent: string;
  accentDim: string;
  danger: string;
  navy: string;
  navyBorder: string;
  /** Papelão do alvo IPSC. */
  paper: string;
  green: string;
  greenBg: string;
  greenBorder: string;
  greenText: string;
  star: string;
}

const light: DesignPalette = {
  bg: '#f5f4f2',
  card: '#ffffff',
  field: '#f0efec',
  border: '#e3e1dc',
  text: '#17171a',
  textSec: '#54524d',
  muted: '#77746d',
  faint: '#b3b0a8',
  accent: '#D2540F',
  accentDim: 'rgba(210,84,15,0.12)',
  danger: '#c62f28',
  navy: '#2b2b31',
  navyBorder: '#42424a',
  paper: '#C9A97C',
  green: '#1f9d55',
  greenBg: '#ecfdf3',
  greenBorder: '#bbe7cc',
  greenText: '#166534',
  star: '#e8b53a',
};

const dark: DesignPalette = {
  bg: '#0E0E10',
  card: '#191919',
  field: '#232326',
  border: '#2e2e33',
  text: '#f5f3f0',
  textSec: '#bab6b0',
  muted: '#8a8680',
  faint: '#55524d',
  accent: '#FF7A45',
  accentDim: 'rgba(255,122,69,0.18)',
  danger: '#e4574a',
  navy: '#33333a',
  navyBorder: '#45454f',
  paper: '#C9A97C',
  green: '#25a35a',
  greenBg: 'rgba(37,163,90,0.14)',
  greenBorder: 'rgba(37,163,90,0.40)',
  greenText: '#34d27f',
  star: '#e8b53a',
};

/** Paleta do tema atual. */
export function useDesign(): DesignPalette {
  return useScheme() === 'dark' ? dark : light;
}
