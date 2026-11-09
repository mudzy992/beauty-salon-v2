import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const dir = new URL('.', import.meta.url)
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Faza 10 — Postavke: paralelna „smeđa“ hex paleta uklonjena iz features/settings.
//
// VAŽNO: ovo NIJE bio WCAG prekršaj. Izmjereni parovi su prolazili:
//   text-#49332d / bg-#fffaf6 = 11.29:1   (1.4.3 treba 4.5)
//   text-white  / bg-#49332d  = 11.70:1
//   text-#6e493c / bg-#f3e8df =  6.50:1
//   border-#9d735d            =  4.16:1   (1.4.11 treba 3.0)
//   ring-#9b735f              =  4.19:1   (1.4.11 treba 3.0)
// Razlog zamjene je konzistentnost identiteta: brand je #632238 (burgund),
// a ovaj modul je koristio zasebnu smeđu skalu koja se ne poklapa s njim.
// ---------------------------------------------------------------------------

const BROWN = /#(?:49332d|9d735d|9b735f|fffaf6|d9c4b5|f3e8df|6e493c|fffdfa|80553e)/gi

const sourceFiles = readdirSync(dir).filter(
  (f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.endsWith('.test.mjs'),
)

test('features/settings ne sadrži paralelnu smeđu hex paletu', () => {
  assert.ok(sourceFiles.length >= 10, `očekivano >=10 izvornih fajlova, nađeno ${sourceFiles.length}`)
  for (const f of sourceFiles) {
    const src = read(`./${f}`)
    const hits = src.match(BROWN) || []
    assert.deepEqual(hits, [], `${f}: smeđi hexovi ${hits.join(', ')}`)
  }
})

test('fokus ring koristi --focus-ring token, ne hardcoded hex (2.4.13)', () => {
  let rings = 0
  for (const f of sourceFiles) {
    const src = read(`./${f}`)
    rings += (src.match(/focus-visible:ring-focus-ring/g) || []).length
    assert.equal(/focus-visible:ring-\[#/.test(src), false, `${f}: hardcoded fokus ring`)
  }
  assert.equal(rings, 4, 'očekivana 4 fokus ringa (form, group-panel, module-page, shell)')
})

test('aktivno stanje navigacije koristi brand tokene', () => {
  // M2: navigacija je izdvojena iz settings-shell.tsx u settings-tab-nav.tsx
  const nav = read('./settings-tab-nav.tsx')
  assert.match(nav, /border-brand-rose-ring bg-nav-active/)
  assert.match(nav, /bg-brand-rose text-on-primary/)
  assert.match(nav, /isActive \? 'text-brand-rose-text' : 'text-slate-800'/)
  // nav mora imati ime; aria-current se postavlja eksplicitno jer <Link> ne
  // zna za ?tab= (NavLink gleda samo pathname)
  assert.match(nav, /<nav\s+aria-label=\{t\('adminSettings\.navigationLabel'\)\}/)
  assert.match(nav, /aria-current=\{isActive \? 'page' : undefined\}/)
})

test('D3: suffix postavke koristi --text-muted, ne slate-400 (1.4.3)', () => {
  // slate-400 (#94A3B8) na bijeloj = 2.56:1 → FAIL; content-muted = 5.61:1 → PASS.
  const display = read('./setting-editor-display.tsx')
  assert.match(display, /<span className="ml-1 text-content-muted">\{def\.suffix\}<\/span>/)
  assert.equal(/text-slate-400/.test(display), false, 'slate-400 se ne smije vratiti')
})

test('tokeni na koje se mapira zaista postoje u konfiguraciji', () => {
  const config = read('../../../tailwind.config.js')
  for (const token of ["'focus-ring'", "'nav-active'", "'on-primary'", "'control-border'",
    "muted: 'hsl(var(--surface-muted))'", "DEFAULT: 'hsl(var(--text))'"]) {
    assert.ok(config.includes(token), `tailwind.config.js: nedostaje token ${token}`)
  }
  const css = read('../../styles/globals.css')
  for (const v of ['--nav-active-bg', '--on-primary', '--focus-ring', '--brand-primary-ring']) {
    assert.ok(css.includes(v), `globals.css: nedostaje varijabla ${v}`)
  }
})
