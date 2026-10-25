import React from 'react';
import { Text } from 'react-native';

// lightweight glyph icons (no icon dep). swap for SVG set later.
const GLYPH: Record<string, string> = {
  home: '⌂', drama: '◈', anime: '✦', others: '❖', profile: '◉',
};

export function TabIcon({ name, color }: { name: string; color: string; focused?: boolean; size?: number }) {
  return <Text style={{ color, fontSize: 20, fontWeight: '700' }}>{GLYPH[name] ?? '●'}</Text>;
}
