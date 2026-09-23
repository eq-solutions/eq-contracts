const BRAND_KIT_VERSION = 1;
const NEUTRAL_BRAND_KIT = Object.freeze({
  kitVersion: BRAND_KIT_VERSION,
  palette: Object.freeze({ primary: "4B5563", deep: "374151", ice: "F3F4F6", ink: "1F2937" }),
  logos: Object.freeze({}),
  fonts: Object.freeze({ heading: "Arial", body: "Arial", docBody: "Arial" }),
  legal: Object.freeze({}),
  policy: Object.freeze({ flat: true }),
  complete: false
});
const DOC_BODY_SAFE_FONTS = ["Calibri", "Aptos", "Arial"];
const HEX6 = /^[0-9A-F]{6}$/;
function isHex6(v) {
  return typeof v === "string" && HEX6.test(v);
}
function toHex6(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/^#/, "").toUpperCase();
  if (/^[0-9A-F]{3}$/.test(s)) return s.split("").map((c) => c + c).join("");
  return HEX6.test(s) ? s : null;
}
function isLogoAsset(v, path, invalid) {
  if (v === void 0) return true;
  if (typeof v !== "object" || v === null) {
    invalid.push(path);
    return false;
  }
  const o = v;
  let ok = true;
  if (typeof o.url !== "string" || o.url === "") {
    invalid.push(`${path}.url`);
    ok = false;
  }
  for (const k of ["widthPx", "heightPx"]) {
    if (typeof o[k] !== "number" || !Number.isFinite(o[k]) || o[k] <= 0) {
      invalid.push(`${path}.${k}`);
      ok = false;
    }
  }
  if (!["image/png", "image/svg+xml", "image/webp", "image/jpeg"].includes(o.mime)) {
    invalid.push(`${path}.mime`);
    ok = false;
  }
  return ok;
}
function validateTenantBrandKit(input) {
  const missing = [];
  const invalid = [];
  const o = typeof input === "object" && input !== null ? input : {};
  if (o.kitVersion !== BRAND_KIT_VERSION) invalid.push("kitVersion");
  const tenant = typeof o.tenant === "object" && o.tenant !== null ? o.tenant : {};
  for (const k of ["id", "slug", "legalName", "displayName"]) {
    const v = tenant[k];
    if (v === void 0 || v === null || v === "") missing.push(`tenant.${k}`);
    else if (typeof v !== "string") invalid.push(`tenant.${k}`);
  }
  const palette = typeof o.palette === "object" && o.palette !== null ? o.palette : {};
  for (const k of ["primary", "deep", "ice", "ink"]) {
    if (palette[k] === void 0 || palette[k] === null || palette[k] === "") missing.push(`palette.${k}`);
    else if (!isHex6(palette[k])) invalid.push(`palette.${k}`);
  }
  if (palette.accent !== void 0 && !isHex6(palette.accent)) invalid.push("palette.accent");
  const logos = typeof o.logos === "object" && o.logos !== null ? o.logos : null;
  if (!logos) missing.push("logos");
  else for (const k of ["light", "dark", "mark"]) isLogoAsset(logos[k], `logos.${k}`, invalid);
  const fonts = typeof o.fonts === "object" && o.fonts !== null ? o.fonts : {};
  for (const k of ["heading", "body", "docBody"]) {
    if (fonts[k] === void 0 || fonts[k] === null || fonts[k] === "") missing.push(`fonts.${k}`);
    else if (typeof fonts[k] !== "string") invalid.push(`fonts.${k}`);
  }
  if (typeof fonts.docBody === "string" && !DOC_BODY_SAFE_FONTS.includes(fonts.docBody)) invalid.push("fonts.docBody");
  const legal = typeof o.legal === "object" && o.legal !== null ? o.legal : null;
  if (!legal) missing.push("legal");
  else for (const k of ["abn", "address", "phone", "email", "web"]) {
    if (legal[k] !== void 0 && legal[k] !== null && typeof legal[k] !== "string") invalid.push(`legal.${k}`);
  }
  const policy = typeof o.policy === "object" && o.policy !== null ? o.policy : null;
  if (!policy || policy.flat !== true) invalid.push("policy.flat");
  if (typeof o.complete !== "boolean") invalid.push("complete");
  if (missing.length === 0 && invalid.length === 0) return { ok: true, kit: input };
  return { ok: false, missing, invalid };
}
export {
  BRAND_KIT_VERSION,
  DOC_BODY_SAFE_FONTS,
  NEUTRAL_BRAND_KIT,
  isHex6,
  toHex6,
  validateTenantBrandKit
};
