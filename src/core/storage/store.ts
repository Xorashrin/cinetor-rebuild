// Per-section isolated storage + state. Namespaced mmkv buckets so no
// section's cache ever collides with another's.

import { create } from 'zustand';
import type { SectionId, MediaItem } from '../sources/types';
import { dedupKey } from '../classify/classify';

// mmkv is native; guard for typecheck/test env where it may not init.
let mmkv: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require('react-native-mmkv');
  mmkv = new MMKV({ id: 'cinetor' });
} catch {
  mmkv = null;
}

const bucket = (s: SectionId | 'settings') => `cinetor.${s}`;
type StoreSection = SectionId | 'settings';

export const sectionStore = {
  set(key: string, value: string, section: StoreSection) {
    mmkv?.set(`${bucket(section)}.${key}`, value);
  },
  get(key: string, section: StoreSection): string | undefined {
    return mmkv?.getString?.(`${bucket(section)}.${key}`);
  },
  setJson(key: string, value: unknown, section: StoreSection) {
    this.set(key, JSON.stringify(value), section);
  },
  getJson<T>(key: string, section: StoreSection): T | undefined {
    const v = this.get(key, section);
    try { return v ? (JSON.parse(v) as T) : undefined; } catch { return undefined; }
  },
};

// ---- In-memory per-section feed state (zustand) ----
// One slice per section; refresh/write is section-scoped by construction.

export interface FeedSlice {
  items: MediaItem[];
  loading: boolean;
  refreshing: boolean;
  lastSync: number;
  error?: string;
}

type Feeds = Record<SectionId, FeedSlice>;

interface FeedActions {
  setItems(section: SectionId, items: MediaItem[]): void;
  appendItems(section: SectionId, items: MediaItem[]): void;
  setLoading(section: SectionId, loading: boolean): void;
  setRefreshing(section: SectionId, r: boolean): void;
  setError(section: SectionId, err?: string): void;
  touchSync(section: SectionId): void;
  clear(section: SectionId): void;
}

const emptySlice = (): FeedSlice => ({
  items: [], loading: false, refreshing: false, lastSync: 0,
});

export const useFeeds = create<Feeds & FeedActions>((set) => ({
  home: emptySlice(),
  kdrama: emptySlice(),
  anime: emptySlice(),
  others: emptySlice(),
  livetv: emptySlice(),
  adult: emptySlice(),

  setItems: (section, items) =>
    set((st) => ({ [section]: { ...st[section], items: dedup(items) } }) as any),

  appendItems: (section, items) =>
    set((st) => ({
      [section]: { ...st[section], items: dedup([...st[section].items, ...items]) },
    }) as any),

  setLoading: (section, loading) =>
    set((st) => ({ [section]: { ...st[section], loading } }) as any),

  setRefreshing: (section, r) =>
    set((st) => ({ [section]: { ...st[section], refreshing: r } }) as any),

  setError: (section, err) =>
    set((st) => ({ [section]: { ...st[section], error: err } }) as any),

  touchSync: (section) =>
    set((st) => ({ [section]: { ...st[section], lastSync: Date.now() } }) as any),

  clear: (section) => set({ [section]: emptySlice() } as any),
}));

function dedup(items: MediaItem[]): MediaItem[] {
  const seen = new Map<string, MediaItem>();
  for (const it of items) {
    const k = dedupKey(it);
    const prev = seen.get(k);
    if (!prev) seen.set(k, it);
    else {
      // merge alt sources + prefer richer metadata
      const alts = new Set([...(prev.altSources ?? []), it.sourceId, ...(it.altSources ?? [])]);
      seen.set(k, {
        ...(prev.poster ? prev : it.poster ? it : prev),
        altSources: [...alts],
      });
    }
  }
  return [...seen.values()];
}
