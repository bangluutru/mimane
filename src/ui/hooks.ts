import { useEffect, useRef, useState } from 'react';
import { onChange, type Topic } from '@/domains/storage/db';

/** Run an async query and re-run it when any of `topics` change. */
export function useLive<T>(query: () => Promise<T>, deps: unknown[], topics: Topic[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  const q = useRef(query);
  q.current = query;
  useEffect(() => {
    let alive = true;
    const run = () => q.current().then((v) => alive && setValue(v)).catch((e) => console.error(e));
    run();
    const off = onChange(topics, run);
    return () => {
      alive = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}
