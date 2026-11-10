import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

/**
 * WCAG kriteriji čiji je dokaz **izvor**, ne render.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * Od 21 kriterija na 🟡 u `MATRIX.md`, za jedan dio nije potreban ni preglednik ni čitač
 * ekrana: kriterij je ispunjen ili prekršen **načinom na koji je kod napisan**. Npr. 3.2.1
 * (On focus) je prekršen ako `onFocus` pokreće navigaciju — to se vidi iz izvora i ne
 * ovisi o rasporedu.
 *
 * ── Šta ovo NE dokazuje (bez uljepšavanja) ───────────────────────────────────
 * Ovo su **provjere odsustva**: dokazuju da prekršajni obrazac ne postoji u `src`, ne i da
 * je ponašanje u pregledniku ispravno u svakom slučaju. Kriteriji koji traže raspored,
 * zumiranje ili AT (1.3.2, 1.4.4, 1.4.12, 2.1.1, 2.5.3, 3.3.1, 3.3.2, 3.3.3, 4.1.3)
 * **nisu** ovdje i ostaju 🟡.
 *
 * ⚠️ `test:reduced-motion` koji `MATRIX.md` navodi kao dokaz za 2.3.3 **nikad nije postojao**
 * (nije bio ni u `package.json` ni u `src`). Ovaj fajl ga zamjenjuje stvarnim testom.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry) && !/\.test\.|\.d\.ts$/.test(entry)) out.push(full)
  }
  return out
}

const SOURCES = walk(ROOT)

/** Izbacuje komentare da komentarisani kod ne broji kao nalaz. */
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1)
}

const CLEAN = new Map(SOURCES.map((f) => [relative(ROOT, f), blankComments(readFileSync(f, 'utf8'))]))

function filesMatching(re) {
  return [...CLEAN.entries()].filter(([, src]) => re.test(src)).map(([f]) => f)
}

/** Tijelo `onX={...}` izraza: prati zagrade, jer regex do prvog `}` ne vidi ugniježđene. */
function handlerBodies(src, prop) {
  const bodies = []
  const needle = `${prop}={`
  let at = src.indexOf(needle)
  while (at !== -1) {
    let depth = 0
    let i = at + needle.length - 1
    let end = i
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1
      else if (src[i] === '}') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    bodies.push(src.slice(at + needle.length, end))
    at = src.indexOf(needle, end + 1)
  }
  return bodies
}

// ── 1.3.3 Sensory characteristics ─────────────────────────────────────────────

test('1.3.3: nijedno uputstvo se ne oslanja samo na boju ili oblik', () => {
  const locales = ['bs', 'en'].map((l) =>
    JSON.parse(readFileSync(new URL(`../i18n/locales/${l}.json`, import.meta.url), 'utf8')),
  )
  const SENSORY = /\b(zelen|crven|plav|žut|sjajn|tamn|green|red|blue|yellow|bright|dark)\w*\b/i
  const ACTION = /\b(klikni|pritisni|odaberi|izaberi|tap|click|press|select|choose)\w*\b/i

  const hits = []
  const walkLocale = (node, path, lang) => {
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        walkLocale(value, path ? `${path}.${key}` : key, lang)
      }
    } else if (typeof node === 'string' && SENSORY.test(node) && ACTION.test(node)) {
      hits.push(`${lang}:${path} = ${node}`)
    }
  }
  locales.forEach((locale, i) => walkLocale(locale, '', ['bs', 'en'][i]))

  assert.deepEqual(hits, [], 'uputstvo smije koristiti boju samo uz tekstualnu oznaku')
})

// ── 1.3.4 Orientation ─────────────────────────────────────────────────────────

