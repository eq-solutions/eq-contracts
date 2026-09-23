/**
 * @eq-solutions/contracts — TenantBrandKit.
 *
 * The ONE shape every EQ surface uses to describe a tenant's brand when it
 * renders a document, an email, or branded chrome. Produced by exactly one
 * normaliser (`@eq-solutions/documents` → `brand.normalise()`, and the
 * canonical RPC `eq_get_tenant_brand_kit` which applies the same mapping);
 * consumed by eq-field, eq-shell, eq-service (this TS type) and eq-cards
 * (the JSON Schema in `brand-kit.schema.json`, same shape).
 *
 * Design (eq-context `eq/documents/branded-document-kit-design-2026-09-23.md`):
 *  - Palette carries FOUR roles — primary / deep / ice / ink — the same four
 *    canonical `organisations.branding.palette` already stores, as bare
 *    6-digit hex. `accent` is an optional fifth role; when absent, `deep` is
 *    the accent. A tenant's `deep` may legitimately be a different hue from
 *    `primary` (it is whatever the logo extraction found).
 *  - Logos carry MEASURED pixel dimensions so no consumer ever re-measures an
 *    image to honour aspect ratio. Measured once at upload, stored, trusted.
 *  - Fonts: `docBody` MUST be a font that is installed everywhere Word runs
 *    (Calibri / Aptos / Arial), because editable .docx files leave the
 *    building. `heading` and `body` may be brand fonts.
 *  - `legal` is the footer line source. Nothing downstream hardcodes an ABN.
 *  - Missing values fall back to NEUTRAL_BRAND_KIT — greyscale, no logo,
 *    system fonts — NEVER to another tenant's brand. EQ's own brand is just
 *    the `eq` tenant's row, not a default.
 *
 * Dependency-free on purpose (same rule as the handoff contract): the
 * validator below is the runtime guard; no zod, no schema library.
 */

export const BRAND_KIT_VERSION = 1 as const

/** A logo asset with its measured native dimensions. */
export interface LogoAsset {
  /** Absolute URL. Tenant storage (`tenant-logos/<org-uuid>/…`) or a data: URL. */
  url: string
  /** Native width in pixels, measured at upload. > 0. */
  widthPx: number
  /** Native height in pixels, measured at upload. > 0. */
  heightPx: number
  mime: 'image/png' | 'image/svg+xml' | 'image/webp' | 'image/jpeg'
}

export interface BrandPalette {
  /** Bare 6-digit hex, uppercase, no '#'. Primary fills, title text, table headers. */
  primary: string
  /** Secondary headings, hover, subtitle; doubles as accent when `accent` is absent. */
  deep: string
  /** Light tint: zebra rows, panels, page tint. */
  ice: string
  /** Body text. Never pure black. */
  ink: string
  /** Optional accent for rules / CTAs. Absent ⇒ use `deep`. */
  accent?: string
}

export interface BrandFonts {
  /** Heading font family name, e.g. "Plus Jakarta Sans". */
  heading: string
  /** Web / PDF body font family name. */
  body: string
  /** .docx body font — must be universally installed (Calibri, Aptos, Arial). */
  docBody: string
}

export interface BrandLegal {
  abn?: string
  address?: string
  phone?: string
  email?: string
  web?: string
}

export interface TenantBrandKit {
  kitVersion: typeof BRAND_KIT_VERSION
  tenant: {
    /** Canonical organisation UUID (public.organisations.id on eq-canonical). */
    id: string
    /** Canonical slug, e.g. "eq". */
    slug: string
    /** Legal entity name for footers. */
    legalName: string
    /** Display name for mastheads. */
    displayName: string
  }
  palette: BrandPalette
  logos: {
    /** For white / light backgrounds. Required in a complete kit; may be absent ⇒ no logo rendered. */
    light?: LogoAsset
    /** For dark / primary-fill backgrounds. */
    dark?: LogoAsset
    /** Square mark for favicons, xlsx corners. */
    mark?: LogoAsset
  }
  fonts: BrandFonts
  legal: BrandLegal
  /**
   * Rendering policy. Constant today (flat: no gradients, no shadows — both
   * brand briefs agree) but carried so a future tenant option has a home.
   */
  policy: { flat: true }
  /**
   * True when every value came from the tenant's own record. False when any
   * role was filled from NEUTRAL_BRAND_KIT — consumers may warn the user.
   */
  complete: boolean
}

/**
 * The fallback for incomplete tenant brand data. Greyscale, no logo, system
 * fonts, empty legal. Deliberately ugly: a grey document is a visible
 * "finish your brand card"; a document in another company's blue is a leak
 * nobody notices. Decided by Royce 2026-09-23.
 */
export const NEUTRAL_BRAND_KIT: Readonly<Omit<TenantBrandKit, 'tenant'>> = Object.freeze({
  kitVersion: BRAND_KIT_VERSION,
  palette: Object.freeze({ primary: '4B5563', deep: '374151', ice: 'F3F4F6', ink: '1F2937' }),
  logos: Object.freeze({}),
  fonts: Object.freeze({ heading: 'Arial', body: 'Arial', docBody: 'Arial' }),
  legal: Object.freeze({}),
  policy: Object.freeze({ flat: true as const }),
  complete: false,
})

