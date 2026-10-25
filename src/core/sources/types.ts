// Unified media contract. Every item in every section conforms to MediaItem.
// `section` is the isolation boundary — an item lives in exactly one feed.

export type SectionId =
  | 'home'      // movies + series
  | 'kdrama'    // korean / asian drama
  | 'anime'     // anime (sub/dub/donghua)
  | 'others'    // regional: bangla/hindi/tamil/se-asia
  | 'livetv'    // iptv channels
  | 'adult';    // isolated, pin-gated

export type MediaKind =
  | 'movie'
  | 'series'
  | 'anime'
  | 'drama'
  | 'channel'
  | 'adult';

export type StreamKind = 'hls' | 'mp4' | 'dash' | 'iframe' | 'bdix' | 'torrent' | 'embed';

export interface StreamSource {
  url: string;
  quality?: string;            // "1080p" | "720p" | "auto"
  server: string;              // provider label e.g. "AnimePahe" | "BDIX:host"
  kind: StreamKind;
  headers?: Record<string, string>;
  referer?: string;
  subtitles?: { lang: string; url: string }[];
}

export interface Episode {
  n: number;
  title?: string;
  airDate?: string;
  sources: StreamSource[];
}

export interface Season {
  n: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: string;                  // stable, source-namespaced: "anime:animepahe:1234"
  section: SectionId;          // isolation boundary
  kind: MediaKind;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  synopsis?: string;
  genres: string[];
  rating?: number;             // 0-10
  lang?: string;               // iso or "Bangla" | "Hindi" | "KO" etc.
  seasons?: Season[];
  sources: StreamSource[];     // movie/single-stream items
  sourceId: string;            // adapter that produced it
  altSources?: string[];       // other hosts serving same title (dedup +N)
  updatedAt: number;
}

// Source adapter contract. Each adapter registers to exactly ONE section.
export interface SourceAdapter {
  id: string;
  name: string;
  section: SectionId;
  baseUrl: string;
  enabled: boolean;
  getHome?(page?: number): Promise<MediaItem[]>;
  search?(query: string, page?: number): Promise<MediaItem[]>;
  getDetails?(id: string): Promise<MediaItem>;
  getStreams?(id: string, episode?: { season: number; episode: number }): Promise<StreamSource[]>;
}
