// Per-section feed controller. Stale-while-revalidate:
// serve cache instantly, refresh in background, update when fresh.
// Each section owns one controller instance — refreshing one never touches another.

import { useFeeds, sectionStore } from '../core/storage/store';
import { sourcesFor } from '../core/sources/registry';
import type { SectionId, MediaItem } from '../core/sources/types';

const FEED_KEY = 'feed.cache';
const STALE_MS = 15 * 60 * 1000;

export async function loadFeed(section: SectionId, force = false) {
  const st = useFeeds.getState();
  const slice = st[section];
  if (slice.loading || slice.refreshing) return;

  // 1. cache-first
  const cached = sectionStore.getJson<MediaItem[]>(FEED_KEY, section);
  if (cached && cached.length && !force) {
    st.setItems(section, cached);
  }

  const stale = Date.now() - slice.lastSync > STALE_MS;
  if (!force && !stale && slice.items.length) return;

  // 2. background revalidate across this section's sources
  st.setRefreshing(section, true);
  try {
    const sources = sourcesFor(section);
    const results = await Promise.allSettled(
      sources.filter((s) => s.getHome).map((s) => s.getHome!(1)),
    );
    const items = results
      .filter((r): r is PromiseFulfilledResult<MediaItem[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
    if (items.length) {
      const set = useFeeds.getState();
      set.setItems(section, items);
      sectionStore.setJson(FEED_KEY, items, section);
    }
    useFeeds.getState().setError(section, undefined);
  } catch (e: any) {
    useFeeds.getState().setError(section, e?.message ?? 'feed error');
  } finally {
    const set = useFeeds.getState();
    set.setRefreshing(section, false);
    set.touchSync(section);
  }
}

export async function searchSection(section: SectionId, query: string): Promise<MediaItem[]> {
  const sources = sourcesFor(section).filter((s) => s.search);
  const results = await Promise.allSettled(sources.map((s) => s.search!(query)));
  return results
    .filter((r): r is PromiseFulfilledResult<MediaItem[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
