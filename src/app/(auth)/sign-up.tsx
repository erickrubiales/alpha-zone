import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { authErrorMessage } from '@/auth/auth-errors';
import { ErrorText, Field, PrimaryButton } from '@/components/form';
import { Fonts, useDesign } from '@/constants/design';

export default function SignUp() {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUpEmail } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 6 é o mínimo do Firebase; abaixo disso ele recusa com 'auth/weak-password'.
  const shortPassword = password.length > 0 && password.length < 6;
  const canSubmit = name.trim().length >= 2 && email.trim().length > 3 && password.length >= 6;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signUpEmail(name, email, password);
    } catch (e) {
      setError(authErrorMessage(e, 'Não foi possível criar a conta. Tente novamente.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={[styles.backText, { color: c.accent, fontFamily: Fonts.bodySemi }]}>‹ Voltar</Text>
        </Pressable>

        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.headingBold }]}>Criar conta</Text>

        <ErrorText>{error}</ErrorText>

        <View style={styles.form}>
          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Como você aparece no ranking"
            textContentType="name"
          />
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
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Ao menos 6 caracteres"
            error={shortPassword}
          />
          {shortPassword ? (
            <Text style={[styles.hint, { color: c.danger, fontFamily: Fonts.body }]}>
              A senha precisa ter pelo menos 6 caracteres.
            </Text>
          ) : null}

          <PrimaryButton label="Criar conta" busy={busy} disabled={!canSubmit || busy} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 20 },
  back: { alignSelf: 'flex-start' },
  backText: { fontSize: 16 },
  title: { fontSize: 28 },
  form: { gap: 14 },
  hint: { fontSize: 12.5, marginTop: -6, marginLeft: 4 },
});
