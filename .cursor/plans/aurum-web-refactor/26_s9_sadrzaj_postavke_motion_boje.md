# S9 — Admin sadržaj + Postavke, motion i boje

Izvršni plan za S9. Faza (`10_phase-9-admin-content-settings.md`) je vlasnik odobrio 2026-11-25
uz napomenu: „unutar S9 možeš provjeriti motion i boje“. Ovaj fajl je mjerenje, redoslijed
rada i evidencija dokaza; faza ostaje vlasnički dokument.

**Ulaz:** S8 zatvoren za moj dio — CI [45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)
za `cf147bd` je **5/5**, a CI [45672221177](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45672221177)
za `c99ba94` je **5/5**. Za S8 ostaju **samo vlasnikove potvrde**: zoom 200%/400%, vizuelni
pregled i tastaturni pregled. Te potvrde se ne mogu dokazati automatizovano, pa se S9 ne
smije predstaviti kao „S8 dokazano završen“.

---

## 1. Izmjereno stanje (prije razbijanja)

Faza traži da se stvarne veličine izmjere i upišu **prije** razbijanja (`09_phase-8-admin-data.md`, §17).

### 1.1 Fajlovi preko 150 linija (meta: 100–150)

| Fajl | Linije | Plan |
|---|---|---|
| `pages/EmailSettings.tsx` | **1416** | Podijeliti na: konstante, tipove, `normalizeExistingTemplate`/`renderCampaignHtml`, te tri panela (SMTP / predlošci / kampanje) u `features/email-settings/` |
| `pages/Gallery.tsx` | **627** | `features/gallery/`: tipovi, hook za kategorije, lista kategorija, dijalog kategorije, mreža slika, dijalog dodavanja slike, dijalog slike |
| `pages/Notifications.tsx` | **388** | `features/notifications/`: hook za listu, red akcija, tabela, detalj/pregled |
| `pages/Reviews.tsx` | **330** | `features/reviews/`: tipovi, hook, zvjezdice, tabela, dijalog detalja |
| `features/email-settings/email-visual-editor.tsx` | **285** | `features/email-settings/`: tipovi bloka, editor bloka, preview |
| `features/settings/setting-editor-form.tsx` | **248** | `features/settings/`: polja, validacija boje, akcije |
| `pages/Blog.tsx` | **216** | `features/content/`: tabela, editor posta, filter |
| `pages/AppReleases.tsx` | **214** | `features/app-releases/`: tabela, filter, forma (već postoji `app-release-create-form.tsx`) |
| `features/settings/groups-site.ts` | **173** | Podijeliti po grupama: home / contact / pages / modules / comments |
| `pages/Settings.tsx` | **169** | `features/settings/` — prebaciti na postojeći `settings-module-page` obrazac |

### 1.2 Fajlovi u okviru (ostaju)

`SettingsHub.tsx` 67, `SettingsOperations.tsx` 64, `SettingsAppearance.tsx` 82, `SettingsSeo.tsx` 62,
`settings-module-page.tsx` 129, `settings-tab-nav.tsx` 92, `setting-group-panel.tsx` 89,
`groups-operations.ts` 76, `setting-editor-display.tsx` 74, `use-admin-settings.ts` 71,
`setting-editor-boolean.tsx` 71, `types.ts` 67, `app-release-create-form.tsx` 123, `groups-seo.ts` 38.

---

## 2. Motion (2.3.3 / 2.5.4) — vlasnikov zahtjev

**Utvrđeno:** cijeli S9 opseg ima **nula** `motion-reduce:` zaštita, dok je S8 već uspostavio
obrazac (`animate-spin motion-reduce:animate-none` u `pages/Salon.tsx`,
`features/client-analytics/client-picker.tsx`, `features/shell/admin/ui/data-state.tsx`,
`pages/ServiceWorkGallery.tsx`).

Globalni blok u `globals.css:654` (`animation-duration: 0.01ms !important`) postoji, ali on
spiner ne prestaje — smanji trajanje i broj iteracija, pa ikona ostaje rotirana u proizvoljnom
uglu. `motion-reduce:animate-none` je `animation: none` i spinner je statički.

**Konkretni nalazi (prije):**

| Vrsta | Broj | Gdje |
|---|---|---|
| `animate-spin` bez `motion-reduce` | **30** | vidi raspodjelu ispod |
| `animate-pulse` bez `motion-reduce` | **1** | `settings-module-page.tsx` (skeleton) |
| `transition-all` | **1** | `EmailSettings.tsx` — progress bar širine kampanje (`transition-all` → `transition-[width]` + `motion-reduce:transition-none`) |

> **Ispravka broja (2026-11-25, poslije prvog mjerenja).** Prva verzija ovog
> dokumenta navodila je **24** `animate-spin` instanci. To je bio broj *fajlova* sa
> bar jednom animacijom, ne broj *instanci*. Broj instanci je **30 `animate-spin` +
> 1 `animate-pulse` = 31**, i to je sada autoritativna vrijednost. Razlika je
> nastala jer se jedan fajl (`email-settings`, 11 instanci) prijavljivao više puta.
> **Vrijednost u tekstu je ispravljena; izvor istine je `test:s9-reduced-motion`,
> koji broji instance iz izvora** — ne ovaj redak dokumenta.

