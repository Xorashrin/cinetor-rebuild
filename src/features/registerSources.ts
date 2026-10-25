import type { MediaItem, SourceAdapter } from '../core/sources/types';
import { registerSource } from '../core/sources/registry';
import { getJson } from '../core/network/http';

interface AniListResponse {
  data?: { Page?: { media?: any[] } };
}

const anilist: SourceAdapter = {
  id: 'anilist-metadata',
  name: 'AniList metadata',
  section: 'anime',
  baseUrl: 'https://graphql.anilist.co',
  enabled: true,
  async search(query) {
    const body = JSON.stringify({
      query: `query ($search: String) { Page(perPage: 30) { media(search: $search, type: ANIME) { id title { romaji english native } coverImage { large } bannerImage description startDate { year } averageScore genres format } } }`,
      variables: { search: query },
    });
    const res = await getJson<AniListResponse>('https://graphql.anilist.co', {
      method: 'POST', body, headers: { 'Content-Type': 'application/json' }, timeoutMs: 9000,
    });
    return (res.data?.Page?.media ?? []).map((m) => toAnime(m));
  },
  async getHome() {
    const body = JSON.stringify({
      query: `query { Page(perPage: 30) { media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) { id title { romaji english native } coverImage { large } bannerImage description startDate { year } averageScore genres format } } }`,
    });
    const res = await getJson<AniListResponse>('https://graphql.anilist.co', {
      method: 'POST', body, headers: { 'Content-Type': 'application/json' }, timeoutMs: 9000,
    });
    return (res.data?.Page?.media ?? []).map((m) => toAnime(m));
  },
};

function toAnime(m: any): MediaItem {
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Untitled';
  return {
    id: `anime:anilist:${m.id}`, section: 'anime', kind: 'anime', title,
    originalTitle: m.title?.native, year: m.startDate?.year, poster: m.coverImage?.large,
    backdrop: m.bannerImage, synopsis: m.description?.replace(/<[^>]+>/g, ''),
    genres: m.genres ?? [], rating: m.averageScore ? m.averageScore / 10 : undefined,
    lang: 'Japanese', sources: [], sourceId: 'anilist-metadata', updatedAt: Date.now(),
  };
}

const iptvOrg: SourceAdapter = {
  id: 'iptv-org-public', name: 'IPTV-org public channels', section: 'livetv',
  baseUrl: 'https://iptv-org.github.io/iptv', enabled: true,
  async getHome() {
    // Public playlist is metadata only. Playback URLs remain supplied by the playlist.
    const text = await (await fetch('https://iptv-org.github.io/iptv/index.m3u')).text();
    return parseM3u(text);
  },
};

function parseM3u(text: string): MediaItem[] {
  const lines = text.split(/\r?\n/);
  const items: MediaItem[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('#EXTINF')) continue;
    const url = lines[i + 1]?.trim();
    if (!url || url.startsWith('#')) continue;
    const title = lines[i].split(',').slice(1).join(',').trim() || 'Unknown channel';
    items.push({
      id: `channel:iptv-org:${items.length}:${url}`, section: 'livetv', kind: 'channel', title,
      genres: ['Live TV'], sources: [{ url, server: 'IPTV-org', kind: 'hls', quality: 'auto' }],
      sourceId: 'iptv-org-public', updatedAt: Date.now(),
    });
  }
  return items;
}

export function registerBuiltinSources() {
  registerSource(anilist);
  registerSource(iptvOrg);
}
