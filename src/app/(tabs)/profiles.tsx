import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { colors } from '@/core/theme';
import { sectionStore } from '@/core/storage/store';

// Profiles = settings only. Live TV, Adult, BDIX toggles, quality defaults.
export default function Profiles() {
  const [bdix, setBdix] = React.useState(sectionStore.get('bdix.enabled', 'settings') === '1');
  const [saver, setSaver] = React.useState(sectionStore.get('net.saver', 'settings') === '1');
  const [adult, setAdult] = React.useState(sectionStore.get('adult.enabled', 'settings') === '1');

  const toggle = (key: string, val: boolean, set: (b: boolean) => void) => {
    sectionStore.set(key, val ? '1' : '0', 'settings');
    set(val);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 18 }}>
      <Text style={s.title}>Profiles</Text>
      <Row label="BDIX auto-scan (Wi-Fi only)" sub="Silently find local FTP/media servers"
        value={bdix} onChange={(v) => toggle('bdix.enabled', v, setBdix)} />
      <Row label="Data saver" sub="Cap quality on mobile data"
        value={saver} onChange={(v) => toggle('net.saver', v, setSaver)} />
      <Row label="Adult section" sub="PIN-gated, hidden by default"
        value={adult} onChange={(v) => toggle('adult.enabled', v, setAdult)} />
      <Text style={s.note}>
        Cinetor v1.0.0 — BDIX + multi-source streaming. Live TV & Adult are separate modules.
      </Text>
    </ScrollView>
  );
}

function Row({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.label}>{label}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentA }}
        thumbColor={value ? '#fff' : colors.textDim} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: colors.border,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  note: { color: colors.textFaint, fontSize: 12, marginTop: 18, lineHeight: 18 },
});