**Konačna raspodjela (31 instanca, sve sa `motion-reduce:animate-none`):**

| Fajl | `animate-spin` | `animate-pulse` |
|---|---|---|
| `features/email-settings/email-campaigns-panel.tsx` | 5 | — |
| `features/email-settings/email-smtp-panel.tsx` | 4 | — |
| `features/gallery/gallery-add-image-dialog.tsx` | 3 | — |
| `features/notifications/notification-preferences.tsx` | 2 | — |
| `features/settings/setting-editor-form.tsx` | 2 | — |
| `features/app-releases/app-release-create-form.tsx` | 1 | — |
| `features/app-releases/app-release-list.tsx` | 1 | — |
| `features/blog/blog-comments-dialog.tsx` | 1 | — |
| `features/email-settings/email-templates-panel.tsx` | 1 | — |
| `features/gallery/gallery-category-dialog.tsx` | 1 | — |
| `features/gallery/gallery-image-dialog.tsx` | 1 | — |
| `features/gallery/gallery-image-grid.tsx` | 1 | — |
| `features/notifications/notifications-list.tsx` | 1 | — |
| `features/reviews/reviews-table.tsx` | 1 | — |
| `features/settings/setting-editor-boolean.tsx` | 1 | — |
| `features/settings/settings-module-page.tsx` | 1 | 1 |
| `pages/Blog.tsx` | 1 | — |
| `pages/EmailSettings.tsx` | 1 | — |
| `pages/Gallery.tsx` | 1 | — |
| **UKUPNO** | **30** | **1** |

**Pravilo:** svaki `animate-*` u S9 opsegu dobija `motion-reduce:animate-none`; `transition-*`
ostaje jer je globalni blok već neutrališe pod `prefers-reduced-motion`, a `transition-colors`
nije vestibularni pokret. `transition-all` je **sveden na `transition-[width]`** + `motion-reduce:transition-none`
(progress širine kampanje) — pokreće se samo na promjeni širine, a ne na svim promjenama stila.

---

## 3. Boje (1.4.3 / 1.4.11) — vlasnikov zahtjev

**Utvrđeno:** S9 opseg koristi hardkodirane Tailwind palete umjesto semantičkih tokena:

| Klasa | Problem | Zamjena |
|---|---|---|
| `text-emerald-600` | 3.77:1 na bijeloj — **ne prolazi** 4.5:1 za normalni tekst | `text-ok-foreground` (6.49:1 / ok-bg, 9.03:1 u tamnoj) |
| `text-emerald-700` | prolazi samo na klasičnoj bijeloj, ne i u Aurum | `text-ok-foreground` |
| `bg-emerald-500` (progress) | nije semantički, ne prati temu | `bg-ok` |
| `text-rose-600` | prolazi na klasičnoj bijeloj (4.83:1), ne i na Aurum champagne | `text-danger` |
| `text-blue-600` | van Aurum palete | `text-brand-rose-text` / `text-content-strong` |
| `accent-amber-700` | van Aurum palete (checkbox/radio) | `accent-brand-rose` |
| `fill-yellow-400 text-yellow-400` (zvjezdice) | van Aurum palete | `fill-brand-gold text-brand-gold` + prazna `text-content-strong` |
| `text-slate-300` (prazna zvjezdica) | van Aurum palete | `text-content-strong` |
| `bg-black/40` + `text-white` preko fotografije | preklapni sloj nije tematski | zadržati preklap, ali tekst prebaciti na token i provjeriti Aurum override |

Aurum već ima override za `[data-gallery-image-meta]` (`globals.css:2054`) — taj override mora
ostati i s novim tokenima.

**Pravilo:** u S9 opsegu nema novih hardkodiranih paleta; postojeće se prevode na semantičke
tokene (`text-content*`, `text-danger`, `text-ok-foreground`, `text-brand-*`, `bg-surface*`).

---

## 4. Redoslijed rada

1. **Mjerenje** — ovaj fajl (gotovo).
2. **Motion** — `motion-reduce:animate-none` + `transition-[width]`; novi test `test:s9-reduced-motion`.
3. **Boje** — semantički tokeni; novi test `test:s9-semantic-colors`.
4. **Razbijanje** — `features/gallery/*`, `features/reviews/*`, `features/content/*`,
   `features/notifications/*`, `features/email-settings/*`, `features/app-releases/*`,
   `features/settings/*`; `pages/*` ostaju tanki orkestratori.
5. **Dokazi** — puna `test:*` petlja, `typecheck`, `typecheck:e2e`, `lint`, build, 5 Python provjera,
   Playwright `chromium`, backend E2E, push → CI 5/5.
6. **Dokumentacija** — CHANGELOG, HANDOFF, CHECKLIST, faza, matrica.

---

## 5. Nepromjenjivi ugovori (faza §4)

