// Nuvio-compatible Stremio addon manifest/transport layer.
// Adapted from NuvioMobile's public addon model: manifest -> resources ->
// catalog/meta/stream/subtitles routes. It handles metadata and authorized
// addon endpoints without executing Kotlin/JS plugin code inside Cinetor.
import { getJson } from '../core/network/http';
import type { SectionId, StreamSource } from '../core/sources/types';

export type NuvioAddon = {
  id: string; name: string; version: string; description?: string; logo?: string;
  manifestUrl: string; resources: NuvioResource[]; catalogs: NuvioCatalog[];
  behaviorHints: { configurable?: boolean; configurationRequired?: boolean; adult?: boolean; p2p?: boolean };
};
export type NuvioResource = { name: string; types: string[]; idPrefixes?: string[] };
export type NuvioCatalog = { type: string; id: string; name?: string; extra?: NuvioExtra[] };
export type NuvioExtra = { name: string; isRequired?: boolean; options?: string[]; optionsLimit?: number };
export type NuvioSection = SectionId;

const safeUrl = (url: string) => /^https?:\/\//i.test(url) ? url : null;
const base = (manifestUrl: string) => manifestUrl.split('?')[0].replace(/\/manifest\.json\/?$/, '').replace(/\/$/, '');
const segment = (value: string) => encodeURIComponent(value);

export function nuvioResourceUrl(addon: NuvioAddon, resource: string, type: string, id: string, extra?: string) {
  const suffix = extra ? `/${segment(extra)}` : '';
  const query = addon.manifestUrl.includes('?') ? addon.manifestUrl.slice(addon.manifestUrl.indexOf('?')) : '';
  return `${base(addon.manifestUrl)}/${resource}/${type}/${segment(id)}${suffix}.json${query}`;
}

export function classifyNuvioAddon(addon: NuvioAddon): NuvioSection {
  const text = `${addon.name} ${addon.description ?? ''}`.toLowerCase();
  if (/anime|manga|donghua/.test(text)) return 'anime';
  if (/k.?drama|asian|korea|dorama/.test(text)) return 'kdrama';
  if (/iptv|live|sports/.test(text)) return 'livetv';
  return 'home';
}

export async function loadNuvioAddon(manifestUrl: string): Promise<NuvioAddon> {
  const raw = await getJson<any>(manifestUrl, { timeoutMs: 12000, retries: 1 });
  const types = Array.isArray(raw.types) ? raw.types.filter((x:any)=>typeof x==='string') : [];
  const prefixes = Array.isArray(raw.idPrefixes) ? raw.idPrefixes.filter((x:any)=>typeof x==='string') : [];
  const resources: NuvioResource[] = (raw.resources ?? []).map((r:any) => typeof r === 'string'
    ? { name:r, types, idPrefixes:prefixes }
    : { name:r.name, types:r.types?.length ? r.types : types, idPrefixes:r.idPrefixes?.length ? r.idPrefixes : prefixes })
    .filter((r:NuvioResource)=>!!r.name);
  return { id:raw.id, name:raw.name, version:raw.version ?? '0.0.0', description:raw.description,
    logo:safeUrl(raw.logo) ?? undefined, manifestUrl, resources, catalogs:(raw.catalogs ?? []).map((c:any)=>({type:c.type,id:c.id,name:c.name,extra:c.extra})), behaviorHints:raw.behaviorHints ?? {} };
}

export async function fetchNuvioStreamLinks(addon:NuvioAddon, type:string, id:string): Promise<StreamSource[]> {
  const url = nuvioResourceUrl(addon, 'stream', type, id);
  const payload = await getJson<any>(url, { timeoutMs:15000, retries:1 });
  return (payload.streams ?? []).filter((s:any)=>safeUrl(s.url)).map((s:any)=>({
    url:s.url, server:`Nuvio:${addon.name}`, quality:s.quality ?? 'auto',
    kind:/\.m3u8($|\?)/i.test(s.url) ? 'hls' : 'embed', referer:s.referer,
    headers:s.headers, subtitles:(s.subtitles ?? []).filter((x:any)=>safeUrl(x.url)).map((x:any)=>({lang:x.lang ?? 'und',url:x.url})),
  }));
}
