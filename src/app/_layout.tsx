import { Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { useScheme } from '@/lib/theme-pref';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  return (
    <AuthProvider>
      <Navigation fontsLoaded={fontsLoaded} />
    </AuthProvider>
  );
}

function Navigation({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, ready } = useAuth();
  const scheme = useScheme();

  // A splash só sai quando já sabemos QUEM está logado. Sem isso o app pisca a
  // tela de login por um instante a cada abertura, mesmo com a sessão salva.
  const booted = fontsLoaded && ready;
  useEffect(() => {
    if (booted) SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  if (!booted) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
