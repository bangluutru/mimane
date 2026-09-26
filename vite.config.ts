import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

/**
 * onnxruntime-web references its 26 MB wasm via `new URL(…, import.meta.url)`,
 * so Vite copies it into dist — over Cloudflare Pages' 25 MiB per-file limit.
 * Transformers.js loads that runtime from jsDelivr at run time anyway
 * (env.backends.onnx.wasm.wasmPaths defaults to the CDN), so drop the copy.
 */
function dropBundledOrtWasm(): Plugin {
  return {
    name: 'drop-bundled-ort-wasm',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const name of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name];
    },
  };
}

export default defineConfig({
  plugins: [react(), dropBundledOrtWasm()],
  resolve: {
    alias: [
      { find: '@', replacement: src('') },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as never);
