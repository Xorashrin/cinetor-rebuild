import { getJson } from '../core/network/http';
import type { SectionId, StreamSource } from '../core/sources/types';

export type CloudStreamRepo = { name?: string; url: string; shortCode?: string; sections: SectionId[]; status: 'configured' | 'unverified' };
export type CloudStreamExtension = { name: string; version?: string; internalName?: string; repository: string; section: SectionId; status: 'available' | 'unverified' };

type RepoJson = { name?: string; description?: string; iconUrl?: string; authors?: string[]; plugins?: Array<{ name?: string; internalName?: string; version?: string; url?: string }> };

// Public repository manifests advertised by the supplied CloudStream guide.
// The app reads metadata only; it does not download opaque plugins or execute
// third-party Kotlin code. Playback remains limited to authorized adapters.
export const CLOUDSTREAM_REPOS: CloudStreamRepo[] = [
  { name:'CloudStream Providers', url:'https://raw.githubusercontent.com/recloudstream/extensions/master/repo.json', shortCode:'cspr', sections:['home'] , status:'configured' },
  { name:'English Providers', url:'https://codeberg.org/cloudstream/cloudstream-extensions/raw/branch/builds/repo.json', shortCode:'6wyw1RnS', sections:['home','anime','kdrama'], status:'configured' },
  { name:'Multilingual Providers', url:'https://codeberg.org/cloudstream/cloudstream-extensions-multilingual/raw/branch/builds/repo.json', shortCode:'Bwyw1S3k', sections:['home','livetv'], status:'configured' },
  { name:'Hexated', url:'https://codeberg.org/cloudstream/cloudstream-extensions-hexated/raw/branch/builds/repo.json', shortCode:'mwyw140i', sections:['home','anime','kdrama','livetv'], status:'configured' },
  { name:'Horis', url:'https://codeberg.org/cloudstream/cloudstream-extensions-horis/raw/branch/master/repo.json', shortCode:'Owyw2lbO', sections:['kdrama'], status:'configured' },
  { name:'CakesTwix', url:'https://raw.githubusercontent.com/CakesTwix/cloudstream-extensions-uk/master/repo.json', sections:['home'], status:'configured' },
  { name:'Turkish Providers', url:'https://raw.githubusercontent.com/keyiflerolsun/Kekik-cloudstream/master/repo.json', shortCode:'KekikAkademi', sections:['home','anime','kdrama'], status:'configured' },
];

export async function fetchCloudStreamRepo(repo: CloudStreamRepo): Promise<CloudStreamExtension[]> {
  const json = await getJson<RepoJson>(repo.url, { timeoutMs: 12000, retries: 1 });
  return (json.plugins ?? []).map(p => ({ name:p.name || p.internalName || 'Unnamed extension', version:p.version, internalName:p.internalName, repository:repo.name || repo.url, section:repo.sections[0], status:'available' }));
}

export function classifyCloudStreamExtension(name: string): SectionId {
  const n=name.toLowerCase();
  if(/anime|ani|manga|gogo|kick|yugen/.test(n)) return 'anime';
  if(/drama|asian|kiss|korea|doram/.test(n)) return 'kdrama';
  if(/iptv|live|tv247|sports/.test(n)) return 'livetv';
  return 'home';
}

export function normalizeExtensionSources(extension: CloudStreamExtension, links: Array<{ url:string; quality?:string; headers?:Record<string,string> }>): StreamSource[] {
  return links.filter(link => /^https?:\/\//i.test(link.url)).map(link => ({ url:link.url, quality:link.quality || 'auto', headers:link.headers, server:`CloudStream:${extension.name}`, kind:/\.m3u8($|\?)/i.test(link.url) ? 'hls' : 'embed' }));
}
