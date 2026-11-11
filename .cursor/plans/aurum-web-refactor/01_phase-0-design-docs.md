# S0 — Dizajn dokumenti + popravka CI baselinea

**Status:** ✅ **S0 implementiran i lokalno provjeren (199/199); čeka se zeleni CI run na grani.** Plan je odobren odlukom `approve_s0` · **Tip:** isključivo dokumenti + jedan novi source-contract test + registracija tog testa u CI · **Bez produkcijskog UI koda.**

---

## 1. Cilj i zašto

1. **Unaprijediti referentni dizajn (Q1, Q7):** `docs/design/NEJRA – beauty salon · Referentni dokument.html` dograditi od 8-sekcijskog ilustrativnog pregleda u **punu, živu specifikaciju** koja postaje **jedini izvor istine** za cijeli refaktor.
2. **Kreirati v2/v3 (Q5, Q7, Q11):** dva nova, samostalna, ilustrovana vizuelna koncepta. Ona **nisu specifikacija**; služe za odabir vizuelnog pravca i zadovoljavaju već postojeći `test:design-reference` ugovor.
3. **Popraviti baseline CI (izmjeren kvar):** `frontend/scripts/design-reference.test.mjs` čita dva fajla koja ne postoje na ovoj grani → 197/198 testova prolazi, CI je crven. S0 prvim pushom mora dati **5/5 zelenih poslova**.

---

## 2. Ulaz (šta mora biti gotovo)

- Odobren `00_overview.md` (Kapija 0).
- Grana `arena/71be6ba3-beauty-salon-v2`, čist working tree osim plan-dokumenata.
- Poznat tačan ugovor `frontend/scripts/design-reference.test.mjs` (pročitan, vidi §4).
- Poznat baseline: 197 PASS / 1 FAIL; sve Python provjere zelene; build 276,9/300 KiB.

---

## 3. Fajlovi — tačan spisak (nijedan više)

| Fajl | Akcija | Napomena |
|---|---|---|
| `docs/design/NEJRA – beauty salon · Referentni dokument.html` | **IZMJENA** (ime fajla se NE mijenja) | dogradnja §01–§08 → §01–§14; zadržati sve postojeće interaktivne demo-e i CSS tokene |
| `docs/design/referentni-prijedlog-v2.html` | **NOVO** | samostalan koncept V2 |
| `docs/design/referentni-prijedlog-v3.html` | **NOVO** | samostalan koncept V3 |
| `frontend/scripts/design-spec.test.mjs` | **NOVO** | `node --test`, JSDOM; čuva ugovor pune specifikacije |
| `frontend/package.json` | **IZMJENA** | dodaje `test:design-spec` (1 nova skripta) |
| `.github/workflows/ci.yml` | **IZMJENA** | 1 novi korak u `frontend` poslu, odmah uz „Test standalone design references" (linija ~601) |
| `.cursor/plans/aurum-web-refactor/CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md` | **IZMJENA** | evidencija segmenta |
| `.cursor/docs/matrices/aurum-theme/`, `aurum-route-coverage/` | **IZMJENA** | status matrica nakon S0 (još 🟡) |

**Privremeni fajlovi (NE commit-aju se):** 4 generisane JPEG ilustracije; ugrađuju se kao base64 u HTML i brišu s diska prije `git add`. `docs/design/` ostaje bez zasebnog `assets/` foldera.

---

## 4. Ugovor dokumenata (izmjeren iz testova, ne izmišljen)

### 4.1 `design-reference.test.mjs` — obavezan za **oba** nova HTML-a

Za svaki `V{2,3}` (`frontend/scripts/design-reference.test.mjs`):

- `<html lang="bs">`; `<title>` sadrži `V2` odn. `V3`.
- Postoje ID-jevi: `identitet`, `komponente`, `dashboard`, `stylist`, `klijent`, `public`, `pokrivenost`.
- **Svaki** `<a href>` počinje s `#` i ciljni ID postoji u dokumentu (nema vanjskih linkova).
- **Svaki** `<img src>` je `data:image/jpeg;base64,…` i ima neprazan `alt`; **≥2** `<img>` po dokumentu.
- `0` elemenata `<script src>` i `<link rel="stylesheet">` (sve ugrađeno).
- **≥15** elemenata s klasom `.demo` (ilustracije ekrana uloga i javnih stranica).
- `document.body.textContent` sadrži tačan string **`AI ilustracije`**.
- `#light` na početku ima `aria-pressed="true"`; klik na `#dark` → `document.body.classList.contains('dark')` + `dark aria-pressed="true"` + `light aria-pressed="false"`; klik na `#light` → skida `dark` i vraća pressed stanja.
- U `<script>` se **tačno jednom** pojavljuju stringovi `document.body.classList.toggle("dark",isDark)` i `dark.setAttribute("aria-pressed",String(isDark))`; mutacijski test ih zamjenjuje s `void 0` i očekuje da `verifyTheme` **padne**. Dakle oba stringa su funkcionalno obavezna, ne ukras.