/** Fonts that are safe as `docBody` — installed with every supported Office. */
export const DOC_BODY_SAFE_FONTS = ['Calibri', 'Aptos', 'Arial'] as const

const HEX6 = /^[0-9A-F]{6}$/

/** True for a bare, uppercase, 6-digit hex string (the storage form). */
export function isHex6(v: unknown): v is string {
  return typeof v === 'string' && HEX6.test(v)
}

/** Normalise "#3da8d8" / "3DA8D8" / " #3DA8D8 " → "3DA8D8"; null when not a 6-digit hex. */
export function toHex6(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/^#/, '').toUpperCase()
  if (/^[0-9A-F]{3}$/.test(s)) return s.split('').map((c) => c + c).join('')
  return HEX6.test(s) ? s : null
}

export type BrandKitValidation =
  | { ok: true; kit: TenantBrandKit }
  | { ok: false; missing: string[]; invalid: string[] }

function isLogoAsset(v: unknown, path: string, invalid: string[]): boolean {
  if (v === undefined) return true
  if (typeof v !== 'object' || v === null) { invalid.push(path); return false }
  const o = v as Record<string, unknown>
  let ok = true
  if (typeof o.url !== 'string' || o.url === '') { invalid.push(`${path}.url`); ok = false }
  for (const k of ['widthPx', 'heightPx'] as const) {
    if (typeof o[k] !== 'number' || !Number.isFinite(o[k]) || (o[k] as number) <= 0) { invalid.push(`${path}.${k}`); ok = false }
  }
  if (!['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'].includes(o.mime as string)) { invalid.push(`${path}.mime`); ok = false }
  return ok
}

/**
 * Dependency-free runtime check that an object is a valid TenantBrandKit.
 * Never throws. Use it on the RPC output, on the normaliser output in tests,
 * and on any kit that crosses a process boundary (JWT, cache, gateway).
 *
 *   missing — required keys that are absent / empty
 *   invalid — present keys with the wrong shape or value
 */
export function validateTenantBrandKit(input: unknown): BrandKitValidation {
  const missing: string[] = []
  const invalid: string[] = []
  const o = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>

  if (o.kitVersion !== BRAND_KIT_VERSION) invalid.push('kitVersion')

  const tenant = (typeof o.tenant === 'object' && o.tenant !== null ? o.tenant : {}) as Record<string, unknown>
  for (const k of ['id', 'slug', 'legalName', 'displayName'] as const) {
    const v = tenant[k]
    if (v === undefined || v === null || v === '') missing.push(`tenant.${k}`)
    else if (typeof v !== 'string') invalid.push(`tenant.${k}`)
  }

  const palette = (typeof o.palette === 'object' && o.palette !== null ? o.palette : {}) as Record<string, unknown>
  for (const k of ['primary', 'deep', 'ice', 'ink'] as const) {
    if (palette[k] === undefined || palette[k] === null || palette[k] === '') missing.push(`palette.${k}`)
    else if (!isHex6(palette[k])) invalid.push(`palette.${k}`)
  }
  if (palette.accent !== undefined && !isHex6(palette.accent)) invalid.push('palette.accent')

  const logos = (typeof o.logos === 'object' && o.logos !== null ? o.logos : null) as Record<string, unknown> | null
  if (!logos) missing.push('logos')
  else for (const k of ['light', 'dark', 'mark'] as const) isLogoAsset(logos[k], `logos.${k}`, invalid)

  const fonts = (typeof o.fonts === 'object' && o.fonts !== null ? o.fonts : {}) as Record<string, unknown>
  for (const k of ['heading', 'body', 'docBody'] as const) {
    if (fonts[k] === undefined || fonts[k] === null || fonts[k] === '') missing.push(`fonts.${k}`)
    else if (typeof fonts[k] !== 'string') invalid.push(`fonts.${k}`)
  }
  if (typeof fonts.docBody === 'string' && !(DOC_BODY_SAFE_FONTS as readonly string[]).includes(fonts.docBody)) invalid.push('fonts.docBody')

  const legal = (typeof o.legal === 'object' && o.legal !== null ? o.legal : null) as Record<string, unknown> | null
  if (!legal) missing.push('legal')
  else for (const k of ['abn', 'address', 'phone', 'email', 'web'] as const) {
    if (legal[k] !== undefined && legal[k] !== null && typeof legal[k] !== 'string') invalid.push(`legal.${k}`)
  }

  const policy = (typeof o.policy === 'object' && o.policy !== null ? o.policy : null) as Record<string, unknown> | null
  if (!policy || policy.flat !== true) invalid.push('policy.flat')

  if (typeof o.complete !== 'boolean') invalid.push('complete')

  if (missing.length === 0 && invalid.length === 0) return { ok: true, kit: input as TenantBrandKit }
  return { ok: false, missing, invalid }
}
