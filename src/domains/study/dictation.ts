/**
 * Dictation comparison: LCS alignment of learner units vs. expected units.
 * Units are characters for Japanese and words otherwise (adapter decides).
 */
export type DiffOp = { type: 'ok' | 'missing' | 'extra' | 'accent'; unit: string; typed?: string };

export function diffUnits(expected: string[], actual: string[]): DiffOp[] {
  const n = expected.length;
  const m = actual.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = expected[i] === actual[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === actual[j]) {
      ops.push({ type: 'ok', unit: expected[i] });
      i++;
      j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ type: 'extra', unit: actual[j++] });
    } else {
      ops.push({ type: 'missing', unit: expected[i++] });
    }
  }
  return ops;
}

/** Share of expected units the learner got (a transparent count, not a grade). */
export function accuracy(ops: DiffOp[]): { correct: number; total: number } {
  const total = ops.filter((o) => o.type !== 'extra').length;
  // an accent op counts toward the total but not as correct
  return { correct: ops.filter((o) => o.type === 'ok').length, total };
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');

/**
 * Collapse an adjacent extra/missing pair that differs only in diacritics
 * (e.g. Vietnamese tone marks: "chao" vs "chào") into one 'accent' op.
 */
export function markAccentErrors(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  for (let i = 0; i < ops.length; i++) {
    const a = ops[i];
    const b = ops[i + 1];
    if (b && a.type !== 'ok' && b.type !== 'ok' && a.type !== b.type) {
      const missing = a.type === 'missing' ? a : b;
      const extra = a.type === 'extra' ? a : b;
      if (fold(missing.unit) === fold(extra.unit)) {
        out.push({ type: 'accent', unit: missing.unit, typed: extra.unit });
        i++;
        continue;
      }
    }
    out.push(a);
  }
  return out;
}