### 4.2 `design-spec.test.mjs` — novi ugovor za NEJRA specifikaciju

Provjerava (JSDOM, bez vanjskih resursa): `lang="bs"`, `title`, postojanje svih 14 sekcija, tabelu tokena za **3 stanja** (classic light / aurum light / aurum dark) s izračunatim omjerima, mapu 58 deklaracija ruta, katalog šablona, odjeljak o 3-state izborniku, odjeljak o paritetu i CI matrici, te da su svi interni linkovi ispravni. Sadrži **mutacijske provjere** (uklanjanje ključne sekcije / token reda mora pasti), u stilu postojećih `*-accessibility.test.mjs` testova. Registruje se kao `test:design-spec` + CI korak → `check_ci_index.py` ostaje zelen.

---

## 5. Koraci (redoslijed)

**A. NEJRA — puna specifikacija (SSOT).** Zadržati §01–§08 (urednički zaključak, brend, tokeni s live WCAG računicom, katalog komponenti, admin iskustvo s filterima, uloge, javno iskustvo, smjernice + lista odobravanja) i dodati:

- **§09 Mapa ekrana (58 deklaracija):** za svaku grupu (javne 14 / auth-izuzeci 8 / admin 24 / stylist 12) tabela `ruta → ekran → namjena → izvor podataka → stanja (loading/empty/error/success) → responzivni prijelom → a11y ugovor → i18n ključevi → vlasništvo segmenta S2–S10`. Bez izmišljanja podataka: izvori su `app/router.tsx`, `public.routes.tsx`, `admin.routes.tsx` i `docs/audit/UX_UI_ROUTE_INVENTORY.md`.
- **§10 Tokeni za 3 stanja:** `Klasična svijetla` (današnji `#632238` / `#D4A843`, default), `Aurum svijetla` i `Aurum tamna` (paleta iz izvornog dokumenta: `#FAF6EF`, `#0E0B08`, `#7A5A12` / `#D4AF6A`, `#9B3D4F` / `#E8A89A`, itd.). Za **svaki** semantički par live izračun omjera po WCAG 2.2 formuli (već postoji u dokumentu), cilj 4,5:1 za tekst / 3:1 za UI, status „Prolazi/Pada" + tačka + tekst (nikad samo boja). Eksplicitno navesti **precedenciju Q9**: Aurum fiksira paletu, runtime `theme_primary`/`theme_accent` override je neaktivan dok je Aurum odabran.
- **§11 Dizajn sistem / šabloni:** `PageHeader`, `StatCard`, `FilterBar`, `DataTable` (caption, `aria-sort`, jedinstvena imena akcija, kartice ispod 640 px), `StatusBadge` (tekst + ikona + boja), `EmptyState` / `ErrorState` (retry) / `LoadingState`, `ConfirmDialog`, `Toast` (`role="status"`), `FormSection`, `ThemeSwitcher` (3 stanja, `aria-pressed`, vidljiv fokus, 44 px meta). Za svaki: markup ugovor, minimalna ciljna površina, fokus, greška uz polje, `prefers-reduced-motion`, `forced-colors`.
- **§12 Izbornik teme:** 3 opcije (Q8), default, pamćenje (`localStorage`), gdje se pojavljuje (javni header, admin header, stylist header, auth/onboarding kartice, fullscreen kalendar), `<html lang>` prati i18n, `<meta name="theme-color">` po stanju, napomena u Postavke → Izgled (Q9).
- **§13 Paritet + verifikacija:** nepregovarajući ugovor iz `00_overview.md` §6 + CI matrica §9 + legenda ✅/🟡/❌/➖.
- **§14 Kontrolna lista i odobrenje:** proširiti postojeću `#dec` listu novim stavkama; zadržati gumb „Odobravam pravac".

