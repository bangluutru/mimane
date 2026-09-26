/** Split text into sentences at terminator matches, keeping the terminator. */
export function splitByTerminators(text: string, terminators: RegExp): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    let last = 0;
    const re = new RegExp(terminators.source, terminators.flags.includes('g') ? terminators.flags : terminators.flags + 'g');
    for (const m of line.matchAll(re)) {
      const end = (m.index ?? 0) + m[0].length;
      const s = line.slice(last, end).trim();
      if (s) out.push(s);
      last = end;
    }
    const tail = line.slice(last).trim();
    if (tail) out.push(tail);
  }
  return out;
}
