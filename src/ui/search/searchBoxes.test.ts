import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Canh nguyên tắc "ô tìm kiếm ở đâu cũng dùng @chotto/search" (README, mục
 * "Ô tìm kiếm"). Trước khi có gói, mỗi site một ô và mỗi ô một kiểu lỗi: ô
 * này quên đ→d, ô kia vẽ hai vòng focus lồng nhau. Viết tay lại là quay về
 * đúng chỗ đó.
 *
 * Ô nào buộc phải giữ bản tự viết (gói thiếu khả năng) thì thêm vào ALLOWED
 * kèm lý do và TODO(@chotto/search). Hiện không có.
 */
const ALLOWED: Record<string, string> = {};

const ROOT = join(__dirname, '..', '..');
const HOOK = 'ui/search/useMimaneSearch.ts';
const SELF = 'ui/search/searchBoxes.test.ts';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });

const files = walk(ROOT)
  .map((p) => ({ rel: relative(ROOT, p), code: readFileSync(p, 'utf8') }))
  .filter((f) => f.rel !== SELF && !(f.rel in ALLOWED));

describe('ô tìm kiếm dùng @chotto/search', () => {
  it('không có ô tìm kiếm viết tay trong src/', () => {
    const handmade = files.filter((f) => /type=["']search["']|role=["'](search|combobox)["']/.test(f.code)).map((f) => f.rel);
    expect(handmade).toEqual([]);
  });

  it('mọi ô đi qua hook nối useMimaneSearch', () => {
    // <SearchBox> một dòng và useSearchBox gọi thẳng đều bỏ qua điều hướng,
    // resetKey và chữ giao diện theo ngôn ngữ của app.
    const bypass = files
      .filter((f) => f.rel !== HOOK && (/\buseSearchBox\b/.test(f.code) || /<SearchBox[\s>]/.test(f.code)))
      .map((f) => f.rel);
    expect(bypass).toEqual([]);
  });

  it('gói cài từ repo dùng chung, ghim theo tag', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'));
    expect(pkg.dependencies?.['@chotto/search']).toMatch(/^github:bangluutru\/chotto-search#v\d+\.\d+\.\d+$/);
  });
});