**B. AI ilustracije (Q11).** `generate_image` → 4 JPEG-a (2 po konceptu: npr. ambijent salona u „zlatnom satu" i detalj usluge). Ugraditi kao `data:image/jpeg;base64,`; `alt` na bosanskom; uz svaku napomenu „AI ilustracije". **Bez ponude opcija** (riječ je o assetima unutar dokumenta, ne o zasebnom deliverableu). Privremeni fajlovi se brišu.

**C. V2 / V3 koncepti.** Dva **različita** pravca (npr. V2 = svijetli, galerijski, editorski; V3 = tamni, filmski), oba unutar Aurum Noir identiteta. Svaki ima 7 obaveznih sekcija (§4.1), ≥15 `.demo` ekrana javnih/uloga/dashboarda, live `light/dark` prekidač s točnim JS stringovima, interne anchor linkove, ugrađene ilustracije i **eksplicitnu rečenicu** da je `NEJRA – …html` jedini izvor istine za implementaciju, a ovaj dokument vizuelni koncept (ne specifikacija). Nema novih funkcionalnosti ni tvrdnji o podacima.

**D. Registracija novog testa.** `test:design-spec` u `frontend/package.json` + jedan `npm run test:design-spec` korak u `ci.yml` u `frontend` poslu; provjeriti `check_ci_index.py`.

---

## 6. Testovi

| Test | Status | Garancija |
|---|---|---|
| `test:design-reference` | ✅ **6/6** (prije FAIL/ENOENT) | oba nova HTML-a ispunjavaju tačan ugovor §4.1, uključujući mutacijske provjere teme |
| `test:design-spec` | ✅ **2/2** + 7 mutacija | NEJRA dokument je zaista puna specifikacija (14 sekcija, 3 stanja tokena, 58 ruta, šabloni, paritet) i ne može se osiromašiti neopaženo |
| svih ostalih 197 `test:*` | ✅ **197/197**, nepromijenjeno | nijedan se ne briše niti slabi |
| `test:brand-colors`, `test:i18n-key-resolution`, `test:eslint-a11y-severity` | zeleno | S0 ne dira kod, pa ostaju netaknuti |

---

## 7. CI provjere

Lokalno prije commit-a: svih 5 Python provjera + puna `test:*` petlja (sada **199/199**) + `npm run build` + `npm run typecheck:e2e` + `git diff --check`.
Zatim `git push origin arena/71be6ba3-beauty-salon-v2` → `gh run watch <id>` → **5/5 poslova success** (`repo-checks`, `backend`, `frontend`, `a11y-e2e`, `mobile`). Ovo je **prvi zeleni run na grani**.

---

## 8. Definition of Done + dokazi

- ✅ 3 dizajn HTML-a postoje; NEJRA ima 14 sekcija i jedini je SSOT; v2/v3 su označeni kao koncepti.
- ✅ `test:design-reference` i `test:design-spec` prolaze lokalno i u CI; mutacijske provjere uhvaćene.
- ✅ `check_ci_index.py` vidi novu skriptu i njen CI korak; `check_doc_links.py` i dalje zelen.
- ✅ Nijedan produkcijski fajl (`frontend/src`, `backend`, `mobile`) nije diran; nema novih zavisnosti.
- ✅ Generisani JPEG-ovi nisu u Gitu; veličina HTML-ova zabilježena u `CHANGELOG.md`.
- 🟡 Rendered a11y koncepata nije provjeren u pregledniku (nije ni cilj koncepata); `a11y-e2e` je zelen jer se app nije mijenjala.
- ✅ Commit sha + CI run id + 5/5 upisani u `CHECKLIST.md` / `CHANGELOG.md` / `HANDOFF.md`.
- **STOP** → pitanje: „Odobravaš li S1 (temelj: tokeni + 3-state tema)?".

---

## 9. Rizici i pitanja za ovaj segment

- **Pitanje prije pisanja HTML-a (ako se pojavi):** smije li se postojeći NEJRA dokument preimenovati/arhivirati? **Ne** (Q7); ostaje isto ime. Ako vlasnik ipak želi arhivu v1 → STOP + pitanje.
- **Pitanje:** trebaju li v2/v3 sadržavati i stvarne screenshot-e postojeće aplikacije? U sandboxu nema preglednika → **ne izmišljamo**; koriste se AI ilustracije (Q11) + ručno nacrtani `.demo` markup. Ako vlasnik traži stvarne screenshot-e → STOP.
- R5/R7: base64 JPEG povećava fajlove; pratiti veličinu i ne prelaziti razumni okvir (~1,5 MB po dokumentu).
- Nijedna tvrdnja o WCAG-u ne smije biti ✅ bez izračuna u samom dokumentu; računica se ponavlja u `check_ui_contrast.py` tek u **S1**.
