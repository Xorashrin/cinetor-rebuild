import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useFeeds } from '../core/storage/store';
import { loadFeed, searchSection } from '../features/feed';
import { PosterCard } from './PosterCard';
import { colors } from '../core/theme';
import type { SectionId, MediaItem } from '../core/sources/types';

// Shared screen for all content sections — identical shell, isolated data.
export function SectionScreen({ section, title }: { section: SectionId; title: string }) {
  const slice = useFeeds((s) => s[section]);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<MediaItem[] | null>(null);
  const [searching, setSearching] = React.useState(false);

  useEffect(() => { loadFeed(section); }, [section]);

  const onRefresh = useCallback(() => loadFeed(section, true), [section]);

  const onSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    try { setResults(await searchSection(section, q)); }
    finally { setSearching(false); }
  }, [section]);

  const data = results ?? slice.items;
  const cols = 3;
  const cardW = Math.floor(360 / cols) - 12;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder={`Search ${title}…`}
          placeholderTextColor={colors.textFaint}
          style={s.search}
        />
      </View>

      {slice.error && data.length === 0 ? (
        <View style={s.center}><Text style={s.err}>{slice.error}</Text></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          numColumns={cols}
          renderItem={({ item }) => <PosterCard item={item} width={cardW} />}
          contentContainerStyle={{ padding: 6, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={slice.refreshing} onRefresh={onRefresh}
              tintColor={colors.accentB} colors={[colors.accentB]} />
          }
          ListEmptyComponent={
            slice.loading || searching
              ? <ActivityIndicator color={colors.accentB} style={{ marginTop: 60 }} />
              : <View style={s.center}><Text style={s.dim}>No content yet. Pull to refresh.</Text></View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  search: {
    marginTop: 12, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, color: colors.text,
    borderWidth: 0.5, borderColor: colors.border, fontSize: 14,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  dim: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  err: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
