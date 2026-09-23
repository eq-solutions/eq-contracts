const HANDOFF_REQUIRED_KEYS = ["tenant_id", "eq_role", "email"];
function validateHandoffClaims(input) {
  const missing = [];
  const invalid = [];
  const o = typeof input === "object" && input !== null ? input : {};
  for (const k of HANDOFF_REQUIRED_KEYS) {
    const v = o[k];
    if (v === void 0 || v === null || v === "") missing.push(k);
    else if (typeof v !== "string") invalid.push(k);
  }
  if (o.is_platform_admin !== void 0 && o.is_platform_admin !== null && typeof o.is_platform_admin !== "boolean") {
    invalid.push("is_platform_admin");
  }
  for (const k of ["tenant_slug", "name", "brand_color"]) {
    if (o[k] !== void 0 && o[k] !== null && typeof o[k] !== "string") invalid.push(k);
  }
  if (o.brand_logo_url !== void 0 && o.brand_logo_url !== null && typeof o.brand_logo_url !== "string") {
    invalid.push("brand_logo_url");
  }
  if (missing.length === 0 && invalid.length === 0) {
    return { ok: true, claims: input };
  }
  return { ok: false, missing, invalid };
}
export * from "./brand-kit.js";
export {
  HANDOFF_REQUIRED_KEYS,
  validateHandoffClaims
};
