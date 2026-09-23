import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateTenantBrandKit, NEUTRAL_BRAND_KIT, toHex6, isHex6, BRAND_KIT_VERSION, DOC_BODY_SAFE_FONTS } from '../brand-kit.js'

// Synthetic tenant. Deliberately not any real tenant's values.
const complete = {
  kitVersion: 1,
  tenant: { id: '00000000-0000-0000-0000-000000000001', slug: 'acme', legalName: 'Acme Pty Ltd', displayName: 'Acme' },
  palette: { primary: '112233', deep: '445566', ice: 'EEF2F7', ink: '101820', accent: 'AA3366' },
  logos: { light: { url: 'https://example.test/l.png', widthPx: 2000, heightPx: 723, mime: 'image/png' } },
  fonts: { heading: 'Roboto', body: 'Roboto', docBody: 'Calibri' },
  legal: { abn: '11 111 111 111', address: '1 Test St', phone: '02 0000 0000' },
  policy: { flat: true },
  complete: true,
}

test('complete kit validates', () => {
  assert.equal(validateTenantBrandKit(complete).ok, true)
})

test('neutral kit plus a tenant validates and is marked incomplete', () => {
  const r = validateTenantBrandKit({ ...NEUTRAL_BRAND_KIT, tenant: complete.tenant })
  assert.equal(r.ok, true)
  assert.equal(NEUTRAL_BRAND_KIT.complete, false)
  assert.equal(NEUTRAL_BRAND_KIT.kitVersion, BRAND_KIT_VERSION)
})

test('neutral kit is frozen, greyscale, logo-less', () => {
  assert.ok(Object.isFrozen(NEUTRAL_BRAND_KIT))
  for (const hex of Object.values(NEUTRAL_BRAND_KIT.palette)) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 40, `${hex} is not neutral`)
  }
  assert.deepEqual(NEUTRAL_BRAND_KIT.logos, {})
})

test('missing and invalid are reported by path', () => {
  const r = validateTenantBrandKit({
    ...complete,
    palette: { primary: '#3DA8D8', deep: '445566', ice: 'EEF2F7' },
    fonts: { ...complete.fonts, docBody: 'Plus Jakarta Sans' },
  })
  assert.equal(r.ok, false)
  assert.deepEqual(r.missing, ['palette.ink'])
  assert.deepEqual(r.invalid, ['palette.primary', 'fonts.docBody'])
})

test('logo assets need measured dimensions and a known mime', () => {
  const r = validateTenantBrandKit({ ...complete, logos: { light: { url: 'x', widthPx: 0, heightPx: 10, mime: 'image/gif' } } })
  assert.equal(r.ok, false)
  assert.deepEqual(r.invalid, ['logos.light.widthPx', 'logos.light.mime'])
})

test('hex helpers', () => {
  assert.equal(toHex6('#3da8d8'), '3DA8D8')
  assert.equal(toHex6(' 3DA8D8 '), '3DA8D8')
  assert.equal(toHex6('#abc'), 'AABBCC')
  assert.equal(toHex6('3DA8D'), null)
  assert.equal(toHex6(null), null)
  assert.equal(isHex6('3da8d8'), false)
})

test('JSON Schema mirrors the TS contract', () => {
  const schema = JSON.parse(readFileSync(new URL('../brand-kit.schema.json', import.meta.url), 'utf8'))
  assert.deepEqual([...schema.required].sort(), Object.keys(complete).sort())
  assert.deepEqual(schema.properties.fonts.properties.docBody.enum, [...DOC_BODY_SAFE_FONTS])
  assert.equal(schema.properties.kitVersion.const, BRAND_KIT_VERSION)
  assert.deepEqual(Object.keys(schema.properties.palette.properties).sort(), ['accent', 'deep', 'ice', 'ink', 'primary'])
  assert.deepEqual(Object.keys(schema.$defs.logoAsset.properties).sort(), ['heightPx', 'mime', 'url', 'widthPx'])
})
