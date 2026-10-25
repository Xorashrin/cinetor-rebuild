# CINETOR — Master Plan (Clean Rebuild)

> Single-source-of-truth plan for a fresh build. Replaces all previous Cinetor work.
> Target: Android APK via GitHub Actions (Expo/RN). No local JVM builds — CI only.

---

## 0. Product Definition

**Cinetor** (`com.cinetor.app`) — a high-polish Android streaming hub.
Dark cinematic UI, smooth 60fps animation, per-section isolation, silent BDIX scan on
Wi-Fi, multiple external sources, adaptive playback for mobile data users.

Five bottom tabs — **strictly isolated** (own state, cache, search, sources, refresh):

| # | Tab | Content scope |
|---|-----|---------------|
| 1 | **Home** | Movies + TV/Series only |
| 2 | **K-Drama** | Korean/Asian drama only |
| 3 | **Anime** | Anime only (sub/dub/donghua) |
| 4 | **Others** | Regional content (Bangla/Hindi/Tamil/Telugu/SE-Asia) |
| 5 | **Profiles** | Profile + settings only |

Plus two **separated** modules reachable from Profiles:
- **Live TV** — IPTV channels (own section, not a bottom tab by default)
- **Adult** — behind a PIN/opt-in, fully isolated, off by default

**Isolation rule (hard):** no content bleeds across sections. Each section has its own
feed, cache key namespace, search index, source registry entry, and refresh controller.

---

## 1. Design System (high quality)

- **Stack:** React Native + Expo SDK (managed + prebuild), TypeScript, Expo Router.
- **Player:** `expo-av` → upgrade path to `react-native-video`/`media3` if build allows.
- **Rendering:** FlatList/FlashList (big lists), Reanimated 3 for gestures/anim,
  react-native-image / expo-image for posters, react-native-mmkv for fast storage.
- **Palette:** near-black `#0B0B10`, surface `#14141C`, elevate `#1C1C26`,
  accent violet→pink gradient `#5B2DFF → #C026D3`, emerald online `#22C55E`,
  gold rating `#FACC15`, text `#F4F4F8`/`#9A9AB0`.
- **Signature motion:** hero crossfade + Ken Burns, shimmer skeletons, spring press
  scale, staggered card entrance, smooth parallax on detail.
- **Perf budget:** cold start <1.5s, list scroll 60fps, image decode off-thread,
  section switch <80ms (keep-mounted tabs).

---

## 2. Architecture (section isolation engine)

```
src/
  app/                # Expo Router routes
  core/
    sources/          # source registry + per-section source adapters
    network/          # fetch wrapper, retry, timeout, headers, cache
    classify/         # tag -> section router (isolation enforcement)
    storage/          # mmkv namespaced per section
    player/           # playback engine + download manager
  features/
    home/  kdrama/  anime/  others/  profiles/  livetv/  adult/
      each: feed.ts, search.ts, sources.ts, ui/, state.ts, cache.ts
  bdix/
    scanner.ts        # silent wifi BDIX prober
    classify.ts       # server type + section tagging
    catalog.ts        # crawled title -> unified MediaItem
  components/         # shared UI (PosterCard, Row, Hero, Shimmer, Player)
```

### Isolation mechanics
- Every `MediaItem` carries `section: 'home'|'kdrama'|'anime'|'others'`.
- `classify()` assigns section at ingest; item only ever lands in one feed.
- Per-section store: `state[section]` slice + `mmkv` bucket `cinetor.<section>`.
- Per-section source registry: sources register to exactly one section.
- Per-section refresh: each feed owns a `RefreshController` (stale-while-revalidate,
  pull-to-refresh, independent interval). Refreshing Anime never touches Home.

### MediaItem contract
```
{ id, section, title, year, poster, backdrop?, type:'movie'|'series'|'anime'|'drama'|'channel'|'adult',
  genres[], rating?, lang?, seasons?[{ n, episodes[{ n, title, sources[] }] }],
  sources[]: [{ url, quality, server, kind:'hls'|'mp4'|'dash'|'iframe'|'bdix'|'torrent' }]
}
```

