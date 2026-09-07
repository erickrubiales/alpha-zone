import { Stack } from 'expo-router';

// `anchor` define qual tela abre quando a URL não casa com nenhuma rota do grupo —
// que é exatamente o caso de `/` com o usuário deslogado. Sem isso o Expo Router
// pega a primeira rota em ordem alfabética, e `reset` vem antes de `sign-in`: o
// app abria na tela de redefinir senha, sem histórico para o "Voltar".
export const unstable_settings = { anchor: 'sign-in' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
