import type { MediaItem, SourceAdapter, SectionId } from '../core/sources/types';
import { registerSource } from '../core/sources/registry';
import { getJson } from '../core/network/http';

export type GuideSource = {
  id: string; name: string; section: SectionId; url: string;
  protocol: 'api' | 'm3u' | 'local-discovery' | 'link-only';
  note: string;
};

// Source catalog from MEDIA_STREAMING_SOURCES_GUIDE.md. Link-only entries are
// intentionally not scraped: the app does not bypass access controls or pull
// copyrighted streams from third-party aggregators.
export const GUIDE_SOURCES: GuideSource[] = [
  { id:'vidsrc', name:'VidSrc', section:'home', url:'https://vidsrc.to', protocol:'link-only', note:'TMDB/IMDb embed provider' },
  { id:'cineby', name:'Cineby / FlixHQ', section:'home', url:'https://cineby.app', protocol:'link-only', note:'External provider link' },
  { id:'yts', name:'YTS', section:'home', url:'https://yts.mx', protocol:'link-only', note:'External download provider' },
  { id:'fmovies', name:'Fmovies / 123Movies', section:'home', url:'https://fmoviesz.to', protocol:'link-only', note:'External provider link' },
  { id:'hianime', name:'HiAnime', section:'anime', url:'https://hianime.to', protocol:'link-only', note:'External anime provider' },
  { id:'animepahe', name:'AnimePahe', section:'anime', url:'https://animepahe.ru', protocol:'link-only', note:'External anime provider' },
  { id:'gogoanime', name:'GogoAnime / Anitaku', section:'anime', url:'https://anitaku.to', protocol:'link-only', note:'External anime provider' },
  { id:'nyaa', name:'Nyaa.si', section:'anime', url:'https://nyaa.si', protocol:'link-only', note:'Torrent index; not played in-app' },
  { id:'dramacool', name:'DramaCool', section:'kdrama', url:'https://dramacool.bg', protocol:'link-only', note:'External drama provider' },
  { id:'kisskh', name:'KissKh', section:'kdrama', url:'https://kisskh.co', protocol:'link-only', note:'External drama provider' },
  { id:'myasiantv', name:'MyAsianTV', section:'kdrama', url:'https://myasiantv.cx', protocol:'link-only', note:'External drama provider' },
  { id:'iptv-org', name:'IPTV-org', section:'livetv', url:'https://iptv-org.github.io/iptv', protocol:'m3u', note:'Public channel playlist' },
  { id:'daddylive', name:'DaddyLive / DLHD', section:'livetv', url:'https://daddylive.sx', protocol:'link-only', note:'External live provider' },
  { id:'discoveryftp', name:'Discovery FTP / DFLIX', section:'home', url:'https://movies.discoveryftp.net', protocol:'local-discovery', note:'User-network probe only' },
  { id:'circleftp', name:'Circle FTP / SamOnline', section:'home', url:'https://circleftp.net', protocol:'local-discovery', note:'User-network probe only' },
  { id:'iccbdixtv', name:'ICC FTP & RoarFTP', section:'home', url:'https://iccbdixtv.com', protocol:'local-discovery', note:'User-network probe only' },
  { id:'tmdb', name:'TMDB metadata', section:'home', url:'https://www.themoviedb.org', protocol:'api', note:'Requires user-supplied API key' },
  { id:'consumet', name:'Consumet adapter', section:'home', url:'https://github.com/consumet/consumet.ts', protocol:'api', note:'Use only with a self-hosted, authorized instance' },
  { id:'cloudstream', name:'CloudStream repositories', section:'home', url:'https://github.com/recloudstream/cloudstream', protocol:'link-only', note:'Repository reference only' },
  { id:'yt-dlp', name:'yt-dlp backend', section:'home', url:'https://github.com/yt-dlp/yt-dlp', protocol:'link-only', note:'Backend reference only' },
];

export function sourcesInSection(section: SectionId) { return GUIDE_SOURCES.filter(s => s.section === section); }

interface AniListResponse { data?: { Page?: { media?: any[] } } }

const anilist: SourceAdapter = {
  id: 'anilist-metadata', name: 'AniList metadata', section: 'anime',
  baseUrl: 'https://graphql.anilist.co', enabled: true,
  async search(query) {
    const body = JSON.stringify({ query: `query ($search: String) { Page(perPage: 30) { media(search: $search, type: ANIME) { id title { romaji english native } coverImage { large } bannerImage description startDate { year } averageScore genres format } } }`, variables: { search: query } });
    const res = await getJson<AniListResponse>('https://graphql.anilist.co', { method:'POST', body, headers:{'Content-Type':'application/json'}, timeoutMs:9000 });
    return (res.data?.Page?.media ?? []).map(toAnime);
  },
  async getHome() {
    const body = JSON.stringify({ query:`query { Page(perPage: 30) { media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) { id title { romaji english native } coverImage { large } bannerImage description startDate { year } averageScore genres format } } }` });
    const res = await getJson<AniListResponse>('https://graphql.anilist.co', { method:'POST', body, headers:{'Content-Type':'application/json'}, timeoutMs:9000 });
    return (res.data?.Page?.media ?? []).map(toAnime);
  },
};

const iptvOrg: SourceAdapter = {
  id:'iptv-org-public', name:'IPTV-org public channels', section:'livetv',
  baseUrl:'https://iptv-org.github.io/iptv', enabled:true,
  async getHome() {
    const text = await (await fetch('https://iptv-org.github.io/iptv/index.m3u')).text();
    return parseM3u(text);
  },
};

function toAnime(m:any): MediaItem {
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Untitled';
  return { id:`anime:anilist:${m.id}`, section:'anime', kind:'anime', title, originalTitle:m.title?.native,
    year:m.startDate?.year, poster:m.coverImage?.large, backdrop:m.bannerImage,
    synopsis:m.description?.replace(/<[^>]+>/g,''), genres:m.genres ?? [], rating:m.averageScore ? m.averageScore/10 : undefined,
    lang:'Japanese', sources:[], sourceId:'anilist-metadata', updatedAt:Date.now() };
}

function parseM3u(text:string): MediaItem[] {
  const lines=text.split(/\r?\n/); const items:MediaItem[]=[];
  for(let i=0;i<lines.length-1;i++) { if(!lines[i].startsWith('#EXTINF')) continue; const url=lines[i+1]?.trim(); if(!url || url.startsWith('#')) continue;
    const title=lines[i].split(',').slice(1).join(',').trim() || 'Unknown channel';
    items.push({ id:`channel:iptv-org:${items.length}:${url}`, section:'livetv', kind:'channel', title, genres:['Live TV'], sources:[{url,server:'IPTV-org',kind:'hls',quality:'auto'}], sourceId:'iptv-org-public', updatedAt:Date.now() });
  } return items;
}

export function registerBuiltinSources() { registerSource(anilist); registerSource(iptvOrg); }