---

## 3. BDIX silent scan (first & primary source)

Goal: on Wi-Fi, silently probe the LAN/ISP BDIX hosts and surface FTP/HTTP media into
each section **without the user doing anything**.

### `bdix/scanner.ts`
- Trigger: NetInfo = Wi-Fi connected → start scan in background (no UI block, no prompt).
- Targets: read gateway + DHCP base (e.g. `192.168.x.0/24`, ISP-known BDIX ranges),
  common BDIX host list seed (`data/bdix-hosts.json` — seeded from Ctent's 1,470+ list).
- Probes: `HEAD/GET` on ports 80/8080/8096/8920/32400 + known endpoints
  (CircleFTP `:5000/api`, CyberFTP `/api/v2`, Emby `/System/Info`, Jellyfin `/web`,
  h5ai/Apache/Nginx autoindex detect).
- Concurrency: bounded (~24 in-flight), timeout 1.5–3s, exponential back-off, full
  silent — results push to `bdix/catalog`.
- Cache live hosts to mmkv; rescan on Wi-Fi change + 30min TTL.

### `bdix/catalog.ts`
- For each live host: classify type → crawl directory/API → emit `MediaItem`s.
- Route items to sections by path/filename heuristics
  (`/anime`, `/korean|kdrama`, `/hindi|bangla|tamil` → others; else movies/series → home).
- IPTV `.m3u`/`.m3u8` streams on LAN → Live TV module.
- Dedup across hosts by normalized title+year; `+N servers` alt badge.

**Legal/safety note:** BDIX scan = local-network discovery only. No credentials, no
intrusion — plain GET on open indexable hosts the user's ISP already exposes.

---

## 4. External sources (megathread-derived, category-mapped)

Source = pluggable `SourceAdapter{ id, section, getHome(), search(), getDetails(),
getStreams() }`. Register per-section. Enable/disable in Profiles.

### 4a. Home (Movies + Series) — streaming scrapers
`hydrahd`, `shiopa`, `rivestream`, `lookmovie2`, `yesmovies`, `smashystream`,
`filmex`, `cinema.bz`, `aether`, `67movies`, `1shows`, `stellar`, `mapple`, `yts`/`1337x`
(torrent→stream via seed engine later).

### 4b. K-Drama — asian drama scrapers
`kisskh.ovh`, `kissasian`, `k-drama.in`, `dramanice`, `dramahood`, `myasiantv`,
`asiaflix`, `mkvdrama`, `dramaday`, `rivestream/kdrama`, `vidbox.vc/asian-drama`,
`asiancrush`, `aDrama`, `dramafren`, `raredoramas`.

### 4c. Anime — anime scrapers + trackers
`animepahe`, `miruro`, `anidap`, `anikuro`, `animenana`, `animeparadise`, `animesilo`,
`animenosub`, `anizone`, `reanime`, `flixer`, `wcofun`, `123anime`, `allwish`, `yenime`,
`animexin`/`myanime` (donghua), `hianime` mirrors, `9animstv`.
Trackers for meta/airing: AniList + MyAnimeList (official APIs, posters/synopsis).

### 4d. Others (regional) — Bangla/Hindi/Tamil/SE-Asia
`einthusan`, `tamilmv`, `vegamovies`, `bilibili.tv` (official SE-Asia), `mkv drama` re-use,
`worldscinema`, BDIX regional buckets, `pahe`, `lightdl`, `psa.wf` (DDL→stream).

### 4e. Live TV — IPTV module
`iptv-org/awesome-iptv` playlists (public `.m3u`), `daddylive`, `thetvapp`, `iptv.surf`,
`tv.garden`, `photocall.tv`, plus any LAN `.m3u` BDIX streams. HLS playback only.

### 4f. Adult (isolated, PIN-gated, off by default)
Placeholder adapter interface + curated legal aggregator entries only; hidden until
user enables + sets PIN in Profiles. No content ships enabled.

### 4g. Metadata layer (cross-section, read-only)
AniList (anime), TMDb-style open meta for movies/drama where a free key/endpoint exists,
MyDramaList scrape for K-Drama info. Metadata enriches posters/synopses; is *not* a
playback source. Keep it free/official-first.

---

## 5. Playback, downloads, mobile data

- **Player screen:** expo-av/video; play/pause/seek/double-tap ±10s, pinch zoom,
  brightness/volume gestures, speed, subtitle track (`.srt/.vtt` + OpenSubtitles hook),
  quality picker, auto-rotate, PiP.
- **Adaptive:** prefer HLS master → pick variant by net profile; MP4 progressive fallback.
- **Mobile-data mode:** Profiles toggle → cap default quality (e.g. ≤480p), prefetch
  off, data-saver poster sizes, bandwidth meter. Per-network default quality.
- **Downloads:** download manager queue (finite HLS→MP4 remux where feasible, MP4
  direct, torrent later), resumable, per-item quality, offline player tab in Profiles.
- **Search:** global + per-section; section search only hits that section's sources +
  index. Debounced, ranked, deduped.

---

## 6. Profiles & settings

- Profiles tab = settings only (no media feed). Multi-profile w/ avatar, per-profile
  watch-history + watchlist.
- Settings: default quality per network (wifi/mobile), data-saver, subtitle lang,
  source enable/disable per section, adult PIN + toggle, Live TV visibility,
  BDIX auto-scan on/off, clear cache, about/version.
- Watch-history + continue-watching stored per profile (mmkv), shown on Home.

---

## 7. Build & release (GitHub Actions only)

`.github/workflows/`:
- `ci.yml` — typecheck + unit tests on push/PR.
- `build-apk.yml` — on `v*` tag or manual dispatch: setup node + Java + Android SDK,
  `npx expo prebuild` → `gradle assembleRelease` → upload `cinetor-<ver>.apk` artifact
  + create GitHub Release. Universal armv7/arm64/x86_64, signed with a release
  keystore stored in repo secrets (`KEYSTORE_B64`, `KEYSTORE_PASS`, `KEY_ALIAS`,
  `KEY_PASS`).
- No local JVM/Gradle builds (weak PC) — all heavy builds run on `ubuntu-latest` runners.

---

## 8. Phases (each = CI-verified)

- **P0 Scaffold** — Expo+TS+Router+Reanimated+mmkv; tab shell; theme; icon/splash.
- **P1 Section engine** — MediaItem contract, isolation store, per-section
  feed/search/refresh, FlashList grids.
- **P2 BDIX silent scan** — scanner, classify, catalog → live feeds on Wi-Fi.
- **P3 Player** — playback screen, gestures, quality, subtitles, resume.
- **P4 Sources wave 1** — Home + Anime adapters (top 5 each), search, details, streams.
- **P5 Sources wave 2** — K-Drama + Others + regional; Live TV (iptv-org + LAN).
- **P6 Downloads + mobile-data polish** — queue, offline, adaptive, saver.
- **P7 Adult module + Profiles completeness** — PIN, toggles, watchlist/history.
- **P8 Polish + release** — perf pass, anim polish, tests, `v1.0.0` release via Actions.

---

## 9. Execution model

Orchestrate with parallel subagents per phase (adapters are embarrassingly parallel —
one agent per source adapter + a shared-adapter-contract agent). Verification gate per
phase: `tsc` clean + unit tests + (for build phases) a successful Actions APK run.

---

## 10. Hard rules

1. Section isolation — enforced at classify + store, never cross-feed.
2. BDIX scan is silent + opt-out, never prompts, never blocks UI.
3. CI-only builds — never run Gradle/JVM locally.
4. Real megathread sources only — no fabricated adapters.
5. Adult + Live TV fully separated & off by default.
6. No Netflix/Hulu DRM bypass — only open/indexable sources & free APIs.
