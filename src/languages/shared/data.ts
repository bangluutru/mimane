/**
 * Static data loader used by adapters for lazily-loaded linguistic data
 * (JLPT list, IPA dictionary, shared lexicons). Browser: fetch from the app's
 * base URL. Node build scripts swap in a filesystem loader.
 */
type Loader = (path: string) => Promise<unknown>;

let loader: Loader = async (path) => {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
};

const cache = new Map<string, Promise<unknown>>();

export function setDataLoader(fn: Loader) {
  loader = fn;
  cache.clear();
}

export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = loader(path);
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p as Promise<T>;
}
