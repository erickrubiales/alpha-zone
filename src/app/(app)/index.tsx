// Home provisória do M1. Ela existe para provar as duas coisas que o marco exige:
// que a sessão sobrevive a matar e reabrir o app, e que o núcleo espelhado está
// ligado (o motor é chamado de verdade aqui embaixo, não apenas importado).
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { PrimaryButton } from '@/components/form';
import { Fonts, useDesign } from '@/constants/design';
import { BUILTIN_DRILLS } from '@/core/ipsc-drills-builtin';
import { formatHitFactor } from '@/core/format-num';
import { stageMaxPoints } from '@/core/ipsc-scoring';

export default function Home() {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const provider = user?.providerData[0]?.providerId ?? 'desconhecido';
  const drill = BUILTIN_DRILLS[0];

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <Text style={[styles.brand, { color: c.text, fontFamily: Fonts.heading }]}>ALPHA ZONE</Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.muted, fontFamily: Fonts.bodySemi }]}>SESSÃO</Text>
        <Row c={c} k="Nome" v={user?.displayName || '—'} />
        <Row c={c} k="E-mail" v={user?.email || '—'} />
        <Row c={c} k="Método" v={provider} />
        <Row c={c} k="uid" v={user?.uid ?? '—'} mono />
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.muted, fontFamily: Fonts.bodySemi }]}>NÚCLEO ESPELHADO</Text>
        <Row c={c} k="Drills clássicos" v={String(BUILTIN_DRILLS.length)} />
        <Row c={c} k="Primeiro drill" v={drill.name} />
        <Row c={c} k="Pontos máximos" v={String(stageMaxPoints(drill))} mono />
        <Row c={c} k="HF de exemplo" v={formatHitFactor(120 / 25)} mono />
      </View>

      <PrimaryButton
        label="Sair"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScrollView>
  );
}

function Row({
  c,
  k,
  v,
  mono = false,
}: {
  c: ReturnType<typeof useDesign>;
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.k, { color: c.textSec, fontFamily: Fonts.body }]}>{k}</Text>
      <Text
        style={[styles.v, { color: c.text, fontFamily: mono ? Fonts.mono : Fonts.bodySemi }]}
        numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 18 },
  brand: { fontSize: 26, letterSpacing: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  k: { fontSize: 14, width: 130 },
  v: { fontSize: 14, flex: 1, textAlign: 'right' },
});