test('1.3.4: orijentacija nije zaključana i nijedan CSS je ne uslovljava', () => {
  assert.deepEqual(filesMatching(/screen\.orientation|orientation\.lock\s*\(/), [], 'nema zaključavanja orijentacije')

  const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8')
  const orientationBlocks = css.match(/@media[^{]*orientation[^{]*\{[\s\S]*?\n\}/g) ?? []
  for (const block of orientationBlocks) {
    assert.equal(/display:\s*none/.test(block), false, `orijentacija ne smije kriti sadržaj: ${block.slice(0, 80)}`)
  }
})

// ── 2.3.1 Three flashes ───────────────────────────────────────────────────────

test('2.3.1: nijedna animacija se ne ponavlja beskonačno (nema bljeskanja)', () => {
  const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8')
  const infinite = (css.match(/animation[^;]*\binfinite\b/g) ?? [])
  assert.deepEqual(infinite, [], 'beskonačna animacija može bljeskati >3×/s')

  // Svaka `animation:` deklaracija mora imati konačan broj ponavljanja.
  const declarations = css.match(/animation:\s*[^;]+;/g) ?? []
  assert.ok(declarations.length >= 1, 'očekivane su animacije (app-logo)')
  for (const decl of declarations) {
    assert.equal(/\binfinite\b/.test(decl), false, decl)
  }
})

// ── 2.3.3 + 2.5.4 Motion ──────────────────────────────────────────────────────

test('2.3.3 / 2.5.4: prefers-reduced-motion je GLOBALAN, ne samo za logo', () => {
  const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8')
  // Blok mora gađati sve elemente, ne jedan klasni selektor.
  const globalBlock = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?\}/.exec(
    css,
  )
  assert.ok(globalBlock, 'nedostaje globalni prefers-reduced-motion blok nad *, *::before, *::after')

  const body = globalBlock[0]
  for (const prop of ['animation-duration', 'animation-iteration-count', 'transition-duration']) {
    assert.ok(body.includes(prop), `globalni blok ne pokriva ${prop}`)
  }
  assert.ok((body.match(/!important/g) ?? []).length >= 3, 'bez !important komponentne stilove bi nadjačale')

  // 2.5.4 (AA): motion koji pokreće interakcija mora biti isključiv. CSS blok iznad NE doseže
  // framer-motion (on animira preko JS-a), a koristi ga 9 fajlova s 26 animacija — MATRIX
  // tvrdnja „framer-motion se ne koristi u dashboardu (potvrđeno grep-om)" bila je NETAČNA.
  // Zato se traži MotionConfig s reducedMotion="user" na korijenu provajdera.
  const providers = readFileSync(new URL('../app/providers.tsx', import.meta.url), 'utf8')
  assert.match(providers, /<MotionConfig reducedMotion="user">/, 'framer-motion mora poštovati postavku sistema')

  // Provjera nije prazna: framer-motion se stvarno koristi, pa MotionConfig nije dekoracija.
  const usingFramer = filesMatching(/from ['"]framer-motion['"]/)
  assert.ok(usingFramer.length >= 5, `samo ${usingFramer.length} fajlova koristi framer-motion — očekivano 9`)
})

// ── 2.4.5 Multiple ways ───────────────────────────────────────────────────────

test('2.4.5: postoje barem dva nezavisna načina navigacije', () => {
  const navs = filesMatching(/<nav[\s>]/)
  assert.ok(navs.length >= 2, `nađen samo ${navs.length} <nav> — treba najmanje dva mehanizma`)

  // Drugi mehanizam: pretraga koja vodi do iste destinacije.
  const search = filesMatching(/type=["']search["']|role=["']search["']|adminSettings\.search/)
  assert.ok(search.length >= 1, 'nema pretrage kao drugog načina dolaska do stranice')
})

// ── 2.5.1 Pointer gestures ────────────────────────────────────────────────────

test('2.5.1: gest prevlačenja ima tastaturnu alternativu', () => {
  const slider = readFileSync(new URL('../components/BeforeAfterSlider.tsx', import.meta.url), 'utf8')
  assert.match(slider, /role="slider"/)
  assert.match(slider, /tabIndex=\{0\}/)
  assert.match(slider, /onKeyDown=/)
  for (const attr of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']) {
    assert.ok(slider.includes(attr), `slideru nedostaje ${attr}`)
  }
})

// ── 2.5.2 Pointer cancellation ────────────────────────────────────────────────

test('2.5.2: nijedan onMouseDown ne aktivira akciju (aktivacija je na click/keyup)', () => {
  const ACTIVATION = /navigate\(|\.mutate\(|\.submit\(|router\.push|window\.location/
  const offenders = []
  for (const [file, src] of CLEAN) {
    for (const body of handlerBodies(src, 'onMouseDown')) {
      if (ACTIVATION.test(body)) offenders.push(`${file}: ${body.slice(0, 90)}`)
    }
  }
  assert.deepEqual(offenders, [], 'otkazivanje mora biti moguće prije dizanja prsta')
})

// ── 3.2.1 On focus ────────────────────────────────────────────────────────────

test('3.2.1: fokus ne mijenja kontekst — onFocus samo otvara padajuću listu', () => {
  const CONTEXT_CHANGE = /navigate\(|\.mutate\(|\.submit\(|router\.push|window\.location|setView\(|setTab\(/
  const offenders = []
  let checked = 0
  for (const [file, src] of CLEAN) {
    for (const body of handlerBodies(src, 'onFocus')) {
      checked += 1
      if (CONTEXT_CHANGE.test(body)) offenders.push(`${file}: ${body.slice(0, 90)}`)
    }
  }
  assert.ok(checked >= 5, `provjereno samo ${checked} onFocus handlera — očekivano barem 5`)
  assert.deepEqual(offenders, [])
})

// ── 3.2.2 On input ────────────────────────────────────────────────────────────

test('3.2.2: unos ne mijenja kontekst — onChange ne navigira ni ne šalje formu', () => {
  const CONTEXT_CHANGE = /navigate\(|\.mutate\(|\.submit\(|router\.push|window\.location/
  const offenders = []
  let checked = 0
  for (const [file, src] of CLEAN) {
    for (const body of handlerBodies(src, 'onChange')) {
      checked += 1
      if (CONTEXT_CHANGE.test(body)) offenders.push(`${file}: ${body.slice(0, 90)}`)
    }
  }
  assert.ok(checked >= 20, `provjereno samo ${checked} onChange handlera — očekivano barem 20`)
  assert.deepEqual(offenders, [])
})

// ── 3.3.8 Accessible Authentication (Minimum) ─────────────────────────────────

test('3.3.8: kredencijalna polja imaju autocomplete tokene (password manager radi)', () => {
  const login = readFileSync(new URL('../pages/Login.tsx', import.meta.url), 'utf8')
  assert.match(login, /autoComplete="username"/)
  assert.match(login, /autoComplete="current-password"/)

  const register = readFileSync(new URL('../pages/Register.tsx', import.meta.url), 'utf8')
  assert.match(register, /autoComplete="new-password"/)

  // `autoComplete="off"` je dozvoljen samo na poljima koja NISU kredencijalna.
  const off = filesMatching(/autoComplete="off"/)
  for (const file of off) {
    assert.equal(
      /pages\/(Login|Register)\.tsx$/.test(file),
      false,
      `${file} je auth forma i ne smije gasiti autocomplete`,
    )
  }
})

test('3.3.8: nalijepljeni tekst se PRIHVATA, ne odbacuje (kognitivni test)', () => {
  const otp = readFileSync(new URL('../components/ui/otp-input.tsx', import.meta.url), 'utf8')
  const paste = /const handlePaste[\s\S]*?\n  \}/.exec(otp)
  assert.ok(paste, 'otp-input nema handlePaste')
  // `e.preventDefault()` je u redu SAMO zato što se vrijednost odmah primijeni preko onChange.
  assert.match(paste[0], /clipboardData\.getData\('text'\)/)
  assert.match(paste[0], /onChange\(pasted\)/)

  // Nijedno polje ne smije blokirati paste bez primjene vrijednosti.
  const blockers = []
  for (const [file, src] of CLEAN) {
    for (const body of handlerBodies(src, 'onPaste')) {
      if (/preventDefault\(\)/.test(body) && !/onChange\(|setValue\(|set[A-Z]/.test(body)) {
        blockers.push(`${file}: ${body.slice(0, 90)}`)
      }
    }
  }
  assert.deepEqual(blockers, [], 'paste koji odbacuje tekst je kognitivni test po WCAG 2.2')
})

// ── 1.4.5 Images of text ──────────────────────────────────────────────────────

test('1.4.5: tekst se ne renderuje kao slika — logo je SVG komponenta', () => {
  // U cijelom `src` postoje samo dva `<img>`: avatar i generički medij (fotografije rada).
  // Naslovi i logo su SVG komponente, pa se tekst može mijenjati bojama i fontom korisnika.
  // Broje se POJAVLJIVANJA, ne fajlovi: mutacija koja doda drugi `<img>` u postojeći fajl
  // inače ne bi bila uhvaćena (izmjereno — prva verzija ovog testa ju je propustila).
  const occurrences = []
  for (const [file, src] of CLEAN) {
    const count = (src.match(/<img[\s>]/g) ?? []).length
    if (count > 0) occurrences.push({ file, count })
  }
  const total = occurrences.reduce((sum, o) => sum + o.count, 0)
  // IZMJERENO: u cijelom `src` postoji **jedan** `<img>` (`components/media-image.tsx`).
  // `ui/avatar.tsx` ga spominje samo u komentaru, a `blankComments` ga zato i ne broji.
  // Prag je 1, ne 2: s pragom 2 mutacija koja doda drugi `<img>` u postojeći fajl prolazi
  // neuhvaćena (izmjereno — prve dvije verzije ovog testa su je propustile).
  assert.equal(total, 1, `očekivan tačno 1 <img>, nađeno ${total}: ${JSON.stringify(occurrences)}`)
  assert.deepEqual(occurrences.map((o) => o.file), ['components/media-image.tsx'])

  const logo = filesMatching(/AppLogo|UploadedBrandLogo/)
  assert.ok(logo.length >= 2, 'logo mora biti komponenta, ne slika s tekstom')
})

// ── 4.1.3 Status messages — namjerno NIJE zatvoren ────────────────────────────

test('4.1.3: mjerenje stanja, ne tvrdnja o usklađenosti', () => {
  // Izmjereno, da sljedeći korak ne polazi od nule: sonner 2.0.8 ima **jedan** `aria-live:
  // "polite"`, a u `src` je 95 `role="status"`/`aria-live`. To NIJE dovoljno za ✅ — nije
  // dokazano da svaka statusna poruka prolazi kroz live region, pa kriterij ostaje 🟡.
  const live = filesMatching(/role="status"|aria-live=/)
  assert.ok(live.length >= 20, `samo ${live.length} fajlova s live regionom — očekivano ≥20`)
})
