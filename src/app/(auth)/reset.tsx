// Redefinição de senha.
//
// A mensagem de sucesso é deliberadamente vaga ("se existir uma conta"): dizer
// que o e-mail não está cadastrado revelaria quem tem conta no app. O Firebase,
// com a proteção contra enumeração ligada, também não diferencia os dois casos.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { authErrorMessage } from '@/auth/auth-errors';
import { ErrorText, Field, PrimaryButton } from '@/components/form';
import { Fonts, useDesign } from '@/constants/design';

export default function ResetPassword() {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e, 'Não foi possível enviar o e-mail. Tente novamente.'));
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

        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.headingBold }]}>Redefinir senha</Text>

        {sent ? (
          <View style={[styles.okBox, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}>
            <Text style={[styles.okText, { color: c.greenText, fontFamily: Fonts.bodyMed }]}>
              Se existir uma conta com esse e-mail, o link de redefinição já está a caminho. Confira também a caixa
              de spam.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.lead, { color: c.textSec, fontFamily: Fonts.body }]}>
              Informe o e-mail da sua conta e enviamos um link para você criar uma senha nova.
            </Text>

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
              <PrimaryButton
                label="Enviar link"
                busy={busy}
                disabled={email.trim().length < 4 || busy}
                onPress={submit}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 18 },
  back: { alignSelf: 'flex-start' },
  backText: { fontSize: 16 },
  title: { fontSize: 28 },
  lead: { fontSize: 15, lineHeight: 22 },
  form: { gap: 14 },
  okBox: { borderWidth: 1, borderRadius: 14, padding: 16 },
  okText: { fontSize: 14.5, lineHeight: 21 },
});
