/**
 * WCAG 3.3.7 (Redundant Entry, AA) — sistematska provjera, ne pretpostavka.
 *
 * Normativni tekst: „Information previously entered by or provided to the user that is
 * required to be entered again in the same process is either: auto-populated, or available
 * for selection by the user." (Izuzeci: ponovni unos je neophodan, sigurnosni razlog, ili
 * je prethodni unos nevažeći.)
 *
 * MATRICA je tvrdila „redundant entry nije sistematski provjeren" i navodila kandidate
 * `workbook-new-entry`, `category-wizard-dialog`, forme. **Provjera je pokazala da su oba
 * navedena kandidata jednostranačne forme** — ime fajla `category-wizard-dialog.tsx`
 * zavodi, ali u njemu nema koraka. Ovaj test zaključava nalaz da se ne bi ponovo
 * „otkrivao" isti nepostojeći problem.
 *
 * Šta je stvarno nađeno (i da je u redu):
 *  - `workbook-detail-page` pita „uključi pauze?" (dugme), pa rezultat prenosi **preko
 *    URL-a** u `workbook-reschedule-preview`, koji svoj toggle **pred-popunjava** iz tog
 *    parametra. Pred-popunjavanje je upravo ono što 3.3.7 traži — nije prekršaj.
 *  - `PublicReserve` uopće **ne pita** kontakt podatke: ako `email`/`phone`/verifikacija
 *    nedostaju, preusmjerava na `/profil` (`PublicReserve.tsx:547`). Forma traži samo
 *    usluge, datum, termin i bilješke.
 *  - Onboarding pita tri **različite** stvari (lozinka, spol, email verifikacija), po jednu
 *    po stranici, svaku vezanu za svoj zastavicu.
 *
 * 🔴 Ograničenje: ovo je provjera **izvora**. Ne može dokazati da korisnik u stvarnom toku
 * ne vidi isto polje dvaput kroz neku putanju koju grep ne vidi (npr. preko keša ili
 * navigacije naprijed-nazad).
 */
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')
const read = (rel) => readFileSync(resolve(SRC, rel), 'utf8')

const wizard = read('features/finance/catalog/category-wizard-dialog.tsx')
const workbookNew = read('features/stylist-workbook/pages/workbook-new-entry-page.tsx')
const detailPage = read('features/stylist-workbook/pages/workbook-detail-page.tsx')
const reschedule = read('features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx')
const publicReserve = read('pages/public/PublicReserve.tsx')
const onboarding = read('utils/clientOnboarding.ts')

/** Indikator višekoračnog toka — isti popis za svaki fajl, da je provjera uporediva. */
const STEP_INDICATORS = [
  'currentStep',
  'activeStep',
  'setStep(',
  'nextStep(',
  'prevStep(',
  'goToStep(',
  'StepIndicator',
]

const nemaKoraka = (src, ime) => {
  for (const ind of STEP_INDICATORS) {
    assert.ok(!src.includes(ind), `${ime} sadrži '${ind}' — nije jednostranačna forma`)
  }
}

// ── 1. Kandidati iz matrice NISU višekoračni ──────────────────────────────────────

test('category-wizard-dialog je jedan dijalog, ne čarobnjak s koracima', () => {
  nemaKoraka(wizard, 'category-wizard-dialog')
  // Jedan `useState` za cijelu formu, jedan Save.
  assert.ok(wizard.includes('const [form, setForm] = useState(empty)'), 'očekivan jedan useState za formu')
  assert.equal(wizard.match(/handleSave/g)?.length, 2, 'očekivan tačno jedan handleSave (definicija + poziv)')
})

test('workbook-new-entry-page je jedna dugačka stranica, ne tok u koracima', () => {
  nemaKoraka(workbookNew, 'workbook-new-entry-page')
  // `useState(0)` ovdje postoji, ali NIJE brojač koraka — to je zamka za grep.
  assert.ok(workbookNew.includes('const [partialDiff, setPartialDiff] = useState(0)'))
  assert.ok(workbookNew.includes('const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0)'))
})

test('javna rezervacija: brojač koraka postoji, ali NE uslovljava sadržaj', () => {
  // `step` ovdje postoji (za razliku od dva kandidata iz matrice) — i to je u redu.
  assert.ok(publicReserve.includes('const [step, setStep] = useState(1)'), 'nema brojača koraka')
  assert.ok(publicReserve.includes('role="progressbar"'), 'brojač nije izložen kao progressbar')
  // Ključno: nijedna sekcija se NE gate-uje po `step`. Vidi se ono što je odabrano
  // (progresivno otkrivanje), pa nema „koraka" kroz koje se prolazi dvaput.
  assert.ok(!publicReserve.includes('step ==='), 'neki sadržaj se ipak gate-uje po step ===')
  // Sekcije se otkrivaju po ODABIRU, ne po brojaču:
  for (const uslov of ['selectedServices.length > 0 ?', 'selectedDate ?', 'selectedSlot ?']) {
    assert.ok(publicReserve.includes(uslov), `sekcija nije uslovljena sa '${uslov}'`)
  }
})

// ── 2. Ista informacija se ne traži dvaput na istoj stranici ──────────────────────

/** Izvlači `id="…"` i `id={…Id}` vrijednosti iz JSX-a. */
const poljeIdovi = (src) => {
  const out = []
  const re = /id=(?:"([^"]+)"|\{([A-Za-z0-9_]+)\})/g
  for (const m of src.matchAll(re)) out.push(m[1] ?? m[2])
  return out
}

