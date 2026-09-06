/**
 * Preferência de tema. Mesma API do app da loja (`useScheme()`), para que os
 * componentes portados funcionem sem alteração.
 *
 * Por enquanto só segue o sistema; a escolha manual (claro/escuro/automático)
 * entra junto com a tela de ajustes.
 */
import { useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