- `SettingsHub` sa 7 tabova i `?tab=` ostaje; 6 `TabRedirect` ruta i `/admin/debtors` i dalje rade.
- Svi setting ključevi, validacije (`isSupportedHexColor`), `SettingsSocketSync` refresh i
  `getSetting` fallback netaknuti; **Q9 napomena iz S1** se ne smije izgubiti.
- Blog editor uključujući `blog_language`/SEO polja, moderacija recenzija, galerija sa
  tastaturnim reorderom i `DialogTitle`, sanitizirani HTML preview u `EmailSettings` — svi
  netaknuti. **Raw HTML campaign mod se ne mijenja** (STOP uslov iz faze §9).
- `window.confirm` zamjena je već urađena (`AdminConfirmDialog`) — ne miješati dva obrasca.
- Bez novih zavisnosti, bez novih postavki, bez diranja backend-a.

---

## 6. Dokazi

_(ažurirano 2026-11-25, poslije završetka lokalnog rada)_

### 6.1 Struktura — finalne veličine

| Stranica (orkestrator) | Linije | Bivši monolith |
|---|---|---|
| `pages/Blog.tsx` | **90** | 216 |
| `pages/Gallery.tsx` | **132** | 627 |
| `pages/Reviews.tsx` | **65** | 330 |
| `pages/SettingsHub.tsx` | **67** | 67 (ostaje) |
| `pages/Settings.tsx` | **28** | 169 |
| `pages/SettingsOperations.tsx` | **33** | 64 |
| `pages/SettingsAppearance.tsx` | **65** | 82 |
| `pages/SettingsSeo.tsx` | **20** | 62 |
| `pages/AppReleases.tsx` | **56** | 214 |
| `pages/Notifications.tsx` | **68** | 388 |
| `pages/EmailSettings.tsx` | **101** | 1416 |

Nijedna `pages/*` datoteka ne prelazi 150 linija. Najveći modul u `features/` je
`setting-editor-field.tsx` (194) — on **ne može** biti razbijen na dva modula jer
`test:form-control-labels` zahtijeva da `<Label htmlFor>` i kontrola budu u **istom fajlu**
(garancija 1.3.1/3.3.2). Svi ostali moduli su ≤ 155 linija, a većina ispod 130.

### 6.2 Motion i boje

- `test:s9-reduced-motion` → **5/5** (31 `animate-*` instanci, svi sa `motion-reduce:animate-none`).
- `test:s9-semantic-colors` → **5/5** (nema sirovih paleta u S9 opsegu; tri obrazložena izuzetka:
  email preview okvir, gallery photo scrim, native color picker).
- `test:text-contrast-allowlist` → **4/4**; `check_ui_contrast.py` → **148/148** parova.
- Kontrast semantičkih tokena (classic / Aurum light / Aurum dark):
  `ok-fg` 7.14 / 6.39 / 9.86 · `info-fg` 8.71 / 17.55 / 15.60 · `warn-fg` 8.35 / 6.39 / 9.75 ·
  `bad-fg` 8.31 / 6.54 / 8.88 · `neutral-fg` 10.44 / 9.05 / 8.45 · `danger` 5.22 / 6.54 / 8.88.

### 6.3 Testovi, lint, build

| Provjera | Rezultat |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | **čist** |
| `npx eslint src --ext .ts,.tsx` | **0 grešaka / 5 upozorenja** (sva 5 u fajlovima van S9 opsega: `stylist-portal/*`, `DailyLog.tsx`) |
| `test:*` petlja (210 skripti) | **209/210** — jedini pad `test:auth-session-rendered` (Playwright nema instaliran browser; `cdn.playwright.dev` je blokiran u sandboxesu — nije aplikaciona greška) |
| `npm run build` | **zelen** — Initial JS/CSS **294,6 / 300 KiB** gzip, Analytics 116,4 / 140, Calendar 101,1 / 125, public home 45,1, admin dashboard 15,3, stylist inbox 19,2 |
| `npm run typecheck:e2e` | **čist** |
| 5 Python provjera (`check_ci_index`, `check_doc_links`, `check_i18n`, `check_repo_hygiene`, `check_ui_contrast`) | **PASS** |
| `git diff --check` | **PASS** |

Fokusirani ugovori: Settings **46/46**, i18n-key-resolution **7/7**, admin content a11y **10/10**,
admin settings controls a11y **11/11**, admin notifications **12/12**, app-releases i18n **2/2**,
raw API errors **6/6**, blog **40/40**, admin blog i18n **1/1**, gallery keyboard **5/5**,
gallery i18n **4/4**, reviews i18n **3/3**.

### 6.4 Otvoreno

- **`AdminConfirmDialog` tok u `Reviews`** — revizija poruke/uvjeta/efekta/fokus-povratka prema
  S6 odobrenju **nije završena**; trenutno stanje je provisiono.
- `test:auth-session-rendered` — treba instaliran Playwright browser (`npx playwright install chromium`).
- Stvarni AT/zoom (200%/400%) pregled i ručni vizuelni pregled ostaju vlasnikova potvrda.
- **Nema merge/deploya** i nema S10 bez zasebnog odobrenja.
