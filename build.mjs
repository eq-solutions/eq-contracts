// Build step — transpile index.ts → index.js (ESM). Mirrors the
// @eq-solutions/roles model: the repo ships BOTH the .ts (the `types` entry) and
// the built .js (runtime), so `github:` consumers need no build or transpile
// step. Run `npm run build` and commit both index.ts and index.js.
import { build } from 'esbuild'

await build({
  entryPoints: ['index.ts'],
  outfile: 'index.js',
  format: 'esm',
  platform: 'neutral',
  target: 'node18',
  bundle: false,
  logLevel: 'info',
})
console.log('built index.js')