test('nijedna forma ne renderuje dva polja s istim id-om (duplikat bi značio duplo pitanje)', () => {
  for (const [ime, src] of [
    ['workbook-new-entry-page', workbookNew],
    ['category-wizard-dialog', wizard],
    ['workbook-reschedule-preview', reschedule],
  ]) {
    const ids = poljeIdovi(src)
    assert.ok(ids.length > 0, `${ime}: nije nađen nijedan id — regex ne radi`)
    const duplikati = ids.filter((v, i) => ids.indexOf(v) !== i)
    assert.deepEqual(duplikati, [], `${ime}: duplicirani id-ovi ${duplikati.join(', ')}`)
  }
})

// ── 3. Reschedule tok: izbor se prenosi URL-om, ne pita se ponovo ─────────────────

test('izbor „uključi pauze" se prenosi URL parametrom s obje strane', () => {
  // Strana koja šalje
  assert.ok(detailPage.includes('reschedule-preview/'), 'detail page ne navigira na preview')
  for (const vrijednost of ['?includeBreaks=0', '?includeBreaks=1']) {
    assert.ok(detailPage.includes(vrijednost), `detail page ne nudi ${vrijednost}`)
  }
  // Strana koja prima — parametar se MORA zvati isto
  assert.ok(reschedule.includes("searchParams.get('includeBreaks')"), 'preview ne čita includeBreaks iz URL-a')
  // I MORA ga koristiti kao početnu vrijednost kontrole, ne kao mrtav podatak
  assert.ok(reschedule.includes('const [includeBreaks, setIncludeBreaks] = useState(initialIncludeBreaks)'))
  assert.ok(reschedule.includes('aria-checked={includeBreaks}'), 'toggle nije vezan na prenesenu vrijednost')
})

test('preostali ulazi preview stranice takođe imaju početne vrijednosti iz URL-a', () => {
  for (const [param, stanje] of [
    ['mode', 'initialMode'],
    ['manualShiftMinutes', 'initialManualShiftMinutes'],
  ]) {
    assert.ok(reschedule.includes(`searchParams.get('${param}')`), `preview ne čita '${param}'`)
    // Dozvoli i generički parametar: `useState<RescheduleMode>(initialMode)`
    const ima = reschedule.includes(`= useState(${stanje})`) ||
      reschedule.includes(`useState<RescheduleMode>(${stanje})`)
    assert.ok(ima, `${stanje} se ne koristi kao početno stanje`)
  }
})

// ── 4. Javna rezervacija ne traži kontakt koji već ima ────────────────────────────

test('PublicReserve preusmjerava na /profil umjesto da ponovo pita kontakt podatke', () => {
  const uslov = 'if (!user?.email || !user?.phone || !user?.isEmailVerified)'
  assert.ok(publicReserve.includes(uslov), 'nema provjere poznatih kontakt podataka')
  const at = publicReserve.indexOf(uslov)
  assert.ok(at > -1, 'guard nije nađen')
  const poslije = publicReserve.slice(at + uslov.length)
  const navigacija = poslije.indexOf("navigate('/profil'")
  const sljedeciIf = poslije.indexOf('if (')
  assert.ok(navigacija > -1, 'ne preusmjerava na /profil')
  assert.ok(navigacija < sljedeciIf, 'preusmjeravanje nije u OVOJ grani nego u nekoj kasnijoj')
  // Forma ne smije imati svoja polja za email/telefon — inače bi ih tražila dvaput.
  for (const zabranjeno of ['type="email"', 'type="tel"', 'name="phone"', 'name="email"']) {
    assert.ok(!publicReserve.includes(zabranjeno), `forma ipak pita ${zabranjeno}`)
  }
})

test('PublicReserve pred-popunjava uslugu iz URL parametra `serviceId`', () => {
  assert.ok(publicReserve.includes("searchParams.get('serviceId')"))
  assert.ok(publicReserve.includes('setSelectedServices([match])'), 'ne pred-popunjava odabir')
})

// ── 5. Onboarding pita tri različite stvari, ne istu triput ───────────────────────

test('svaki onboarding korak ima svoju zastavicu i svoju rutu (nema ponavljanja)', () => {
  const parovi = [
    ['mustChangePassword', '/force-change-password'],
    ['genderOnboardingCompleted', '/onboarding/gender'],
    ['isEmailVerified', '/onboarding/email'],
  ]
  for (const [zastavica, ruta] of parovi) {
    assert.ok(onboarding.includes(zastavica), `nedostaje zastavica ${zastavica}`)
    assert.ok(onboarding.includes(`'${ruta}'`), `nedostaje ruta ${ruta}`)
    // Ruta mora biti USLOVLJENA zastavicom, ne samo negdje pomenuta u fajlu
    // (`isEmailVerified` stoji i u deklaraciji tipa, pa sam `includes` ne dokazuje ništa).
    const uslov = onboarding.includes(`return '${ruta}'`) || onboarding.includes(`'${ruta}'`)
    assert.ok(uslov, `ruta ${ruta} nije nađena`)
    const atRute = onboarding.indexOf(`'${ruta}'`)
    const atZastavice = onboarding.lastIndexOf(zastavica, atRute)
    assert.ok(atZastavice > -1, `${zastavica} se ne pojavljuje PRIJE rute ${ruta}`)
    // Između zastavice i rute ne smije biti `return null` — to bi značilo da su odvojeni.
    const izmedu = onboarding.slice(atZastavice, atRute)
    assert.ok(!izmedu.includes('return null'), `${ruta} nije uslovljena sa ${zastavica}`)
  }
  // Tri različite rute — da je ista ruta dvaput, koraci bi se preklapali.
  const rute = parovi.map(([, r]) => r)
  assert.equal(new Set(rute).size, 3, 'onboarding rute nisu međusobno različite')
})
