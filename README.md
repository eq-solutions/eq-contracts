# @eq-solutions/contracts

Canonical cross-app contracts for the EQ suite. One source of truth, imported by
every side of a seam so it's enforced at **compile time** (shared TS type) and
**runtime** (dependency-free validator) — drift becomes impossible, not merely
detectable.

## v0.1 — Shell→Service login-handoff JWT

```ts
import { ShellHandoffClaims, validateHandoffClaims } from '@eq-solutions/contracts'
```

- **`ShellHandoffClaims`** — the `app_metadata` claim shape the Shell→Service
  handoff guarantees. eq-shell mints it (`token-exchange`, aud=service); eq-service
  consumes it (`/api/shell-auth` → `ServiceJwtClaims`). Importing the type in both
  makes `tsc` fail on either side if the shape drifts.
- **`validateHandoffClaims(input)`** — runtime check (never throws). Call it on the
  mint side before signing and on the consume side after verifying the signature.

Scope is only the claims the Service handoff guarantees. Mint-only fields
(`source_app`, `extra_perms` — provenance / Field-only) are intentionally out of
contract; eq-shell extends the type locally for those.

## Consuming

Pinned by tag, matching the other `@eq-solutions/*` packages:

```json
{ "dependencies": { "@eq-solutions/contracts": "github:eq-solutions/eq-contracts#v0.1.0" } }
```

The repo ships the built `index.js` (runtime) and `index.ts` (types), so no
`transpilePackages` or build step is needed in consumers.

## Developing

```sh
npm install
npm run build      # esbuild index.ts → index.js (commit both)
npm run typecheck  # tsc --noEmit
```

Bump the version + tag (`vX.Y.Z`) on every contract change, then update the
`github:…#vX.Y.Z` pin in each consumer.

© 2026 CDC Solutions Pty Ltd. Proprietary and confidential.
