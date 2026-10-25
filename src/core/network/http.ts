// Thin fetch wrapper: timeout, retry, headers, concurrency limiter.

export interface ReqOpts {
  method?: 'GET' | 'HEAD' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} ${url}`);
  }
}

export async function request(url: string, opts: ReqOpts = {}): Promise<Response> {
  const { method = 'GET', timeoutMs = 8000, retries = 0 } = opts;
  const headers = { 'User-Agent': DEFAULT_UA, ...(opts.headers ?? {}) };
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, headers, body: opts.body, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok && res.status >= 500 && attempt < retries) continue;
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) await sleep(200 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function getText(url: string, opts: ReqOpts = {}): Promise<string> {
  const res = await request(url, opts);
  if (!res.ok) throw new HttpError(res.status, url);
  return res.text();
}

export async function getJson<T>(url: string, opts: ReqOpts = {}): Promise<T> {
  const res = await request(url, opts);
  if (!res.ok) throw new HttpError(res.status, url);
  return res.json() as Promise<T>;
}

export async function probe(url: string, timeoutMs = 2500): Promise<{ ok: boolean; ms: number; status: number }> {
  const start = Date.now();
  try {
    const res = await request(url, { method: 'HEAD', timeoutMs });
    return { ok: res.ok || res.status === 405, ms: Date.now() - start, status: res.status };
  } catch {
    return { ok: false, ms: Date.now() - start, status: 0 };
  }
}

export function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return ''; }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Bounded-concurrency mapper. */
export async function mapLimit<I, O>(
  items: I[],
  limit: number,
  fn: (item: I, i: number) => Promise<O>,
): Promise<O[]> {
  const out: O[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
