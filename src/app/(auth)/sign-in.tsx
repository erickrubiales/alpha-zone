// Tela de entrada: e-mail/senha, Google e Apple.
//
// O botão da Apple só aparece onde a Apple permite (iOS 13+). Ela exige que, se o
// app oferece login social de terceiros, o Sign in with Apple esteja disponível —
// e reprova a submissão quando não está.
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appleAvailableAsync } from '@/auth/apple';
import { useAuth } from '@/auth/auth-context';
import { authErrorMessage } from '@/auth/auth-errors';
import { ErrorText, Field, LinkText, PrimaryButton, SecondaryButton } from '@/components/form';
import { Fonts, useDesign } from '@/constants/design';
import { googleEnabled } from '@/data/config';
import { useScheme } from '@/lib/theme-pref';

type Busy = null | 'email' | 'google' | 'apple';

export default function SignIn() {
  const c = useDesign();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInEmail, signInGoogle, signInApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    let alive = true;
    appleAvailableAsync()
      .then((ok) => alive && setAppleReady(ok))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await fn();
      // Sem navegação aqui: o guard do root layout troca de grupo sozinho quando
      // o onAuthStateChanged dispara.
    } catch (e) {
      setError(authErrorMessage(e, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setBusy(null);
    }
  };

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={[styles.brand, { color: c.text, fontFamily: Fonts.heading }]}>ALPHA ZONE</Text>
          <Text style={[styles.tagline, { color: c.muted, fontFamily: Fonts.body }]}>
            Treino, cronometragem e pontuação de tiro prático.
          </Text>
        </View>

        <ErrorText>{error}</ErrorText>

        <View style={styles.form}>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="voce@exemplo.com"
            textContentType="emailAddress"
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••"
            onSubmitEditing={() => canSubmit && run('email', () => signInEmail(email, password))}
            returnKeyType="go"
          />
          <View style={styles.forgot}>
            <LinkText label="Esqueci minha senha" onPress={() => router.push('/reset')} />
          </View>
          <PrimaryButton
            label="Entrar"
            busy={busy === 'email'}
            disabled={!canSubmit || busy !== null}
            onPress={() => run('email', () => signInEmail(email, password))}
          />
        </View>

        {googleEnabled || appleReady ? (
          <View style={styles.dividerRow}>
            <View style={[styles.rule, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.faint, fontFamily: Fonts.body }]}>ou</Text>
            <View style={[styles.rule, { backgroundColor: c.border }]} />
          </View>
        ) : null}

        <View style={styles.social}>
          {googleEnabled ? (
            <SecondaryButton
              label="Continuar com Google"
              busy={busy === 'google'}
              onPress={() => run('google', signInGoogle)}
            />
          ) : null}

          {appleReady ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={14}
              style={styles.appleBtn}
              onPress={() => run('apple', signInApple)}
            />
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footText, { color: c.muted, fontFamily: Fonts.body }]}>Ainda não tem conta?</Text>
          <LinkText label="Criar conta" onPress={() => router.push('/sign-up')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 22 },
  head: { gap: 8 },
  brand: { fontSize: 34, letterSpacing: 1 },
  tagline: { fontSize: 15, lineHeight: 22 },
  form: { gap: 14 },
  forgot: { alignItems: 'flex-end', marginTop: -4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1 },
  dividerText: { fontSize: 12.5 },
  social: { gap: 10 },
  appleBtn: { height: 52, width: '100%' },
  footer: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingTop: 4 },
  footText: { fontSize: 14 },
});
