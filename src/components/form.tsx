// Peças básicas de formulário usadas nas telas de login. Nada de específico do
// IPSC aqui — só o suficiente para as telas de identidade não repetirem estilo.
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Fonts, useDesign } from '@/constants/design';

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: boolean }) {
  const c = useDesign();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: c.textSec, fontFamily: Fonts.bodySemi }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.faint}
        style={[
          styles.input,
          { backgroundColor: c.field, borderColor: error ? c.danger : c.border, color: c.text, fontFamily: Fonts.body },
        ]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = useDesign();
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: c.accent, opacity: off ? 0.55 : pressed ? 0.9 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.primaryText, { fontFamily: Fonts.bodyBold }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  busy?: boolean;
}) {
  const c = useDesign();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.secondary,
        { backgroundColor: c.card, borderColor: c.border, opacity: busy ? 0.55 : pressed ? 0.9 : 1 },
      ]}>
      {busy ? <ActivityIndicator color={c.text} /> : icon}
      {busy ? null : (
        <Text style={[styles.secondaryText, { color: c.text, fontFamily: Fonts.bodySemi }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useDesign();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={[styles.link, { color: c.accent, fontFamily: Fonts.bodySemi }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  const c = useDesign();
  if (!children) return null;
  return (
    <View style={[styles.errorBox, { backgroundColor: c.accentDim, borderColor: c.danger }]}>
      <Text style={[styles.errorText, { color: c.danger, fontFamily: Fonts.bodyMed }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  label: { fontSize: 13 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16 },
  secondary: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryText: { fontSize: 15 },
  link: { fontSize: 14 },
  errorBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  errorText: { fontSize: 13.5, lineHeight: 19 },
});
