/**
 * `test:theme-brand-precedence` — Q9 / NEJRA §10: dok je bilo koji Aurum skin
 * aktivan, runtime `theme_primary`/`theme_accent` override NE smije pisati inline
 * `--brand-*` na `<html>` (inline bi pobjedio CSS blok). `buildBrandColorVariables`
 * i `test:brand-colors` ostaju NETAKNUTI; mijenja se samo KADA se poziva.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const blankComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1)

const settingsContext = read('../../../context/SettingsContext.tsx')
const contextCode = blankComments(settingsContext)
const brandColors = read('../../../utils/brand-colors.mjs')
const providers = read('../../../app/providers.tsx')
const appearance = read('../../../pages/SettingsAppearance.tsx')
const packageJson = read('../../../../package.json')
const ciYml = read('../../../../../.github/workflows/ci.yml')
const bs = JSON.parse(read('../../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

test('SettingsContext čita skin i gasi override PRIJE pisanja --brand-*', () => {
  assert.match(contextCode, /import \{ useTheme \} from '\.\.\/features\/shell\/theme\/theme-context'/)
  assert.match(contextCode, /const \{ skin \} = useTheme\(\)/)
  assert.match(contextCode, /if \(skin !== 'classic'\)/, 'Q9 guard')
  // Guard se mora nalaziti PRIJE jedinog poziva buildBrandColorVariables.
  const guardAt = contextCode.indexOf("if (skin !== 'classic')")
  const builderAt = contextCode.indexOf('buildBrandColorVariables(settings.theme_primary')
  const setPropertyAt = contextCode.indexOf('root.style.setProperty(name, value)')
  assert.ok(guardAt > -1 && builderAt > guardAt, 'builder smije biti samo u classic grani')
  assert.ok(setPropertyAt > builderAt, 'setProperty ide nakon buildera')
  assert.match(contextCode, /brandNames\.forEach\(\(name\) => root\.style\.removeProperty\(name\)\)/)
  assert.match(contextCode, /name\.startsWith\('--brand-'\)/, 'uklanjaju se SVE inline brand varijable')
  assert.match(contextCode, /\}, \[settings, skin\]\)/, 'promjena skin-a mora ponovo pokrenuti efekat')
})

test('buildBrandColorVariables je netaknut: nema logike teme u čistoj funkciji', () => {
  assert.doesNotMatch(brandColors, /useTheme|data-skin|aurum|skin !==/)
  assert.match(brandColors, /export function buildBrandColorVariables\(primarySetting, accentSetting\)/)
  for (const key of [
    '--brand-primary', '--brand-accent', '--brand-primary-text-light',
    '--brand-primary-text-dark', '--brand-primary-ring', '--brand-accent-text-light',
    '--brand-accent-text-dark', '--brand-accent-ring',
  ]) {
    assert.ok(brandColors.includes(`"${key}"`), `izgubljen ključ ${key}`)
  }
  // Postojeći test i njegov CI korak ostaju (ugovor §4.2).
  assert.match(packageJson, /"test:brand-colors": "node --test src\/utils\/brand-colors\.test\.mjs"/)
  assert.match(ciYml, /npm run test:brand-colors/)
})

test('ThemeProvider je iznad SettingsProvider (useTheme mora biti dostupan)', () => {
  const theme = providers.indexOf('<ThemeProvider>')
  const settings = providers.indexOf('<SettingsProvider>')
  assert.ok(theme > -1 && settings > theme)
  assert.match(providers, /import \{ ThemeProvider \} from '\.\.\/features\/shell\/theme\/theme-context'/)
})

test('Q9 napomena je lokalizovana i vidljiva samo pod Aurumom', () => {
  const key = 'adminSettings.appearance.aurumNote'
  for (const locale of [bs, en]) {
    const value = resolveKey(locale, key)
    assert.ok(typeof value === 'string' && value.length > 20, `nedostaje ${key}`)
  }
  assert.match(appearance, /t\('adminSettings\.appearance\.aurumNote'\)/)
  assert.match(appearance, /skin !== 'classic' \?/)
  assert.match(appearance, /const \{ skin \} = useTheme\(\)/)
  assert.match(appearance, /data-aurum-note/, 'napomena mora biti prepoznatljiva u DOM-u')
})

test('mutacije precedencije se odbijaju (detektor nije prazna provjera)', () => {
  const guards = (src) => [
    src.includes("const { skin } = useTheme()"),
    src.includes("if (skin !== 'classic')"),
    src.indexOf("if (skin !== 'classic')") < src.indexOf('buildBrandColorVariables(settings.theme_primary'),
    src.includes("root.style.removeProperty(name)"),
    src.includes('}, [settings, skin])'),
  ].every(Boolean)
  assert.equal(guards(contextCode), true, 'izvorni kontekst mora zadovoljiti Q9')
  const mutations = [
    ["if (skin !== 'classic')", "if (skin === 'classic')"],
    ['}, [settings, skin])', '}, [settings])'],
    ["const { skin } = useTheme()", "const skin = 'classic'"],
    ['brandNames.forEach((name) => root.style.removeProperty(name))', '// uklonjeno'],
  ]
  for (const [from, to] of mutations) {
    assert.ok(contextCode.includes(from), `mutacija nije našla polazni tekst: ${from}`)
    assert.equal(guards(contextCode.replace(from, to)), false, `mutacija nije uhvaćena: ${from}`)
  }
})
