import type { SectionId, MediaItem, MediaKind } from '../sources/types';

// Section router — the isolation gate. Every ingested item passes through
// classify() exactly once; the result is permanent and never re-routed.
//
// Order matters: most specific first (adult > anime > kdrama > regional > home).

const ADULT_RE = /\b(xxx|porn|adult|18\+|nsfw|jav|erotic|hentai)\b/i;
const ANIME_RE = /\b(anime|donghua|ova|ona)\b|\/(anime|anim)\//i;
const KDRAMA_RE = /\b(kdrama|k[\s-]?drama|korean\s+drama|jdrama|cdrama|dorama)\b|\/(korean|k-?drama|kdrama)\//i;
const REGIONAL_RE = /\b(bangla|bengali|hindi|tamil|telugu|malayalam|kannada|punjabi|urdu|marathi|nepali|sinhala|bhojpuri|desi|south\s*asia|bollywood|tollywood)\b|\/(hindi|bangla|tamil|telugu|south|bollywood)\//i;
const SERIES_RE = /\b(series|season\s*\d|s\d{1,2}e\d{1,3}|episode|tv\s*show|web\s*series)\b/i;

export interface ClassifyInput {
  title: string;
  path?: string;        // directory/url path hint
  genres?: string[];
  lang?: string;
  kind?: MediaKind;
  declared?: SectionId; // adapter's own section (authoritative)
}

/**
 * Decide the single owning section. `declared` from a source adapter always wins
 * because adapters are registered to exactly one section already.
 */
export function classify(input: ClassifyInput): SectionId {
  if (input.declared) return input.declared;

  const text = `${input.title} ${input.path ?? ''} ${(input.genres ?? []).join(' ')} ${input.lang ?? ''}`;

  if (ADULT_RE.test(text)) return 'adult';
  if (ANIME_RE.test(text)) return 'anime';
  if (KDRAMA_RE.test(text)) return 'kdrama';
  if (REGIONAL_RE.test(text)) return 'others';
  return 'home';
}

/** Infer a MediaKind for list/detail rendering. */
export function inferKind(input: ClassifyInput, section: SectionId): MediaKind {
  if (input.kind) return input.kind;
  switch (section) {
    case 'anime': return 'anime';
    case 'kdrama': return 'drama';
    case 'livetv': return 'channel';
    case 'adult': return 'adult';
    case 'home':
      return SERIES_RE.test(`${input.title} ${input.path ?? ''}`) ? 'series' : 'movie';
    case 'others':
      return SERIES_RE.test(`${input.title} ${input.path ?? ''}`) ? 'series' : 'movie';
  }
}

/** Normalize a title for cross-source dedup. */
export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\[\(].*?[\]\)]/g, '')   // drop [1080p], (2021), {Sub}
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dedup key: normalized title + year bucket. */
export function dedupKey(item: MediaItem): string {
  return `${normalizeTitle(item.title)}|${item.year ?? 0}|${item.kind}`;
}
