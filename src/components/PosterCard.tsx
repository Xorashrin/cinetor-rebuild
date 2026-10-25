import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors, radius } from '../core/theme';
import type { MediaItem } from '../core/sources/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PosterCard({ item, onPress, width = 120 }: {
  item: MediaItem; onPress?: () => void; width?: number;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const h = Math.round(width * 1.5);
  return (
    <AnimatedPressable
      style={[s.card, { width }, style]}
      onPressIn={() => (scale.value = withSpring(0.94, { damping: 12 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
      onPress={onPress}
    >
      <View style={[s.poster, { height: h }]}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill}
            contentFit="cover" transition={180} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.ph]} />
        )}
        {typeof item.rating === 'number' && (
          <View style={s.badge}><Text style={s.badgeText}>★ {item.rating.toFixed(1)}</Text></View>
        )}
        {(item.altSources?.length ?? 0) > 0 && (
          <View style={s.alt}><Text style={s.altText}>+{item.altSources!.length}</Text></View>
        )}
      </View>
      <Text numberOfLines={1} style={s.title}>{item.title}</Text>
      <Text numberOfLines={1} style={s.meta}>
        {[item.year, item.lang, item.genres[0]].filter(Boolean).join(' · ')}
      </Text>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  card: { margin: 6 },
  poster: {
    borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  ph: { backgroundColor: colors.elevate },
  badge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  badgeText: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  alt: {
    position: 'absolute', bottom: 6, right: 6, backgroundColor: colors.accentA,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  altText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 6 },
  meta: { color: colors.textDim, fontSize: 10, marginTop: 2 },
});
