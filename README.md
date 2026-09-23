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

## v0.2 — TenantBrandKit

```ts
import { TenantBrandKit, validateTenantBrandKit, NEUTRAL_BRAND_KIT } from '@eq-solutions/contracts'
```

The one shape every EQ surface uses for a tenant's brand when it renders a
document, an email, or branded chrome. Design and rationale:
`eq-context/eq/documents/branded-document-kit-design-2026-09-23.md`.

- **`TenantBrandKit`** — `palette` (primary / deep / ice / ink, optional
  accent; bare uppercase hex), `logos` (light / dark / mark, each with
  **measured** `widthPx`/`heightPx` so nobody re-measures at render time),
  `fonts` (`docBody` must be Calibri / Aptos / Arial — editable .docx files
  leave the building), `legal` (the footer line source), `policy.flat`,
  `complete`.
- **`validateTenantBrandKit(input)`** — dependency-free runtime check, never
  throws. Run it on the canonical RPC output, on normaliser output in tests,
  and on any kit that crosses a process boundary.
- **`NEUTRAL_BRAND_KIT`** — the fallback for incomplete tenant data.
  Greyscale, no logo, system fonts. **Never** another tenant's brand; EQ's
  own brand is just the `eq` tenant's row.
- **`brand-kit.schema.json`** — JSON Schema (2020-12) mirror for non-TS
  consumers (eq-cards / Dart). `npm test` asserts it matches the TS type.

Producers: `@eq-solutions/documents` (`brand.normalise()`, from the raw
`organisations.branding` jsonb) and the canonical RPC
`eq_get_tenant_brand_kit` on eq-canonical. Consumers never build a kit by
hand.

## Consuming

Pinned by tag, matching the other `@eq-solutions/*` packages:

```json
{ "dependencies": { "@eq-solutions/contracts": "github:eq-solutions/eq-contracts#v0.2.0" } }
```

The repo ships the built `index.js` / `brand-kit.js` (runtime) and the `.ts` files (types), so no
`transpilePackages` or build step is needed in consumers.

## Developing

```sh
npm install
npm run build      # esbuild index.ts + brand-kit.ts → .js (commit all four)
npm test           # node:test — validator + schema/type parity
npm run typecheck  # tsc --noEmit
```

Bump the version + tag (`vX.Y.Z`) on every contract change, then update the
`github:…#vX.Y.Z` pin in each consumer.

© 2026 CDC Solutions Pty Ltd. Proprietary and confidential.
