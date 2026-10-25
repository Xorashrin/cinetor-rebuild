// Silent BDIX scanner — probes the user's local network + seeded ISP host list
// on Wi-Fi, classifies live servers, caches them, and emits catalog-ready hosts.
//
// SILENT BY CONTRACT: never prompts, never blocks UI, never shows a progress
// wall. Runs only on Wi-Fi. Opt-out via Profiles setting `bdix.enabled`.

import { mapLimit, probe, request, hostOf } from '../core/network/http';
import { MEGA_HOSTS } from './hosts';
import { sectionStore } from '../core/storage/store';
import { getNetworkStateAsync, NetworkStateType } from 'expo-network';
import { create } from 'zustand';

export type ServerClass =
  | 'CIRCLEFTP' | 'CYBERFTP' | 'EMBY' | 'JELLYFIN' | 'DIRECTORY'
  | 'MEDIA_SITE' | 'PORTAL' | 'ANIME_WEB' | 'IPTV' | 'UNKNOWN';

export interface LiveServer {
  url: string;
  host: string;
  cls: ServerClass;
  latency: number;
  online: boolean;
  lastSeen: number;
}

interface ScanState {
  scanning: boolean;
  scanned: number;
  total: number;
  online: number;
  lastScan: number;
  servers: LiveServer[];
  start(): Promise<void>;
  rescan(): Promise<void>;
}

const STORE_KEY = 'bdix.live_servers';
const SCAN_TTL = 30 * 60 * 1000;   // rescan cached hosts every 30 min
const PROBE_TIMEOUT = 2600;
const CONCURRENCY = 24;            // bounded — quiet on the network

export const useScan = create<ScanState>((set, get) => ({
  scanning: false, scanned: 0, total: 0, online: 0, lastScan: 0, servers: [],

  start: async () => {
    const st = get();
    if (st.scanning) return;
    if (!bdixEnabled()) return;

    const onWifi = await isWifi();
    if (!onWifi) {
      // restore cache so UI still has last-known hosts (they just won't refresh)
      const cached = sectionStore.getJson<LiveServer[]>(STORE_KEY, 'home');
      if (cached) set({ servers: cached, online: cached.filter(s => s.online).length });
      return;
    }

    set({ scanning: true, scanned: 0, total: MEGA_HOSTS.length });
    try {
      const results = await mapLimit(MEGA_HOSTS, CONCURRENCY, async ([url]) => {
        const s = await probeAndClassify(url);
        set((cur) => ({ scanned: cur.scanned + 1 }));
        return s;
      });
      const online = results.filter((r) => r.online);
      // restore non-network metadata for hosts that answered before
      set({
        servers: online, online: online.length, scanning: false,
        lastScan: Date.now(),
      });
      sectionStore.setJson(STORE_KEY, online, 'home');
    } finally {
      set({ scanning: false });
    }
  },

  rescan: async () => {
    const st = get();
    if (Date.now() - st.lastScan < SCAN_TTL) return;
    await get().start();
  },
}));

function bdixEnabled(): boolean {
  const v = sectionStore.get('bdix.enabled', 'settings');
  return v !== '0';
}

async function isWifi(): Promise<boolean> {
  try {
    const s = await getNetworkStateAsync();
    return s.type === NetworkStateType.WIFI;
  } catch {
    return false;
  }
}

const CLASS_TESTS: [RegExp, ServerClass][] = [
  [/circleftp/i, 'CIRCLEFTP'],
  [/cyberftp/i, 'CYBERFTP'],
  [/emby/i, 'EMBY'],
  [/jellyfin/i, 'JELLYFIN'],
  [/index|autoindex|h5ai|directory/i, 'DIRECTORY'],
  [/iptv|m3u|livetv/i, 'IPTV'],
  [/anime/i, 'ANIME_WEB'],
];

async function probeAndClassify(url: string): Promise<LiveServer> {
  const host = hostOf(url);
  const base: LiveServer = { url, host, cls: 'UNKNOWN', latency: 0, online: false, lastSeen: 0 };

  const p = await probe(url, PROBE_TIMEOUT);
  if (!p.ok) return base;
  base.online = true; base.latency = p.ms; base.lastSeen = Date.now();

  // classify by host string first
  for (const [re, cls] of CLASS_TESTS) {
    if (re.test(url) || re.test(host)) { base.cls = cls; return base; }
  }

  // shallow GET → sniff server signature
  try {
    const res = await request(url, { method: 'GET', timeoutMs: PROBE_TIMEOUT });
    const body = (await res.text()).slice(0, 4096).toLowerCase();
    const server = (res.headers.get('server') ?? '').toLowerCase();
    if (body.includes('emby') || server.includes('emby')) base.cls = 'EMBY';
    else if (body.includes('jellyfin') || server.includes('jellyfin')) base.cls = 'JELLYFIN';
    else if (body.includes('circleftp') || body.includes('cyberftp')) base.cls = 'CIRCLEFTP';
    else if (body.includes('index of') || body.includes('h5ai') || /apache|nginx|litespeed|lighttpd/.test(server))
      base.cls = 'DIRECTORY';
    else if (body.includes('.m3u') || body.includes('iptv')) base.cls = 'IPTV';
    else if (body.includes('anime')) base.cls = 'ANIME_WEB';
    else base.cls = 'MEDIA_SITE';
  } catch { /* keep UNKNOWN */ }

  return base;
}
