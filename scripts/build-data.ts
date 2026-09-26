/**
 * Builds lazily-loaded linguistic data into public/:
 *   public/dict/*, public/vendor/kuromoji.js  kuromoji + IPADIC (Apache-2.0)
 *   public/data/ja-jlpt.json JLPT word list (MIT, elzup/jlpt-word-list, from J. Waller's lists CC-BY)
 *   public/data/ja-kanji-jlpt.json kanji → JLPT level (MIT, davidluzgouveia/kanji-data)
 *   public/data/en-cmu.json  CMU Pronouncing Dictionary (BSD-style, via cmu-pronouncing-dictionary ISC)
 *   public/data/vi-lexicon.json shared Vietnamese lexicon for segmenting imported text
 */
import fs from 'node:fs';
import path from 'node:path';
import { dictionary as cmu } from 'cmu-pronouncing-dictionary';
import { normalizeLexicon, type RawLexEntry } from '../src/domains/vocabulary/lexicon';

const root = path.resolve(import.meta.dirname, '..');
const out = (p: string) => path.join(root, 'public', p);
const cacheDir = path.join(root, '.cache');
fs.mkdirSync(out('data'), { recursive: true });
fs.mkdirSync(out('dict'), { recursive: true });

async function fetchCached(name: string, url: string): Promise<string> {
  const file = path.join(cacheDir, name);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    fs.writeFileSync(file, await res.text());
  }
  return fs.readFileSync(file, 'utf8');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

// 1. kuromoji dictionary
const dictSrc = path.join(root, 'node_modules/kuromoji/dict');
// Served as *.dat.bin (still gzip bytes): some servers add `Content-Encoding: gzip`
// to *.gz files, the browser then inflates them and kuromoji's own gunzip fails.
fs.rmSync(out('dict'), { recursive: true, force: true });
fs.mkdirSync(out('dict'), { recursive: true });
for (const f of fs.readdirSync(dictSrc)) fs.copyFileSync(path.join(dictSrc, f), out(`dict/${f.replace(/\.gz$/, '.bin')}`));
fs.mkdirSync(out('vendor'), { recursive: true });
const umd = fs.readFileSync(path.join(root, 'node_modules/kuromoji/build/kuromoji.js'), 'utf8');
fs.writeFileSync(out('vendor/kuromoji.js'), umd.replace(/\.dat\.gz"/g, '.dat.bin"'));

// 2. JLPT word list: expression → [reading, level, english]
const words: Record<string, [string, number, string]> = {};
for (const n of [5, 4, 3, 2, 1]) {
  const csv = await fetchCached(`n${n}.csv`, `https://raw.githubusercontent.com/elzup/jlpt-word-list/master/src/n${n}.csv`);
  for (const [expr, reading, meaning] of parseCsv(csv).slice(1)) {
    for (const key of expr.split(/[;；、]/).map((s) => s.trim()).filter(Boolean)) {
      if (!words[key]) words[key] = [reading, n, meaning.slice(0, 80)];
    }
    if (reading && !words[reading]) words[reading] = [reading, n, meaning.slice(0, 80)];
  }
}
fs.writeFileSync(out('data/ja-jlpt.json'), JSON.stringify(words));

// 3. kanji → JLPT (new levels)
const kanjiJson = JSON.parse(
  await fetchCached('kanji.json', 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json'),
) as Record<string, { jlpt_new: number | null }>;
const kanji: Record<string, number> = {};
for (const [k, v] of Object.entries(kanjiJson)) if (v.jlpt_new) kanji[k] = v.jlpt_new;
fs.writeFileSync(out('data/ja-kanji-jlpt.json'), JSON.stringify(kanji));

// 4. CMU dictionary (first pronunciation per word, alphabetic words only)
const cmuOut: Record<string, string> = {};
for (const [w, p] of Object.entries(cmu as Record<string, string>)) if (/^[a-z][a-z']*$/.test(w)) cmuOut[w] = p;
fs.writeFileSync(out('data/en-cmu.json'), JSON.stringify(cmuOut));

// 5. Vietnamese shared lexicon
const viRaw = JSON.parse(fs.readFileSync(path.join(root, 'content/lexicon/vi.json'), 'utf8')) as Record<string, RawLexEntry>;
fs.writeFileSync(out('data/vi-lexicon.json'), JSON.stringify(normalizeLexicon('vi', viRaw)));

const size = (p: string) => `${(fs.statSync(out(p)).size / 1024).toFixed(0)} KB`;
console.log('ja-jlpt', Object.keys(words).length, size('data/ja-jlpt.json'));
console.log('ja-kanji', Object.keys(kanji).length, size('data/ja-kanji-jlpt.json'));
console.log('en-cmu', Object.keys(cmuOut).length, size('data/en-cmu.json'));
console.log('vi-lexicon', size('data/vi-lexicon.json'));
