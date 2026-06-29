/**
 * @eq-solutions/contracts — Shell→Service login-handoff JWT contract.
 *
 * The `app_metadata` claims that eq-shell MINTS (token-exchange, aud=service)
 * and eq-service CONSUMES (/api/shell-auth → ServiceJwtClaims). This is the
 * single source of truth: importing the type in both repos makes `tsc` fail on
 * either side the moment the shape drifts, and validateHandoffClaims() enforces
 * the same contract at runtime — on the mint side before signing, and on the
 * consume side after verifying the signature.
 *
 * Scope: ONLY the claims the Service handoff guarantees. eq-shell may carry
 * mint-only fields (source_app, extra_perms — provenance / Field-only) by
 * extending this type; they are intentionally NOT part of the Service contract.
 */

/** Required + optional app_metadata claims for a valid Shell→Service handoff. */
export interface ShellHandoffClaims {
  /** Canonical tenant UUID. RLS keys on this. Required. */
  tenant_id: string
  /**
   * Canonical EQ role (manager | supervisor | employee | apprentice | labour_hire).
   * Typed as string to keep this package dependency-free; the authority for the
   * enum is @eq-solutions/roles. Required — eq-service derives isAdmin/analytics
   * from it, and hasJwtSession gates on it.
   */
  eq_role: string
  /** User email — eq-service's identity for the session. Required. */
  email: string
  /** Platform-admin override. Optional; absent ⇒ false. */
  is_platform_admin?: boolean
  /** Human-readable tenant slug (e.g. 'sks'); eq-service maps it to its tenant row. */
  tenant_slug?: string
  /** Display name, for greetings. Not a security field. */
  name?: string
  /** Tenant brand colour (hex). eq-service renders chrome from it. */
  brand_color?: string
  /** Tenant brand logo URL, or null. */
  brand_logo_url?: string | null
}

/** The claim keys a Service handoff REQUIRES. Drift/absence here breaks login. */
export const HANDOFF_REQUIRED_KEYS = ['tenant_id', 'eq_role', 'email'] as const

export type HandoffValidation =
  | { ok: true; claims: ShellHandoffClaims }
  | { ok: false; missing: string[]; invalid: string[] }

/**
 * Dependency-free runtime check that an object satisfies the handoff contract.
 * Call on the mint side before signing (guarantee you emit a valid token) and on
 * the consume side after verifying the signature (guarantee you got what you
 * expect). Never throws.
 *
 *   missing  — required keys that are absent/empty
 *   invalid  — present keys of the wrong primitive type
 *   ok ⇒ both empty.
 */
export function validateHandoffClaims(input: unknown): HandoffValidation {
  const missing: string[] = []
  const invalid: string[] = []
  const o = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>

  for (const k of HANDOFF_REQUIRED_KEYS) {
    const v = o[k]
    if (v === undefined || v === null || v === '') missing.push(k)
    else if (typeof v !== 'string') invalid.push(k)
  }

  // Optional fields: type-check only when present.
  if (o.is_platform_admin !== undefined && o.is_platform_admin !== null && typeof o.is_platform_admin !== 'boolean') {
    invalid.push('is_platform_admin')
  }
  for (const k of ['tenant_slug', 'name', 'brand_color'] as const) {
    if (o[k] !== undefined && o[k] !== null && typeof o[k] !== 'string') invalid.push(k)
  }
  if (o.brand_logo_url !== undefined && o.brand_logo_url !== null && typeof o.brand_logo_url !== 'string') {
    invalid.push('brand_logo_url')
  }

  if (missing.length === 0 && invalid.length === 0) {
    return { ok: true, claims: input as ShellHandoffClaims }
  }
  return { ok: false, missing, invalid }
}
