/** Configure isomorphic language adapters for Node (build scripts & tests). */
import fs from 'node:fs';
import path from 'node:path';
import { setDataLoader } from '../src/languages/shared/data';
import { configureJapanese } from '../src/languages/ja/adapter';

const root = path.resolve(import.meta.dirname, '..');
setDataLoader(async (p) => JSON.parse(fs.readFileSync(path.join(root, 'public', p), 'utf8')));
configureJapanese({ dicPath: path.join(root, 'node_modules/kuromoji/dict') + '/' });
export { root };
