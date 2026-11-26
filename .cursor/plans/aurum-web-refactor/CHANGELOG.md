# CHANGELOG — Aurum web refaktor

Format svakog unosa: `datum · segment · šta · zašto · fajlovi · testovi · CI run id · status dokaza`.
**Pravilo:** svaka izmjena postojećeg testa mora ovdje imati obrazloženje da je **zadržana ista garancija** (Q10). Svaka promjena boje/tokena mora imati `staro → novo` i omjer kontrasta.

---

## 2026-11-26 · S11 · Početak završnog prolaza: tri teme, axe i reflow

- **Odobrenje i ulaz.** Korisnik je odobrio S11 nakon provjere da je S10 commit `e6b4271b46eab994e0512e1be4500c7702755eea` završio CI run **[45781994850](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45781994850) 5/5 success**. S10 run uključuje rendered-a11y job, ali ne novu S11 pokrivenost za sva tri skin-a.
- **Testni slice.** Dodani su public, admin i stylist Playwright specovi — ukupno 15 testova × BS/EN za Classic, Aurum light i Aurum dark (30 theme/locale axe scans) na `/`, guest `/rezervacija` entry (ispravno se prati preusmjeravanje na `/login`), `/admin`, `/admin/settings` i `/stylist/inbox`. Theme fixture presreće isti javni `/api/settings/public` ugovor; dark/light prijelaz i `aria-pressed` provjeravaju se kroz vidljivi ThemeSwitcher tastaturom, ne direktnim DOM/localStorage override-om. Axe koristi postojeće pravilo kritičnih/ozbiljnih WCAG nalaza i upis coverage po theme-suffixed ruti.
- **Reflow dokazi.** Svaki novi slučaj dodaje 320 CSS px viewport/overflow mjerenje, root font-size 200% simulaciju i WCAG text-spacing stresni CSS s diferencijalnim clipping checkom. Ovo nisu stvarni browser zoom na 200/400%, OS forced-colors ili AT dokaz.
- **Lokalno (ponovljeno 2026-11-26).** Frontend Node suite **1042/1042**; `npx tsc --noEmit -p tsconfig.json`, `npm run typecheck:e2e`, production build i `git diff --check` PASS; build budget initial JS/CSS **294.7/300 KiB gzip**. ESLint **0 errors / 5 warnings** (existing exhaustive-deps warnings). Playwright discovery prikazuje svih **15** novih testova u očekivanim `chromium`, `admin`, `stylist` projektima; `wcag-source-contracts` **18/18**. Pet repository gates PASS: hygiene **2213** tracked paths, CI index **393/396** (3 exclusions), docs links **766/262 files**, locale parity **2897/2897**, source contrast **148/148**. `npm run test:a11y-routes` lokalno eksplicitno **SKIPPED** jer sandbox nema Chromium; novi rendered testovi čekaju CI. Privremeni font-size, text-spacing CSS i viewport se sada očiste/povrate između locale prolaza. Nijedan postojeći test nije uklonjen/oslabljen; source contract pokriva 3 skin-a, javni language/theme controls, live announcement i zabranu privatnog state override-a.
- **Mrtav kod.** Scan svih 14 produkcijskih TS/TSX fajlova u `features/shell/admin/ui` našao je po najmanje jednog koda-potrošača; ništa nije obrisano. Nastavak zahtijeva po-modulsku provjeru i brisanje samo kad 0 import/consumer dokazano.
- **Preostalo.** S11 CI, ručni stylist inbox → start → completion flow, stvarni browser zoom 200/400%, forced-colors OS, NVDA/VoiceOver, fokus-povratak i puna matrix finalization su otvoreni. Nema merge/deploya.

## 2026-11-26 · S10 · Schedule, dugovanja i završetak rezervacije — nastavak u toku

- **Dekompozicija.** `stylist-schedule-page.tsx` 212 → **117** linija: status/time sortiranje i buduće grupisanje su u `utils/stylist-schedule-sections.ts` (**62**), reservation card u komponenti (**59**). `stylist-debts-page.tsx` 199 → **146**: repayment POST/refetch/toast je u hooku (**54**), dijalog UI u komponenti (**64**). `complete-reservation-dialog.tsx` 217 → **143**; postojeće draft/reset/validacija/iznosi/payload su u hooku (**118**) uz izdvojeni payload tip.
- **Ugovori i ponašanje.** Schedule status-priority i start-time redoslijed, today/future grouping, retry/loading/empty, reservation linkovi i IN_PROGRESS payment akcija ostaju. Dug repayment ruta/payload, odgođeni refetch, greške i busy status su nepromijenjeni. Completion zadržava pay-debts intent, reset samo pri prvom otvaranju, iznos/dug/tip izračune, validacije, settled debt IDs i callback payload. Dodani su source contracts za sectioning/sort, repayment POST/refetch i completion validation; i18n/a11y testovi sada čitaju prave izdvojene fajlove.
- **Lokalni dokazi.** schedule **5/5**, completion dialog + reservation detail **9/9**, debts **4/4**; puni Node suite **1041/1041**; TypeScript + E2E typecheck PASS; build PASS (**294.7/300 KiB** initial gzip; Analytics 116.4/140, calendar 101.8/125). ESLint 0 errors / 5 warnings (postojeći, debts warning ostaje). `git diff --check` PASS. Ovi novi schedule/debts/completion fajlovi su lokalni, nisu u CI runu 45775652262.
- **Granica.** Bez API/FSM/amount izmjena. Nema novog push/CI za ovaj dodatni lokalni batch; konačni S10 rendered path i 5/5 ostaju gate. Nema merge/deploy.

## 2026-11-26 · S10 · Nastavak razbijanja workbook new-entry i direct booking hookova

- **Opseg i motivacija.** Nastavak S10 je odobren 2026-11-25 („nastavi S10“). Završeno je razdvajanje dva veća toka koji su ostali nakon tankih stranica; samo prezentacijski sloj je promijenjen. Stylist/workbook API, podaci, iznosi, routing i FSM nisu dirani.
- **Workbook new-entry.** `useWorkbookNewEntryForm.ts` je kompozicija od **148 linija**. Katalog (`useWorkbookNewEntryCatalog.ts`, **146**) i lojalnost (`useWorkbookNewEntryLoyalty.ts`, **78**) su izdvojeni iz forme; validacija, payload, dug i submit (`useWorkbookNewEntrySubmission.ts`, **143**) su zasebni. Stranica je **233** linije. Debounce/stale-response zaštita, klik-izvan/Escape, gender filter, izbor i reset, validacija, cijene/popust, napojnica, `debtHandling`, toastovi i payload su očuvani.
- **Direct booking.** Stranica je **98** linija, a hookovi `useStylistDirectBooking.ts` (**110**), `useStylistDirectBookingCatalog.ts` (**112**) i `useStylistDirectBookingSubmission.ts` (**76**) su fokusirani na kompoziciju, čitanja/katalog i slanje. `servicesRequestIdRef`/`clientSearchRequestIdRef`, filter po spolu i čišćenje izbora, automatski kraj, isti POST payload, `submitGeneration`, session-version zaštita i dvostruki submit guard su sačuvani.
- **Testni ugovori (Q10).** Nove izvorne putanje dodane su u new-entry i direct-booking i18n/recovery kontrakte; testne tvrdnje nisu uklonjene ni oslabljene. `raw-api-error-exposure.test.mjs` pozitivan mapper kontrakt prati novi submission fajl, gdje se `resolveAdminApiError` preselio. Nakon prvog full-suite nalaza zastarjele putanje, ugovor je prebačen na stvarni novi izvor i ponovljen.
- **Lokalni dokazi.** Fokusirani new-entry **28/28**; direct-booking + inbox **10/10**; S10 reduced-motion **5/5**, semantic-colors **6/6**, stylist dark-contrast source contract **3/3**; frontend Node suite **1036/1036**; `tsc --noEmit` + `typecheck:e2e` PASS; production build i gzip budžeti PASS (initial JS/CSS **294.6/300 KiB**, Analytics **116.4/140**, calendar **101.8/125**, inbox **19.4**, dashboard **15.3**). ESLint **0 grešaka / 5 upozorenja** (postojeća upozorenja u `use-reservation-detail-status.ts`, `stylist-debts-page.tsx`, `stylist-reservation-detail-page.tsx`, `DailyLog.tsx`). Pet Python provjera je nakon usklađivanja prošlo: repo hygiene (2199 putanja), CI index (393/396; 3 interaktivna izuzeta), doc links (765 linkova/262 Markdown fajla), BS/EN i18n (2897/2897) i source kontrast (148/148).
- **CI checkpoint.** Commit `4996d1d` je pushan; run **[45775652262](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45775652262)** završio je **5/5 success**: repo hygiene, mobile TypeScript, backend, frontend typecheck/build/test i rendered a11y. Nije zabilježen broj rendered testova jer nije provjeren iz loga. Ovaj CI pokriva new-entry/direct-booking batch, ali ne kasnije schedule/debts/completion izmjene.
- **Status i granice.** Rendered tastaturni prolaz inbox → start → završetak, konačni S10 CI nad svim izmjenama, konačna matrica i STOP za S11 ostaju otvoreni. Nema merge/deploya.

## 2026-11-25 · S9 · Admin sadržaj + postavke hub: orkestratori, motion i semantičke boje

- **Zašto.** Faza `10_phase-9-admin-content-settings.md` zatvara 24 admin rute, a mjerenje
  prije rada pokazalo je **devet** datoteka preko 150 linija (`EmailSettings.tsx` **1416**,
  `Gallery.tsx` 627, `Notifications.tsx` 388, `Reviews.tsx` 330, `email-visual-editor.tsx` 285,
  `setting-editor-form.tsx` 248, `Blog.tsx` 216, `AppReleases.tsx` 214, `groups-site.ts` 173,
  `Settings.tsx` 169). Uz to je vlasnik izrijekom tražio provjeru **motiona** i **boja** u
  S9 opsegu.
- **Struktura.** Svih 11 admin stranica su sada tanki orkestratori: `Blog.tsx` **90**,
  `Gallery.tsx` **132**, `Reviews.tsx` **65**, `SettingsHub.tsx` 67, `Settings.tsx` **28**,
  `SettingsOperations.tsx` **33**, `SettingsAppearance.tsx` **65**, `SettingsSeo.tsx` **20**,
  `AppReleases.tsx` **56**, `Notifications.tsx` **68**, `EmailSettings.tsx` **101** linija.
  Logika je u `features/{gallery,reviews,blog,email-settings,notifications,app-releases,settings}/`.
  `EmailSettings` je razbijeno na 11 modula: konstante → `email-settings-constants.ts`,
  `email-template-defaults.ts` (podrazumijevani tekstovi template-a), `email-campaign-html.ts`
  (generator + bijela lista znakova), tri hooka (`use-email-smtp` → `-state`/`-config`/`-actions`,
  `use-email-templates`, `use-email-campaigns` → `-settings`/`-audience`/`-job`), tri panela
  (SMTP → `email-smtp-panel`/`-connection`/`-sender`/`-limits`/`-clear-password`, template-i,
  kampanje → `-campaigns-panel`/`-editor`/`-audience`/`-progress`) i vizuelni editor
  (`email-visual-editor` → orkestrator / `-blocks` / `-preview` / `-types`).
  `groups-site.ts` je podijeljen na `groups-site-pages.ts` + `groups-site-modules.ts` (redoslijed
  grupa isti), `settings-copy-keys.ts` na `settings-copy-keys.ts` + `settings-copy-keys-site.ts`.
  **Pravilo:** nijedna `pages/*` datoteka ne prelazi 150 linija.
- **Motion (2.3.3 / 2.5.4).** S9 opseg je imao **nula** `motion-reduce:` zaštita. Svih
  **31** `animate-*` instanci (30 `animate-spin` + 1 `animate-pulse`) sada ima
  `motion-reduce:animate-none`; `transition-all` u progressu kampanje sveden je na
  `transition-[width] motion-reduce:transition-none`. Novi ugovor `test:s9-reduced-motion`
  (**5/5**) broji instance **iz izvora** i traži isti obrazac zaštite kao S8
  (`animate-spin motion-reduce:animate-none`); provjera je i globalni `prefers-reduced-motion`
  blok u `globals.css` i odsutnost `transition-all`.
- **Boje (1.4.3 / 1.4.11).** Sirove Tailwind palete u S9 opsegu prevedene su u semantičke
  tokene: `text-emerald-600`/`text-emerald-700` → **`text-ok-foreground`** (7.14 / 6.39 / 9.86),
  `bg-emerald-500` → **`bg-ok`**, `text-rose-600` → **`text-danger`** (5.22 / 6.54 / 8.88),
  `text-blue-600` → **`text-brand-rose-text`** / `text-info-foreground`** (8.71 / 17.55 / 15.60),
  `text-slate-300` (prazna zvjezdica) → **`text-content-strong`** (10.44 / 9.05 / 8.45),
  `text-amber-600` → **`text-warn-foreground`** (8.35 / 6.39 / 9.75), `bg-amber-*` → **`bg-warn`**,
  `text-red-600` → **`text-danger`**. Novi ugovor `test:s9-semantic-colors` (**6/6**) traži da
  u S9 opsegu nema sirovih paleta i dozvoljava **tri** obrazložena izuzetka: email preview
  okvir (`email-visual-editor-preview.tsx` — mail se renderuje na bijeloj pozadini nezavisno od
  teme), gallery photo scrim (`gallery-image-grid.tsx` — Aurum override ga ionako zamjenjuje)
  i native color picker (`setting-editor-field.tsx` — bijela ploča zbog kontrasta kontrole).
  `check_ui_contrast.py` je **148/148** parova, `test:text-contrast-allowlist` **4/4**.
- **Utjecaj na postojeće testove (Q10).** Nijedna postojeća asertcija nije uklonjena ni
  oslabljena; promijenjene su **putanje izvora** i dodane su tamo gdje je broj prešao u novi
  fajl. Konkretno: `admin-content-a11y` je dobio dva nova gallery modula u listu izvora
  (broj `<Label>` ostaje 15 — ista dva Label-a su preseljena, ne dodata) i
  `blog-post-image-upload.tsx` uz `blog-post-form-dialog.tsx` (`<input type="file">` i
  `MediaImage` su u izdvojenom modulu, pa se oba čitaju zajedno; broj slika ostaje 3);
  `wcag-source-contracts` (2.5.7 drag) je prebačen sa `email-visual-editor.tsx` na
  `email-visual-editor-blocks.tsx` — dozvoljeni popis i dalje traži **isti obrazac alternative**
  (`moveBlock(index, index - 1)` / `moveBlock(index, index + 1)` + `aria-label` dugmadi) i
  sada **strože** provjerava da dozvoljeni fajl i dalje postoji; `form-control-labels` je
  zadržao potpunu garanciju (svaka kontrola ima programsko ime) — zato `setting-editor-field.tsx`
  **nije** razbijen na dva modula, jer `<Label htmlFor>` mora biti u istom fajlu kao kontrola;
  `admin-settings-controls-a11y`, `admin-settings-accessibility`, `admin-settings-seo-i18n`,
  `admin-settings-site-*-i18n`, `email-settings-*-i18n`, `email-visual-editor`,
  `admin-gallery-i18n`, `public-blog-comments-*-test`, `i18n-key-resolution` i
  `raw-api-error-exposure` su usklađeni sa novim putanjama izvora, bez gubitka tvrdnji.
  Nova dva ugovora (`test:s9-reduced-motion`, `test:s9-semantic-colors`) su dodata u
  `.github/workflows/ci.yml` — `check_ci_index.py` traži CI korak za svaku `test:*` skriptu.
  `test:s9-semantic-colors` ima **šest** tvrdnji: pet o paletama + jedna o **forced-colors**
  (globalni `@media (forced-colors: active)` blok u `globals.css` postoji i S9 ne uvodi
  vlastiti blok niti tvrde granice).
- **CI.** Paket je pushan kao `bef75dc` i **[45694496238](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45694496238)**
  je **5/5**: repo higijena i statički izvještaji, mobilni TypeScript, backend build+testovi,
  frontend typecheck+build i rendered a11y (axe) nad izolovanom CI bazom (izolovani PostgreSQL +
  Redis) — **svih pet poslova zeleni**. Tačan broj prošlih testova u rendered a11y koraku nije
  izvučen iz CI loga u ovoj sredini (host za logove i artifikate nije dostupan iz sandboxa), pa
  se **ne navodi broj koji nije provjeren**; autoritativni signal su zaključci runa i koraka.
  Nakon toga je pushan i commit `071ad50` (dokumentacija + forced-colors tvrdnja) sa CI runom
  **[45702072097](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45702072097)** — takođe
  **5/5**, svih pet poslova zeleno.
- Zapisni commit `7f61060` ima CI run
  **[45709806591](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45709806591)** — **5/5**.
- **Dokazi (lokalno).** `tsc --noEmit` **čist**; ESLint **0 grešaka / 5 upozorenja** (sva
  postojeća i u fajlovima van S9 opsega — `stylist-portal/*`, `DailyLog.tsx`); `test:*` petlja
  **209/210** skripti zeleno, jedini pad `test:auth-session-rendered` je **okolina**
  (Playwright nema instaliran browser; `npx playwright install chromium` pada jer je
  `cdn.playwright.dev` blokiran); produkcijski build **zelen** (Initial JS/CSS
  **294,6/300 KiB** gzip, Analytics 116,4/140, Calendar 101,1/125, public home 45,1, admin
  dashboard 15,3, stylist inbox 19,2); `typecheck:e2e` čist; pet Python provjera **PASS**
  (`check_ci_index`, `check_doc_links`, `check_i18n` — BS/EN 2897 list ključeva, identični
  skupovi — `check_repo_hygiene`, `check_ui_contrast`); `git diff --check` **PASS**. Fokusirani
  ugovori: Settings **46/46**, i18n-key-resolution **7/7**, admin content a11y **10/10**,
  admin settings controls a11y **11/11**, notifications **12/12**, app-releases i18n **2/2**,
  raw API errors **6/6**, blog **40/40**, admin blog i18n **1/1**, gallery keyboard **5/5**,
  gallery i18n **4/4**, reviews i18n **3/3**, email settings **13/13**.
- **Revizija `AdminConfirmDialog` toka u `Reviews` (S6 uslov) — završena.** Usporedjeno je
  izvorno `pages/Reviews.tsx` (`c99ba94`) sa izdvojenim modulima: naslov
  (`common.confirmDestructiveTitle`), opis (`reviews.deleteConfirm`), dugme (`common.delete`),
  uvjet (otvaranje na klik „obriši“), efekat (`DELETE` → toast → `loadData()` → zatvaranje
  detalja iste recenzije; greška → `reviews.actionFailed`), renderovanje (isti
  `AdminConfirmDialog` unutar detalja i van njega) i **fokus-povratak** (ista, nedirana
  `AdminConfirmDialog` komponenta) su **identični**. Original već nije koristio
  `window.confirm`, pa nije bilo zamjene oblika — samo premještanja koda.
- **Granice i otvoreno.** (1) `test:auth-session-rendered` treba
  instaliran Playwright browser. (3) Stvarni AT/zoom (200%/400%) i ručni vizuelni pregled
  ostaju vlasnikova potvrda — mock/source testovi nisu AT audit. (4) **Nema merge/deploya** i
  nema S10 bez zasebnog odobrenja.

---

## 2026-11-25 · S8 · Jedna stavka po području u bočnoj traci + izbori u analitici

- **Zašto.** Bočna traka je duplirala pod-poglede: „Klijenti“ i „Stilisti“ u analitici imali su isti vidljivi naziv kao stavke za upravljanje korisnicima i frizerima, pa je axe prijavio `identical-links-same-purpose` kao **nepotpuno** (čvor `a[href$="stylists"]`, run 42985731553), a klik na „Klijenti“ vodio na `/admin/users` umjesto u analitiku. Uzrok je uklonjen u korijenu, ne maskiran `aria-label` prepiskom: **bočna traka sada nosi jednu stavku po području**, a pod-pogledi žive u tablistu svog hub-a — isti obrazac koji M2 već primjenjuje na postavke (`/admin/settings` = jedna stavka, sedam tabova).
- **Navigacija.** `admin-nav.ts` više ne nosi `tab` / `tabDefault` / `ariaLabelKey` / `matchPrefix`; `adminNavItemHref` je uklonjen. Aktivna stavka se rješava po putanji (`/admin` je tačan match, ostale pokrivaju pod-strane). Analitika je jedna stavka `nav.analytics` → `/admin/analytics`, bez `?tab=`; korisnici i frizeri su u novoj grupi `nav.sectionPeople` („Ljudi“ / „People“). Vidljivi tekst stavke je i njeno pristupačno ime, pa je ručni kontekst u `aria-label` nepotreban.
- **Analitički tabovi.** `/admin/analytics` ima tablist sa tri pogleda (Pregled / Klijenti / Stilisti) i radix tastaturnom navigacijom (strelice, Home/End), očuvanjem query parametara i browser historijom. **Zadani tab više ne piše `?tab=`** (`next.delete('tab')`) — isto pravilo kao `finance-page.tsx` i `settings-tab-nav.tsx`. Time stavka u traci i tablist daju **istu adresu za isti pogled**, pa isti sadržaj ne živi pod dvije URL adrese (2.4.9). `?tab=overview` i dalje radi kao deep link, ali se više ne piše.
- **Izbori umjesto skokova.** Tab „Klijenti“ više ne redirectuje na `/admin/users`, a „Stilisti“ na `/admin/stylists` (bila su to mrtve granice): oba sada imaju vlastiti **picker** — traživač, paginacija i stabilni selektori (`data-client-picker`, `data-stylist-picker`). Klijentski picker traži po `q`; frizerski ne (backend `/api/stylists/admin` nema `q`), pa lista nosi naziv, specijalizaciju i oznaku neaktivnog profila. „Nazad“ u analitici klijenta vraća na listu klijenata **u istom tabu** (`/admin/analytics?tab=clients`), ne na `/admin/users`; ključevi `clientAnalyticsPage.backToUsers` / `stylistAnalytics.backToStylists` zamijenjene su sa `backToList`.
- **Granice paginacije.** Frizerski endpoint odbija `offset > 1000` (400), pa picker ograničava najviše 50. stranicu (veličina 20). Backend `hasMore` određuje stanje dugmeta „Dalje“, a ne samo poređenje sa ukupnim brojem.
- **Dekoracija i razbijanje.** `admin-layout.tsx` je 142 linije (brand, korisnički meni i mobilna fioka su izdvojeni u `admin-chrome.tsx`, `admin-user-menu.tsx`, `admin-mobile-nav.tsx`); `ClientAnalytics.tsx` je 146, `StylistAnalytics.tsx` 119, `AnalyticsHub.tsx` 58. Izdvojeni su i moduli za rad sa galerijom, editorom usluge, brisanjem usluge i detaljima klijenta.
- **Utjecaj na postojeće testove (Q10).** Tri sudska objekta: (1) `a11y-admin.spec.ts` — test „users eye …“ je očekivao dugme „nazad na korisnike“ i odlazak na `/admin/users`; **ista garancija** (izbor klijenta otvara analitiku i period se čuva kroz filtere) je zadržana, a promijenjena je samo očekivana destinacija dugmeta i izraz na „nazad na listu / back to list“ prema novom ugovoru. (2) Isti fajl, test „analytics subviews are keyboard-navigable …“ — prešao je sa navigacije bočnom trakom na navigaciju **tablistom**; isti cilj (tastaturna izmjena pod-pogleda, `aria-selected`, tabela/tipka grafikona) je zadržan, a prethodno provjerena jedinstvena adresa stavke u traci ostaje zasebna asertcija. (3) `analytics-hub-redirect.test.mjs` je dobio **novu** asertciju koja zaključava „zadani tab bez `?tab=`“; ništa nije uklonjeno ni oslabljeno. `analytics-link-purpose.test.mjs`, `s6-presentation.test.mjs` i `settings-hub-redirect.test.mjs` su usklađeni sa novim modelom jedne stavke po području.
- **Dokazi (lokalno).** Frontend: **207/207** `test:*` skripti zeleno (`test:auth-session-rendered` 21/21 uz ispravan `PLAYWRIGHT_BROWSERS_PATH`; bez te varijable skripta pada na „Executable doesn't exist“, što je okolina, ne kod). `tsc --noEmit` čist, ESLint 0 grešaka (šest ranijih upozorenja), produkcijni build zelen (initial 294,8/300 KiB, Analytics 116,4/140 KiB), pet Python provjera i `git diff --check` PASS. Browser: **cijeli `chromium` projekat 2355/2355** (S8 + M1–M6 + `wcag-rendered`), od toga S8 podskup 22/22 na ciljanim analitičkim specovima. Authentificirani admin/stylist a11y suite uz **pravi backend, PostgreSQL i Redis**: **828 prošlo / 2 palo** u prvom pokretanju; oba pada bila su zastarjela očekivanja iz prethodne tačke (gore), pa nakon ispravke **830/830** u ponovljenom pokretanju. (Jedan privremeni pad `axe admin: Kalendar rezervacija` u međurunu prolazi 7/7 u izolaciji s ponavljanjem — flake pod opterećenjem, ne regresija.) Backend: novi `backend/test/analytics-picker.e2e-spec.ts` (pravi HTTP + PostgreSQL, ne mock) **5/5**, a **cijeli backend E2E 7/7 suita / 106/106 testova**. **Granice:** mock browser testovi nisu AT audit; lokalni Chromium nije CI build; nema stvarnog mobilnog uređaja ni OS pickera; izbori nisu izmjereni pod velikim brojem zapisa.
- **CI.** Paket je pushan kao `cf147bd` i **[45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** je **5/5**: repo higijena, mobilni TypeScript, backend build+testovi, frontend typecheck+build i rendered a11y nad izolovanom CI bazom (izolovani PostgreSQL + Redis, prijavljeni CI nalozi) — **svih pet poslova i svi koraci zeleni**. Tačan broj prošlih testova u rendered a11y koraku nije izvučen iz CI loga u ovoj sredini (host za logove i artifikate nije dostupan iz sandboxa), pa se **ne navodi broj koji nije provjeren**; autoritativni signal su zaključci runa i koraka. S8 **ostaje otvoren** (stvarni AT/400%, ručni pregled, reduced-motion/forced-colors); nema merge/deploya i nema S9 bez odobrenja.

---

## 2026-11-18 · S8 · Privatni upload before/after para

- Tri nova endpointa pod `RolesGuard` (`OWNER`/`SYSTEM_ADMIN`) i globalnim JWT guardom: `GET /api/services/admin/work-gallery/:serviceId/eligible-entries`, `GET .../:serviceId/pending-consent` i `POST .../:serviceId/private-pair` (multipart: `entryId`, fajlovi `before` i `after`). Odgovori su `private, no-store`.
- **Jedan par po zapisu.** Par se veže za postojeći završeni `SERVICE` zapis odabrane usluge (`status=COMPLETED`, nije obrisan, ima klijenta, nije sakriven, nema postojećeg before/after para). Zapis koji već ima par dobija 409 (`WORK_GALLERY_PAIR_ALREADY_EXISTS`) i ništa se ne piše — javni feed bira najviše jedan par po zapisu (`sortOrder,id`), pa bi drugi par tiho zamijenio vidljivi. Uklanjanje para ostaje na postojećem `DELETE /api/daily-log/:id/images/:imageId`.
- **Sadržajna provjera tipa.** Najviše 10 MB po fajlu; tip se provjerava sadržajem (sharp metadata), ne samo MIME oznakom — JPEG/PNG/WebP/GIF prolaze, SVG i dokumenti se odbacuju (400). Sve se čuva u `private/work-gallery/YYYY/MM/` sa `storageClass=PRIVATE`; javni statički korijen se ne dodiruje.
- **Atomicnost i čišćenje.** Oba fajla se snimaju prije transakcije; transakcija zaključava red zapisa (`SELECT … FOR UPDATE`), ponovo provjerava uslove i veže oba reda slika odjednom. Ako korak padne, napravljeni uploadovi se brišu (`deleteUnreferencedUpload` nikad ne briše referencirani upload). Procesni prekid između pisanja fajla i upisa u bazu može ostaviti **privatne orphan fajlove**; to nije auto-čišćeno i prijavljeno je kao granica.
- **Upload ne stvara saglasnost i ne objavljuje.** Par ostaje van javnog i van admin feeda (oba traže aktivnu saglasnost) dok klijent u aplikaciji ne odobri svaku fotografiju pojedinačno. Lista čeka saglasnost vraća stanje po slici i **nikakvu putanju fajla**.
- **Konkurentnost.** Dva istovremena uploada na isti zapis: jedan 201, drugi 409; uploadovi i fajlovi gubitnika se brišu. Redoslijed zaključavanja je isti kao kod redoslijeda galerije (red zapisa), pa nema mrtvog zaključavanja sa swapom.
- **UI.** Panel na admin stranici galerije radova usluge: odabir završenog zapisa, dva označena file inputa, inline validacija tipa/veličine, status i alert regija s povratom fokusa na prvo nevažeće polje i lista „privatni parovi koji čekaju saglasnost“. Panel ostaje montiran dok se galerija ponovo učitava (isprva je bio unutar grane za učitavanje parova, pa ga je reload remontovao i izgubio poruku o uspjehu). Lista čeka saglasnosti se učitava tek kad se otvori, ne pri svakom prikazu stranice.
- **Greške.** Pet novih kodova (`WORK_GALLERY_SERVICE_NOT_FOUND`, `…_ENTRY_NOT_ELIGIBLE`, `…_PAIR_ALREADY_EXISTS`, `…_PAIR_PHOTOS_REQUIRED`, `…_PAIR_PHOTO_TYPE_INVALID`) sa parovima ključeva u oba jezika; frontend prevodi po **kodu**, ne po sirovom tekstu backenda.
- **Dokazi.** Backend unit **14/14**, realni PostgreSQL/JWT HTTP **8/8** (cijeli backend e2e **99/99**, 6/6 suita; backend unit **860/860**, 117/117 suita), frontend Node **8/8** (upload) i **998/998** (skup iz `test:*` skripti), upload mock Chromium **8/8**, build/typecheck (uključujući `typecheck:e2e`) i pet Python provjera PASS. Nema OS pickera ni pravog mobilnog uređaja; client-side provjera tipa je samo pomoć, server je odluka; UI prikazuje prvu stranicu (20) prikladnih zapisa i čeka saglasnosti, iako API paginira; nije izmjerena konkurencija velikog broja zapisa; mock browser testovi nisu AT audit.
- **Utjecaj na postojeće testove (Q10).** Tri starija OWNER spec (`s8-work-gallery-order`, `s8-work-gallery-visibility`, `s8-work-gallery-visibility-retry`) su imala catch-all mock koji je za nove read endpointe vraćao `{}`; zato je panel prikazivao alert za učitavanje i njegov `role="alert"` je kolidirao s `getByRole('alert')` u tim specovima. Dodan je dijeljeni fixture `e2e/work-gallery-upload-fixtures.ts` koji odgovara praznom stranicom; **nijedna postojeća asertcija nije uklonjena ni promijenjena**. Puni mock S8 prije te izmjene: **437 passed / 8 failed**; poslije: **445/445**.
- **Odvojeno, van ovog paketa.** `m1-expense-attachments-keyboard.spec.ts` je u CI-ju pao na axe kontrastu `<select id="expense-cat">`: sken je radio dok je kontrola još bila `disabled` (upload u toku), a `disabled:opacity-50` joj je prepolovio kontrast (3.74:1). To je **nepromijenjena** finance/testna trka — frontend kod za finansije nije diran od `2a8dfc3` (zeleni CI), a ispravka je dodala `await expect(select).toBeEnabled()` prije axe skena, pa se sada skenira ustaljeno stanje. WCAG 1.4.3 izuzima neaktivne komponente, pa se time ne gubi dokaz. `m1-calendar-keyboard.spec.ts` (`agenda-enter`) je pao u CI-ju, a lokalno prolazi **66/66** — to je CI-flake, ne promjena koda.
- **Regresija uhvaćena CI-jem, iz koordinacije redoslijeda.** Commit `352a622` (redoslijed) nikad nije bio u CI-u i donio je 8 novih hardkodiranih serverskih poruka bez koda; straža `api-error-codes.node-test.ts` (limit 439) zato pala na **445**. Sve osam su prebačene na `apiError(KOD)` uz pet novih kodova (`WORK_GALLERY_ORDER_DISTINCT_ENTRIES_REQUIRED`, `…_CHANGED`, `…_COMPARISON_CHANGED`, `…_NOT_ELIGIBLE`, `…_NOT_ADJACENT`) i `WORK_GALLERY_SERVICE_NOT_FOUND` za dvije poruke „usluga nije pronađena“; frontend sada prevodi i te kodove, pa redoslijed pokazuje tačan razlog umjesto generičke poruke. Nema promjene u ponašanju: ista poruka, sada prevodiva.
- **CI.** [CI 45559422184](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45559422184) za `24109f8` završio je **4/5**: rendered a11y **3181 passed / 0 failed / 0 skipped** (uz 15 nepotpunih axe `color-contrast` uzoraka, isto kao ranije), frontend typecheck/build, mobile i repo posao prošli; pao je backend posao na straži `api-error-codes` (gore). Ispravka je u `650c0c2`. **[CI 45566994361](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45566994361)** za `0119905` završio je **5/5**, a rendered a11y **3181 passed / 0 failed / 0 skipped** uz istih 15 nepotpunih uzoraka. Ovo pokriva upload paket i redoslijed; S8 i dalje nije završen.
- S8 **nije završen**: ostaju završne/ručne provjere i CI za ovaj paket. Nema merge/deploya; STOP prije S9.

---


- Zasebna revizija reda po usluzi i rangovi u migraciji; OWNER/SYSTEM_ADMIN endpoint čita konzistentnu stranicu i vrši transakcijsku CAS zamjenu susjednih validnih parova. Validira i revizije vidljivosti; konflikt traži eksplicitni refresh. Samo filtrirani feed mijenja red, ne globalni/random. Prvi ili nerangirani pomak normalizuje cijelu uslugu i može stvarati opterećenje/zaključavanja; to nije benchmarkovano. Revizija ne verzionira sve promjene zapisa i saglasnosti, a eligibility nije dokaz potpune serializacije svih consent utrka.
- BS/EN dugmad podržavaju tastaturu, učitavanje preko granice stranice, status i čuvanje fokusa/sesije; 320px/200% reflow test. Stranica 147 linija, hook 150, izdvojene akcije i validacija. Postojeće visibility fiksure proširene novim tokenom/putanjom, njihove potvrde, fokus, retry i ABA garancije zadržane. i18n source test proširen na izdvojene fajlove; postojeće asertacije ostaju. Prvi Node run otkrio je ternarni izraz koji statički skener nije prepoznavao; oba poziva sada su eksplicitna i ciljano prolaze.
- PostgreSQL/JWT HTTP **7/7** (auth lookup mock) obuhvata uloge, feedove, stranice, stale/invalid, susjednost, konkurentna sortiranja i hide; 25 migracijskih SQL datoteka je ručno primijenjeno, ne Prisma migrate deploy. Backend unit **846/846**, frontend/backend build i typecheck, Prisma validate i pet Python provjera PASS. CI za prethodni `af08f07` [45502852329](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45502852329) u vrijeme pisanja još traje; ne pokriva ovaj paket. Puni mock Chromium S8 **437/437**, Node **1005/1005**, lint 0 errors/6 ranijih warnings. Browser build prethodi samo ekvivalentnoj prepravci ternarnog prevoda radi statičkog skenera; poslije nje ponovni build, ciljani i18n test i browser redoslijed **9/9** prolaze.
- S8 nije završen: privatni upload nije implementiran, ostaju završne/ručne provjere. Nema merge/deploya; STOP prije S9. Mock browser i sintetički viewport nisu stvarni AT/OS audit.

---

## 2026-11-18 · S8 · Revizijska zaštita vidljivosti galerije

- Negativna kontrola na `2a8dfc3`: nakon hide → restore stari hide je pogrešno dobio **200 umjesto 409** na stvarnoj izolovanoj PostgreSQL bazi. Sada boolean stanje i revizija moraju odgovarati; atomski update rotira UUID, zastarjeli zahtjevi dobijaju 409, no-op se odbija. Početna vrijednost `0` nije tajna; UUID ne zamjenjuje autorizaciju. Zaštita se odnosi na promjene vidljivosti, ne verzionira sve izmjene zapisa/saglasnosti.
- Privilegirani `visible` odgovor čita reviziju s prikazanim zapisom; skrivena lista također je vraća. Oba su `private, no-store`; public feed ne vraća token. Klijent zadržava prikaz na konfliktu i traži osvježenje, bez tihog retryja. Neispravni ili nedostajući tokeni zatvaraju akcije. Stari frontend bez tokena dobija 400: koordinisati migraciju/backend/frontend prije budućeg rollouta, ovdje nema deploya.
- HTTP/PostgreSQL **6/6**, uključujući ABA oba smjera, konkurentna dva zahtjeva, provjere rola, validaciju, javni feed i izvornike/saglasnosti (JWT potpisan; `validateUser` mock). Svih **24 migracijska SQL fajla** ručno primijenjeno u praznoj lokalnoj bazi; to nije dokaz Prisma migrate deploy. Stari testovi ažurirani zbog proširenog zahtjeva i privilegovanog feeda, uz očuvanje potvrde, fokusa, paginacije, sesijskih guardova i consent asertacija.
- Mock Chromium S8 **427/427** uz zasebni kasnije dodani test neispravne revizije skrivene liste 1/1 PASS; Node **1005/1005**, backend unit **845/845**, frontend/backend build, E2E typecheck, Prisma validate, lint 0 errors/6 ranijih warnings i pet Python provjera PASS. Mock i sintetički viewport nisu AT ili produkcijski dokaz.
- [CI 45488631000](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45488631000) za prethodni `2a8dfc3` je **5/5**, ne obuhvata ovaj paket. S8 ostaje otvoren: privatni upload, redoslijed i završni CI/ručne provjere. STOP prije S9 i bez merge/deploya.

---

## 2026-11-18 · S8 · Ugniježđeni analitički paneli u rendered testovima

[CI 45469817621](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45469817621) za `4c0fc1c` pao je u rendered a11y poslu: testni `getByRole('tabpanel')` postao je višeznačan jer su stvarni analitički tablist i detalji klijenta sada ugniježđeni. Dva selektora u `a11y-admin.spec.ts` ograničena su na aktivni unutrašnji panel; tekstualne, tastaturne, fokusne i axe asertacije ostaju nepromijenjene. Lokalno s pravom prijavom i izolovanim PostgreSQL/Redisom prošlo je **48 M2 slučajeva + 2 auth setup**, te **4 tastaturna slučaja + 2 auth setup**. Podaci M2 testova su mockirani; lokalni Chromium nije isti CI build. Migracijski SQL primijenjen je ručno, ne preko Prisma migrate deploy. Novi CI treba potvrditi na novom commit-u; S8 nije završen (verzionisanje vidljivosti, privatni upload i redoslijed ostaju). Nema merge/deploya, S9 tek nakon STOP-a i odobrenja.

---

## 2026-11-18 · S8 · Osvježavanje kataloga između različitih dijaloga

- Pri odgođenom mock uspjehu spremanja usluge dok je otvoreno brisanje druge, ili odgođenom uspjehu brisanja dok je otvoren drugi editor, raniji kod je odmah pokretao refresh. Kada je odgovor kataloga zadržan, svih **8/8** BS/EN × 320/1280 × save/delete negativnih kontrola izgubilo je otvoreni dijalog; raniji test s instant katalogom pokazivao je rani dodatni read, ali ne pouzdano gubitak dijaloga.
- Osvježavanje je koordinirano kroz otvoreni editor, dijalog brisanja i potvrdu kategorije/potkategorije. Kada raniji write uspije dok je drugi dijalog otvoren, njegov nacrt ostaje vidljiv; lokalizovani alert traži kopiranje nespremljenog teksta i zatvaranje prije refresh-a. Save, upload i destruktivne potvrde su `aria-disabled`, ostaju fokusabilni, a handler/ref guard sprečava stvarni poziv. Nakon zatvaranja ide odgođeni refresh. To je konzervativan UX: nacrt nije automatski sačuvan niti se ponovo primjenjuje; već poslani server zahtjevi se ne otkazuju i već uploadovan fajl može ostati na serveru. Zaštita obuhvata ove dijaloge na Services stranici, ne druge stranice ili sve moguće promjene sesije.
- Novi mock testovi pokrivaju oba smjera, četiri potvrde kategorije pri kasnom saveu i četiri kasna brisanja kategorije pri otvorenom editoru; provjeravaju očuvanje nacrta, fokus, Enter bez dodatnog writea i refresh tek nakon zatvaranja. Šest ograničenih axe skenova (pravila `button-name`, `aria-valid-attr`, `aria-allowed-attr`) bez violations. Mockirani API i `setInputFiles` nisu stvarna baza, OS picker ili AT audit.
- Prvi objedinjeni run nakon koordinacije imao je **399 passed / 8 failed**: fokusni testovi su pokazali da, dok Radix još zatvara dialog, fokus na naslov nije uspio. Fokusni fallback pri reloadu sada se primjenjuje i u `onCloseAutoFocus`; ciljano **32/32**, a novi kompletni S8 **411/411**. Ranije garancije povrata fokusa, bez preuzimanja nakon što korisnik pomjeri fokus, ostaju u testovima. Dva statička testa su usklađena s novim koordiniranim callbackom i dodatnim guardom potvrde, uz zadržane provjere pending/reason/duplicate/focus i rendering lanca.

Frontend Node **1005/1005**, build, E2E typecheck, pet Python provjera i diff check PASS, lint 0 errors/6 ranijih warnings. Initial **293,9/300 KiB**, Analytics **116,4/140 KiB**. Lokalni Chromium **158.0.8127.0**, ne potpuno isti CI build 158.0.8127.18. [CI 45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za pushani `c34c12f` još traje pri zapisu (četiri success, rendered u toku); ovaj lokalni nastavak nije u njemu. Sačekati završetak prije pusha, potom pratiti novi CI. S8 ostaje otvoren, uključujući nesklad gallery upravljanja i tablist/sidebar; STOP prije S9 i bez merge/deploya.

---

## 2026-11-18 · S8 · Async editor usluga i stabilnost retry fiksure

- Upload slike: nakon zatvaranja i ponovnog otvaranja editora zastarjeli uspjeh ili greška više ne mijenja novi obrazac, njegov upload, file input ili toast; generation/sequence i promjena auth sesije obezvređuju stare odgovore. Ref blokira dupli upload i Save tokom uploada, uz lokalizovan status. Prije ispravke **8/8 fail** jer je Save ostao omogućen, a odvojena provjera prije **4/4 fail** jer je kasna slika A zamijenila original usluge B. Nakon ispravke testira se i uspješan drugi upload i njegov tačan mock PATCH payload.
- Već poslani save ne zatvara niti reloadom briše novootvoreni editor: ref serijalizuje spremanja, a uspješan stari save dok je drugi editor otvoren odgađa refresh do zatvaranja tog editora. Ishod savea ostaje vidljiv; ako nema otvorenog editora uspjeh odmah refreshuje, neuspjeh ne. Prije ispravke odgođeni uspjeh **4/4 fail**, neuspjeh **4/4 pass**. U oba slučaja status objašnjava da zatvaranje ne otkazuje poslani zahtjev. To ne otkazuje ni upload niti dokazuje da je server poništio/izvršio mutaciju; učitani fajl nakon zatvaranja može ostati na serveru. Guard se odnosi na editor usluga, ne sve druge otvorene dijaloge ili buduće mutacije.
- Nove mock browser fiksure pokrivaju BS/EN, 320/1280 i uspjeh/neuspjeh, te kasni save nakon zatvaranja bez novog editora. **24/24**, uključujući četiri scoped axe skena pravila `button-name`, `aria-valid-attr`, `aria-allowed-attr` bez violations. To nije puni WCAG/AT pregled; upload picker simulira `setInputFiles`, mock nije backend ni stvarni OS.
- Prvi objedinjeni run **390 passed / 1 failed**: `s8-users-focus-recovery` je pokrenuo scoped axe prije pojave error elementa (`No elements found for include`). Dodato eksplicitno čekanje njegove vidljivosti, bez uklanjanja ijedne axe, retry ili fokus asertacije; ponovljeni retry **20/20**. Ponovljena potpuna S8 regresija **395/395** (prije dodatka četiri scoped axe skena u novom editor testu), zatim taj novi test **24/24** s axe.

Frontend Node **1005/1005**, build, E2E typecheck, pet Python provjera i diff check PASS; lint 0 errors/6 ranijih warnings. Initial **293,7/300 KiB**, Analytics **116,4/140 KiB**. [CI 45416015805](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45416015805) za prethodni `f58097f` završio je **5/5**, rendered **3107/0/0**, uz 15 nepotpunih axe contrast uzoraka. Ovaj paket nije obuhvaćen tim CI-jem; nakon pusha provjeriti novi CI. S8 je otvoren, uključujući nesklad plana za upravljanje galerijom i tablist/sidebar; STOP prije S9, bez merge/deploya.

---

## 2026-11-18 · S8 · Prethodni CI: test upravljanja ulogama

[CI 45407428201](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45407428201) za `097d82d` završio je **4/5**, rendered **3066 passed / 1 failed / 0 skipped**; pao je `a11y-admin.spec.ts` test upravljanja ulogama. Backend, frontend, mobile i repo poslovi prošli su. CI log host vraća EOF, pa se tačna asertacija iz CI-ja ne može nezavisno provjeriti; ima 15 axe incomplete `color-contrast` uzoraka.

Postojeći admin test nakon novog koraka potvrde i dalje je čekao POST odmah po izboru menija. U izolovanom admin browser projektu s lažnim tokenom, mock profilom i API fiksurama taj isti test prije izmjene **1/1 fail** na `additions: očekivano 1, stvarno 0`; kompatibilno je s promjenom UI-ja, ali nije potvrđen tačan CI failure stack. Test sada provjerava potvrdu, ime i ulogu, odsustvo POST-a prije potvrde i tek onda potvrđuje. Zadržane su provjere klijentske uloge, POST payload-a, potvrde/cancel/DELETE uklanjanja uloge i njihovih brojila. Nakon izmjene **5/5** ponavljanja te **4/4** ciljnih admin akcija (uključujući deactivation i reset); mock server je ugašen i privremeni auth fajlovi uklonjeni. Ovo nisu stvarna CI baza, produkcijske mutacije ni AT pregled.

E2E typecheck prolazi, prethodna objedinjena S8 regresija **371/371** ne uključuje admin projekt; novi CI treba provjeriti za cijeli paket. S8 ostaje otvoren.

---

## 2026-11-18 · S8 · Fokus potvrda, paginacije i greške korisnika (rad u toku)

- U korisničkim redovima i karticama explicitni `event.currentTarget` sada prolazi do potvrda reset linka, uklanjanja ne-stilističke uloge i deaktivacije; editor i uklanjanje stiliste već pamte okidače. Sintetički nefokusirajući klik u BS/EN × 320/1280 prije **4/4 fail** na reset potvrdi (editor je prethodno prošao); poslije **4/4** prolaze sva četiri okidača po scenariju i odustajanje bez mockiranih `/api` ili `/auth` writeova. Ovo nije dokaz stvarnog pointer ponašanja svih OS/browser kombinacija.
- Retry neuspjelog učitavanja i paginacija sada fokusiraju stabilni naslov prije uklanjanja ili onesposobljavanja aktivne kontrole: prvi/posljednji skok i Previous/Next samo kada postaju disabled. Prije **16/16 fail** (retry, zadnji broj, Next do posljednje, Previous do prve u BS/EN × viewporti); poslije prolaze uključujući provjeru da odgođeni odgovor ne oduzima fokus koji je korisnik premjestio. Dodatna **4/4** potvrđuju da običan broj i Next koji ostaju omogućeni čuvaju fokus. Četiri scoped axe skena error stanja za `button-name`, `label-content-name-mismatch` i `aria-valid-attr` nemaju violations; nisu potpuni audit.
- Ako učitavanje pretrage ili stranice ne uspije, panel s kontrolama se uklanja. Ranije je fokus ostajao bez cilja: prije **8 stay fail / 8 leave pass** u BS/EN × 320/1280 × pretraga/paginacija; sada je **16/16**. Samo ako je aktivni element još unutar panela neposredno prije važeće greške fokus prelazi na naslov; korisniku koji je otišao drugdje fokus se ne preuzima, a guard starih odgovora ostaje. To ne dokazuje sve browser/AT i asinkrone rasporede.
- `users-a11y.test.mjs` ažuriran da prati novi retry poziv, zadržavajući provjeru izvornog `loadData`, error/status prikaza i sequence guarda, te dodaje provjeru panela i uslovnog fokusa. Prvi Node run **1004/1005** pao je samo na starom tekstualnom obliku `onRetry={loadData}`; nakon ažuriranja **1005/1005**.

Završna samostalna S8 Chromium mock regresija **371/371** (uključuje četiri nova fokusna/axe scenarija s očuvanjem fokusa), Node **1005/1005**, build, E2E typecheck, pet Python provjera i diff check PASS; lint **0 grešaka / 6 ranijih upozorenja**. Initial **293,7/300 KiB**, Analytics **116,4/140 KiB**. Testovi su mockirani, ne potvrđuju stvarne upise niti AT/WCAG audit. Pokriveni su odabrani fokusni tokovi, ne svi redovi ili kombinacije.

[CI 45407428201](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45407428201) za prethodni `097d82d` završio je **4/5**, uz pad admin testa uloga; analiza i ispravka fiksure iznad. Run ne pokriva ovaj nastavak; pushati i pratiti novi CI. S8 ostaje otvoren do CI-ja i pregleda DoD-a, uključujući nesklad plana za galeriju i analitičku navigaciju; STOP prije S9, bez merge/deploya.

---

## 2026-11-18 · S8 · Prethodni CI pad paginacijske fiksure

[CI 45399201915](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45399201915) za `9360e86` je **4/5**, rendered **3042 passed / 1 failed / 0 skipped**; pao je `s8-users-pagination.spec.ts` 1280. Backend, frontend, mobile i repo poslovi prošli su, uključujući standardni Prisma generate i backend test nove galerijske fiksure. Puni log i report/trace nisu dostupni zbog EOF na GitHub Actions storage hostovima, pa tačna asertacija i uzrok CI pada nisu potvrđeni. Axe je iznio 15 incomplete `color-contrast` uzoraka, nisu violations niti dokaz pristupačnosti.

Identificiran je moguć testni race: UI ažurira stranicu prije nego što Playwright zabilježi mrežni zahtjev, a stara fiksura je odmah sinhrono očekivala `queries` da sadrži page 10. Lokalno bez intervencije 1280 **50/50 pass**, pa to ne reproducira stvarni CI pad. Kada se u fiksuri opažanje route odgodi 500 ms, oba viewporta prije ispravke **2/2 fail** na toj asertaciji. `expect.poll` sada čeka *isti* objekt `{page:10,pageSize:20,q:''}`; zadržane su sve postojeće provjere aria-current, granica, search reseta i taba. Odgođena fiksura poslije **20/20** (10 ponavljanja po viewportu). Odgoda je sintetička, a ovo je popravljena ranjivost testa i moguća hipoteza, ne utvrđeni CI uzrok.

Ponovljeni završni mock S8 **331/331**, E2E typecheck, pet Python i diff check PASS; ostali build/Node/lint rezultati su u zapisu ispod. Potreban je novi CI za potvrde korisnika i testnu ispravku, bez tvrdnje 5/5 dok ne završi.

---

## 2026-11-18 · S8 · Potvrde dodjele uloge i deaktivacije u editoru (rad u toku)

S8 zahtijeva potvrdu promjene uloge i deaktivacije. Pregled je pokazao dva nepokrivena puta: izbor dodavanja uloge iz menija odmah je slao POST, a spremanje editora sa ugašenim `isActive` odmah je slalo PATCH. Nova fiksura BS/EN × 320/1280 prije izmjene **8/8 fail** na nepostojećim potvrdama. Ovo su bila dva UI puta, ne tvrdnja da je backend izvršio pogrešnu mutaciju.

- Dodjela uloge sada traži eksplicitnu potvrdu s korisničkim imenom i lokalizovanom ulogom; odustajanje vraća fokus na add-role dugme i ne šalje upis. Potvrda zadržava isti POST, payload, postojeće uslove uloga i specijalnu poruku za STYLIST; vizuelna varijanta potvrde nije destruktivna. Tokom zahtjeva add-role za istog korisnika je disabled/busy, uz sinhroni guard od ponavljanja i fokusni fallback na naslov; nakon mock greške dostupan je novi pokušaj. Guard ne serijalizira druge tipove mutacija, ne otkazuje već poslani zahtjev i nije backend zaštita od konkurencije.
- Editor traži potvrdu samo za prelazak aktivnog u neaktivno stanje; obični edit i aktivacija ostaju direktno spremanje. Escape/odustajanje zatvaraju samo ugniježđenu potvrdu i ostavljaju formu bez upisa. Potvrda zadržava isti PATCH i polja, dok se pri pending stanju fokus vraća na stabilni naslov editora ako Save postane disabled. Nakon mock greške editor i vrijednosti ostaju, a novi pokušaj ponovo traži potvrdu. Negativna kontrola pending fokusa prije fallbacka **4/4 fail**; stariji guard za nested Escape ponovljen **20/20** prije dodavanja naslovnog fallbacka. Validacija forme i dalje živi u postojećem save hooku; potvrda se može prikazati prije poruke o nevalidnoj formi.
- Novi testovi **24/24** pokrivaju potvrdu/cancel i identitet cilja, oba jezika i viewporta, direktno spremanje/aktivaciju, odgođenu grešku i retry. Osam scoped axe skenova potvrda za `button-name`, `label-content-name-mismatch`, `aria-valid-attr`, `aria-required-attr` nema violations; to nije potpun axe/AT audit. Prvi pokušaj skena pogrešno je naveo nepostojeći axe naziv pravila i 8 testova je palo prije skeniranja; ispravljeno je na `aria-required-attr`, zatim **24/24**. Raniji test akcija izmijenjen je samo da potvrdi novi korak prije POST-a; postojeće asertacije svih metoda, putanja, payload-a, ostalih potvrda i dubinske veze ostaju.

Završni samostalni mock S8 Chromium **331/331**, frontend Node **1005/1005**, build, E2E typecheck, pet Python provjera i diff check PASS; lint **0 grešaka / 6 ranijih upozorenja**. Initial **293,7/300 KiB**, Analytics **116,4/140 KiB**. Testovi mockiraju API i ne dokazuju stvarne promjene uloga, uređaje/OS ni AT. `edit-user-dialog.tsx` je sada 173 linije; cilj od približno 100–150 nije tvrdi limit, ali preostalo je razmotriti njegovo izdvajanje.

[CI 45399201915](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45399201915) prethodnog `9360e86` završio je **4/5** zbog jednog pagination testa; detalji i lokalna analiza iznad. Backend je prošao s normalnim Prisma generate/testom, ali CI ne pokriva ovaj paket; pushati i pratiti novi run. S8 ostaje otvoren i ne ide se u S9 prije STOP-a i odobrenja; bez merge/deploya.

---

## 2026-11-18 · S8 · Prazne stranice galerije i retry fokus (rad u toku)

- Stvarni backend prvo paginira dnevne zapise, a zatim mapiranje odbacuje zapise bez dva različita odobrena foto-kandidata. Zato ugovor može legitimno vratiti `items: []`, `hasMore: true` i napredni `nextOffset`; nije dokaz da je cijela galerija prazna. Nova backend unit fiksura s istom slikom u obje uloge potvrđuje prazan prvi page i kasniji ispravan par uz `skip` 0/1. Mockirana Prisma baza ne dokazuje stvarni DB query.
- Frontend je ranije pri `items.length === 0` sakrio sentinel i dugme te pogrešno pokazao prazan rezultat, bez obzira na `hasMore`; nova fiksura prije ispravke **12/12 fail** u BS/EN × 320/1280. Sada nastavlja automatski ili ručno, krajnju praznu poruku prikazuje tek kada više nema stranica, a retry nakon prazne stranice koristi tačan offset. Brojač ostaje fokusna meta i kad posljednja stranica ne sadrži nijedan par; već učitani parovi i guard protiv paralelnih zahtjeva ostaju. Nove fiksure pokrivaju uspješan kasniji par, neuspjeli pa uspješni retry na offsetu 18, stvarno iscrpljivanje i dva uzastopna prazna pagea uz sintetički observer; **16/16**. Observer, API i podaci su simulirani, ne stvarna baza ni svi rasporedi interakcija.
- Retry usluge je prije popravke izgubio fokus kada je loading grana uklonila naslov i dugme: novi test **4 service fail / 4 pairs pass**. Naslov je sada stabilan kroz loading, retry prije zahtjeva fokusira naslov, a zakašnjeli rezultat ne preuzima fokus koji je korisnik premjestio. Nakon ispravke **8/8** u BS/EN × viewporti. Ukupno galerijski retry, paginacija, ranije utrke i slider **51/51**.
- Posljednji potpuni S8 Chromium mock run **307/307**, frontend Node **1005/1005**, build i E2E typecheck, pet Python provjera i diff check PASS, lint **0 grešaka / 6 upozorenja**; initial **293,7/300 KiB**, Analytics **116,4/140 KiB**. Backend suite **12/12** uključujući novu fiksuru prolazi lokalno uz eksplicitni test-only stub Prisma enum vrijednosti i mockiranu bazu: `npm ci` nije preuzeo Prisma engine jer je `binaries.prisma.sh` nedostupan u sandboxu, te lokalni Prisma generate/backend build nisu dokazani. CI mora odraditi standardni generate/build i test bez tog stuba. Nije stvarni AT, OS ili produkcijska transakcija.

[CI 45392038969](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45392038969) za prethodni `f2bd682` završen je **5/5**, rendered **3019 passed / 0 failed / 0 skipped**; ne obuhvata ovaj nastavak, za koji je potreban novi CI. S8 ostaje otvoren zbog CI-ja, potpunog DoD pregleda i nesklada plana oko gallery akcija/tab navigacije; STOP prije S9, bez merge/deploya.

---

## 2026-11-18 · S8 · Pointer fokus i ručna paginacija galerije (rad u toku)

- U Services dijalozima `document.activeElement` nije pouzdan okidač kada klik ne fokusira dugme. Eksplicitni `event.currentTarget` prolazi kroz katalog i tabelu do editor/deletion dijaloga i opcionalnog `trigger` u zajedničkoj potvrdi; drugi pozivači zadržavaju prethodni fallback. BS/EN × 320/1280 fiksura je prije promjene **4/4 pala na prvom okidaču**, poslije **4/4** prolazi svih devet okidača i cancel bez mock writeova. `dispatchEvent` simulira nefokusirajući klik, ne dokazuje ponašanje stvarnog miša u svim OS/browser kombinacijama.
- Work Gallery je zapravo read-only before/after prikaz dnevnika, bez UI-ja za upload, brisanje i reorder koji se spominju u S8 planu. Nismo dodavali niti tvrdimo pokrivenost nepostojećih akcija; nesklad treba razriješiti prije zatvaranja faze. Automatska paginacija dosad nije nudila alternativu ako observer ne javlja presjek; početna fiksura nakon korekcije putanje slike **4/4 fail** na nedostajućem dugmetu. Dodani lokalizovano ručno učitavanje, status učitavanja, vidljivi broj učitanih poređenja i fokusni fallback prije uklanjanja dugmeta; observer i zaštita od paralelnih zahtjeva ostaju. BS/EN × 320/1280 × tihi/nedostajući observer **8/8**, uključujući tastaturu, jedan zahtjev, zadržavanje ranijih podataka i nepreuzimanje fokusa nakon odgovora. Zajedno sa starim race i slider testovima **23/23**. Nije simuliran stvarni assistive technology ni sve moguće kombinacije observera i fokusa.
- Build **293,7/300 KiB** initial i **116,4/140 KiB** Analytics; cijeli S8 mock Chromium **283/283**, Node **1005/1005**, E2E typecheck, pet Python provjera i diff check prolaze; lint **0 grešaka / 6 upozorenja**. Nakon tipografske ispravke TypeScript fiksure (bez promjene scenarija) ciljani run galerije opet **8/8**. S8 sadrži Salon i Users pozivače zajedničke potvrde; ostale pozivače i stvarni AT/backend ne predstavljamo kao potpuno provjerene.

[CI 45385829364](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45385829364) za prethodni `482fa2f` završen je **5/5**, rendered **3007 passed / 0 failed / 0 skipped**; ne obuhvata ovaj nastavak. Potreban je novi CI za nastavak. S8 ostaje otvoren, uključujući dogovor o tablist/sidebar i nesklad galerije, bez merge/deploya i bez prelaska u S9 prije STOP-a i odobrenja.

---

## 2026-11-18 · S8 · Objedinjeni paket: graf, fokus i veći moduli (rad u toku)

Prethodni [CI 45376878389](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45376878389) za `258ad4b` završio je **5/5**, rendered **2991 prošao / 0 palo / 0 preskočeno**; axe `color-contrast` ima 6 incomplete uzoraka u tom runu. On ne obuhvata nove izmjene ispod.

- Graf mjesečnih finansija je bio interaktivni Recharts SVG unutar `role=img`, pa interaktivni potomak nije bio zasebno izložen u pristupačnom stablu i nije imao vlastito ime. Nova fiksura BS/EN × 320/1280 prije promjene **4/4 fail** na imenovanom grafu. Sada SVG zadržava Recharts `application`/keyboard sloj, ima lokalizovano ime i opis povezan s **vidljivim** `figcaption` sažetkom iz istih izračuna i uputom za strelice; tabela ostaje iz istih `chartData`. Test ulazi Tab-om, provjerava fokusni outline, lijevo/desno mijenja tooltip 100→200→100, izlazi Tab-om i otvara tabelu s neto 150, uz četiri ciljana axe skena bez violations. Ažurirani izvorni test umjesto starog `role=img` provjerava povezani sažetak, ime i tastaturni sloj; ranije provjere zbirova i pet kolona ostaju. Ovo nije dokaz rada sa stvarnim čitačem ekrana; `role=application` i live-region zahtijevaju S11 AT provjeru.
- Fokus usluga: na retry i spremanje editorom prije popravke **8/8 fail** pri odgođenom čitanju; fokus odlazi na stabilni naslov ako će fokusirani dio stranice nestati, te se ne preuzima po dovršetku ako korisnik ode drugdje. Potvrda brisanja usluge prije **4/4 fail** na povrat fokusa nakon odustajanja; sada pamti okidač i koristi naslov ako je okidač uklonjen. BS/EN × širine provjeravaju i mock potvrđeni DELETE, učitavanje i da kasni odgovor ne vraća fokus korisniku koji se pomjerio. Fokus kroz miš u svim preglednicima i ostale rasporede događaja nije dokazan; već poslani zahtjev se ne otkazuje.
- Kompetencije frizera: dva dostupna checkboxa sa istim nazivom prije **4/4 fail**, pa dobijaju skriven redni broj za razlučivanje. Nakon uklanjanja/odabira element nestaje iz liste; fokus prije **4/4 fail**, sada prelazi na stabilni naziv odgovarajuće liste. Fiksura pokriva Space, odabir druge istoimene kompetencije i lokalizacije, s ciljanim axe skenovima. Redni broj zavisi od trenutnog kataloga, nije stabilni ID.
- Razdvojeni su veći moduli uz očuvanje ponašanja: `use-salon-management` **221→148**, `service-deletion-dialog` **209→128**, `stylist-removal-dialog` **206→114**, `service-fields` **193→112**, `stylist-editor-dialog` **173→114**, `use-user-editor` **180→146**, `use-user-row-presentation` **184→127**, `use-service-editor` **183→163**, `use-stylist-removal` **199→159**. Novi moduli izdvajaju podatke i mutacije salona, izbor/preview brisanja, sliku i status usluge, kompetencije, finansijske opcije i zapise za uklanjanje, izračun payload-a, query dugova i akcije korisničkog reda. API putanje, uslovi spremanja i payload nisu namjerno mijenjani. Izvorni testovi ažurirani prate kompletnu kompoziciju i izvorne provjere, uključujući query-key/invalidation, deep-link i kontrastnu allowlistu; dodane su provjere priključenih child komponenti i čuvanja uslova potvrde. Testovi mockiraju upise i ne dokazuju stvarne transakcije.

Svi glavni S8 page fajlovi su **46–150 linija**; još šest izdvojenih modula imaju 151–173 linije (cilj plana je približno 100–150, nije tvrdi limit). Lokalni objedinjeni S8 mock Chromium **271/271**, frontend Node **1005/1005**, build/typecheck, pet Python provjera i diff check prolaze; lint **0 grešaka / 6 ranijih upozorenja**. Initial **293,6/300 KiB**, Analytics **116,4/140 KiB**. Jedan međurun imao je 4 ENOENT artefaktna pada jer su dva Playwright procesa istovremeno čistila isti `test-results`; zasebni i završni objedinjeni run su naknadno prošli bez paralelnih Playwright procesa.

**DoD pregled, ne potvrda završetka:** analitički overview/hub, klijentska i frizerska analitika, korisnici, salon, usluge, frizeri i work gallery imaju izdvojene stranice i ciljane mock testove učitavanja/greške/sadržaja, action imena i relevantne ugovore; prethodni zapisi navode pojedinačne scenarije i ograničenja. Postojeći odobreni M1/Q7 prikaz koristi tri sidebar **linka** s `?tab=` i `aria-current`, a ne `role=tablist` kako tekst S8 plana predlaže; postojeći routing/redirect test je zelen, UI nije prepravljan mimo odluke. Potrebno je provjeriti da je ovo usklađenje plana prihvatljivo prije zatvaranja. Završni CI za ovaj paket još nije pokrenut u trenutku zapisa; stvarni AT, 400% i potpuni pregled DoD-a ostaju otvoreni. Bez merge/deploya; S9 tek nakon S8 STOP-a i odobrenja.

---

## 2026-11-18 · S8 · Semantika kataloga i objedinjena regresija (rad u toku)

U kategorijskom Radix accordion triggeru bili su ugniježđeni zasebni buttoni; prethodni komentar da je to pristupačno nije bio ispravan. Nova BS/EN × 320/1280 mock fiksura je prije promjene našla **šest ugniježđenih buttona u sva četiri scenarija**. Akcije kategorije su sada semantička braća triggera; kategorije/potkategorije su izdvojene iz kataloga u komponente, a zajednička funkcija za imena čuva dotadašnje razlučivanje duplikata po redoslijedu. Dodani su BS/EN nazivi „Dodaj uslugu“ sa potkategorijom, i skriveni redni broj za istoimene accordion triggere. Brojevi nisu stabilni identifikatori. U editoru se pri zatvaranju vraća fokus zapamćenom elementu ako je još u DOM-u; testirano je tastaturno odustajanje, ne svi scenariji uklanjanja okidača ili fokus mišem u svim preglednicima.

Fiksura provjerava da kategorijske akcije ne mijenjaju accordion, cilj novog mock POST-a (`cat-2`), jedinstvena imena, tastaturno otvaranje i povrat fokusa, te scoped axe `nested-interactive`, `button-name` i `label-content-name-mismatch`. Nakon promjene **4/4** (uključeno u paket ispod). Prva objedinjena regresija **253 prošla / 2 pala** jer je postojeći test tražio stari tačan naziv „Add service“; selektor je promijenjen u novi tačan naziv s potkategorijom, dok asertacije kreiranja, uploada i cjelokupnog tijela zahtjeva ostaju iste. Source-contract test prati potpunu kompoziciju stranica → katalog → kategorija → potkategorija → tabela; uklonjen je sada nepotreban `jsx-a11y` disable, a kontrast allowlist seli se s ikonom u novi fajl, bez promjene praga.

Završna lokalna S8 mock regresija **255/255**, Node **1003/1003**, build i E2E typecheck prolaze; lint **0 grešaka / 6 ranijih upozorenja**, pet Python provjera i diff check prolaze. Initial **293,5/300 KiB**, Analytics **116,4/140 KiB**. Lokalni Chromium 153 i mock write nisu provjera produkcijske baze, stvarnog OS pickera ili AT/WCAG audita. [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za `73726f6` ima četiri uspješna posla, rendered još traje u trenutku zapisa; ove izmjene nisu njime obuhvaćene.

S8 nije proglašen gotovim: CI za konačni commit nije potvrđen 5/5; 13 izdvojenih TS/TSX modula prelazi 150 linija (najveći 221), a nisu dovršeni pregled svih DoD polja, tooltip tastatura/AT i fokus nakon nestanka okidača. Nazivi s rednim brojevima nisu trajni ID. Prije S9 potrebno je dovršiti otvoreno i slijediti STOP iz S8 plana; nema merge/deploya.

---

## 2026-11-18 · S8 · Akcije otpisa u editoru korisnika (rad u toku)

Više otvorenih dugovanja imalo je isti pristupačni naziv „Otpiši dug“. Novi BS/EN × 320/1280 mock scenariji s dva ista iznosa/usluge i jednom stavkom bez usluge prije promjene padaju **4/4**. Izdvojen je `user-debts-panel.tsx` (76 linija; `edit-user-dialog.tsx` **213 → 158**), uz očuvanje klijentskog query/retry/invalidation ugovora. Naziv radnje sada zadržava vidljivi tekst i dodaje uslugu ili lokalizovani fallback, formatirani iznos i redni broj liste (broj se može promijeniti kad se lista promijeni). Fiksura tastaturom provjerava odustajanje bez zahtjeva, fokus i potvrdu upravo drugog duga s ispravnim mock PATCH tijelom; četiri scoped axe provjere `button-name` i `label-content-name-mismatch` ne prijavljuju violations.

Pri prvoj široj regresiji nakon imenovanja desktop Escape je povremeno zatvarao roditeljski editor umjesto ugniježđene potvrde, ostavljajući potvrdu otvorenom (mobilne fiksure prolazile). Čekanje da se fokus uspostavi unutar potvrde samo po sebi nije uklonilo problem: široki run **249 prošlo / 2 pala**. Editor sada, ako dobije zahtjev za zatvaranje dok potvrda postoji, zatvara potvrdu umjesto sebe; odustajanje ne šalje PATCH. Poslije popravke **20/20** ponovljenih fiksura prolazi. Namjernim isključivanjem guard-a reproducirano **3 pada / 7 prolaza**, potvrđujući intermitentnost; izvor i pozitivni build su vraćeni. Ova zaštita ne otkazuje već poslani server zahtjev niti dokazuje sve rasporede događaja.

Završno mock S8 **251/251**, Node **1003/1003**, build/E2E typecheck, lint 0 grešaka/6 ranijih upozorenja i pet Python provjera prolaze; Initial **293,5/300 KiB**, Analytics **116,4/140 KiB**. Mock API i Chromium 153 nisu dokaz stvarnog finansijskog otpisa niti nezavisni AT/WCAG audit. [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za prethodni `73726f6` pri zapisivanju još traje; novi push bi ga otkazao. S8 ostaje otvoren.

---

## 2026-11-18 · S8 · CI ažuriranje

[CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` završio je **5/5**, rendered **2963 prošla / 0 pala / 0 preskočenih**, sa 15 incomplete axe uzoraka kontrasta. Nakon toga pushani su `39421cd`, `d09f266`, `ab2e229` i `73726f6`; [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za zadnji commit tek počinje. Prethodni zeleni CI ne dokazuje ovaj novi skup promjena; S8 i dalje otvoren.

---

## 2026-11-18 · S8 · Prezentacija klijentske analitike (rad u toku)

`ClientAnalytics.tsx` izmjeren na **161 liniju** i smanjen na **134**, premještanjem postojećeg lokalizovanog formatiranja datuma, statusa, imena i fallbacka u `use-client-analytics-presentation.ts` (**32** linije). Pozivi, route/deep-link i izračuni nisu mijenjani. Source-contract i18n test sada prati vezu stranica → hook i iste provjere datuma/statusa, umjesto da traži izdvojeni kod po staroj putanji.

Prije pozitivnog builda testirana je prethodna verzija (`dist` iz `ab2e229`) sa promjenom EN → BS, fallback korisničkog/stylist imena, nepoznatog statusa i neispravnog datuma, datum-only vrijednosti te dvije vremenske zone i širine; **4/4** prolaze prije i poslije. Lokalni Chromium s ograničenim ICU za BS prikazuje `M01` umjesto mjeseca iz Node ICU; prvi test zato nije valjano pretpostavio isti literal kao Node i prilagođen je očekivanju browserovog `Intl` u UTC, bez promjene proizvoda. Nakon refaktora klijentski skup **21/21**, kompletni mock S8 **247/247**, Node **1003/1003**, build/E2E typecheck, lint 0 grešaka/6 ranijih upozorenja, pet Python provjera i diff check prolaze; bundle **293,4/300 KiB**, Analytics **116,4/140 KiB**. Mock i Chromium 153 nisu CI Chromium 158 ili nezavisni AT/WCAG pregled. CI [45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` još radi pri zapisivanju; novi push bi ga otkazao. S8 je i dalje otvoren.

---

## 2026-11-18 · S8 · Paginacija frizera i fokus (rad u toku)

Kod promjene stranice lista sakrije paginaciju tokom čitanja, pa se fokusirani okidač ukloni. Reprodukcija odgođenog odgovora prije popravke daje **4/4** padova fokusa (BS/EN × 320/1280); test koji pomjeri fokus drugdje tokom čitanja prolazio je i ranije. Odvojeni retry nakon greške je prije popravke također izgubio fokus **2/2**. Paginacija je izdvojena iz `Stylists.tsx` (**159 → 146 linija**, novi modul **36**); prije promjene stranice fokus se sinhrono prebaci na postojeći fokusabilni naslov, koji se ne uklanja tokom učitavanja. Isto vrijedi za retry liste nakon greške; nema naknadnog preuzimanja fokusa ako korisnik ode drugdje. Zadržani su onemogućeni krajevi paginacije, parametri page/pageSize, broj stranica, error/retry i izbor tražene stranice.

Nove fiksure provjeravaju tastaturu, odgođen odgovor, prvu/zadnju stranicu, povrat, pomjeranje fokusa i 500 → retry na istoj stranici, kao i retry inicijalne greške. U početnom pisanju testova pogrešni nazivi kontrola i dva `status` čvora su ispravljeni prije navedene negativne kontrole. Nakon promjene ciljano **40/40** frizerskih scenarija (prije dodavanja još jednog page-error retry testa), završno kompletan mock S8 **243/243**, Node **1003/1003**, build, E2E typecheck, lint 0 grešaka/6 ranijih upozorenja i pet Python provjera prolaze. Budžeti 293,4/300 KiB i Analytics 116,4/140 KiB. Ovo je automatizovana mock provjera na Chromium 153, ne OS/AT audit ni dokaz svih rasporeda odgovora. CI [45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` pri pisanju još traje; ne pushati dok ne završi jer bi workflow otkazao postojeći run. S8 ostaje otvoren.

---

## 2026-11-18 · S8 · Izdvajanje prazničnog panela salona (rad u toku)

`Salon.tsx` izmjeren na **162 linije** prije i **128** poslije izdvajanja u `salon-holidays-panel.tsx` (**57** linija). Panel preuzima samo prikaz praznika i retry s istim fokusnim pravilom; hook, endpointi, potvrda, editor, tab i handleri ostaju kao prije. `holidayTabRef` se prosljeđuje iz stranice, a ref retry dugmeta živi u panelu. Source test sada eksplicitno povezuje stranicu → panel → tabelu i provjerava proslijeđene radnje, blokadu i retry; ranije semantičke provjere svih pet tabela ostaju. Posebno su ponovo pokrenute postojeće fiksure kasnog čitanja i prebacivanja fokusa/tabova kako bi se pokrili mount/unmount i pending retry.

Rezultati: Salon **64/64**, kompletan mock S8 **235/235**, Node **1002/1002**, build i E2E typecheck, lint 0 grešaka/6 ranijih upozorenja, pet Python provjera i diff check prolaze. Initial bundle **293,4/300 KiB**, Analytics **116,4/140 KiB**. Mock podaci i lokalni Chromium 153 (CI očekuje 158) nisu nezavisni AT/WCAG pregled ni stvarne server mutacije. CI [45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za raniji `8dc9e02` pri zapisivanju još radi (4 uspješna, rendered u toku); novi lokalni commit ne pushati dok prethodni run traje jer bi ga workflow otkazao. Zatim verificirati zaključak i pokrenuti CI za sve nove commitove. S8 ostaje otvoren.

---

## 2026-11-18 · S8 · Razlučivi detalji klijentske analitike (rad u toku)

U tabeli rezervacija sva dugmad za detalje zvala su se samo „Detalji“, a kartice recenzija za istu uslugu imale su jednak naziv. Nova fiksura s po dvije stavke iste usluge, datuma i vremena prije promjene pada **8/8** (BS/EN × 320/1280 × rezervacije/recenzije). Imena sada uključuju vidljivu uslugu i lokalizovani datum, rezervacije i vrijeme, te lokalizovani redni broj u aktuelnoj listi — razlikuju se i kad su ostali podaci jednaki. Redni broj prati redoslijed liste i može se promijeniti kada se lista promijeni; nije identifikator zapisa. Test otvara svaku stavku tastaturom, provjerava baš njenu bilješku/komentar, Escape i povrat fokusa. Osam ciljanih `button-name`/`label-content-name-mismatch` axe skenova po aktivnom panelu ne prijavljuje violations; to nije potpun WCAG ni AT pregled.

Sačuvane su garancije source-contract testa: klikabilan red bez nedozvoljenog tab fokusa i posebno imenovano dugme; ažurirani su očekivani ključ i provjera BS/EN placeholdera. Prvi Node run pao je 2/1001 zbog prethodnog doslovnog ključa, poslije ažuriranja **1001/1001** prolazi. Mock S8 **235/235** prije dodavanja ciljnih axe asertacija, zatim nova fiksura s axe **8/8**, E2E typecheck, build **293,4/300 KiB**, Analytics **116,4/140 KiB**, lint 0 grešaka/6 ranijih upozorenja i pet Python provjera prolaze. Lokalni Chromium 153 umjesto CI 158; testovi koriste mock API. CI [45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` pri pisanju je **4 uspješna i rendered u toku**; ne pushati novi commit dok taj run traje jer workflow otkazuje prethodni run za istu granu.

---

## 2026-11-18 · S8 · CI O4 praznik: ispravka fiksure (rad u toku)

CI [45349480169](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45349480169) za `1458f91` završio je **4/5**: rendered a11y **2953 passed / 1 failed**, `O4 salon holiday: cancel and confirm isolated deletion` timeout 60 s; 15 axe uzoraka ostaje incomplete. Puni CI log nije dostupan (EOF); anotacija ne navodi tačan korak. O4 mock praznik nije sadržavao `message` i `pushSentAt`, iako backendov Prisma `Holiday` uključuje oba nullable polja, pa ga validator koji je stigao u `1458f91` odbija. Lokalno pokretanje istog testa u izolovanoj mock admin sesiji s izvornom fiksurom reproduciralo je timeout čekanja taba Praznici i ekran greške. Nakon dodavanja dva `null` polja test prolazi **5/5**, bez uklanjanja provjera otkazivanja, fokusa i jednog DELETE zahtjeva; eksplicitno čekanje taba ograničeno na 10 s daje konkretniju CI anotaciju ako učitavanje ponovo padne. Budući da CI detaljni log nije dostupan, fiksura je potvrđen lokalni uzrok identičnog simptoma, ne dokaz stvarnog poziva koji je istekao u CI-ju. Mock admin sesija i Chromium 153 nisu CI izolovana baza i Chromium 158; potreban je novi CI.

---

## 2026-11-18 · S8 · Blokiranje zastarjelih akcija praznika (rad u toku)

Prije ispravke korisnik je mogao dodavati, uređivati, brisati ili slati obavijesti iz zastarjelog prikaza; pet BS/EN i otvoreni-editor fiksura padaju prije promjene. Tokom osvježavanja i nakon neuspjeha akcije su disabled, a upozorenje objašnjava zašto; nakon uspješnog retryja ponovo su dostupne. Već otvoren editor ne može spremiti dok read traje ili je neuspješan i prikazuje status/grešku s uputom za zatvaranje i retry. Već otvorena potvrda brisanja zatvara se kad read počne bez slanja DELETE-a; sinhroni ref guard dodatno odbija stare event-handlere i potvrdu prije React rerendera. Započeti server write nije moguće otkazati i ova promjena ne garantuje serializaciju dva write-a koja su već počela.

Fokus na akciji koja postaje disabled prebacuje se na tab praznika, ali se ne preuzima ako je korisnik otišao drugdje; i editor/potvrda imaju siguran povrat na tab kad prethodni okidač nije dostupan. `AdminConfirmDialog` dobio je opcioni fallback ref; normalni dostupni okidač i dalje ima prednost. Dvije fiksure fokusa prije popravke padaju; namjerno uklanjanje fallbacka ruši potvrdu 1/1, izvor i build vraćeni, test opet prolazi. Postojeća utrka dva čitanja sada pokreće oba POST-a prije početka refresh-a, a zatim odgađa odgovore kao ranije: očuvana je provjera starog 200/500 rezultata i tačno dva write-a, uz novu zaštitu UI-ja. Prva objedinjena regresija je 226/227 zbog testa koji je očekivao vidljiv neaktivni panel nakon što je fokus na Radix tabu automatski aktivirao drugi tab; test sada provjerava fokus/odabrani tab i dovršetak odgovora, ne pretpostavlja vidljivost skrivenog panela. Završno mock S8 **227/227**, Node **1001/1001**, lint 0 grešaka/6 ranijih upozorenja, build **293,4/300 KiB**, Analytics **116,4/140 KiB**, E2E typecheck i pet Python provjera prolaze. Lokalni Chromium 153 nije Playwrightov očekivani 158; mock i ograničeni axe nisu stvarni AT, svi server rasporedi ni potpuni WCAG audit. CI za ovaj nastavak tek slijedi; nema merge/deploya.

---

## 2026-11-18 · S8 · Osvježavanje praznika i izdvajanje hooka (rad u toku)

Simulirani odgođeni odgovori pokazali su da stariji uspješan dohvat praznika može prepisati noviji, uključujući preplitanje s potpunim ponovnim učitavanjem salona; `holidays: null` je prethodno izgledao kao prazna lista. Za četiri takve fiksure negativni build sa starim hookom pada, dok dvije druge prolaze; četiri dodatne fiksure za neispravan datum, `sendPush`, ID i dupli ID padaju prije stroge validacije. Sada generacija, sesija i identitet salona razdvajaju potpuni i parcijalni read; stariji rezultat ne prepisuje noviji, a promjena salona prihvata praznike novog salona. Za obje putanje validiraju se jedinstveni ID-jevi, kalendarski datumi i polja potrebna editoru. Neispravan ili neuspješan parcijalni read zadržava posljednji prikaz uz upozorenje da može biti zastario, te nudi zaseban retry čitanja bez ponovnog slanja notifikacije; prazna prethodna lista u grešci se ne prikazuje kao pouzdano prazna. Fokus se nakon uspješnog retryja vraća na tab, osim ako ga je korisnik pomjerio drugdje.

`use-salon-management` 292 → 221 linija; akcije/stanje praznika izdvojeni su u `use-salon-holidays` (134), a validacija u poseban modul. Izvorni endpointi, payloadovi, potvrde i namjerni efekti nisu mijenjani. Ciljani salon **55/55**, puni mock S8 **218/218**, frontend Node **1001/1001**, lint 0 grešaka/6 ranijih upozorenja, build **293,2/300 KiB**, Analytics **116,4/140 KiB**, E2E typecheck i pet Python provjera prolaze; 4 BS/EN × 320/1280 retry fiksure prije UI popravke padaju, poslije prolaze uz ograničeni axe za nazive/ARIA. Negativna kontrola bez zaštite kasne greške ruši 1/1; bez session pre-guard-a test dokazuje dodatni GET nakon promjene sesije (1/1 fail), a izvor/build vraćeni i pozitivni test ponovljen. Mock ne dokazuje stvarni backend, sve rasporede zahtjeva ni AT: već poslani write može uspjeti nakon promjene sesije, a prikazani stari redovi za vrijeme greške ostaju interaktivni. S8 i S11 ručni dokazi ostaju otvoreni; CI ovog nastavka tek slijedi. Nema merge/deploya.

---

## 2026-11-18 · S8 · Nazivi klizača galerije radova (rad u toku)

Više prije/poslije klizača uz uslugu imalo je isto pristupačno ime. BS/EN × 320/1280 browser fiksure prije ispravke padaju 4/4, jer traženi razlučivi nazivi ne postoje. Pri više trenutno učitanih parova koriste se postojeći lokalizovani nazivi s rednim brojem i brojem učitanih parova; jedan par zadržava postojeći naziv. Pri učitavanju sljedeće stranice broj se ažurira i odnosi se samo na trenutno učitane parove, ne na ukupan broj na serveru. Testovi provjeravaju neovisno upravljanje tastaturom, te prijelaz jednog para u dva nakon paginacije. Ciljani galerijski skup 19/19, puni mock S8 199/199, Node 1001/1001, lint 0 grešaka/6 ranijih upozorenja, build 293,2/300 KiB i typecheck prolaze; API i fotografije nisu mijenjani. Sintetički preglednik nije stvarni AT ni dokaz sadržaja/slikovnih opisa. CI ovog nastavka tek slijedi; S8 ostaje otvoren.

---

## 2026-11-18 · S8 · Kompozicija analitičkog pregleda (rad u toku)

`Analytics.tsx` 388 → 68 linija: filter perioda, finansijski sažetak, graf/tabela i tabele uspješnosti izdvojeni su u četiri modula od 80–98 linija. Učitavanje, redoslijed hookova i izračun grafa/sumarnog opisa ostaju na stranici; preset vrijednosti, formati, obračuni, sadržaj, deep-link, endpoint i query parametri nisu namjerno promijenjeni. Filter je stalno montiran tokom loading/error stanja, pa zadržava izabrane datume i za retry.

Tri postojeća source-testa prilagođena su novim putanjama uz dodatne provjere importa i renderovanja komponenti; zadržane su provjere datuma, iznosa, deep-linka, sažetka, pet imenovanih kolona i `data-label` vrijednosti. Četiri nove mock BS/EN × 320/1280 fiksure provjeravaju stanje filtera tokom odgođenog zahtjeva i greške, iste retry parametre, deep-link i vrijednosti grafa/tabele. Ciljani browser 7/7, puni mock S8 **194/194**, frontend Node **1001/1001**, lint 0 grešaka/6 ranijih upozorenja, build **293,2/300 KiB** i Analytics **116,4/140 KiB**, typecheck te svih pet Python provjera prolaze. Negativna kontrola koja namjerno remounta filter pri promjeni loading stanja ruši sva 4 testa na gubitku unesenog datuma; izvor i build vraćeni, 4/4 potom ponovo prolazi. Lokalni Chromium 153 nije Playwrightov očekivani 158; mock API i source provjere nisu stvarni backend niti puni WCAG/AT audit. CI za ovaj nastavak tek slijedi. S8 i ručni S11 dokazi ostaju otvoreni; nema merge/deploya.

---

## 2026-11-18 · S8 · Učitavanje galerije i zakašnjeli odgovori (rad u toku)

Simulirana promjena usluge tokom odgođenog čitanja pokazala je da stari uspjeh/greška može prepisati novi naziv, slike ili stanje greške; četiri takva browser scenarija prije popravke padaju. Malformiran `items` se ranije prikazivao kao prazna galerija: sva četiri BS/EN × 320/1280 scenarija padaju prije ispravke. Hook sada zasebno prati generaciju čitanja usluge i stranice, vlasništvo prema serviceId/sesiji i paralelni zahtjev za stranicu, te odbacuje neispravne podatke/offset uz postojeći retry. Kod greške naredne stranice već učitane slike ostaju; retry ponavlja istu stranicu. Nisu promijenjeni endpointi, parametri ili server. Nije dokaz snapshot dosljednosti pri istovremenim izmjenama baze.

Poslije ispravke 14/14 ciljanih testova, uključujući retry malformirane naredne stranice i zakašnjeli odgovor te stranice nakon promjene usluge; kompletni mock S8 **190/190**, frontend Node **1001/1001**, lint 0 grešaka/6 ranijih upozorenja, build **293,2/300 KiB**, Analytics **115,9/140 KiB** i E2E typecheck prolaze. Browser je lokalni Chromium 153 uz Playwright koji očekuje 158; CI koristi propisanu verziju. Mock testovi ne dokazuju stvarni backend, asistivnu tehnologiju ili puni WCAG audit. CI za ovaj nastavak tek slijedi. S8 ostaje otvoren, uključujući preostalo razbijanje velikih fajlova i završnu DoD provjeru; nema merge/deploya.

---

## 2026-11-18 · S8 · Razlučivi nazivi frizerskih akcija (rad u toku)

Akcije uređivanja/analitike u redovima sada u BS/EN sadrže korisničko ime (fallback user ID), a akcija uklanjanja kompetencije sadrži naziv usluge. Isti nazivi se na trenutnoj stranici/katalogu razlučuju rednim brojem; vizuelni podaci, link analitike, ciljni zapis i ponašanje ostaju isti. Mock BS/EN × 320/1280 uključuje sintetičke duplikate, cilj linka, uklanjanje kompetencije, povrat fokusa i ciljani axe (`button-name`, `link-name`, `label-content-name-mismatch` za tabelu). Prije promjene 4/4 padaju na nejedinstvenim nazivima redova; nakon promjene 4/4 prolaze, a negativna kontrola uklanjanja imena kompetencije ruši 4/4. Original vraćen. To nije potpuni audit pristupačnosti.

Source test `generic-aria-and-row-actions-a11y` sada za frizere provjerava interpolirano ime i isti edit handler; ostale asercije ostaju nepromijenjene. Paket frizeri/admin 41/41, završni mock S8 Chromium 180/180, frontend Node 1001/1001, lint 0 grešaka/6 ranijih upozorenja, build 293,2/300 KiB, Analytics 115,9/140 KiB i typecheck prolaze. Preostali S8 i ograničenja dokumentovani su ispod. Nema merge/deploya.

---

## 2026-11-18 · S8 · Sigurniji frizerski editor i stanja salona (rad u toku)

**Frizeri:** neuspjeh liste više nije prazna lista, već lokalizovana greška s retry; loading je status. Editor se otvara u loading stanju, ali ne dopušta spremanje dok radno vrijeme, dodijeljene kompetencije i kompletni katalog ne stignu i ne prođu validaciju. Kod neuspjeha ili neispravnog/nepotpunog read-a daje grešku/retry umjesto ranijih podrazumijevanih/praznih podataka. Namjenska stroga varijanta čitanja kataloga odbija malformirane i očigledno nepotpune/truncirane stranice; prethodni potrošači zadržavaju stari helper. Editor odbija datumske izuzetke i više smjena na isti dan, jer ih postojeći obrazac ne može sigurno predstaviti pri replacement write-u. Prikazuje objašnjenje; to namjerno ograničava uređivanje takvih rasporeda dok ne postoji odgovarajući editor.

Postojeći PATCH i dva POST-a, sadržaj i role nisu namjerno mijenjani. Dodatni sequence/session guard sprječava starije read odgovore i sprječava započinjanje dva replacement POST-a nakon promjene sesije usred PATCH-a; već poslani PATCH se ne može povući i ta tri server zahtjeva nisu jedna transakcija. Osim toga, zakašnjeli uspjeh refresha trenutno odabranu stranicu, a ne onu s početka spremanja. Fokus se po zatvaranju vraća na pokretač ili naslov ako red više nije montiran. `use-stylist-management` 170 → 53, editor hook 136 linija. Paginacija nije snapshot izolovana od istovremenih server izmjena; kompletan katalog iz ovog klijentskog testa nije garancija konkurentne dosljednosti.

**Salon:** BS/EN × 320/1280 baseline 16/16 očekivanih padova (loading heading/status te greške i malformiran odgovor); realan uspješan null fallback ostaje prazno stanje. Loading sada ima jedan heading i status, a neuspjela/malformirana čitanja grešku i retry umjesto obrasca za kreiranje. Zadržan je list → public/detail fallback i postojeći ensure za uspješno potvrđen prazan raspored. Salon read odbija nepotpune/neispravne podatke, a sequence/session guard ignoriše zastarjele rezultate i ne započinje fallback za njih. Gallery service loading sada ima naslov/status, a loading parova status. Izvorni heading test prilagođen je četiri međusobno isključive grane i i dalje zahtijeva tačno jedan h1 po grani; novi browser testovi to provjeravaju i renderovano. Prije popravke gallery loading 4/4 očekivano padao.

**Dokazi:** frontend Node **1001/1001**, mock S8 Chromium **176/176**, build **293,2/300 KiB**, Analytics **115,9/140 KiB**, lint 0 grešaka/6 ranijih upozorenja, E2E typecheck, i18n **2816/2816**, CI indeks, hygiene, 758 doc linkova i 148 source kontrast parova prolaze. Mock S8 Chromium paket je pokrenut zasebno; provjera `npx playwright test --list` pokazuje da postojeći `test:a11y-routes` u CI-ju već obuhvata svih 176 aktuelnih S8 Chromium scenarija, pa nije dodavan dupli CI korak. Time se ispravlja raniji navod da S8 browser specovi nisu u CI-ju: nisu zaseban korak, ali ulaze kroz postojeći Playwright glob. Negativne kontrole ruše **3/3** (stari editor read 200/500 i sesija tokom PATCH-a) te **2/2** (salon stale 200/500); originali vraćeni. Late-save/stranica test prije ispravke očekivano pada. Mock API ne dokazuje stvarne DB transakcije, paralelne server izmjene, uređaje, čitač ekrana ili puni WCAG audit.

CI [45241818125](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45241818125) za `864e1f6` je **5/5 success**; nakon toga pushan `9861370`, CI [45251212312](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45251212312) pri bilježenju 4 success, rendered a11y još traje. Ovaj zahvat još nije u tom CI-ju; ne pushati dok prethodni ne završi 5/5. Nema merge/deploya.

**Preostalo S8:** Analytics 388, ClientAnalytics 161, Stylists 152, salon management hook 292 i više izdvojenih komponenti i dalje iznad ciljnog okvira; ne tvrditi DoD samo na osnovu veličine. Provjeriti jedinstvena imena akcija u frizerskim redovima/kompetencijama i utrke učitavanja galerije pri promjeni serviceId (pregled koda, još nije browser reprodukcija), te ostala tri stanja, grafičke alternative, tab/deep-link, fokus, prava i potvrde. S11 ručni AT/zoom i drugi ranije dokumentovani dokazi ostaju otvoreni.

---

## 2026-11-18 · S8 · Users kompozicija i oporavak kataloga (rad u toku)

`Users.tsx` 547 → 133 linije: uređivanje, kreiranje, akcije, jednokratne lozinke i panel liste premješteni su u feature hookove i komponente. Uloge, API ugovori, validacija, otkazivanje provjere korisničkog imena, potvrde i dijalozi nisu namjerno mijenjani. Source testovi Users/credentials i finance recovery prate stvarni render-chain i izdvojene hookove, uz zadržavanje ranijih asercija. Mock regresije uključuju create grešku/retry i izostalu lozinku, otpis duga i invalidaciju, te zakašnjele username 200/500 za create/edit. Namjerno uklanjanje username cancellation guardova ruši 4/4, original vraćen.

`Services.tsx` 190 → 136 linija: read i izgradnja kataloga izdvojeni u hook. Prije popravke 8/8 novih testova padalo je jer loading nema heading/status, a greška read-a prikazuje prazan katalog bez retry. Sada su heading i lokalizovani status dostupni tokom učitavanja, greška ima retry, a sequence/cleanup štiti od zakašnjelih uspjeha i grešaka. Isti endpointi i grupisanje ostaju; izmjene source testa uključuju provjeru veze i novo stanje, bez uklanjanja prethodnih garancija. Negativna kontrola uklanjanja zaštite ruši stale 200/500 2/2; original vraćen, build i ciljani test ponovljeni 10/10. Istovremeni retry u testu je sintetički. Mock testovi ne dokazuju serverske transakcije ili rad čitača ekrana.

Frontend Node **1000/1000**, kompletni mock S8 Chromium **116/116**, build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck, pet Python provjera i lint 0 grešaka/6 ranijih upozorenja. Ažuriran je i audit link koji je nakon ekstrakcije pokazivao na nepostojeće linije Users stranice. Mock S8 specovi su zasad lokalni dokaz, nisu zaseban CI korak; uključivanje u CI treba riješiti prije zatvaranja S8. CI [45241818125](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45241818125) za `864e1f6` pri bilježenju 4 uspješna posla, rendered a11y još traje; `30d008e` i ovaj rad nisu u tom CI-ju. Nema merge/deploya.

**S8 još nije završen:** Analytics (388) i ClientAnalytics (161), kao i više izdvojenih modula, prelaze ciljni okvir; sve DoD dokaze treba dovršiti. Dodatnim pregledom primijećeno: Salon nema heading/status pri loadingu i fallback može sakriti neuspjeh čitanja kao nepostojanje salona; Stylists read grešku tretira kao praznu listu, a neuspjeh učitavanja radnog vremena/usluga u editoru kao podrazumijevane vrijednosti (potreban posebno oprezan test prije promjene); ServiceWorkGallery loading nema heading ni status. To su nalazi pregleda koda, ne tvrdnja da su već reproducirani u browseru. Grafikoni, alternative, tab/deep-link, potvrde, fokus i sva tri stanja svih 6+1 ekrana zahtijevaju završni DoD pregled; S11 ručni AT/zoom i druga ranije dokumentovana ograničenja ostaju otvoreni.

---

## 2026-11-18 · S8 · Učitavanje analitičkog pregleda (rad u toku)

`Analytics.tsx` 477 → 388 linija: tipovi dashboarda i postojeći read/validacija/sequence/retry premješteni su u `use-analytics-dashboard`; preset logika, izračun grafikona i tabela ostaju nepromijenjeni u stranici. Source test API ugovora prati hook i provjerava njegovo povezivanje sa stranicom. S8 nije završen: stranica i dalje zahtijeva razbijanje te pregled svih DoD kriterija.

Mock Chromium **18/18** (tri analitička speca): novi testovi provjeravaju stariji 200/500 nakon promjene preseta, neispravan odgovor i retry s istim odabranim rasponom, te tabelu grafa i neto 75; prethodni scenariji klijenta i frizera također prolaze. Namjerno isključivanje dashboard sequence guardova uzrokuje očekivani pad **2/2**, original vraćen i build/matrica ponovljeni. Fiksure ne dokazuju stvarne serverske podatke niti pristupačnost čitačem ekrana. Node **999/999**, lint 0 grešaka/6 prethodnih upozorenja, build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck i pet Python provjera prolaze.

CI [45241818125](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45241818125) za `864e1f6` pri bilježenju četiri posla prošla, rendered a11y u toku; ova lokalna dopuna nije u tom CI-ju. Nakon dovršetka runa pushati aktuelnu granu i provjeriti novi CI. Nema merge/deploya.

---

## 2026-11-18 · S8 · Analitički prikazi (rad u toku)

`ClientAnalytics.tsx` 566 → 161 linija: prikazi sažetka, četiri taba i period-filter su komponente; upravljanje detaljnim dijalogom je hook, a region tabele ostaje montiran unutar svakog aktivnog panela. `StylistAnalytics.tsx` 248 → 119: postojeći read/sequence/retry tok je hook, a obje imenovane tabele su komponenta s `useId`. API endpointi, validacija, primjena perioda, izračuni, redoslijed tabova, fokus i lokalizacija nisu namjerno mijenjani. Tanka klijentska kompozicija još je 161 linija, `Analytics.tsx` 477, `Users.tsx` 547, `Services.tsx` 190; S8 i sve ostale DoD provjere ostaju otvorene.

**Dokazi:** frontend Node **999/999**, lint 0 grešaka/6 postojećih upozorenja, build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck; strict i18n 2813/2813, CI indeks, hygiene, 758 linkova i 148 source kontrast parova prolaze. Završni mock Chromium **23/23**: raniji admin tokovi i klijentske utrke/fokus/retry, plus popunjeni klijentski paneli, BS/EN × 320/1280, i analitika frizera sa deep-link periodom, validacijom identiteta, retry, tabelama i stale 200/500. Ciljani axe testovi tri pravila strukture tabela nisu potpuni axe audit. Negativna kontrola uklanjanja sequence guardova frizera pada **2/2**, izvorni kod je vraćen i završni paket ponovljen. To su simulirani odgovori, ne dokaz stvarnog servera ili asistivne tehnologije.

Source testovi tabela, lokalizacije i row akcija sada prate izdvojene komponente uz provjeru njihove veze sa stranicama; scope/caption, semantika, podaci i dostupni nazivi zadržani su kao garancije. CI prethodnog `2f9d5f0` [45233401354](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45233401354) završio je **5/5 success**. Ovaj zahvat i `77ba87f` traže novi CI; nema merge/deploya.

---

## 2026-11-18 · S8 · Klijentska analitika (rad u toku)

`ClientAnalytics.tsx` 821 → 566 linija: izdvojeni su tipovi, hook za oba read zahtjeva, prikaz detalja s povratkom fokusa te ocjena zvjezdicama. URL parametri, proračuni, validacija identiteta odgovora, retry i nezavisna stanja analitike i dugovanja nisu namjerno mijenjani. Stranica još nije tanka kompozicija, kao ni Users i Analytics; S8 DoD ostaje otvoren.

Mock Chromium **17/17** (tri speca): novi scenariji pokrivaju zakašnjeli 200/500 za analitiku i dugovanja pri promjeni perioda, odvojene greške i retry, detalje rezervacije i recenzije te povrat fokusa na 320/1280. Namjernim isključivanjem cleanup guardova oba stale scenarija padaju, zatim su originalni guardovi vraćeni i pozitivan paket ponovljen. Fiksure ne dokazuju rad servera ili stvarnog čitača ekrana; ovi testovi ne rade axe sken. Source test ocjene i i18n sada čitaju izdvojene module i provjeravaju veze, a ista allowlista dekorativnih zvjezdica prati premještenu komponentu.

Node **999/999**, lint 0 grešaka/6 ranijih upozorenja, build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck i pet Python provjera prolaze. CI prethodnog `2f9d5f0` [45233401354](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45233401354) pri bilježenju ima četiri uspješna posla i rendered a11y u toku; ovaj zahvat traži vlastiti CI. Nema merge/deploya.

---

## 2026-11-18 · S8 · State hookovi usluga i korisnika (rad u toku)

**Opseg:** `Services.tsx` 496 → 190 linija: state forme, kreiranje/uređivanje i upload preseljeni u `use-service-editor`, a preview/brisanje/spajanje u `use-service-deletion` zajedno s postojećim generacijskim i sesijskim guardovima. `Users.tsx` 799 → 547: učitavanje, debounce, paginacija i sekvenca zahtjeva u `use-users-list`; preview i transfer pri uklanjanju frizera u `use-stylist-removal`. Endpointi, payloadovi, pravila i fokusni refovi nisu namjerno mijenjani. Neki hookovi i dalje imaju 173–199 linija, a stranice Analytics/ClientAnalytics/StylistAnalytics mjere 477/821/248: S8 nije završen niti se skraćivanje smatra završnim dokazom.

**Regresije:** svježi build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck; Node **999/999**, lint 0 grešaka i 6 ranijih upozorenja. Završni mock Chromium paket **80/80**, uključujući postojeće utrke brisanja/spajanja i ranije korisničke/salonske testove, te nove: kreiranje sva tri tipa kataloga i multipart upload na 320/1280 (sintetički fajl/odgovor), zadržavanje editor podataka nakon neuspjeha i retry; stale list 200/500, loading pri novom čekanju i oporavak liste; te stale preview frizera 200/500 i ispravnu reviziju za drugog korisnika. Namjernim isključivanjem guardova negativne kontrole padaju **3/3** za listu i **2/2** za preview (pogrešna revizija odnosno zatvoren novi dijalog). Pozitivni završni run vraća originalne guardove. Nisu dokazani stvarna obrada slike, serverski upisi, otkazivanje poslanog zahtjeva ni puni audit pristupačnosti.

**Source-testovi:** ugovor paginiranih admin lista i test korisničke pristupačnosti čitaju izdvojeni hook i provjeravaju da ga stranica koristi; očuvane su sekvence i pozivi. Salon/services test provjerava povezivanje oba nova hooka. Strict i18n 2813/2813, CI indeks, hygiene, 758 dokumentacijskih linkova i odabrani source kontrast prolaze; nema novih paketa.

**CI:** prethodni [45193806331](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45193806331) za `7ce1538` završen **5/5 success**. Lokalni commit `e457c5a` i ovaj zahvat zahtijevaju novi CI. Nema merge/deploya.

---

## 2026-11-18 · S8 · Korisnički redovi i razlučive praznične akcije (rad u toku)

**Opseg:** iz `Users.tsx` (1173 → 799 linija) izdvojeni su prikaz desktop kolona, kartice i akcije uloga te paginacija; stanje, učitavanje, API mutacije, fokusni refovi, debouncing i računanje stranica ostaju na stranici. Uloge, redoslijed kolona, prava i API ugovori nisu namjerno mijenjani. Razbijanje ostaje djelimično: stranica i `use-user-row-presentation.tsx` (184 linije) još prelaze planiranu veličinu, a S8 DoD nije zatvoren.

**Pristupačnost:** praznični redovi su imali ista generička imena akcija. Uredi/obriši/pošalji sada sadrže ime i lokalizovani datum, a tačni duplikati imena/datuma dobijaju redni broj; vidljivi tekst dugmeta za uređivanje zadržan je u pristupačnom imenu. Na tri praznika s istim imenom (dva istog datuma) negativna kontrola prije izmjene pada **4/4** na generičkom nazivu; nakon izmjene prolaze **4/4** BS/EN × 320/1280, uključujući razlučivost svih akcija, `button-name`/`label-content-name-mismatch` axe sken tabele, otkazivanje uz povrat fokusa i simulirani DELETE tačno odabranog reda. Ovo nije puni axe/AT audit. Ažuriran O4 selektor za imenovanu prazničnu akciju; postojeća provjera opisa, Escape/fokusa i tačno jednog DELETE-a ostaje: izolovana mock O4 provjera **1/1**.

**Regresije:** mock Chromium **71/71** uključuje nove korisničke role/reset/deaktivaciju i analitički deep-link, provjeru stranica i reset pretrage na 320/1280, te praznične akcije; nakon dodatka ciljanog axe pravila ista praznična matrica ponovo **4/4**. Testovi ne dokazuju stvarne serverske mutacije ni slanje e-maila/push poruke. Node **999/999**, lint 0 grešaka i 6 ranijih upozorenja, build **293,0/300 KiB** (Analytics **115,9/140 KiB**), E2E typecheck, strict BS/EN paritet **2813/2813**, CI indeks, hygiene, 758 linkova i odabrani source kontrast prolaze. Source testovi korisničkih akcija i analitičkih linkova sada prate cijeli lanac kompozicije; allowlista kontrasta samo premješta istu dekorativnu ikonu. Nema novih paketa.

**CI:** prethodni [45193806331](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45193806331) za `7ce1538` pri bilježenju ima 4 uspješna posla i a11y u toku. Novi zahvat nije obuhvaćen tim runom. Nema merge/deploya.

---

## 2026-11-18 · S8 · Salon i prikaz kataloga (rad u toku)

**Opseg:** `Salon.tsx` 632 → 122 linije; postojeći state, API tokovi i socket osvježavanje premješteni u `use-salon-management`, tipovi u `salon-types`, obrasci kreiranja i postavki te dvije tabele u zasebne komponente. `Services.tsx` 681 → 496: kategorije, potkategorije i tabela usluga izdvojene u `service-catalog` s tipovima kataloga. Nisu namjerno mijenjani payloadovi, proračuni, rute ni endpointi. Stranica Salon sada je kompozicija, ali njen hook ima 263 linije, katalog 186, a Users 1173 i Services 496: ovo nije završetak S8 ni provjera svih kriterija pristupačnosti (npr. jedinstvena imena prazničnih akcija ostaju za provjeru/popravku).

**Regresije:** frontend Node **998/998** (src, scripts i e2e `*.test.mjs`), lint 0 grešaka/6 ranijih upozorenja, build 293,0/300 KiB, Analytics 115,9/140 KiB i E2E typecheck. Mock Chromium paket **60/60**, uključujući četiri nova Salon testa: postavke/radno vrijeme na 320/1280, edit/obavijest/odustajanje i potvrdu brisanja praznika, te validaciju i kreiranje salona s defaultima; dodatni fallback i inicijalizacija radnog vremena **1/1**. Testovi provjeravaju requeste i UI, ne stvarne transakcije ili rad push servisa. Source testovi za kontrole, tabele, kontrast i ESLint izuzetke preseljeni su na nove fajlove; provjerava se i veza komponenti sa stranicama, ranije garancije ostaju. Strict i18n, CI indeks, hygiene, 758 doc linkova i source kontrast prolaze; nema novih zavisnosti.

**CI:** prethodni [45185754547](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45185754547) za `265e691` pri bilježenju ima četiri uspješna posla, rendered a11y još traje. Ovaj zahvat još nije u tom runu. Nema merge/deploya.

---

## 2026-11-18 · S8 · Širi refaktor korisnika, kataloga, salona i frizera (rad u toku)

**Opseg:** izdvojeni su dijalozi kreiranja/uređivanja korisnika i uklanjanja uloge stiliste; dijalog uređivanja kataloga s posebnim poljima kategorije/podkategorije i usluge; dijalog praznika; te upravljanje stilistima, njihov editor i tabela radnog vremena. Iz galerije radova izdvojen je hook učitavanja/paginacije. Poslovni tokovi, API putanje, obračuni, prevodi i rute nisu namjerno mijenjani. Prije → poslije: `Users.tsx` 1619 → 1173, `Services.tsx` 1006 → 681, `Salon.tsx` 674 → 632, `Stylists.tsx` 520 → 136, `ServiceWorkGallery.tsx` 226 → 128 linija. Posljednje dvije stranice sada su tanke kompozicije, ali neki njihovi moduli ostaju oko 166–170 linija; ostale tri stranice i kompletan S8 DoD su još otvoreni.

**Regresije:** svježi build **293,0/300 KiB**, Analytics **115,9/140 KiB**, E2E typecheck, Node **990/990**, lint 0 grešaka i 6 ranijih upozorenja. Chromium fiksure **56/56**, uključujući osam novih: uređivanje korisnika i jednokratna lozinka te transfer pri uklanjanju uloge na 320/1280 px, slanje profila/radnog vremena/usluga stiliste, spremanje praznika, izmjene svih triju tipova kataloga, te galerija retry/paginacija/tastaturni slider. Obuhvaćeni su tačni simulirani request payloadovi, nije testirana stvarna mutacija/baza; tabele usluga uključuju postojeće axe provjere i poznate parcijalno zaklonjene čvorove na 640 px. Izvorni testovi kontrasta, oporavka dugova, pristupačnosti kontrola/tabela i DataTable izuzetka ažurirani su na nove lokacije; uz provjeru veze s roditeljskim komponentama zadržavaju ranije garancije. Nema novih paketa.

**CI:** prethodni [45174526163](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45174526163) na `d570e3a` završen je **5/5**, nakon otkazivanja `45169104005` pri ranijem pushu. CI ovog refaktora još ne postoji u trenutku bilježenja. Nije rađen merge/deploy.

---

## 2026-11-18 · S8 · Odobrenje i lista korisnika (rad u toku)

Korisnik je izričito odobrio nastavak šireg razbijanja velikih admin fajlova prema S8 planu uz očuvanje API-ja i testova. Iz `Users.tsx` (1719 linija prije, 1619 poslije) izdvojeni su postojeći `UsersList` i tipovi u `features/users/`; obrada podataka, kolone, akcije i njihov redoslijed ostaju u stranici. Ovo je početak, ne završetak razbijanja niti S8 DoD.

Statički `users-a11y.test.mjs` sada čita i izdvojenu listu, uz zasebnu provjeru importa i korištenja iz stranice. Test i dalje provjerava caption, jedan DataTable, loading status, redoslijed kolona, akcije i odsustvo lokalnih stilova. Puni web Node **990/990**, build **293,0/300 KiB**, E2E typecheck; mock Chromium **2/2** na 320/1280 px: kartica/tabela, podaci, tabovi/prazno stanje i otvaranje/zatvaranje uređivanja s povratkom fokusa bez write poziva. Test ne dokazuje stvarne upise ni sve korisničke tokove. CI ove dopune još ne postoji; prethodni run [45169104005](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45169104005) još traje. Nema merge/deploya.

---

## 2026-11-18 · S8 · Dijalog usluge i zakašnjela mutacija (rad u toku)

**Šta i zašto:** prikaz dijaloga za brisanje/spajanje izdvojen je u `features/services/service-deletion-dialog.tsx`; state, API ugovor i pravila ostaju u stranici. `Services.tsx` je u ovom koraku smanjen na oko 1006 linija, a novi dijalog ima oko 209; ovo nije završeno planirano razbijanje velikih fajlova.

Odvojeni kontrolisani browser test reproducirao je utrku već poslanog DELETE zahtjeva: nakon Escape i otvaranja drugog dijaloga, stari uspjeh je zatvarao novi dijalog, a greška prikazivala pogrešan preview; oba slučaja su pala prije popravke. Guard veže završetak za generaciju dijaloga i sesiju, sprječava dodatno slanje tokom aktivnog zahtjeva i odgađa osvježavanje kataloga do zatvaranja novog dijaloga. Kontrole su tokom slanja onemogućene, status na BS/EN jasno kaže da zatvaranje ne otkazuje već poslanu promjenu. Uspjeh/greška se i dalje prijavljuju u istoj aktivnoj sesiji. Već poslani server zahtjev se ne može poništiti zatvaranjem; odlazak sa stranice prije odgovora ne garantuje prikaz njegove obavijesti.

**Dokazi:** mock Chromium 200/500 test **2/2** provjerava očuvanje drugog dijaloga, status, jednu poslanu mutaciju, obavijest i odgođeno osvježavanje; pozitivni 200 mock nakon osvježenja uklanja prvu uslugu iz kataloga. Zajednički paket sa 44 ostala testa je na završnom buildu imao **45/46** zbog strogog selektora u novoj asertaciji; selektor je preciziran i oba nova testa potom prolaze, a ostala 44 su već prošla na istom buildu. Raniji zajednički paket prije dodatne statusne poruke bio je **46/46**. Node **990/990**, build **292,9/300 KiB**, E2E typecheck, lint 0 grešaka / 6 ranijih upozorenja, i18n, CI indeks, repo hygiene i 758 dokumentacijskih linkova prolaze. Write odgovori su mockirani; nema dokaza realne transakcije iz ovih testova.

**CI:** [45169104005](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45169104005) odnosi se na prethodni commit `6e7177e`: četiri posla prolaze, rendered a11y je pri posljednjoj provjeri u toku. Ove nove izmjene nisu u tom runu. Nema merge/deploya.

---

## 2026-11-18 · S8 · Utrka pregleda brisanja i CI nastavak (rad u toku)

**Pregled akcije:** u sintetičkom browseru zakašnjeli uspjeh pregleda cilja A prepisivao je već prikazani konflikt cilja B, a zakašnjela greška uklanjala B pregled; oba testa prije popravke padaju. Server provjerava `impactToken` i konflikte u transakciji, ali korisnički prikaz i omogućavanje akcije ne smiju zavisiti samo od toga. Generacijski guard sada odbacuje zastarjele odgovore i greške te ne završava novi loading iz starog zahtjeva; invalidira pregled i pri promjeni režima/cilja, pražnjenju cilja, zatvaranju dijaloga i unmountu. Prije popravke zatvaranja putem Cancel dodatna negativna kontrola hvata zakašnjelu pogrešnu toast poruku; nakon popravke ona se ne pojavljuje. Ovo štiti učitavanje pregleda, ne dokazuje sve utrke već poslanih mutacija.

**Dokaz:** na svježem buildu mock Chromium **44/44**: 14 utrka (stari 200/500, novi konflikt, prazan cilj, promjena akcije, još otvoren novi zahtjev, ponovno otvaranje i zatvaranje Cancel/Escape), 24 pregleda tabele i 6 postojećih brisanje/spajanje fiksura. Web Node **990/990**, build 292,9/300 KiB i E2E typecheck prolaze. Testovi nemaju stvarne write transakcije.

**CI:** [45161311410](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45161311410) za `2517970` završio **4/5**: backend (uključujući PostgreSQL HTTP testove), frontend, mobile i hygiene prolaze; a11y **2740 prošlo, 2 pala**. Iz GitHub anotacija: O4 testovi kategorije i potkategorije traže stara pristupačna imena bez naziva stavke. Selektori su usklađeni s tačno imenovanim fiksurama (`O4 usluge` i `O4 podkategorija`), a provjere opisa, odustajanja bez mutacije, povratka fokusa i jedne potvrđene DELETE mutacije ostaju iste. Oba originalna testa lokalno **2/2** uz sintetički admin profil i mock API; nisu stvarni CI/backend rezultat. Naknadni S8 kod još nema CI dokaz.

**640 px:** originalni scoped axe je bilježio nepotpun kontrast 1–2 djelimično odrezana čvora. Tabela je horizontalno scrollabilna i fokusabilna; u svih šest kombinacija tema/jezika pomjeranje strelicom radi, a zasebni axe pregled svakog tada izmjerenog čvora nakon scrolla prolazi bez incomplete i violations. Negativna kontrola namjerno slabog kontrasta ponovljena **5/5** otkriva prekršaj. Ovo je ograničen pregled konkretnog mock sadržaja, ne puni vizuelni/AT audit.

**Test ugovora:** allowlista DataTable stila dokumentuje tačno jednu funkcionalnu klasu samo za izdvojenu tabelu usluga; provjere klase, aktivnog CSS-a i mobilne geometrije ostaju, ostali potrošači nisu izuzeti. Nije rađen merge niti deploy.

---

## 2026-11-18 · S8 · Tabela usluga i mobilni reflow (rad u toku)

**Šta i zašto:** `Services.tsx` je prije ovog koraka imao 1241 liniju; nakon izdvajanja imao je 1106 (kasniji guard opisan iznad). Kolone i akcije tabele izdvojene su u `features/services/service-table.tsx` (147 linija) i zajednički tip u `service-types.ts`. Pozivi uređivanja i brisanja, linkovi, formatiranje, redoslijed i nazivi kolona ostaju isti. Ovo nije završeno razbijanje S8.

Na svježem prethodnom buildu test je pri 320 CSS px utvrdio da je opis skriven, a nakon otkrivanja je izmjerena tabela široka 743 px u regionu širokom 210 px: planirana kartična pravila iz `index.css` nisu bila uključena u aktivni stylesheet. Posebno ograničena pravila u `globals.css` pretvaraju samo tabelu usluga u kartice ispod 640 px, bez promjene drugih tabela. Opis je vidljiv i prelama i dugačak neprekinuti tekst umjesto da se skrati. Test bez popravke opisa pada na `hidden`, a test širine bez reflowa pada na horizontalnom prekoračenju.

**Dokaz:** svježi produkcijski build i E2E typecheck prolaze; sintetički Chromium tabela **24/24** (tri teme, BS/EN, 320/639/640/1280 px) provjerava svih osam kolona, imena i linkove istoimenih usluga, geometriju bez horizontalnog preljeva na mobilnom, dugi opis te otvaranje uređivanja tipkom Enter. Postojeće sintetičke regresije previewa brisanja/spajanja **6/6**. Scoped axe nad tabelom nema prijavljenih WCAG A/AA prekršaja u svih 24; pri 320/639/1280 nema `incomplete`, ali pri 640 ima 1–2 `color-contrast` nepotpuna čvora po testu zbog djelimičnog zaklanjanja — ostaju za pregled, nisu prolaz kontrasta. Web Node **990/990**, lint 0 grešaka / 6 ranijih upozorenja; build početno 292,9/300 KiB; CI indeks i i18n prolaze. Testovi koriste mock API, nisu stvarni backend ni pregled čitačem ekrana.

**Izmjena testa:** statički test tabele sada čita i izdvojeni modul te eksplicitno provjerava da stranica renderuje `ServiceTable`, a ona `DataTable`; broj tabela, caption, scope i ostale postojeće garancije ostaju provjerene. CI [45161311410](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45161311410) odnosi se na prethodni `2517970`: backend, mobile, frontend i hygiene prolaze; a11y je još u toku pri zadnjoj provjeri. Ovaj S8 nastavak nije uključen u taj run. Nema merge/deploya.

---

## 2026-11-18 · Nastavak nakon `a788242` · CI i obnova sesije

**Šta i zašto:** CI za `a788242` pokazao je da obje izolovane PostgreSQL baze uspješno primjenjuju migracije, ali backend brava broja literalnih grešaka i mobilni test permission alerta nisu prošli. Nove consent greške prebačene su u postojeći registar kodova, uz očuvane HTTP statuse i BS poruke, mapiranje kodova i BS/EN ključeve. Brava od 439 nije povećana. Mobilni source test sada prihvata dodatne `beforeDescription` i `afterDescription` zavisnosti callbacka; provjera da odbijena dozvola prekida rad prije pickera ostaje nepromijenjena.

Obnova istog tokena u drugom tabu prethodno nije proizvodila token `storage` događaj. Uz token se sada upisuje neosjetljivi revizijski marker, pa se drugi tab invalidira i kada je token isti. Novi mock browser test prije popravke pada, nakon popravke prolazi; dodani su i store/Axios testovi za događaj, odgođeni 401 i odjavu prije događaja. Kompatibilnost sa starim tabovima koji pišu samo token se zadržava. `localStorage` i dalje nema atomsku compare-and-swap zaštitu; već poslani zahtjevi mogu uspjeti nakon promjene sesije i ostali async tokovi nisu time automatski pokriveni.

**Provjere:** backend registar **7/7**, backend unit **838/838**, build; frontend Node **990/990**, build **292,8/300 KiB**, E2E typecheck, BS/EN, CI indeks i repo hygiene; mobilni Node **386/386**, TypeScript i iOS JS bundle. Mock browser auth/session **21/21** uključujući cross-tab **5/5**; testirani backend HTTP slučaj ima dodatnu asertaciju koda, ali nakon te izmjene nije lokalno ponovo pokrenut s PostgreSQL-om. CI [45158952236](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45158952236): frontend i hygiene prolaze, backend i mobile padaju na navedenim koracima, a a11y je još bio u toku pri posljednjoj provjeri. Rezultati su vezani za taj commit, ne za ovaj nastavak. Nema mergea ni deploya.

---

## 2026-11-18 · Više tabova, privatni obrasci i booking fokus (rad u toku)

**Šta i zašto:** stvarna dva Chromium taba su prije popravke zadržavala stilistu A nakon prijave B i odjave u drugom tabu. Store sluša `storage` i čita trenutno stanje umjesto zastarjele vrijednosti događaja, briše identitet i skriva zaštićeni sadržaj do novog profila. Axios prije slanja provjerava neslaganje storagea i odbija stari zahtjev umjesto da ga pošalje s novim tokenom; odgovor i zasebni login fallback također provjeravaju storage. Zakašnjeli 401 i odjava ne smiju obrisati poznati noviji token; pozivaoci ne preusmjeravaju ako odjava nije uspjela.

`IdentityBoundary` resetuje lokalni privatni state pri promjeni korisnika na admin/stylist granicama te na profilu, vlastitim rezervacijama, formi rezervacije i članku s nacrtom komentara. Time su uklonjeni reproducirani zaostali izbor klijenta, otvoreni dijalog, napomena rezervacije i nacrt komentara drugog korisnika. Članak se pri promjeni identiteta ponovo učitava; javni router i ostatak aplikacije se ne remountaju. Zakašnjeli uspjeh klijentske ili direktne rezervacije i komentara ne smije preusmjeriti niti izmijeniti novi identitet; normalni tokovi ostaju testirani.

Ponovljen je stvarni fokusni pad na svježem buildu: **7/15** sintetičkih Classic/reduced-motion pokušaja palo je na hit-testu. Dijagnostika je izmjerila fokusirani centar na 692 px, iza sticky zaglavlja do 698 px. Privremeni nadzor sada provjerava položaj i nakon scroll događaja (ne samo promjene veličine), a eksplicitni korisnički unos otkazuje i još nezapočeti prijenos fokusa. Poslije prve izmjene jedan od 30 testova je i dalje pao na zaštiti korisničkog skrolanja; nakon dodatne zaštite **30/30** ponavljanja prolazi. Novi deterministički sintetički wheel-before-frame test pada kada se privremeno ukloni ta zaštita, a prolazi kada se vrati. Ovo ne dokazuje uzrok izvornog intermitentnog CI pada.

**Testovi:** synthetic Vite browser **20/20**, uključujući četiri testa u dva taba; store/Axios/query **18/18**; frontend Node **987/987**; svježi build **292,4/300 KiB**, E2E typecheck i lint 0 grešaka / 6 postojećih upozorenja. Na svježem buildu odabrani browser paket **37/37** (booking fokus, change-after-slot, retry s istim idempotency ključem i prikaz bloga); prethodni produkcijski paket **234/234** bio je prije posljednjih izmjena bloga i fokusa. API odgovori su mockirani; mali lokalni servis je davao samo javne postavke, ne stvarni backend. CI indeks, i18n i diff check prolaze. CI run id: nema.

**Izmjene testova:** source test promjene lozinke usklađen je s novim `isCurrent` guardom: i dalje zahtijeva sprečavanje zakašnjele navigacije, a dodatno provjerava zaštitu rotacije tokena i verziju sesije; stvarni negativni i normalni tok su browser-testirani. Fokusni hit-test nije oslabljen; dodana je samo dijagnostika geometrije te zaseban negativno kontrolisan test prije framea.

**Ograničenja te međufaze:** isti token zapisan ponovo u drugom tabu nije generisao `storage` događaj (naknadna zaštita opisana je iznad); `localStorage` nema atomsku compare-and-swap zaštitu između konkurentnih tabova. Već poslani server zahtjev može uspjeti i nakon promjene korisnika. Nisu dokazani svi ostali async tokovi, stvarni backend/browser lifecycle, socket/backend, migration deploy, mobilni uređaji/AT ni puni CI. Nije rađen deploy ni merge.

---

## 2026-11-18 · Web sesija i privatni query cache (rad u toku)

**Šta i zašto:** sintetički testovi su reproducirali zakašnjele profile, 401 i login koji utiču na noviju sesiju, kao i Axios zahtjev koji zbog asinhronog interceptora dobije pogrešan token. `auth.store.ts`, `api/client.ts` i `app/providers.tsx` koriste verziju sesije i guardove; fallback profila pri loginu ima odvojenu Axios instancu. Isti token obnovljen tokom početnog učitavanja ponovo pokreće inicijalizaciju. Zakašnjeli odgovor promjene lozinke ne smije zamijeniti novu sesiju.

React Query je reproducirano prikazivao keš duga stiliste A stilisti B. Svi postojeći query hookovi koriste `useSessionQuery`, koji dodaje verziju sesije na kraj ključa, bez prosljeđivanja starih podataka kao placeholdera; postojeće prefix invalidacije ostaju funkcionalne. Stari rezultati mogu do isteka GC-a ostati u memoriji pod starim ključem. Dodani su AST ugovor protiv direktnih nezaštićenih query čitanja i test prefix invalidacije. Ovo nije tvrdnja da su sve druge lokalne state/mutacije ili budući API-ji automatski sigurni.

**Dokaz:** Vite store/Axios i query testovi **12/12**; sintetički browser **8/8**, uključujući keš i zakašnjeli dug, lozinku (negativni i normalni tok), stari 401/startup i isti token. Prije popravka test curenja keša, test zakašnjele lozinke i test obnove istog tokena padaju. Negativne kontrole za stare 401/provider zaštite također padaju. Puni pronađeni frontend Node testovi **981/981** nakon izolacije keša (prije posljednjih promjena provider/lozinka); odabrane produkcijske browser regresije **114/114** na buildu prije posljednje promjene providera. Svježi build i E2E typecheck prolaze poslije nje; lint 0 grešaka / 6 postojećih upozorenja; CI indeks, i18n i `git diff --check` prolaze. Browser API odgovori su mockirani, proxy websocket upozorenja su očekivana bez backend servera.

**Ograničenja u toj međufazi:** promjena tokena/odjava u drugom tabu tada nije bila sinhronizovana niti testirana (kasniji rad je opisan iznad); stvarni backend/browser lifecycle i kompletan pregled preostalih privatnih stanja/mutacija nisu dokazani. Nema novog CI runa niti deploya. S8 i ostali otvoreni rad ostaju u toku.

---

## 2026-11-18 · S8 · Početno mjerenje (rad u toku)

Vlasnik je odobrio razbijanje. Prije izmjena izmjereno `wc -l`: AnalyticsHub 46, Analytics 477, ClientAnalytics 821, StylistAnalytics 248, Users 1718, Services 1519, Salon 674, Stylists 520, ServiceWorkGallery 226. Source-contract testovi referenciraju ove putanje; pri izdvajanju treba očuvati njihove stvarne garancije. Ovo je samo inventar, S8 nije završen i nema CI dokaza za ovaj korak.

---

## 2026-11-11 · K0 · Plan kreiran (bez koda)

**Šta:** kreiran `.cursor/plans/aurum-web-refactor/` sa `00_overview.md`, 12 faznih planova (`01`–`12`), `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`; kreirane plan-matrice `.cursor/docs/matrices/aurum-theme/` i `.cursor/docs/matrices/aurum-route-coverage/` (obe s `MATRIX.md` + `CHANGELOG.md`).

**Zašto:** zahtjev vlasnika (unaprijediti referentni dizajn → refaktor javnih stranica i svih dashboarda, segmentno, planski, uz sve CI provjere, bez izmišljanja) + odluke Q1–Q11 prikupljene kroz dva kruga pitanja.

**Fajlovi:** isključivo `.cursor/plans/**` i `.cursor/docs/matrices/**`. **Nijedan** fajl u `frontend/`, `backend/`, `mobile/`, `.github/`, `scripts/`, `docs/`, `SOURCE_OF_TRUTH.md` nije diran. Nije napravljen commit ni push.

**Istraživanje (izmjerene činjenice, ne pretpostavke):**
- `docs/design/` ima 1 fajl (`NEJRA – beauty salon · Referentni dokument.html`, 26.070 B); `referentni-prijedlog-v2.html` i `-v3.html` ne postoje na ovoj grani.
- Baseline: 5 Python provjera PASS; `npm run build` PASS (276,9/300 KiB); `test:*` **197 PASS / 1 FAIL** (`test:design-reference`, ENOENT); `check_i18n.py` 2711/2711; `check_ui_contrast.py` 80/80; `check_doc_links.py` 670/202.
- `.dark` klasa se nigdje u `frontend/src` ne dodjeljuje; runtime brand override ide kroz `SettingsContext.tsx` → `buildBrandColorVariables` → inline `--brand-*` na `<html>`.
- CI: 5 poslova; `a11y-e2e` jedini daje rendered axe dokaz (Chromium u sandboxu nedostupan, `run-a11y-routes.mjs` namjerno `SKIPPED`).

**Testovi:** nisu pokrenuti nad izmjenama (nema koda); ponovo pokrenute su samo read-only Python provjere radi potvrde da plan-dokumenti ne kvare `check_doc_links.py` / `check_repo_hygiene.py`.

**CI run id:** nema (namjerno nije bilo pusha; workflow se pokreće samo na `push` u `arena/**`, a baseline bi bio crven).

**Status dokaza:** ✅ za činjenice izmjerene u repozitoriju; 🟡 za sve buduće implementacijske tvrdnje; ⬜ za 12 segmenata.

---

## 2026-11-11 · S0 · Dizajn dokumenti + popravka CI baselinea

**Šta:**
- `docs/design/NEJRA – beauty salon · Referentni dokument.html` dograđen s 8 na **14 sekcija**: §09 mapa **58 deklaracija ruta** (generisana iz `router.tsx` / `public.routes.tsx` / `admin.routes.tsx`, 14 javnih + 8 izuzetaka + 24 admin + 12 stylist), §10 tokeni za **3 stanja** (`#theme-states`) + uživo izračunata tablica kontrasta `#tok3` (2 Aurum stanja × 11 parova, **22/22 „Prolazi"**, light 3,73–17,55:1 / dark 4,01–16,89:1), §11 katalog 11 šablona, §12 ugovor izbornika teme (3 opcije, `localStorage`, `data-skin`, `theme-color`, Q9 precedencija), §13 paritet + CI matrica svih 5 poslova, §14 kontrolna lista 12 segmenata. Naslov sada sadrži „Aurum" i „puna specifikacija"; nav proširen na 01–14; izvornih 8 interaktivnih demo-a (tema, komponente, admin filteri, booking, odobravanje) **ostaju netaknuti**.
- **NOVO** `docs/design/referentni-prijedlog-v2.html` („Atelier Ivory", 446 KiB) i `-v3.html` („Noir Cinéma", 329 KiB): dva različita vizuelna koncepta, svaki sa 7 obaveznih sekcija, 22 `.demo` ekrana, 2 ugrađene **AI ilustracije** (`data:image/jpeg;base64,`), ispravnim `light/dark` prekidačem i eksplicitnom napomenom da su koncepti, ne specifikacija.
- **NOVO** `frontend/scripts/design-spec.test.mjs` (2 testa + 7 mutacijskih provjera), skripta `test:design-spec` u `frontend/package.json`, novi korak `Test NEJRA full design specification` u `ci.yml` (`frontend` posao).
- 4 AI ilustracije generisane alatom; privremeni JPEG-ovi **nisu u Gitu** (ugrađeni su kao base64 i obrisani s diska).

**Zašto:** Q1/Q7 (NEJRA = jedini izvor istine, puna specifikacija), Q5/Q11 (kreirati v2/v3 s novim AI ilustracijama), Q6 (prvi segment), te popravka izmjerenog baseline kvara `test:design-reference` (`ENOENT`).

**Fajlovi:** 3 × `docs/design/*`, `frontend/scripts/design-spec.test.mjs`, `frontend/package.json`, `.github/workflows/ci.yml`, plan-dokumenti i matrice. **Nijedan** fajl u `frontend/src`, `backend/`, `mobile/`, `.env` ili migracijama nije diran.

**Testovi:** `test:design-reference` **6/6** (prije: FAIL), `test:design-spec` **2/2** (uključuje 7 mutacija), puna `test:*` petlja **199/199** (prije 197/198), `check_ci_index.py` 380/383, `check_doc_links.py` 685/222, i18n 2711/2711, kontrast 80/80, `npm run build` 276,9/300 KiB, `typecheck:e2e` 0, `git diff --check` čist.

**CI međufaza (historijski, još ne 5/5):** commit `fa6d73a` pushan na granu. Run `43032814134` (push) i run `43038425689` (`workflow_dispatch`, isti commit) imaju **4/5 success**: `repo-checks`, `backend`, `frontend`, `mobile` ✅; `a11y-e2e` ❌ na koraku 15 `Install Chromium for Playwright`. Tri reruna neuspješnog posla i jedan potpuno novi run padaju na istom `Temporary failure resolving 'azure.archive.ubuntu.com'` u `apt-get` dijelu `npx playwright install --with-deps chromium` (fali 9 font paketa). Korak `Run rendered a11y (axe) suite` je tada bio `skipped`. Ovo nije regresija aplikacije — S0 ne dira `frontend/src`; rješenje je zatraženo i odobreno odlukom `ci_fallback` (vidi nastavak).

**Status dokaza u međufazi:** ✅ lokalno izmjereno; 🔴 prva dva CI runa 4/5 zbog vanjske infrastrukture; 🟡 rendered a11y u sandboxu (`SKIPPED`).

**Odluke vlasnika nakon blokade (2026-11-11):** `ci_fallback` — odobren minimalni CI-only fallback (bez `--with-deps` ako `apt` padne, uz fail-closed provjeru browser fajla i odbijanje `SKIPPED` axe izlaza); `dark_yes` — **R2 je riješeno**, `Aurum tamna` smije dodijeliti `.dark` klasu. Nijedna odluka ne odobrava automatski S1.

**Konačni CI dokaz:** commit `bbd7ca5` → run **`43043182552`** = ✅ **5/5 success** (`repo-checks`, `backend`, `frontend`, `a11y-e2e`, `mobile`). U `a11y-e2e` su koraci 15 i 16 zeleni; job log: **252 passed | 0 failed | 0 skipped** nad 32 rute, bez aktiviranja `SKIPPED` zaštite. `1.4.6 color-contrast-enhanced` (AAA) ima 28 prekršaja u coverage anotaciji, ali nije asertirani prag; ne tvrdi se potpuna WCAG 2.2/AAA usklađenost ni ručni čitač/zoom/uređaj dokaz.

**Konačni status (S0):** ✅ S0 završen po pravilu „5/5 + STOP"; vlasnik je 2026-11-11 **naknadno eksplicitno odobrio S1, S2, S3 (`approve_s3`), S4 (`approve_s4`) i S5 (`approve_s5` + `card_header`)**, pa S1–S5 više ne čekaju odobrenje (**S6–S11 i dalje čekaju**). S0 je zaključio docs-only commit `3ed3069` s runom `43046250037` = **5/5**.

**Izmjene postojećih testova:** nema — `design-reference.test.mjs` ostaje netaknut; samo su kreirani fajlovi koje je očekivao.

---

## 2026-11-11 · S1 · Temelj: tokeni + 3-state tema + primitive

**Šta:** implementiran jedini novi feature projekta (Q8) po `02_phase-1-foundation.md`:
- **NOVO** `frontend/src/features/shell/theme/`: `theme-state.mjs` (čista state mašina: 3 stanja, `normalizeTheme`, `readStoredTheme`/`writeStoredTheme` nad ključem `nejra.theme`, `applyTheme`), `theme-state.d.mts`, `theme-context.tsx` (`ThemeProvider` + `useTheme()` → `{ choice, setChoice, skin, mode }`), `theme-switcher.tsx` (`role="group"`, 3× `button[aria-pressed]`, `role="status"` najava, 44 px mete, isključivo i18n natpisi).
- **NOVO** 4 source-contract testa: `theme-state.test.mjs` (5/5), `theme-switcher-a11y.test.mjs` (6/6), `theme-brand-precedence.test.mjs` (5/5), `theme-ssot-sync.test.mjs` (8/8); svaki ima mutacijske provjere.
- **NOVO** `frontend/src/features/shell/aurum/ui/` — 8 primitiva po NEJRA §11: `page-header`, `stat-card`, `filter-bar`, `data-table`, `status-badge`, `data-state`, `confirm-dialog`, `form-section`. Stari `features/shell/admin/ui/*` ostaju do S11.
- **IZMJENA** `globals.css`: 2 Aurum bloka (`[data-skin="aurum"][data-mode="light"]`, `.dark[data-skin="aurum"]`, specifičnost 0,2,0) s 12 **tačnih** hexova iz NEJRA §10 + izvedenim semantičkim HSL/raw tokenima + `color-scheme`; `:root` i `.dark` netaknuti. `tailwind.config.js`: `fontFamily.serif` (sistemski Palatino/Georgia stack, bez vanjskih fontova).
- **IZMJENA** `providers.tsx` (`ThemeProvider` iznad `SettingsProvider`), `SettingsContext.tsx` (Q9 guard: pod Aurumom se `buildBrandColorVariables` ne poziva i inline `--brand-*` se uklanjaju; sama funkcija netaknuta), 3 layouta (`ThemeSwitcher`), `SettingsAppearance.tsx` (lokalizovana Q9 napomena), `bs.json`/`en.json` (6 novih ključeva).
- **IZMJENA** `scripts/check_ui_contrast.py` (4 stanja, 140 parova), `frontend/package.json` (4 nove `test:*` skripte → 203), `.github/workflows/ci.yml` (4 nova koraka u `frontend` poslu).

**Zašto:** odobrenje vlasnika za S1; NEJRA §10/§12 je jedini izvor istine; Q9 (Aurum fiksira paletu); R2 riješen odlukom `dark_yes`; strogi paritet (Q10).

**Odluka o 140 parova (`use_140_four`, 2026-11-11):** plan je tvrdio „30 postojećih × 2 = +60", a stvarni parser je imao **26** web parova po stanju (80 ukupno: 52 web + 28 mobile). Na eksplicitno pitanje vlasnik je odabrao zadržati **140** uz 4 nova para po Aurum stanju iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) → 30 × 2 = 60. **Nijedna boja nije izmišljena ni korigovana**; `test:theme-ssot-sync` poredi svih 12 hexova s HTML-om. Izmjereni rasponi: Aurum light 3,73–17,55:1, Aurum dark 3,70–16,89:1.

**Fajlovi:** isključivo `frontend/src/features/shell/{theme,aurum}/`, 11 navedenih izmjena u `frontend/` + `scripts/check_ui_contrast.py` + `.github/workflows/ci.yml` + ovi plan-dokumenti/matrice. **Nema** izmjena ruta, API-ja, `queryKey`, socket eventa, guardova, iznosa, datuma, statusa, filtera, sorta, paginacije, zbirova, `buildBrandColorVariables`, `test:brand-colors`, `/mobile`, `/backend`, `.env`, migracija, `package-lock.json` ni novih npm zavisnosti.

**Testovi:** puna `test:*` petlja **203/203 PASS / 0 FAIL**; nova 4 testa 5/5 + 6/6 + 5/5 + 8/8; 5 Python gate-ova PASS (`check_repo_hygiene` **1788 nakon S1 commit-a** (prije 1772), `check_ci_index` **384/387** s 203 frontend skripte, `check_doc_links` **687/222**, `check_i18n.py --strict` **2717/2717**, `check_ui_contrast.py --strict` **140/140**); `npm run lint` 0 grešaka (7 prethodnih warninga); `npm run build` **279,1 / 300 KiB** gzip (analytics 114,7/140, calendar 100,0/125), **delta +2,2 KiB** prema S0 276,9 KiB; `typecheck:e2e` 0; `git diff --check` čist. `js-yaml` parsirao `ci.yml`: 419 `run` koraka (prije 415).

**Commit:** `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), 40 fajlova / +1872 −61.

**CI run id:** **`43100889990`** — `gh run watch` + `gh run view` = **5/5 success** (`headSha` = gornji SHA): `Mobile TypeScript check`, `Repository hygiene and static reports`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Backend build and tests`. Sva 4 nova S1 koraka u `frontend` jobu `130791757438` (#155–#158) su `success`. `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute, artifact `playwright-a11y-report.zip` ID `13891846859` / 331192 B / SHA256 `2e820a06fb5220e743707ed8c82a8a12da8978a02f7b976f5f428f49afe4fe93`. Rendered axe i dalje pokriva **default `classic`** — to je dokaz da klasični izgled nije regresirao, ne i Aurum stanja; axe za `aurum-light`/`aurum-dark`, zoom/reflow i čitač ekrana ostaju 🟡 do S11. `140/140` je source-only; CI log zadržava nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove.

**Dokazi:** ✅ lokalni (gore); 🟡 rendered Aurum stanja i sve ručne provjere do S11; ➖ `/mobile` i fizički uređaj (Q3).

**Izmjene postojećih testova:** **nema** — svih 199 S0 testova ostaje netaknuto i zeleno; dodana su samo 4 nova.

**Otvoreno:** nema za S1; S2 je naknadno eksplicitno odobren i završen (vidi unos ispod).

---

## 2026-11-11 · S2 · Javni shell + Početna + Usluge + Detalj usluge

**Šta:** prvi potrošač S1 temelja po `03_phase-2-public-shell-catalog.md`:
- **SSOT dopuna (odluka `dopuna_ssot`):** u NEJRA §10, odmah iza `#tok3`, upisan izračunat kontrast filmskog heroja iz §07 — kompozicija `rgb(120.21, 84.54, 60.83)`, `#F5EDE0`/kompozicija **5.73:1**, `#D4AF6A`/kompozicija **3.22:1**, `#1A1204`/`#D4AF6A` **8.96:1**, `#F5EDE0`/`#0E0B08` **16.89:1**. Boje uzete isključivo iz `const T`; **nijedna paleta nije korigovana**. Time je razriješen STOP uvjet iz plana §9 (prije dopune nije bilo izračunatog para).
- **NOVO** `test:public-aurum-hero-contrast` (4/4) + `frontend/package.json` skripta + `ci.yml` korak. Test čita `const T`, `.hero`/`.hero:after` alfe i `globals.css`, komponuje najsvjetliju pozadinu, mjeri 4 para za oba Aurum stanja, traži tamni veo, `prefers-reduced-motion` i odbija mutacije `T.dark.text`. `check_ci_index.py` potvrđuje obosmjerni paritet (385/388).
- **Aurum-only CSS** u `globals.css` (155 linija, sve pod `[data-skin="aurum"]`): hero `radial-gradient` + `--nejra-hero-*` tokeni, zlatni CTA, prigušena fotografija + tamni veo, `aurum-hero-drift 14s linear 2 both` (ne `infinite`) s eksplicitnim `prefers-reduced-motion`, serifni naslovi, semantički tokeni za header/footer/katalog, 44 px mete, `aria-current="page"` + zlatna crtica (oblik, ne samo boja), rezervisana visina async blokova, 12–16 px radijus i 1–1,5 px linije. `:root` i `.dark` klasični blokovi **netaknuti**.
- **IZMJENA** `public-layout.tsx` (`data-aurum-shell`, `aria-current` u desktop + drawer nav), `public-ui.ts` (`publicAurum` semantička mapa), `PublicHome.tsx` (`data-aurum-hero/-image/-overlay`, `data-aurum-cta`), `PublicServices.tsx`, `PublicServiceDetail.tsx`, `before-after-spotlight.tsx` (scope atributi + semantički `publicAurum` klase samo pod Aurumom).
- **S1 primitive konzumirane:** `FilterBar` (+ opcioni `showSubmit = true`, javni katalog koristi `showSubmit={false}` jer filtrira uživo), `TableSkeleton`, `EmptyState`, `ErrorState` u `PublicServices`; `PageHeader` + `StatusBadge` u `PublicServiceDetail`. Sve se renderuje **samo** za `skin === 'aurum'`; klasična grana u izvoru ostaje doslovno identična, pa nema duplih `id`-jeva ni promjene klasičnog DOM-a.

**Zašto:** vlasnik je odobrio S2 („Možeš krenuti sa S2"), a na STOP uvjet je odabrao `dopuna_ssot`. NEJRA §07/§09/§10/§11 su jedini izvor; Q10 traži strogi paritet; `components/ui/*` dijele javni sajt i admin, pa nisu dirani (grep dokaz: 0 diff). `FilterBar` nije tražio promjenu `queryKey`/API-ja (Q10 STOP nije aktiviran).

**Izmjene postojećih testova:** **NEMA**. Svih 203 S1 `test:*` skripti ostaje netaknuto i zeleno; dodan je samo 1 novi test (204 ukupno). Jedina izmjena S1 koda u primitivu je **opcioni** `showSubmit` s defaultom `true` — time je zadržana ista garancija za sve buduće potrošače (`common.filter` i dalje postoji u izvoru), a javni katalog ne dobija no-op submit dugme. Nijedan source-contract test nije oslabljen; `CHANGELOG.md` je ovo obrazloženje koje traži plan §5 korak 6.

**BS/EN:** nema novih vidljivih stringova, `aria-label`, `alt` ni `placeholder`; korišteni su već postojeći `table.*`, `common.filter`, `finance.states.*` i `public.*` ključevi. `bs.json`/`en.json` imaju **0 diff**; `check_i18n.py --strict` 2717/2717.

**Fajlovi:** `docs/design/NEJRA …html`, `.github/workflows/ci.yml`, `frontend/package.json`, 9 fajlova u `frontend/src/` (uključujući `aurum/ui/filter-bar.tsx`), novi `frontend/src/features/public-catalog/public-aurum-hero-contrast.test.mjs`, `03_phase-2-public-shell-catalog.md`. **0 diff:** `frontend/src/components/ui/*`, `BeforeAfterSlider.tsx`, `media-image.tsx`, `features/public-catalog/*` (osim novog testa), `data/*.mjs`, `PublicFeatureGate`, `AppLogo`/`UploadedBrandLogo`, `queryKey`, API pozivi/`limit`/`random`, `useRef` stale brojači, retry tokovi, `package-lock.json`, `/mobile`, `/backend`.

**Testovi:** puna `test:*` petlja **204/204 PASS / 0 FAIL**; novi test **4/4**; 5 Python gate-ova PASS (`check_repo_hygiene` **1789 nakon S2 commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2717/2717**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **279,9 / 300 KiB** gzip (**+0,8 KiB** prema S1 279,1; `public home` 45,4, `dashboard` 13,5, `stylist inbox` 17,9, `analytics` 114,7/140, `calendar` 99,4/125); `typecheck:e2e` 0; `npm run lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist.

**Commit:** `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`), 13 fajlova / +547 −129.

**CI run id:** **`43110763869`** — `gh run watch --exit-status` + `gh run view` = **5/5 success**, `headSha=d1fb55d7006e8e74c24f6f0ee018424136c92ba7`: `Mobile TypeScript check`, `Repository hygiene and static reports`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Backend build and tests`. Novi korak `Test NEJRA Aurum hero contrast (S2)` je `success`. `a11y-e2e` job `130825854913`: **252 passed | 0 failed | 0 skipped** nad **32 rute**, artifact `playwright-a11y-report.zip` ID **`13896851237`** / 331270 B / SHA256 `b27443d74d6a31b714ebf8d8a7f66958594f9147ee7bb506602d53907a7e56f4`. Rendered axe i dalje pokriva **default `classic`** = dokaz da klasični javni sajt nije regresirao. CI log zadržava nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova); **ne tvrdi se WCAG 2.2/AAA usklađenost**.

**Dokazi:** ✅ lokalni + CI 5/5; 🟡 rendered axe za `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana i `1.4.6` AAA do S11; ➖ `/mobile` i fizički uređaj (Q3).

**Otvoreno:** nema za S2; **S3 je odobren (`approve_s3`) i završen — vidi unos ispod**. **S4 traži STOP + eksplicitno odobrenje**.

---

## 2026-11-11 · S3 · Javni sadržaj (blog, galerija, kontakt, zadovoljni klijenti)

**Šta:** 5 javnih ruta + `features/blog/{public-blog-comments,public-blog-share}.tsx` dobile su Aurum granu (`isAurum` iz `useTheme()`), `data-aurum-*` markere i 164 Aurum-only CSS linije u `globals.css`. `EmptyState`/`ErrorState` (retry + sljedeći korak), `PageHeader` (kontakt), `DialogDescription` u Radix lightboxu, `fieldset/legend` + `aria-describedby` na komentarima, `aria-label` „Podijeli – {naslov}" iz i18n, `Images`/`AlertCircle` uz tekst, 11 novih BS/EN ključeva. Klasične grane u izvoru ostaju doslovno identične. Jedini izmijenjeni test je `public-blog-share-accessibility.test.mjs` (regex proširen zbog novog `aria-label`, uz dodan assert); ostalih 16 S3 testova su nepromijenjeni i zeleni.

**Zašto:** odluka **`approve_s3`** — „po istom režimu (plan → implementacija → 5/5 CI → evidencija → STOP). Ne dirati PublicFeatureGate bez nove odluke." NEJRA §07/§09/§11 su jedini izvor; Q10 traži strogi paritet. `components/ui/*`, `BeforeAfterSlider.tsx`, `data/*.mjs`, `media-image.tsx`, `features/blog/*-data.mjs`, `PublicFeatureGate`, `queryKey`, backend sanitizacija, `/backend`, `/mobile` i `package-lock.json` imaju **0 diff** (grep dokaz u §10 S3 plana). Kontakt vrijednosti isključivo iz `getSetting(...)`; NEJRA ilustrativni podaci nisu u kodu.

**Izmjene testova:** 1 (gore navedena) — bez novih `test:*` skripti, bez novih CI koraka, `check_ci_index.py` ostaje **385/388**.

**Testovi:** puna `test:*` petlja **204/204 PASS / 0 FAIL**; 5 Python gate-ova PASS (`check_repo_hygiene` **1789**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2728/2728**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **280,9 / 300 KiB** gzip (**+1,0 KiB** prema S2 279,9; `public home` 45,4, `dashboard` 13,5, `stylist inbox` 17,9, `analytics` 114,7/140, `calendar` 100,1/125); `typecheck:e2e` 0; `lint` 0 grešaka / 7 poznatih warninga; `postcss.parse` 90 pravila; `git diff --check` čist.

**CI run id:** **`43116167107`** — `gh run watch --exit-status` (`watch_exit=0`) + `gh run view` = **completed/success, 5/5**, `headSha=a12cf5b3a169d8315fb1c1bd23b522178ab1022f`: `Backend build and tests`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom`, `Repository hygiene and static reports`, `Mobile TypeScript check`. `a11y-e2e` job **`130844618383`**: **252 passed | 0 failed | 0 skipped**, artifact `playwright-a11y-report.zip` ID **`13899570263`** / 330688 B / SHA256 `d360f1ffc3df2b390b855a2a46eac2d38db941862b4db2c535e9f7626b456627`. Rendered axe i dalje pokriva **default `classic`**. CI log zadržava nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova); **ne tvrdi se WCAG 2.2/AAA usklađenost**. `140/140` i hero kontrast su source-only; rendered axe za 3 stanja, 320 px / zoom 400%, čitač ekrana i AAA ostaju 🟡 do S11.

**Otvoreno:** nema za S3; **S4 traži STOP + eksplicitno odobrenje**.

---

## Budući unosi (popunjavaju se stvarnim podacima, ne unaprijed)

S0, S1, S2 i S3 već imaju završene unose iznad s tačnim SHA i run id-em.

| Segment | Šta se upisuje |
|---|---|
| S4–S10 | po segmentu: popis fajlova, eventualne izmjene testova (s garancijom), gzip delta po chunku, CI run id, otvorena pitanja |
| S11 | brisanje starih šablona (grep dokaz 0 potrošača), `a11y-aurum.spec.ts`, docs sync, konačni broj testova, konačni run id, preostale 🟡/➖ stavke |

---

## Šablon za unos segmenta

```
## YYYY-MM-DD · S<n> · <kratki naslov>

Šta: ...
Zašto: ...
Fajlovi: ... (novo / izmjena / brisanje)
Testovi: novi ...; ažurirani ... (garancija zadržana, razlog ...); puna petlja N/N
CI: run <id> — 5/5 success; bundle ... KiB / 300
Dokazi: ✅ ... / 🟡 ... / ❌ ... / ➖ ...
Otvoreno: ... (ili "nema")
```

## 11. S4 realizacija (2026-11-11) — predaja S5

**Odobrenje:** `ask_user s4_approval` → **`approve_s4`** („plan → implementacija → 5/5 CI → evidencija → STOP"; `PublicFeatureGate` bez nove odluke netaknut).

**Implementirano:** commit **`7d2ab0e`** (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`), **12 fajlova / +220 −40**. 6 javnih tokova (`/rezervacija`, `/moj-termin/:token`, `/moje-rezervacije`, `/moje-rezervacije/:id`, `/unsubscribe`, `/profil`) + `my-reservation-card`, `payment-summary-block`, `media-consent-panel` u 3 stanja teme kroz `useTheme()` (prije early return-a), `publicAurum.*` i `data-aurum-*`. `globals.css` dobio **130 append-only Aurum-only linija** (marker `:811`, `postcss.parse` 110 pravila; S2 `:432` / S3 `:646` netaknuti). `<time dateTime>` ×3; 2 nova BS/EN ključa s interpolacijom (**2730/2730**); `window.confirm` za povlačenje saglasnosti zamijenjen `ConfirmDialog`-om (Radix, `isDestructive`, povratak fokusa). **O4 ostaje otvoreno za S6–S9** — diran je samo javni `media-consent-panel.tsx` po S4 DoD-u.

**Nulta promjena (grep `git diff -U0`):** koraci 1–4 i `setStep`, `disabled` uslovi, `service/date/slot`, validacije, `B`/`steps` semantika (`role="progressbar"` + `aria-valuetext`), `aria-pressed`, poruke grešaka uz polje, poziv kreiranja, `Idempotency-Key`/`bookingAttemptRef`, backend dostupnost, statusi, `datesRequestIdRef`/`slotsRequestIdRef`/`requestIdRef`, OTP `autoComplete="one-time-code"`, error mapping, API ugovori, `queryKeys`, `'availability:changed'`, `PublicFeatureGate`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`. Nema novih zavisnosti, novih `test:*` skripti ni izmjene ijednog source-contract testa.

**Lokalno izmjereno:** **204/204** `test:*`; 5 Python gate-ova (`check_repo_hygiene` 1789, `check_ci_index` 385/388, `check_doc_links` 687/222, `check_i18n` **2730/2730**, `check_ui_contrast` **140/140 source-only**); build **281,3/300 KiB** (+0,4 prema S3); `typecheck:e2e` 0; `lint` 0 grešaka / 7 poznatih warninga; `git diff --check` čist.

**CI dokaz:** run **`43177106881`** = **5/5 success** (`headSha` = gornji SHA); `a11y-e2e` job **`131043916664`**: **252 passed | 0 failed | 0 skipped (2.5m)** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report` ID **`13924239127`** / 331564 B / SHA256 `735f02371338766b49288e49bddd249112f148e037ff5d6a3c001502edcb6ae2`. Coverage log i dalje: `1.4.3` NEPOTPUNO (8 ruta / 18 čvorova), `2.5.3` NEPOTPUNO (22 čvora), `1.4.6` AAA **PAD** (28 violations / 70 čvorova). **Ne tvrdi se WCAG 2.2/AAA usklađenost** niti rendered axe za `aurum-light`/`aurum-dark`.

**Obrazložena odstupanja:** `PageHeader`/`FormSection`/`aria-current` na koracima (zabranjena promjena `B`/`steps` semantike), `DataTable`/`StatusBadge` za kartičnu listu (tražio bi drugačiji API payload → STOP uvjet), `test:public-reservation-error` iz plana ne postoji (stvarni `test:reservation-errors` + `test:public-reservation-accessibility` + `test:client-reservation-errors` + `test:campaign-unsubscribe-recovery` su zeleni), `ConfirmDialog` za otkazivanje rezervacije (već `CancelReservationDialog`; zamjena bi dirala validaciju razloga). Detalj u `05_phase-4-public-flows.md` §10.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA, tastaturni end-to-end kroz 4 koraka rezervacije.

**Za S5:** čeka **STOP + eksplicitno odobrenje** (auth + onboarding + NotFound), uz već najavljeno pitanje O2 o mjestu `ThemeSwitcher`-a na ekranima bez layouta.

---

## 12. S5 odluka vlasnika (2026-11-11) — zabilježeno PRIJE implementacije

**Odobrenje:** `ask_user s5_approval` → **`approve_s5`**: „Po istom režimu: plan → implementacija → 5/5 CI → evidencija → STOP. Bez diranja auth tokova, guardova, poruka grešaka, PublicFeatureGate-a i bez novih odluka o paleti."

**O2 (`s5_theme_switcher_place`) → `card_header`:** `ThemeSwitcher` na `/login`, `/register`, `/reset-password`, `/force-change-password`, oba onboarding ekrana i `NotFound` stoji **u zaglavlju auth kartice**, uz logo i postojeći `LanguageSwitcher`, **iznad `<h1>`** — ne ispod forme. Time je O2 iz `HANDOFF.md` zatvoreno; NEJRA §12 se ne tumači dodatno. `06_phase-5-auth-exceptions.md` §4/§9 su ažurirani istom odlukom.

**Obaveza:** nijedan redoslijed polja, `<h1>`, primarni CTA, `autocomplete`, OTP paste, busy/stale zaštita, error mapping, guard ni `PublicFeatureGate` ne smije se promijeniti. `components/ui/otp-input.tsx` ostaje bez izmjene (3.3.8). O4 (`window.confirm` u adminu) i dalje čeka S6–S9.

---

## 13. S5 realizacija (2026-11-11) — predaja S6

**Odobrenje:** `ask_user s5_approval` → **`approve_s5`**; **O2 = `card_header`** (zaglavlje kartice, iznad `<h1>`), zabilježeno u §12 **prije implementacije**.

**Implementirano:** commit **`90acca2`** (`90acca29ec760a48a0dea489c6f004c2d9409780`), **13 fajlova / +156 −24**. Novi `features/auth/auth-card-header.tsx` (`ThemeSwitcher` + `LanguageSwitcher`), 7 ekrana (`Login`, `Register`, `ResetPassword`, `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`, `NotFound`) + dijeljeni `components/OnboardingShell.tsx` + `globals.css` (**84 append-only Aurum-only linije**, `postcss.parse` 124 pravila). `NotFound` dobio jedan `<h1>`. **Bez `useTheme()`**: oba Aurum stanja dijele iste tokene, pa je dovoljan `[data-skin="aurum"]` CSS — nema novih hookova ni rizika za `test:hooks-order`. S2/S3/S4 blokovi netaknuti; nema novih CSS promjenljivih ni tvrdih boja.

**Nulta promjena (`git diff -U0`):** auth endpointi, guardovi, error mapping, `minLength`, `autoComplete`, `aria-busy`/`role`, `fieldset/legend`, OTP paste, `otp-input.tsx`, token cleanup, svi `*Generation`/`*InFlight` refovi, `PublicFeatureGate`, `app/router.tsx`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`, `bs.json`/`en.json` (**2730/2730**, bez novih ključeva). Nijedan test nije diran; nema novih skripti ni zavisnosti.

**Lokalno:** **204/204** `test:*`; 5 Python gate-ova; **140/140** source-only kontrast; build **281,6/300 KiB** (+0,3 prema S4); `typecheck:e2e` 0; `lint` 0/7; `git diff --check` čist.

**CI:** run **`43181880043`** = **5/5 success**; `a11y-e2e` job **`131059574192`** = **252 passed | 0 failed | 0 skipped (2.4m)** / 32 rute na **default `classic`**, artifact **`13926547985`** / 331785 B / SHA256 `327fbb67622b9e59667d929fb12babfafcaf31ea67d7ff0fd4f12afa117042f5`. Coverage `2.5.3`: `passed 9 / incomplete 22 / inapplicable 1` (prije 6/22/4) zbog 4 nova pristupačna dugmeta na `/login` i `/register`; **0 violations**. `1.4.3`/`2.5.3` i `1.4.6` AAA (28/70) ostaju nepotpuni/pad — **bez tvrdnje o WCAG 2.2/AAA**.

**Odstupanja:** jedan veliki auth-card komponent (zaključani `<h1>` regexi) → mali `AuthCardHeader`; nove primitive / sažetak grešaka / novi i18n ključevi → ➖ uz obrazloženje u `06_phase-5-auth-exceptions.md` §10.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe za `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA, rendered fokus-redoslijed kroz auth tokove, tastaturni end-to-end kroz 4 koraka rezervacije.

**Za S6:** čeka **STOP + eksplicitno odobrenje**; O3 (grupisanje navigacije + `ThemeSwitcher` u fullscreen kalendaru) i O4 (`window.confirm` u adminu) se postavljaju na tom STOP-u.

---

## 14. S6 odluke vlasnika — prije implementacije

S6 odobren (`approve_s6`) uz režim plan → implementacija → 5/5 CI → evidencija → STOP. O3: `group_with_map`, zatim eksplicitno `approve_map_a`: sedam sekcija se grupiše u pet bez promjene hrefova ili dodavanja redirecta. Pregled: `/admin`, `/admin/analytics`; Operacije: `/admin/reservations`, `/admin/daily-log`, `/admin/finance`, `/admin/loyalty`; Salon: `/admin/salon`, `/admin/services`, `/admin/stylists`, `/admin/users`; Sadržaj: `/admin/blog`, `/admin/gallery`, `/admin/reviews`; Sistem: `/admin/settings?tab=site`, `?tab=releases`, `?tab=notifications`, `?tab=email`. Svih 17 postojećih navigacijskih hrefova mapiraju se na sebe; postojeći redirecti nisu dio izmjene. Osam `TabRedirect` ruta čuva druge query parametre uz zamjenu `tab`, dok postojeći `/admin/debtors` koristi obični `Navigate` i ne čuva proizvoljni query. Ispravlja se prethodni usmeni tipfeler `/admin/debters`.

`calendar_header`: ThemeSwitcher u zaglavlju fullscreen kalendara. O4 `allow_s7_s9`: eventualna zamjena admin `window.confirm` samo u S7–S9 uz istu poruku, uvjet i efekat; ne u S6. Nema novih KPI-ja, izvora, zavisnosti ili izmjene API-ja, guardova i filtera.

**Dashboard STOP — `preserve_existing`:** vlasnik je odobrio da S6 zadrži postojeće KPI-je, izvore, izračune i filtere; razlika prema ilustrativnim KPI-jima NEJRA §05 evidentira se kao odstupanje. Nema novih KPI-ja ni filtera.

**S6 test addition:** `test:shell-a11y` imports `s6-presentation.test.mjs`, adding checks for the five approved groups, all 17 original hrefs, and the standalone calendar skip target and header switchers; no existing assertion was removed or weakened.

## 15. Revidirani smjer i odobrenje temelja — prije implementacije

Vlasnik traži potpuni novi identitet cijelog weba, zadržava Aurum paletu i traži komponentni standard, premium/unikatan izgled, suptilno kretanje i WCAG 2.2 AA minimum, poželjno AAA. Referenca je inspiracija, ne ograničenje. Koncept `docs/design/aurum-novi-identitet-koncept.html` odobren je kao smjer; ovo nije dokaz WCAG usklađenosti. Raniji S2–S4 trebaju novu realizaciju, a S6 WIP ostaje sačuvan.

`approve_foundation`: administrator bira aktivni identitet i početni režim, korisnik pamti samo light/dark (`persist_mode`); primjenjuje se na cijeli web (`whole_web`), uz minimalni backend bez migracije (`allow_minimal_backend`). Zadano **Aurum + light** (`aurum_initial`, `light_initial`), uključujući prije završetka novog vizuelnog identiteta; `classic` skriva javni prekidač (`hide_when_classic`). Plan i verifikacija: [14_prvi-segment-globalni-izbor-teme.md](14_prvi-segment-globalni-izbor-teme.md).

**Razlog izmjene testa:** `theme-switcher-a11y` mijenja očekivanje tri korisnička dugmeta u dva i dodaje provjeru da se prekidač skriva za `classic`, jer vlasnik više ne dopušta klijentu izbor identiteta. Ostale a11y, fokus, lokalizacija i mutacijske provjere ostaju očuvane.

`test:theme-state` now imports the additional `theme-policy.test.mjs` checks so the existing CI entry exercises administrator precedence, local mode persistence, legacy migration and blocked storage; existing state assertions remain intact.

Dodat je runtime test `ThemeProvider` (React + JSDOM, preko postojećeg `test:theme-state` ulaza) koji provjerava administratorski skin, DOM atribute i očuvanje lokalne preferencije. To nije browser/a11y-e2e dokaz.

### CI recovery — foundation (u toku)
Nakon odobrenja ispravke, validacija globalne teme koristi registrovane kodove grešaka. Četiri admin stranice koriste postojeći semantički muted token umjesto slate-500; paleta se ne mijenja. Dekorativni drift hero pozadine traje 2s umjesto 28s ukupno kako bi se stvarno završio unutar postojećeg 3s preduvjeta axe mjerenja. Source test za tačno trajanje je ažuriran zbog namjerne promjene animacije; nije uklonjena provjera animacije niti smanjena pokrivenost kontrasta. Rendered rezultat i CI tek treba potvrditi.

### CI recovery — dark homepage (u toku)
Nakon odobrenja sanacije, home i footer koriste postojeće semantičke Aurum površine i tekst umjesto neskladnih legacy boja u tamnom režimu. Backend kodovi validacije teme imaju BS/EN mapiranje. Nema izmjene palete niti slabljenja axe testova; čeka se rendered rezultat.

## 16. Revidirani S6 — admin inkrement (CI u toku)

Ponovo upotrijebljen dio sačuvanog WIP-a: pet odobrenih grupa, 17 istih hrefova, kalendarski skip-link i prekidači, više postojećih podataka u mobilnim rezervacijskim karticama. Novi vizuelni tretman admin navigacije i dashboarda koristi postojeće tokene i dekorativne Lucide ikone; podaci i KPI formule nisu mijenjani. Dashboard zadržava postojeće zajedničke admin primitive, a lokalni eksperimentalni `aurum-stat-grid.tsx` nije dio commita. Dodat source test ikona i šest autentificiranih axe scenarija u light/dark; postojeći testovi nisu uklonjeni niti oslabljeni. Ostatak S6 i kompletni identitet nisu završeni.

### S6 sanacija dark kontrasta (CI u toku)
Nakon odobrenja, zajednička admin tabela i pozadine kalendarske biblioteke koriste postojeće semantičke Aurum tokene umjesto legacy boja; paleta i prethodne provjere nisu mijenjane. Dodat source test uparivanja; rezultat browser mjerenja potvrđuje se isključivo kroz a11y-e2e CI.

## 17. Revidirani S2 — naslovnica, inkrement (CI u toku)

Aurum naslovnica dobija lijevo poravnat editorial hero sa postojećom administratorskom fotografijom i sadržajem, asimetrične kartice prednosti te revidiran prikaz postojeće fotografije i sekcija widgeta. Promjene su ograničene na Aurum; `classic` zadržava prethodni vizuelni raspored. Nisu mijenjani izvori, feature gateovi, rute, akcije ni sadržaj. Dodani su source test stvarnih sadržaja i dva a11y-e2e testa na 320 px, uz reduced motion i axe za oba Aurum režima. Nijedan postojeći test nije uklonjen ni oslabljen. Lokalno 203/203 neinteraktivne frontend `test:*` skripte, pet Python gateova, build i e2e typecheck prolaze; lint 0 grešaka / 7 postojećih upozorenja. Rendered rezultat čeka CI; ručni pregled i ostale površine nisu završeni.

## 18. Dijeljene javne/auth/admin/stylist komponente — inkrement (CI u toku)

Javni sadržajni heroji i dijeljena admin/stylist zaglavlja imaju novi Aurum-scoped tretman; stylist navigacija ima dekorativne Lucide ikone uz iste rute, prevedene nazive i aria-current. Auth/onboarding `AuthCardHeader` sada uključuje postojeći konfigurirani logo/naziv (ili postojeći fallback logo) uz prekidače iznad naslova, čime je ispravljeno ranije odstupanje od odluke `card_header`. Classic dobija logo u auth zaglavlju, bez promjene poslovnih tokova. Dodane source provjere te 10 javnih/auth i četiri prijavljena stylist axe scenarija u oba režima; postojeći testovi nisu uklonjeni ni oslabljeni. Lokalno 203/203 neinteraktivne frontend skripte, pet gateova, build 285,1/300 KiB, lint 0 grešaka/7 upozorenja i e2e typecheck prolaze. CI i stvarni ručni pregled su na čekanju; protokol je u `15_rucni-pregled.md`. Ovo nije kompletan redizajn svih stranica niti dokaz WCAG usklađenosti.

CI `43239989029` za `3367d6f` bio je 4/5: 280 rendered testova prošlo, jedan pao na `/usluge` u Aurum dark (broj usluga: 1,16:1 zbog svijetlog teksta na bijeloj kartici). Kartica je u Aurumu vezana za postojeće semantičke `surface`, `line` i `text` tokene; paleta i test ostaju nepromijenjeni. Nova CI provjera je nužna. Artifact 13955170294, SHA256 c234c4ef63c04f8d7b475b684807035ef66f6765f4ed15209f8bb8593b4efab4.

## 19. Vizuelne korekcije naslovne i prekidača

Na zahtjev korisnika Aurum naslovna koristi urednički dvodijelni hero prema konceptu: tekst na semantičkoj površini i odvojena vidljiva slika (konfigurisana slika ima prednost; ranije odobrena AI ilustracija je dekorativni fallback, nije fotografija salona). Animacija ulaza ostaje pod postojećim `MotionConfig reducedMotion="user"`; izbjegnuto je animiranje teksta preko fotografije. Dodani su prevedeni galerija/blog urednički linkovi samo kad su odgovarajući feature flagovi uključeni, bez izmišljenih članaka/recenzija. Postojeći sadržaj i stanja učitavanja ostaju; classic ih ne prikazuje kao nove sekcije. Prekidač prikazuje samo Sun/Moon, s prevedenim sr-only imenima, statusom, stanjem i metama kao prije. Source test je preciziran jer ime više nije vidljivo; nije uklonjena provjera imena niti ijedan test. Nove rendered provjere i CI ostaju mjerilo, a ne dokaz potpunog WCAG-a ili ručnog pregleda.

CI `43272100212` (914e0aa): 4/5, 281 rendered testa prošla. Jedini pad bio je novog testa perzistencije: e2e `addInitScript` je sam brisao postavku pri svakom reloadu. Inicijalizacija tog scenarija ograničena je na prvi ulaz; tvrdnje o fokusu, stanju i perzistenciji ostaju iste. Slijedi ponovno izvršavanje CI-ja.

## 20. Novi kampanjski hero i jedna animirana ikonica

Na zahtjev korisnika prethodni split sa svijetlom površinom zamijenjen je tamnom kampanjskom kompozicijom sa novom AI ilustracijom kose kao dekorativnim fallbackom; administratorova hero slika i tekst ostaju prioritet. Tekst je na odvojenoj neprozirnoj postojećoj NEJRA hero površini radi kontrasta i nezavisnosti od slike. Slika i promjena ikonice imaju jednokratnu animaciju, obje isključene kod reduced motion. Novo jedino stabilno dugme prikazuje Sun u light i Moon u dark; `aria-pressed` označava dark, dostupno ime je prevedeno, promjena se najavljuje i fokus ostaje. Classic nema prekidač. Testovi starog dva-dugmeta ugovora ažurirani su za izričito novu korisničku odluku: i dalje provjeravaju oba režima, ime, stanje, mete, fokus, najavu, jezike, classic, mutacije te dodaju Enter/Space, perzistenciju i reduced-motion rendered provjeru. Izvorni test hero kontrasta NEJRA §07 ostaje kao historijska token provjera; nova kompozicija ima dodatni source test, rendered axe i dalje obavezan. Nema tvrdnje o ručnom ili potpunom WCAG pregledu.

## 21. Naslovna — početak pojedinačnog AAA audita

Na zahtjev korisnika dekorativna hero slika skrivena je ispod 768 CSS px samo u Aurumu; naslov i akcije ostaju. Dodana je rendered provjera mobilne skrivenosti i desktop vidljivosti. Počinje pojedinačni audit `/`: dodana je namjenska desktop light/dark axe AAA asertacija koja zapisuje i nepotpune nalaze, uz postojeće AA i mobilne testove. Ovo je početni mjerni korak, ne tvrdnja o AAA usklađenosti; sadržaj seed baze, zoom, sva dinamička stanja, tastatura i asistivne tehnologije zahtijevaju daljnju provjeru. Sljedeće stranice nisu obuhvaćene ovim inkrementom.

CI `43279270711` za `694635c`: 4/5; postojeći AA testovi i oba mobilna testa prolaze, dvije nove AAA desktop provjere padaju na kontrastu. Light: 12 čvorova (6,01:1 dugmad, 5,93–6,61:1 tekst), dark: jedno dugme 5,7:1. Upareni postojeći `text-muted-strong` i `text`/`surface` tokeni u pogođenim područjima; paleta nije mijenjana. Nalazi su početni i podaci seed baze ne pokrivaju sva stanja. Ponavljanje rendered provjere potrebno.

CI `43280349595` za `257a37f`: 5/5, desktop AAA axe asertacije za naslovnu prošle u light i dark na stanju izolovane CI baze; to nije potpuni WCAG audit niti pokriva sve podatke. Pregledom izvora pronađen je drugi problem naslovne: bočne liste transformacija automatski su se beskonačno pomjerale, bez pauze, uz duplikate fokusabilnih dugmadi. Zamijenjene su statičnim skrolabilnim listama; ručni izbor transformacije ostaje. BS/EN opis je usklađen i dodana source regresijska provjera. Promjena utiče i na classic jer je komponenta zajednička; opravdanje je pristupačnost i očuvanje funkcije izbora, ne kozmetički redizajn.

Proširen audit naslovne pokriva i testne popunjene transformacije/recenziju na 320 px i desktopu u oba režima, uz tastaturni klizač i AAA nalaze. Testni podaci presreću API samo u izolovanom Playwrightu, ne mijenjaju poslovne podatke. CI je potreban za rezultate.

CI `43281519526` za `9817353`: 4/5. Prazna desktop stanja i popunjeni dark mobile prošli su AAA axe; popunjeni light ima dodatne 5,93–6,38:1 tekstove, a desktop popunjeni dark otkrio je AA 2.5.3 neslaganje vidljivog i pristupačnog imena na sličicama. Korišten je postojeći `text-muted-strong`; vidljivi naziv sada ulazi u pristupačno ime zajedno s brojem transformacije, uključujući i razlikovanje mobilnih sličica. Ponovni rendered test je obavezan; paleta nije mijenjana.

## 22. Javno zaglavlje i meniji — AAA inkrement

Javno zaglavlje, mobilni drawer i portal korisničkog menija koriste postojeće Aurum semantičke površine, tekst, granice i fokus; classic nije obojen novim pravilima. Mobilni meni vraća fokus na okidač nakon zatvaranja, kontrole imaju 44 px, te su javni linkovi s ugniježđenim dugmadima pretvoreni u jedan `Button asChild` link bez promjene rute/funkcije. Test izvornog drawer ugovora je prilagođen dodatnim atributima, zadržava provjeru imena i dodaje fokus i zabranu ugniježđenih kontrola. Dodani su izolovani rendered AAA/AA testovi javnog mobilnog i prijavljenog korisničkog menija u oba režima; ovo ne dokazuje potpunu WCAG usklađenost, a stvarni CI rezultat i ručni pregled se čekaju.

CI `43287911946` za `a2a55bd`: 5/5, uključujući otvoreni javni mobilni i prijavljeni korisnički meni u oba Aurum režima, axe AA/AAA i fokus nakon zatvaranja; nije dokaz potpunog WCAG-a. Počinje pojedinačni audit `/usluge`: uklonjen ugniježđeni `main` (zadržan postojeći shell `main`), pristupačno ime usluge uključuje vidljivi naziv i trajanje, dugme za brisanje pretrage ima 44 px. Dodani izolovani testovi popunjenog kataloga i filtera bez rezultata za light/dark i 320px/desktop, sa AA/AAA axe, tastaturom i provjerom preljeva. CI je na čekanju.

CI `43289167654` za `d213874` (4/5) otkrio je na popunjenom katalogu: dark filter bijela površina/svijetli tekst 1,16:1 (AA), light dugmad 6,01:1 (AAA), te 2.5.3 na linku usluge. Pokušaj ručno sastavljenog aria-labela nije riješio axe; uklonjen je suvišni override tako da se ime linka računa iz stvarnog vidljivog naziva i trajanja. Source test prilagođen novom ugovoru i rendered test zadržan. Filter, input i odabrane kontrole koriste uparene postojeće semantičke tokene; paleta nije mijenjana. Potrebno novo CI mjerenje, uključujući dosad nedostupno stanje bez rezultata.

CI `43290465660` za `f202b08`: 4/5. Popunjena stanja oba režima i dark bez rezultata nemaju AA/AAA axe prekršaja; light bez rezultata otkriva još tri AAA kontrasta (5,93–6,38:1). Korišteni su postojeći jači tokeni za reset i prazno stanje. Axe je u popunjenom stanju prijavio nepotpune AA kontrastne provjere (light 2, dark 1), koje ostaju otvorene za ručni pregled; ne proglašavaju se prolazom.

CI `43291453468` za `2b3bd42` (4/5): preostao jedan isti AAA nalaz na akciji praznog stanja; ranije opšte pravilo za legacy klasu imalo je veću CSS specifičnost. Preciziran je selektor postojećeg para tokena, uz nepromijenjen test i paletu. Ponavlja se CI.

## 23. `/usluge` — dodatna pojedinačna stanja

Nastavak audita ove stranice: dugačak naziv kategorije sada se prelama umjesto skraćivanja; prostor u polju pretrage uvećan je za 44px dugme. Prošireni su testovi tastaturnog izbora kategorije i stvarnog prikaza dugog naziva, AAA/AA skeniranja praznog kataloga i greške uz oporavak, te zapis tačnih nepotpunih axe nalaza. Nema izmjena palete niti testnih popuštanja; CI i ručne provjere su na čekanju.

CI `43306548987` za `5e0ae7f` je 5/5. Detaljni axe izlaz upozorio je da istraži-katalog link ima 1:1 kao nepotpun nalaz, a broj kategorije je preklopljen dekorativnim slojem. Link je vezan na postojeći `text`/`surface` par, a dekorativni sjaj je isključen samo na Aurum karticama uz eksplicitnu površinu broja; dodana je provjera različitosti izračunatih boja. Nema izmjene palete. Potreban je novi CI i ostale ručne provjere.

## 24. `/usluge` — prijavljeni kontrast konfigurisanog sadržaja

Korisničke slike su pokazale nečitljive kartice koraka, značke i hover ikonu u tamnom režimu. Prethodna tvrdnja bez nalaza važila je samo za ograničen testni sadržaj, ne stvarne postavke ni hover. Uparene su postojeće semantičke boje površine i teksta za te dijelove i opis preko slike; proširen je fixture na administratorski uređene korake i oznake te hover linka u oba režima. Potrebni su CI i ručni vizualni pregled stvarnog sadržaja.

## 25. Detalji usluge — kontrast i struktura

Na osnovu korisničke slike upareni su semantički tekst/površina za cijenu, trajanje, kategoriju, kontaktne linkove i praznu galeriju; sadržaj preko hero slike dobio je čvrstu površinu. Uklonjen je ugniježđeni `main`, omogućeno prelamanje dugih naslova i kontakata. Dodani su render testovi stvarnih polja i kontaktnih postavki, prazne i popunjene galerije, hover stanja, oba režima i 320px; čekaju CI. Ručni pregled ostaje obavezan.

CI `43313496364` (4/5) otkrio je dodatne AAA nalaze na znački kategorije i kontaktima u zajedničkom footeru, te nepotpun nalaz na rezervacijskom CTA-u. Ispravljeni su postojeći parovi tokena; dekorativni krug koji je preklapao link uklonjen je samo na detalju usluge. Render testovi se ponavljaju.

## 26. Dorada rasporeda prema korisničkim slikama

Uklonjen duplirani naslov i kategorija preko slike detalja i prateći nepotrebni overlay; naslov i alt slike ostaju. Uklonjena je vanjska bijela površina i dupli donji razmak koji su pravili bijelu traku. Opis preko slike na `/usluge` spušten je na većim ekranima uz očuvan razmak od oznake broja; na malim ekranima zadržan je veći sigurnosni razmak. Dodane su regresijske provjere slike, dugog naslova, bijelog omotača i položaja; potrebna je i vizualna provjera sa stvarnim sadržajem.

## 27. Prijavljeni vizualni problemi na više tokova

Na `/usluge` brojevi koraka više se ne skupljaju niti prelamaju; lightbox galerije je prilagođen veličini slike i centru, sa skrolom i jasnim kontrolama. U rezervaciji su trajanja, odabrani servisi i kalendar vezani na površinu/tekst aktivne palete, a nedostupni datumi su čitljivi i označeni precrtavanjem. Javna pozadina sada prati temu (uključujući profil), kao i account meni; legacy kartice stilističkog shella prelaze na Aurum površinu. Dodani su izolovani render fixture testovi za modal, korake, rezervaciju/profil i popunjenu stilističku knjigu. Ovo nije kompletan pregled svih stanja stilističkog dijela; CI i ručna provjera su potrebni.

CI `43383083628` je otkrio stvarni gubitak fokusa po zatvaranju lightboxa: okidač se sada eksplicitno vraća u fokus. Statički test skip-linka usklađen je s novim identifikatorom shella bez uklanjanja provjere. Rezervacijski fixture dopunjen je završenim onboardingom, da test ne mjeri redirect. CI se ponavlja.

CI `43383917572` / `43384745786`: lightbox i popunjeni stylist fixture prolaze; u izolovanom rezervacijskom fixture-u prelazak na profil nije uspješno obnovio sesiju. Provjera profila prebačena je u postojeći projekat sa stvarnom izolovanom CI prijavom umjesto lažnog tokena. Rezervacijski fixture zadržava provjere izbora i kalendara.

## 28. Inventar preostalog javnog portala

Provjerene su deklarirane javne i auth rute i pokrivenost testovima. Otkriven i ispravljen ugniježđeni `main` na `/unsubscribe`; zadržani su status, akcije i testiran shell landmark. Posljednji prethodni CI `43387264619` (5/5) ne predstavlja završni AAA audit cijelog portala: namjenski AAA/AA fixture-i obuhvataju naslovnu, katalog, detalj usluge i lightbox; `/blog`, `/galerija`, `/kontakt`, `/register` imaju osnovni render u obje teme, ne sve podatke/stanja; rezervacija ima test odabira i kalendara, ali ne sve slotove, potvrdu i greške. Profil ima provjeru pozadine, ne cjelovit audit. Blog detalj, recenzije, korisničke rezervacije i detalj/token, unsubscribe i auth/onboarding zahtijevaju pojedinačni pregled sa stvarnim reprezentativnim podacima, u oba jezika i teme, uključujući mobilni prikaz, interakcije, greške i oporavak. Ručni protokol u `15_rucni-pregled.md` nije izvršen. Automatizirani axe ne dokazuje potpunu usklađenost.

## 29. Javni portal — rezervacijski tok po stanjima

Započet dodatni render audit rezervacije: izolovani testni klijent, pretraga i odabir usluge, greška i ponovni pokušaj za datume i termine, raspoloživ i zauzet termin, napomena, dugovanje, loyalty i simulirana potvrda s provjerom payload-a. Axe AA/AAA i reflow mjere se po stanjima u obje teme i na 320px/desktop; CI je potreban za nalaze. Nema stvarnog slanja ili promjena u bazi.

CI `43391943282` je pronašao nedovoljan AAA kontrast pomoćnog teksta u svijetlom i odabranog termina u tamnom režimu. U rezervaciji su upotrijebljeni postojeći jaki parovi teksta i površine te uklonjena prozirnost odabranog termina. Axe je prijavio i nepotpune provjere pojedinačnih dekorativnih brojeva napretka i praznog polja; nisu dokaz prolaza i zahtijevaju ručni pregled. Ponoviti render audit.

CI `43392953499`: tamni tok je prošao sva ciljna stanja i simuliranu potvrdu; svijetli je pokazao dodatni AAA nalaz na outline akcijama (globalni legacy selektor je prepoznao dark hover klasu kao primarnu). Na rezervaciji je vraćen semantički površina/tekst par za te akcije; ostale faze svijetlog toka čekaju ponovljeni CI.

CI `43393860257` pokazao je da je postojeći `:is(button, a[href])` selektor specifičniji nego prethodna korekcija; selektor outline akcija je sada preciziran većom specifičnošću. Nije spušten prag testa.
CI `43394701302` potvrđuje prolaz svijetlih stanja do sažetka, gdje je otkrivena prednost starog selektora nad odabranim terminom i slab kontrast vrijednosti loyalty polja. Dodata specifičnost za termin i uparene boje polja; ponovna provjera je potrebna.

### Blog detalj — početak pojedinačnog pregleda
- Naslov hero sekcije učestvuje u rasporedu umjesto apsolutnog pozicioniranja, uz tamnu rezervnu podlogu; dugi naslov, sadržaj i komentari se prelamaju, a mediji ne prelaze širinu.
- Zamijenjena ugniježđena interaktivna kontrola za prijavu u komentarima jednim linkom sa stilom dugmeta; sačuvana povratna ruta.
- Dodani renderirani scenariji s popunjenim člankom, dugim sadržajem, greškom i tastaturnim ponavljanjem učitavanja komentara, u obje teme i na 320 px/desktop. CI je potreban za rezultat; ručni pregled i ostala stanja ostaju otvoreni.
- CI `43397604353`: tamni scenariji prolaze, svijetli otkrio nedovoljan kontrast povratne, share i outline akcije; hero je označen za ručnu provjeru zbog gradijenta. Upareni su tokeni za akcije, a naslov/datumski tekst dobio neprozirnu tamnu podlogu neovisnu o slici. Ponovna CI provjera slijedi.
- CI `43398627520`: greška komentara i oba tamna scenarija prolaze bez axe violations/incomplete; kod popunjenog komentara u svijetloj temi datum je bio 6.38:1. Datum koristi jači semantički token; potrebna ponovna provjera.

### Urednički redizajn bloga i stapanje homepage fotografije
- Na zahtjev korisnika Aurum lista bloga dobila je prostran urednički uvod, istaknutu prvu objavu i kartice s čitljivom tipografijom; postojeći podaci, postavke, paginacija i Classic ostaju.
- Detalj objave sada ima naslov i datum iznad velike fotografije, umjesto prekrivenog i odrezanog hero prikaza. Prijava, dijeljenje i komentari ostaju dostupni.
- Desktop hero fotografija na naslovnoj ima postepeno maskirane sve rubove; mobilna fotografija ostaje skrivena. Dodani su renderirani testovi popunjene liste i položaja fotografije detalja; vizuelni pregled stvarnih fotografija još je potreban.

### Dorada bloga prema screenshotovima
- Ispravljen prelazak fotografije preko teksta istaknute objave: oba stupca su skupljiva, a fotografija je ograničena vlastitim okvirom; dodana provjera geometrije s realnom učitanom slikom i dugim naslovom.
- Smanjena tipografija i razmaci, dodana urednička oznaka izdvojene priče, suptilni akcenti i sažetak u zaglavlju detalja kada postoji. Desktop i mobilni omjeri fotografije detalja prilagođeni; homepage ostaje netaknut.
- Lokalni build, i18n, pristupačnost liste i E2E typecheck prolaze; renderirani testovi i vizuelna provjera sa stvarnim sadržajem ostaju potrebni.

### Portalne površine — palette fix
- Pronađen uzrok: Tailwind `dark:bg-slate-950` generiše se nakon lokalnih pravila i istom specifičnošću nadjačava prethodni Aurum background; portali se također nalaze izvan layouta. Prijašnji testovi su provjeravali kontrast, ali ne i stvarnu boju.
- Centralno označene zajedničke Radix površine dijaloga, ladica, menija i podmenija, s dovoljno specifičnim Aurum uparenim tokenima te stilom fokusiranih stavki i kontrola u dijalozima. Classic nije obuhvaćen pravilima.
- E2E sada direktno poredi stvarnu boju galerijskog dijaloga, korisničkog menija i ladice novog unosa s `--surface` u obje teme. Druga hardkodirana slate mjesta (uključujući zasebne kontrole i admin) nisu automatski proglašena pregledanim; široka zamjena svih slate klasa mogla bi poništiti semantičke boje i stanja.
- CI `43407635665`: galerija i meni prolaze novu provjeru stvarnih boja; test ladice je naišao na preusmjeravanje zbog nemokiranog autentificiranog API-ja klijenata. Dodani izolirani odgovori za klijente i usluge; ponovna provjera u toku.

### AA/AAA pregled — kontakt i zadovoljni klijenti
- Otkriven postojeći ozbiljan funkcionalni problem: kontakt forma je nakon timeouta prijavljivala uspjeh bez slanja. Zamijenjena je jasno označenim otvaranjem korisnikove email aplikacije (mailto); korisnik sam šalje poruku. Polja su obavezna, unos se ne briše i ne tvrdi se da je email poslan. To nije serversko slanje; potreban je podešen email klijent.
- Dodani renderirani testovi AA + AAA prijavljenih nalaza za kontakt (popunjena forma i radno vrijeme greška/retry) i zadovoljni klijenti (greška/retry, popunjen slider, tastatura), 320px i desktop, obje teme. CI je potreban; ručna provjera i ostale rute/stanja nisu završeni.
- CI `43421095057` otkrio je AAA kontrast sekundarnog teksta i outline akcija u svijetlom kontaktu i prikazu zadovoljnih klijenata; tamni scenariji prolaze (kontakt hero gradijent ostaje `incomplete` za ručni pregled). Sekundarni tekst, polja i outline akcije sada koriste odgovarajuće uparene tokene; ponovna CI provjera slijedi.
- CI `43422102805`: zadovoljni klijenti prolaze obje teme i oba prikaza; popunjena svijetla kontakt polja pokazala su da opći selektor nadjačava prethodnu korekciju. Povećana specifičnost selektora polja bez izmjene kriterija testa.

### Stilistička dnevna knjiga — odabir klijenta i servisa
- Uzrok: odabrani klijent se čitao iz promjenjivog rezultata pretrage. Nakon odabira je cijelo ime pokretalo novi API upit, koji može vratiti praznu listu (ime i prezime su zasebna polja), pa je `selectedClient` nestajao iako je tekst ostao vidljiv. Bez spola odabranog klijenta kontrola servisa se isključi.
- Odabrani klijent čuva se zasebno, pretraga se ne pokreće za već odabranog klijenta; izmjena klijenta briše izbor servisa i iznose. Filtriranje po spolu i postojeća validacija ostaju.
- Dodan E2E s realističnim praznim odgovorom na puno ime, oba spola servisa i promjenom klijenta, te source regresija. Lokalni build i testovi prolaze; potrebno provjeriti CI i stvarne podatke.

### Admin dashboard — prvi inkrement
- Vlasnik je zatvorio javnu fazu (ručni AA pregled ostaje dokumentovan kao neizvršen) i odobrio intenzivan rad na adminu. Zatečeni neversionirani `frontend/src/features/dashboard/aurum-stat-grid.tsx` ostaje netaknut i nije uključen.
- Pregled `/admin`: novi brzi pristup postojećim rutama, jasnija hijerarhija zaglavlja, operativnih/finansijskih kartica s ikonama i tabele, bez izmišljenih podataka ili izmjena formula. Rezervacije su ispred tehničke dijagnostike; uloga i replay zaštite ostaju.
- Djelimični pad izvora sada ne prikazuje lažne nule: zavisne vrijednosti označene su „Nije dostupno”; pad sažetka rezervacija nije prikazan kao prazna lista. Dodani su testovi parcijalnog pada i renderirani AA/AAA izvještaj za desktop/320px u obje teme. Lokalni build i source testovi prolaze; CI i stvarni vizuelni/ručni pregled ostaju potrebni. Ovo nije završetak admina niti potvrda WCAG usklađenosti.
- CI `43427320924`: SSR smoke je tražio novu obaveznu `failedSources` vrijednost u fixtureu, a mobilni axe je našao da scrollable tabela nije fokusabilna tastaturom. Fixture sada prosljeđuje stanje izvora, a zajednička tabela ima imenovanu fokusabilnu regiju; 42/42 SSR smoke lokalno prolazi. Rerun slijedi.
- CI `43428294663`: renderirani a11y job prošao, ali lint ne dopušta statički `tabIndex` na regiji. Fokus se sada dodaje samo kada tabela zaista horizontalno prelijeva, uz praćenje promjene dimenzija; lokalno lint, smoke i build prolaze. Ponovni CI je potreban.

## 30. Admin dashboard — Faza C: strukturna adopcija i tokenizacija (C 9/–15/)

Owner je odobrio admin fazu nakon zatvaranja javne. Svi batchevi uvoditi `<Button>`/`<DataTable>`/`<Select>`/Semantičke tokene umjesto sirovih slate-zinc-neutral gray skala; javne stranice, auth flow i `components/ui` se ne diraju; `aurum-stat-grid.tsx` (neversionirani WIP) netaknut. CI je praćen za svaki push.

- **Faza C (9/) `ca17234`**: pilot DataTable onRowClick + Stylists/Users adopcija djeljenih primitiva (Select); 71 adopcioni plan (C (7/)) apliciran na svih 14 admin stranica; source-contract testovi prepravljeni da prate adopciju.
- **Faza C (10/) `eaf51ec`**: DataTable + app-table th tokenizacija (HEAD_ROW/BODY_ROW); `data-default-card-surface` parovi preko djeljenih klasa.
- **Faza C (11/) `4d5ec65`**: blog admin tabela — migracija na `<DataTable>`; a11y regression test ažuriran.
- **Faza C (12/) `1d2bf6b`**: preostali slate ostati u Analytics/Reviews/invoice-preview tokenizirani (`dark:ring-offset-slate-950` → `ring-offset-surface` i sl.).
- **Faza C (13/) `d924f70`**: masovna tokenizacija text-slate-900/950 parova (~40 fajlova); `text-slate-400` allowlist unos (settings-module-page Search ikona) tokeniziran i unos obrisan; ratchet pragovi `text-contrast-allowlist` (scanned ≥300 / skippedDark ≥50, izmjereno 313/60) i `stylist-dark-contrast-a11y` (strukturalni file-walk ≥15 fajlova umjesto fiksnog praga broja paleta-klasa, koji nakon tokenizacije više nema smisla — 2 amber-700 zadržana sa dark pratiocima). CI `44277411543` — **5/5 zeleno.**
- **Faza C (14/) `3cbab1d`**: masovna tokenizacija text/border/bg slate → semantički tokeni (~51 fajl): svjetli tekst/okviri/površine su sada svi preko djeljenih tokena (`surface*`/`content*`/`line`/`control-border`/`surface-inverse`); 1.4.11 granice upload dropzone/panela → `border-control-border`; workbook reschedule switch „on“ → `bg-surface-inverse`; profile h1 → `text-content`. Javne i auth stranice (Login/Register/ResetPassword/NotFound/ForceChangePassword/onboarding) i `components/ui` netaknuti; prazne zvijezdice u Reviews/ClientAnalytics zadržane (allowlistirane, dekoracija). Lokalno: full `test:*` sweep ZERO grešaka, build 291.8 KiB gzip (budget 300), eslint 0 grešaka, 140/140 kontrast parova, hygiene/i18n/diff-check čisti. CI `44279398623` — rezultat prati se.
- **Faza C (15/)**: `text-muted-foreground` (mrtva utility klasa — nije mapirana u tailwind configu; bojila se samo kroz `[data-skin="aurum"] [data-users-dialog]` patch selektor) zamijenjena sa `text-content-muted` u AppReleases/Gallery/Services/app-release-create-form (23 mjesta). Classic prikaz se mijenja s ničega na propisanu muted boju; Aurum prikaz ostaje konzistentan.
- Svjesna zadržavanja nakon C: **public run exception** (`public/` stranice, auth flow, onboarding, `components/ui` i `src/lib/toast/toaster.tsx` dark-toast estetika — netaknuti), dekorativne prazne zvijezdice (`text-slate-200/300` s `dark:text-content-strong`). Preostalih 14 slate mjesta u admin scope su javno-portal izuzetak (`public-blog-comments.tsx`) i 2 allowlistirane zvijezdice.

### Faza D (1/) — mrtvi patch selektori (query-audit nad runtime src + Radix/vendor poznati atributi)
- Sistematski audit 341 `[data-skin="aurum"]` pravila: za svaki selektor izdvojeni su klasa/attr/`[class*=]` referensi i prebrojano u **runtime** izvoru (tsx/ts; testovi/labeli/komentari isključeni). Uklonjena su samo pravila/alternative bez ijednog runtime pogodka:
  - `[class*="border-blue-"]` iz border-panele grupe (0 pogodaka; bg/text-blue alternative zadržane — Notifications koristi `bg-blue-50/80`);
  - rezervacija (`[data-aurum-page="reserve"] button[class~="shadow-slate-900/5"]` + `:hover`) — cijela dva pravila;
  - blog-post članak (`:is(button, a[href])[class~="shadow-slate-900/5"]` + prva alternativa hover grupe) — zadržana `border-transparent`/`text-slate-600` grana;
  - kontakt/zadovoljni klijenti (2 pravila `shadow-slate-900/5`);
  - users-dialog: `select[class~="bg-white"]` alternativa, `button[class~="bg-slate-900"]` + `:hover:not(:disabled)` (0 runtime `bg-slate-900` klasa u scope-u), `.text-muted-foreground` alternativa (mrtva klasa — C (15/));
  - stylist-shell `:is(button, a)[class~="bg-slate-900"]`.
- **Zadržano namjerno:** `.rbc-today`/`.rbc-time-gutter` (vendor klase react-big-calendar — nevidljive grep-u, ali dolaze iz biblioteke), `[data-highlighted]` (Radix postavlja runtime atribut), sva pravila s javnim/dev patch targetovima (javne Aurum stranice i dalje koriste sirove klase), `:focus-visible`, `forced-colors`, prefers-reduced-motion.
- Lokalno: build PASS (291.6 KiB / 300), **svih 204 `test:*` paketa** prolazi, contrast 140/140, hygiene + i18n + diff-check + tsc + lint (0 grešaka) čisti. CI se prati.

### Faza D (2/) — admin-closure trim (import-closure 255 fajlova)
- Za admin-scoped selektore (`[data-users-dialog]`, `[data-analytics-hub]`, `.admin-shell`, `[data-admin-users]`…) napravljena je tranzitivna import-closure (admin rute + DashboardLayout + stylist rute/layouti/featureri, 255 fajlova) i u njoj provjereni svi klasa-tokeni; sve javne/stanice/auth grane namjerno isključene jer scoped pravila tamo ne mogu pogoditi.
- Uklonjene su samo alternative sa 0 pojavljivanja u closure-u: `.text-slate-800` iz `[data-client-analytics-dialog] :is(…)` i iz `.admin-shell [data-analytics-hub] :is(…)` (obje liste zadržale ostale, žive alternative), `.border-slate-100` iz `[data-analytics-hub]` border pravila.
- Namjerno zadržano: `.rbc-today`/`.rbc-time-gutter` (vendor react-big-calendar — pogodak postoji samo u biblioteci, ne u izvoru; brisanje bi pokvarilo aurum kalendar), sve alternative sa shared `components/ui` pogocima (app-logo, button/badge/accordion/drawer/textarea itd. — dijele ih javne i admin površine).
- Lokalno: build PASS (291.6 KiB / 300), svih 204 test:* paketa 0 grešaka, diff-check čist. CI se prati.

### Faza D (3/) — zatvaranje admin teme i Faze D
- Owner vizuelna provjera (2026-11-18) prošla za admin dashboard i faze C/D; odluka: **admin faza se zatvara**.
- Završni sweep: jedini stvarni sirovi slate u admin scope-u bio je `settings/types.ts` `gray: 'text-slate-500'` (ikona postavki grupe) → `text-content-muted`; rezervna skeniranja potvrđuju da preostali admin pogodci su (a) javni client-reservations/public-shell (izuzetak — javni portal), (b) dvije allowlistirane dekorativne praznine zvijezdice (Reviews/ClientAnalytics), (c) `translate-*` klase (lažni pogodci).
- **Zadržano namjerno (odluka uz ownerovu vizuelnu potvrdu):** `[data-skin="aurum"]` patch CSS za javne/auth/onboarding Aurum površine i dijeljene `components/ui` primitive (button/badge/accordion/dropdown-menu/drawer/textarea/otp-input/switch itd.). Razlog: javne stranice i shared UI i dalje renderuju sirove paleta-klase (javni portal je out-of-scope za admin fazu), pa patch pravila ostaju LOAD-BEARING — brisanje bi regresiralo Aurum kontrast bez ijednog testa koji bi to uhvatio. Brisanje dolazi u obzir tek nakon tokenizacije javnog portala ili shared UI sloja.
- Finalni cilj admina postignut: sirovi `slate-*` u admin TSX ≈ 0 (ostale su samo javne izuzeci + dekoracija); `<Button>`/`DataTable`/`Select`/`Input` adopcija uvedena lokalno po stranicama (C (7/)–(15/)); meh. brisanje mrtvosti patch selektora (D (1/)–(2/)) — bez gubitka funkcionalnosti.
- Grana: `arena/dadb4053-beauty-salon-v2` = origin na HEAD-u; CI za svaki push (5/5 zeleno na finalnim batch-evima; praćeni limiti: `44277411543`, `44279398623` (cancelled→pokriven), `44280149703`, `44293613855`, `44295902829`).
- Remaining per plan before any „gotovo“ on broader scope: tokenizacija javnog portala + shared UI; **ručni vizuelni pregled** reservacijskog/auth/onboarding flow-a; zatim brisanje javnog Aurum patch CSS-a (Faza D finale).

### Faza C (16/) — standardizacija dijeljenih komponenti (`src/components/**`) `2e3d401`
- Owner: „share komponente sve standardizujemo bukvalno ipak“. Sve paleta-klase u dijeljenim komponentama prevedene na semantičke tokene (Classic i Aurum jednako):
  - `components/ui/`: accordion, avatar, badge, button, drawer, dropdown-menu, otp-input, separator, switch, tabs, textarea. Površine `bg-white`/`dark:bg-slate-950` → `bg-surface`, `slate-100` → `surface-muted` / `bg-line` (separatori), `border-slate-*` → `border-line`, svjetli tekst 900/950 → `text-content`, 600–800 → `content-strong`, placeholder → `content-muted`.
  - `components/`: ProtectedRoute/PublicOnlyRoute/StylistRoute (loading → `bg-surface-sunken` + `text-content-strong`), OnboardingShell (h1 → `text-content`, ostalo `content-strong`/`surface-*`/`border-line`), BeforeAfterSlider (`bg-surface-muted`, `focus-visible:ring-focus-ring`, knob ring `ring-line`).
- Zadržano namjerno, s razlogom: `app-logo.tsx` (brand mark), BeforeAfterSlider knob tekst (konstantna bijela podloga — ne smije se invertirati u tamnom modu), `button.tsx` hero/red varijante (konstantne podloge), status-semantičke rose/amber/emerald klase u `alert`/`badge`/`select`/`button(red)` (design-system status API).
- Testovi ažurirani: `onboarding-email-accessibility` (h1 → `text-content`), `text-contrast-allowlist` ratcheti (scanned 313→293, bg+text parovi 40→34, skippedDark 50→45; komentari s datumom).
- Lokalno: build PASS (291.3 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist.

### Faza D (4/) — finalni D: mrtav admin-scoped patch CSS nakon C (16/) `b265fe8`
- Owner: „možeš krenuti u finalni fazu D“. Poslije standardizacije komponenti, ponovni audit 341 `[data-skin="aurum"]` pravila (komentari uklonjeni iz selektora; admin-scope u 255-fajlova import closure; globalno pravila u runtime src):
  - 6 cijelih pravila obrisano: `[data-stylist-shell] [class~="dark:bg-slate-950"]`, `.admin-shell [data-analytics-hub] :is(.text-slate-600, .text-slate-700, .text-slate-900)`, `.admin-shell [data-analytics-hub] .border-slate-200`, `[data-users-dialog] .text-slate-500`, `[data-client-analytics-dialog] div[class~="bg-slate-50"]`, `[data-aurum-overlay-surface] :is(input, textarea, select)[class~="dark:bg-slate-950"]`;
  - alternative obrisane: `.text-slate-600` (`[data-admin-users]`, users-dialog, client-analytics-dialog), `.text-slate-500` (analytics-hub — preostala grana); jednostavnije selektor-liste umjesto `:is()` grupa gdje je ostala jedna grana;
  - audit artefakti (comment contamination, pogrešna cwd relativizacija) identifikovani i ispravljeni prije brisanja; provjera tokena u closure-u rađena je nad komentarima uklonjenim tekstom fajlova.
- **Javni Aurum patch CSS ostaje LIVE i netaknut** — javne stranice i dalje koriste sirove `slate-*` klase; brisanje je bezbjedno tek nakon tokenizacije javnog/auth/onboarding portala. Zadržane su i vendor/Radix klase (`.rbc-*`, `.recharts-*`, `[data-highlighted]`) i sve globalne [data-aurum-page] grane.
- Lokalno: build PASS (291.3 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. CI se prati.

**Admin/C/D replans: završeno u mjeri u kojoj to dozvoljava javni portal. Dalji rad = tokenizacija javnog portala (novi batch serija).**

### Faza C (17/) — javni shell/blog/client-reservations/toast tokenizacija (javni opseg potvrđen) `f24f885`
- Owner: „Može nastavi dalje“ → kroz ask_user potvrđeno da se tretira kao zeleno svjetlo za **javni opseg** tokenizacije.
- Tokenizovano (Classic i Aurum jednako; bez novih animacija, bez izmišljenih vrijednosti):
  - `features/shell/public/public-layout.tsx` (loading/maintenance/header/nav/sidebar-footer/footer/socials), `public-ui.ts` (publicPage.outer/publicSection.surface → `bg-surface`, `subtle`), `before-after-spotlight.tsx`, `features/blog/public-blog-comments.tsx`, `features/client-reservations/{my-reservation-card, payment-summary-block}.tsx`, `src/lib/toast/toaster.tsx` (spreman za dark-toast estetiku preko tokena).
- Zadržano namjerno: komponente rezervisane za javne stranice (Public*.tsx) i auth/onboarding flow — sledeći batch (C 18/+); sirovi slate u testovima koji dohvaćaju javne stranice ostaje do tokenizacije tih stranica.
- Testovi: `text-contrast-allowlist` ratcheti (scanned ≥278, bg+text parovi ≥33) i `public-a11y-axe-findings` (skip-link test sada traži `bg-surface`).
- Lokalno: build PASS (291.2 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. Datum mjerenja: 2026-11-18. CI se prati.

### Faza C (18/) — javni portal i auth/onboarding tokenizacija `75e6927`
- Owner (kroz ask_user): „Može nastavi dalje“ tretirano kao potvrda **javnog opsega**.
- Tokenizirano (Classic i Aurum jednako): `pages/public/*` (PublicHome, PublicReserve, PublicReservationView, PublicBlogList/Post, PublicContact, PublicGallery, PublicServiceDetail, PublicServices, PublicSatisfiedClients, MyReservations, MyReservationDetail, CampaignUnsubscribe), auth/onboarding (`Login`, `Register`, `NotFound`, `ResetPassword`, `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`) — oko 210 sirovih slate/zinc/gray/white/black paleta-klasa prevedeno na `surface*`/`content*`/`line`/`surface-inverse`/`on-surface-inverse` tokene; placeholder mape, Search ikonice, kalendar, `data-reserve-*` selektori.
- Zadržano namjerno: dekorativne prazne zvijezdice (ClientAnalytics `slate-200`, Reviews `slate-300`), app-logo/button(hero/red) konstantne podloge, BeforeAfterSlider knob/white overlay, `Gallery` hover overlay `bg-white/10` (tamni thumbnails), PublicServices/PublicServiceDetail tekstualni hel bojeni crtež (`#49332d`/`#e6dcd3`/`#fcfaf7` — topli editorial dizajn; NE paleta-klase), konstantni crni hero/overlay gradienti.
- `bg-white` → `bg-surface` globalno u scope-u (C (16/)–(18/) isti obrazac); placeholder mapa → `bg-surface-muted`.
- Testovi aktualizirani: `text-contrast-allowlist` ratcheti (scanned ≥125, bg+text parovi ≥24, allowlista 29→17 — stale javni unosi obrisani), `public-a11y-axe-findings` (mapTitle kontejner sada traži `bg-surface-muted` + `text-content-strong`, doesNotMatch `text-content-muted`), `public-contact/public-home/login/registration/onboarding-email/gender/service-detail-recovery` accessibility testovi — slate→token.
- **Javni Aurum patch CSS ostaje LIVE** — brisanje (Faza D finale) ide tek nakon kompletiranja javne faze s navedenim verifikationima; ovaj batch ne briše ništa iz `globals.css`.
- Lokalno: build PASS (291.0 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist. Datum mjerenja: 2026-11-18. CI se prati.

### Faza C (18.1/) — AAA hotfix poslije C (18/): javni linkovi ispod 7:1 u Aurum svijetlom
- CI 44317621050 (Rendered a11y) pao na `color-contrast-enhanced` (job je odmah dijagnosticiran preko check-run annotacija; log sa blob storea nije dostižan): 5 čvorova na kućnoj stranici (Aurum light) — footer `©` (`.py-4`, 6.18), kicker `.tracking-wide` (5.93), before-after comparison labels (6.38), featured review meta + date (6.38). Svi `text-content-muted` (#6b5d49) — Aurum svijetli `--text-muted` ne dostiže AAA 7:1.
- Popravka (AAA-strength copy obrazac): tih 5 čvorova (+ 6 kao backstop: before-after empty/select-transformation, `home-discover` kicker) → `text-content-strong`. Decoration watermark `text-content-muted/[0.22]` ostaje (22% prozirnosti, aria-hidden).
- Napomena za vlasnika: admin 1.4.6 čvorovi (blog th, daily-log values, 47 ukupno) su isti uzrok (`--text-muted` 6.18–6.38 u Aurum light) — to su warning-level zapisi postojeći i prije Faze C; odluke o dizajnu tokena jesu vlasničke, pa NE menjam `--text-muted` bez tvoje potvrde.
- Lokalno: build PASS (291.0 KiB / 300). CI se ponovo prati.

### Faza D (5/) — brisanje javnog Aurum patch CSS-a (proceduralno umrlo poslije C (18/)) — čeka CI
- Owner: „Izgled potvrđen. Možeš nastaviti dalje na sljedeći korak (Faza D 5/)“.
- Mimik provere (runtime src, substring za `[class*=]`, token-granice za `[class~]`, scope po selektoru): **22 delete operacije** u `globals.css` (~4.5 KiB uklonjeno); konstantne podloge (app-logo, Button hero/red — bez runtime korisnika), dekorativne prazne zvijezdice, status-AMBER grane S3 pravila i konstantni crni hero/overlayi **namjerno netaknuti i prozvani**.
  - S3 blok: `text-slate-9/8/7`, `text-slate-6/5`, `bg-slate-`, `border-slate-` pravila — obrisana (markup više nigdje ne nosi te klase); `text-amber-`/`bg-amber-`/`border-amber-` alternative ZADRŽANE (appearance odluka za vlasnika — vidi dole).
  - Hero/`data-home-hero-content`: `[data-aurum-hero]` ostaje samo `.text-white`; `.text-slate-200` alternative obrisane (2 pravila).
  - Homepage AAA audit blok: `.text-slate-600` alternative (about/review/cta) i `footer .text-slate-500` obrisane — pojačanje prelazi na `text-content-strong` čvorove iz C (18.1/). `home-discover .text-content-muted` i `home-about .text-brand-gold-text` ostaju.
  - `data-home-transformations` ostaje samo `a` grana; `[data-home-review] .text-slate-500` obrisana; footer `[class~=text-slate-600]` obrisana; header `hover:bg-slate-100` obrisana.
  - S4: `:is(button,a[href])[class*=bg-slate-900]`, `[data-aurum-progress] [class*=bg-slate-900/200]`, `[role=dialog] [class*=bg/border/text-slate-*]`, auth-banner `text-slate-2`, onboarding progress `bg-slate-2` — obrisane.
  - Reserve i blog-post article-actions slate grane, `data-aurum-comment .text-slate-500`, `data-blog-card-content :is(...)`, contact/satisfied-clients `:is(.text-slate-500, .text-slate-600)` obrisane; `data-users-dialog` slate grane uklonjene iz `:is()` liste (amber/rose/ok grane ostaju žive); `[data-admin-users] .text-slate-900` obrisana.
  - `BeforeAfterSlider` chevron `text-slate-700` → `text-content-strong` (konstantni svetli knob; zatvara posljednji runtime pogodak slate u [data-aurum-page]-opsegu).
  - Stale komentari rewordovani; fajl više **nema slate selektore** (ostala su 4 komentara koja historijski objašnjavaju tokene + translateY lažni pogodci).
- Lokalno: build PASS (290.6 KiB / 300), svih 204 `test:*` paketa 0 grešaka, diff-check čist.
- **OTVORENO ZA VLASNIKA:** status-AMBER grane S3 sweep-a (`text/bg/border-amber-` → Aurum ih renderuje kao `--text-muted`/`--surface-sunken`/`--line`) — design odluka: zadržati sirov status amber u Aurumu (preporučeno; semantik boja je svrha status API-ja) ili ravnati po dosljednosti s flavonom. Bez tvoje potvrde ne diram.
- CI za C (18.1/) (`44321148869`): 4/5 poslova prošlo; a11y posao crven isključivo na AAA čvoru `.text-content-muted.text-xs` u `/rezervacija` (light search stanje, 6.38:1 < 7:1 — isti `--text-muted` razlog kao C (18.1/); annotation `BOOKING_light_*_search`). Popravljeno u ovom batchu: `PublicReserve.tsx` `text-xs text-content-muted` -> `text-content-strong` (9 čvorova; isti obrazac poznat i u peer grupama my-reservation-card/payment-summary-block koje CI nije dohvatio jer nisu u istom stanju).

- Hotfix #2 (isti batch, na temelju CI `44323942493` na `a8ef27c`): search stanja sad clean (`text-content-strong` za `text-xs`), nove AAA 1.4.6 tačke u `dates` stanju — weekday zaglavlja kalendara `.uppercase.py-1` (12px, #6b5d49 na #ffffff = 6.38:1) i rezervni `text-sm` čvorovi isti razlog. Preostali `text-content-muted` u javnoj rezervacijskoj stranici smanjenih na 3 `aria-hidden` dekorativne ikonice (nisu tekst, ne podležu 1.4.6). CI `44323942493` je superseadovan — finalna verifikacija ide na ovom head-u.

- Hotfix #3 (na osnovu CI `44330264164` na `b6abe23` — prvi put čitljiva anotacija!): padovi `BLOG_POST_light_*_comments-populated` (`.text-content-muted.text-sm`, 14px, 6.38:1), `BLOG_LIST_light_*` (`[data-blog-card-content] .text-content-muted.mb-3.gap-2`, 14px, 6.38:1), `CONTACT_light_*_hours-error` (`.h3` 12px uppercase, 6.38:1) — sve light Aurum na bijeloj, isti `--text-muted` razlog. Prebačeno na `text-content-strong`: blog comments (hint/empty/date), blog list (date row/noData), contact (5× h3 sekcije). Dekorativne `aria-hidden` ikonice ostaju muted. Test `public-contact-accessibility` ažuriran (očekuje novi token). Ostali javno-scope AAA setovi (home/services/detail/gallery/reserve/satisfied-clients) — clean na CI `44330264164` razini: sve do blog posta je zeleno.
- CI workflow: `ci.yml` failure annotacija sada ispisje ✘ redove + NEPRAZNE violations liste (`"violations":[]` se ne matcha), uz `tail -n 40` (bez šuma koji je odsjekao baš redak s greškom u `44325979327`/`44330264164`).

### FAZA D (5/) — CI ZELEN na `8ca83be` (run `44332455709`, a11y job `134900190529`) 2026-11-18
- Oba hotfix poraženja (#1: `PublicReserve` `.text-xs text-content-muted` → strong; #2: calendar weekday `.uppercase.py-1` + noResults/`text-sm` → strong; međukorak #3: blog post `.text-content-muted.text-sm` \& comments hint/empty/date, blog list date row/noData, contact 5× h3 12px uppercase → `text-content-strong`) — sve light Aurum na #ffffff, 6.38:1 < 7:1 (AAA), isti `--text-muted` razlog. Vizualni efekat: isti tekst, samo tamniji.
- `public-contact-accessibility.test.mjs` ažuriran (h3 očekuje `text-content-strong`).
- CI: `ci.yml` failure annotation sada ispisje ✘ + neprazne violations liste (`"violations":[]` se ne matcha) + `tail -n 40` (prije: `head -160` s `spec.ts:N` šablonom matchirao SVAKI red — odsjekao je baš redak s greškom u `44325979327`/`44330264164`; dijagnostika je sada `✘ 70/71/74/75`-jasna).
- REZULTATI OVOG PASEA — `git diff c5267fa..HEAD`:
  - `.github/workflows/ci.yml` — a11y dijagnostika (CI infra, ne app kod)
  - `frontend/src/styles/globals.css` — obrisani svi preostali javni Aurum patch selektori (~121 linija): S3 slate grane (`text-slate-9/8/7/6/5`, `bg-slate`, `border-slate`), S4 `[class*=bg-slate-900] [data-aurum-progress] .bg-slate-900/200`, `[role=dialog] slate` ×3, hero `.text-slate-200` ×2, onboarding `bg-slate-2`, auth-banner `text-slate-2`, homepage AAA `.text-slate-600`/footer `.text-slate-500/600` `[class~]`, `home-transformations .text-slate-500/600`, `hover:bg-slate-100`, `reserve` + blog-post article-actions + aurum-comment + `data-blog-card-content` + contact/satisfied-clients slate grane, `[data-admin-users] .text-slate-900`, users-dialog slate grane (amber/rose/ok ostaju).
  - `BeforeAfterSlider.tsx` — chevron `text-slate-700` → `text-content-strong`.
  - `PublicReserve.tsx` — svih 12 sitnih `text-xs/sm text-content-muted` → `text-content-strong`; ostala samo 3 `aria-hidden` ikone.
  - `public-blog-comments.tsx` / `PublicBlogList.tsx` / `PublicContact.tsx` — sitan muted tekst → strong (AAA).
- OTVORENO ZA VLASNIKA PRIJE ZATVARANJA FAZE D (5/): (1) vizualna potvrda javnih stranica na Aurumu (posebno `/rezervacija`, `/blog`, `/blog/:slug`, `/kontakt` — tamniji sitan tekst); (2) status-AMBER grane S3 pravila: zadržati sirov status amber (preporuka: semantika boja je bit statusa) ili ravnati po Aurumu; (3) odluka o `--text-muted` tokenu (light 6.38:1 i dark 6.78:1 na surface-muted — oba ispod 7:1 za AAA) — pending, vlasnik odlučuje, ne dirati samostalno.


### Faza D (5/) — odluke vlasnika primijenjene (2026-11-18)
- **Vizualna potvrda nakon Faze D (5/):** izgled Aurum javnih stranica POTVRĐEN od vlasnika.
- **Status-AMBER grane S3 pravila: ALIGN — zadržati** (amber grane ostaju ravne po Aurum tokenima: `text-amber-* → --text-muted`, `bg-amber-* → --surface-sunken`, `border-amber-* → --line`); amber kao status semantik se NE renderuje sirovo u Aurumu. Bez izmjena u kodu — postojeće mapiranje ostaje.
- **Aurum light `--text-muted`: darkenan na AAA (7:1)** — vlasnik: „darken light --text-muted u AAA“.
  - Anketno mjerenje (HSL 35.294°/18.889% konstantno, samo L): L=27.0% → vs white **9.06**, vs surface-sunken **8.41**, vs surface-muted **7.31** — AAA na SVIM Aurum light podlogama (ranije L=35.294% → 6.39/5.93/5.15).
  - `globals.css`: `--aurum-muted` `#6B5D49` → **`#524738`** (NEJRA §10); semantički `--muted-foreground` / `--text-muted` / `--neutral-fg` `35.294 18.889% 35.294%` → **`35.294 18.889% 27.000%`** (hs l izvedeno, ±1 kanal poklapanje s hexom — verifikovano lokalno).
  - `docs/design/NEJRA – beauty salon · Referentni dokument.html` — §10 `light.muted:'#6B5D49'` → `'#524738'` (SSOT sync test: PASS, 8/8).
  - Tamni Aurum `--text-muted` (#B7A98F / 6.78:1 na surface-muted) — **NE mijenjan** (vlasnik nije odobrio); ostaje kao poznata warning stavka.
  - `scripts/check_ui_contrast.py --strict`: **140/140 PASS** (aurum light text-muted/surface = 9.05, surface-muted = 7.30; NEJRA §10 muted/page = 8.41).
  - Referentni-prijedlog-v2/v3.html i aurum-novi-identitet-koncept.html zadržani kao istorijski koncept (nisu §10 SSOT).
  - Očekivani efekat na a11y anotacije: light Aurum sitni `text-content-muted` tekst sada AAA — očekuje se smanjenje warning čvorova; finalni dokaz = CI a11y job.
- Build PASS (290.6 KiB / 300), 204× test:* 0 grešaka, SSOT 8/8.

### Faza D (5/) — ZATVORENO (2026-11-18): CI `44353945386` (`eb84cf8`) = ALL GREEN (5/5)
- a11y job: `violations 8` (prije 22) u 1.4.6 redu; sve born sas nokty efekat `--text-muted` darkening. Preostalih 8 warning čvorova: `/admin/settings` i `/stylist/*` — `.text-brand-rose-text` / `.bg-nav-active` — #7A5A12 na #EFE6D4 (5.13:1) — brand-on-brand-soft, van vlasnikove odluke (nije `--text-muted`); warning-level, NE blokira CI, držati kao poznatu stavku — gumbna odluka potrebna prije ikakvog mijenjanja brand tokena.
- NEJRA §10 i globals sinkroni (SSOT 8/8), `check_ui_contrast.py --strict` = 140/140 PASS, a11y job `10m27s` — kompletan rendered proof.
- Otkriveno i poboljšano u toku: `ci.yml` failure-annotation je maskirao failing test (head/spec.ts pattern matchirao svaki red; ~4133 B truncation) — sad ispisje ✘ + neprazne violations liste + tail -n 40; dokazno dijagnostički pomak u `44330264164` (imenovani failing testovi: blog-post 70/71, blog-list 74/75, contact h3).
- Master state: commit-ova ove faze — `b5b8e97` (Faza D 5/ deletion), `a8ef27c` (CHANGELOG ispr.), `01ce8ce` (hotfix #2 rezervacija weekday+text-sm; #1 `b5b8e97` uključuje search), `8ca83be` (hotfix #3 blog/kontakt + CI dijagnostika), `eb84cf8` (--text-muted AAA + SSOT), + ovaj (zatvaranje).
- OTVORENO (vlasnik, van CI-kritičnog): dark Aurum `--text-muted` (6.78:1 na surface-muted) — NE odobreno, ostaje; 8× brand-on-nav-active 1.4.6 (5.13:1) — novi known-issue; `features/**` bg-white opseg; Button strukturna adopcija (~50 repo-wide); administrativna 1.4.3 incomplete 15; 2.5.3 incomplete 22; orphaned komentar-analityka na kraju globals.css (zadržati kao dokumentaciju), NE dodirivati bez posebnog batch-a.
- Javni vizualni check: vlasnik potvrdio prije token darkening-a; nakon darkening-a sitni muted tekst je tek neznatno tamniji — vlasnički recheck preporučen ali nije preduvjet za CI; Faza D (5/) se smatra zatvorenom s ovim pushom.

### Faza E (1/) — Admin patch-CSS audit i čišćenje (globals.css, batch 1)
- Owner scope: „patch_audit“ — ista disciplina kao Faza D (5/), primijenjena na admin grane (`.admin-shell`, `[data-admin-*]`, `[data-analytics-hub]`, `[data-users-dialog]`, `[data-dashboard-*]`, `[data-aurum-calendar]`). Audit urađen sel. po sel. (svi 30 admin-relevantnih attribute selektora + sve ko-okkurencije s hook klasama).
- Mapa (admin regioni): S6 shell L991–1058; admin page-header L1142–1151; dashboard shortcuts/cards/states L1689–1735; recent-table th L1737–1740; admin nav/header L1741–1759; default card surface/border L1761–1768; admin primitives L1769–1792 (tabs, field, role-chip); badge pairs + users-dialog/override L1793–1848; analytics hub + client analytics dialog L1849–1896.
- **Proof-delete / proof-simplify (7 operacija u 6 pravila):**
  - obrisano `[data-users-dialog] [class~="text-amber-700"] { color: --warn-fg }` — mrtvo: later (L1842-countdown block) `:is(.text-ok-foreground, .text-amber-700, …) { color: --text }` istog escopa i iste specifičnosti (0,3,0) pregazi — Users.tsx amber čvorovi (1261, 1267, 1632 u dialogima) dobijaju `--text`, nikad `--warn-fg`.
  - obrisano `[data-users-dialog] :is([class~="text-rose-600"], [class~="text-rose-700"]) { color: --bad-fg }` — isti razlog (1282, 1349, 1410, 1541 čvorovi) — pregazeno istim `--text` resetom.
  - obrisano `[data-users-dialog] [class~="bg-rose-50"] { bad-bg/bad-fg/bad-fg }` — potpuno pregazeno kasnijim identičnim escopom `div-ne-ograničenim` reset blokom (`background: bad-bg; border-color: bad-fg; color: --text`, L1844 u prije-izmjenoj verziji) — sva tri prop. pregažena.
  - `[data-dashboard-outbox] :is(.text-content-muted, table.app-table th)` → `table.app-table th` — `.text-content-muted` ne postoji ni u jednoj dashboard/outbox datoteci (`outbox-diagnostics.tsx`, `outbox-events-table.tsx`, `Dashboard.tsx`, `finance-stats.tsx`, `ops-stats.tsx`) — `table.app-table th` ostaje (DataTable renderira `app-table`).
  - `[data-ui-badge="success|warning|danger"]` (users-scope par): izbačene dead `color: ok-fg/warn-fg/bad-fg` — users-scope reset `:is([data-admin-users], [data-users-dialog]) [data-ui-badge] { color: --text }` (kasnije, iste specifičnosti) ih pregazi; `bg/border` ostaju palette-backed (semantik status, AAA bg na surface).
- **ZADRŽANO (sve live):** `data-admin-state` loading/empty/error + `data-admin-skeleton-cell` (data-state.tsx — jedini proizvođač), `data-dashboard-outbox` th, `data-dashboard-replay-confirm` (+ hover; `[data-mode]` varijanta je nivo na root podešavanju), `[data-analytics-hub] .grid > [data-default-card-surface] { min-width: 0 }` i `.recharts-responsive-container { min-width: 0; max-width: 100% }` (layout-only, bez skin scope-a — nužni zbog recharts measuring-node ponašanja), recharts container rules, `table.data-table` 320px reflow blok, `[data-client-analytics-dialog]` (portal van hub escopa), `[data-admin-tabs-list]`/`[data-admin-tab]`/`[data-default-admin-field]` (default fields u portal dialogima — ne ulaze u `.admin-shell`), `data-users-role-chip` (admin-users + amber grana), sve `[data-aurum-calendar]` (ReservationsCalendar), `[data-aurum-nav-icon]` (admin-nav-menu, StylistLayout).
- Nav/portal nalaz: nijedan `[data-aurum-page]` selektor nije u admin opsegu (Aurum-page je isključivo javni + profile/onboarding scope) — admin audit ga nije dirao.
- Namjerne ne-primjene: `.admin-shell [data-default-admin-field]` vs identična `[data-users-dialog]` varijanta NE spajati — dialog portali idu van `.admin-shell`. Analytics hub text overrides (`text-content-muted`/`text-rose-*`/`text-emerald-700`…) živi (AnalyticsHub.tsx). Users.tsx teal/blue svg akcije (922/932) → `--text` (živo), rose Trash2 (943) → `--bad-fg` (živo).
- Lokalno: build PASS (290.6 KiB / 300, bez promjene budgeta), diff-check PASS, contrast strict 140/140 PASS.
- Gatesi prije commita: full `test:*` sweep (204/204 paketa PASS), build PASS (290.6 KiB / 300), diff-check PASS, contrast strict 140/140 PASS.

### Faza E (1/) — ZATVORENO (2026-11-18): CI `44382663785` (`c9bbe0f`) = ALL GREEN (5/5)
- Jobs: Rendered a11y (axe) na izolovanoj CI bazi ✓, Repository hygiene and static reports ✓, Mobile TypeScript ✓, Backend build and tests ✓, Frontend typecheck and production build ✓. (`gh run view --json conclusion,jobs` verifikovano — exit-status watch ne maskira, ali se status uvijek potvrđuje ovim pogledom.)
- Owner visual check (preview na :5173): **OK — sve izgleda isto** (admin badges/dijalozi `/admin/users`, dashboard `/admin`, analitika) — bez regresija nakon delete/simplify operacija.
- Neto: globals.css −9/+4 linija; uklonjena su isključivo cascade-shadow pravila i mrtvi selector arm; ponašanje Aurum admina nepromijenjeno (dokazni mimik proof polazi od Users.tsx/outbox/DataTable runtime co-occurrence).
- Napomena za naredne batcheve Faze E: preostalih ~180 admin linija patcha je ZIVA (svaki selektor ima runtime korisnika); dalje „uprošćivanje“ mora ići kroz refactor markupa (npr. portal dialog ↔ `.admin-shell` uvek scaped override), ne touring-shadow brisanjem. Otvorene stavke (1.4.6 8×, 1.4.3 incomplete 15, 2.5.3 incomplete 22, dark `--text-muted`, `features/** bg-white`, Button adopcija) ostaju netahnute.

### Faza E (2/) — Admin/CTA grane verifikacija: dead S2 gold CTA pravilo obrisano (2026-11-18)
- Nastavak Faze E po odobrenom scope-u („verifikacija preostalih grana — users-dialog, analytics hub, CTA rules“).
- CTA audit: svi `data-aurum-cta="primary"` korisnici (13 čvorova u 13 fajlova) su `<Button>` — normalni (`<button>`) ili `asChild` (`<Link>` → `<a href>`); svi žive unutar `[data-aurum-page]`-escopa (autentikacija/onboarding/javne stranice; OnboardingShell nosi `data-aurum-page="onboarding"` pa i onboarding CTA-evi potpadaju).
- **Proof-delete:** baza S2 `[data-skin="aurum"] [data-aurum-cta="primary"]` obrisana — 100% shaded od `[data-aurum-page] :is(button, a[href])[data-aurum-cta="primary"]` (iste deklaracije, veća specifičnost 0,3,1 vs 0,2,0, kasnije u fajlu). Komentar uz zlatno pravilo rewordovan (sada je jedini izvor deklaracija).
- **ZADRŽANO (živo):** `data-aurum-cta="secondary"` (transparent + gold border + hero-text; PublicHome onDarkOutline + px-8, 2 čvora), `[data-aurum-auth-page] [data-aurum-cta="primary"]` (min-height + focus-visible outline + forced-colors Highlight grana), `[aria-pressed="true"]` (odabran dan + primary Button pressed state — zaseban blok iznad), `data-home-cta` (border-top trokomponentni blok + surface-sunken), `[data-home-cta]` komentar u § home-cta sekciji, `data-aurum-cta` fokus outline na authskim stranicama.
- Verified before delete: svaki CTA čvor renderuje `button` ili `a[href]` (link: PublicHome 188, MyReservations 175, PublicReservationView 242; submit-buttoni: Login/Register/ResetPassword/NotFound/CampaignUnsubscribe/PublicContact/PublicReserve/Onboarding*/ForceChangePassword).
- Neto: −7/+3 linija; ponašanje Aurum CTA dugmadi nepromijenjeno (iste deklaracije vode, samo kroz jedan izvor).
- Lokalno gates: build PASS (290.5 KiB / 300), diff-check PASS, 204× `test:*` = 0 grešaka.
- Gates prije commita: 204× `test:*` = 0 grešaka, diff-check PASS, CI `44392890535` (`bbd74b4`) = **ALL GREEN (5/5)**.
- Vlasnički visual check: **OK** (zlatna CTA dugmad nepromijenjena).

### Faza E (2/) — ZATVORENO (2026-11-18)
- Gold CTA: jedan izvor deklaracija (`[data-aurum-page] [data-aurum-cta="primary"]` re-assert), dead S2 baza obrisana; secondary / auth / home-cta / pressed-state grane zadržane i dokazane žive.
- Napomena: daljnja CTA evolucija (npr. Button strukturna adopcija, varijanta reconciliation) ostaje van ovog audit-scope-a — zaseban vlasnički batch.

### Faza E (3/) — WCAG 2.5.3 label-content-name-mismatch: 22 incomplete čvorova → korak-raizrok fix (2026-11-18)
- Owner scope: Faza E (3/) (odabrano iz ponude nakon Faze E (2/) zatvaranja). Cilj: otkloniti 22 „incomplete“ čvora koje axe prijavljuje na admin rutama (`/admin/analytics #radix-:rm:`, `/admin/blog|daily-log|finance|gallery|loyalty|… #radix-:rg:/:rm:` — 11 admin ruta × 2 dugmeta: mobilni trigger + DropdownMenuTrigger), vidljivi uzroci iz CI anotacije runa `44472018787`.
- **Uzrok (iz axe-core source, axe 4.14.0):** `label-content-name-mismatch-evaluate` računa `visibleText = visibleVirtual(…)`; ako je `is_human_interpretable(visibleText) < 1` → `return void 0` (= incomplete „Unable to determine…“). `isHumanInterpretable` vraća 0 kad je `str.length === 1 && /\D/` (`isNonDigitCharacter`), kad je tekst 'aa'/'abc' (`isSymbolicText`) ili samo punctuacija/emoji. Admin AvatarFallback je prikazivao **jedini znak iz username-a** (`user?.username?.trim()?.[0].toUpperCase()` — u CI `ci_a11y_admin` → „C“), pa je svako admin dugme menija INHERENTNO bilo „Unable to determine“ — bez obzira na aria-label (`Admin meni, C`). Stylist i public imaju 2-znakovni whitespace-split inicijal (za „živu“ provjeru 2.5.3), pa su uglavnom bili „passed“.
- **Fix:** novi dijeljeni helper `src/utils/user-initials.mjs` (`userInitials(username, fallback)`) — UVIJEK 2 alfanumerička znaka: split po svemu što nije L/N (`/[^\p{L}\p{N}]+/u`), uzmi prvi znak dvije neprazne grupe; jedna grupa → njena prva 2 alfanumerička znaka; degenerisano → fallback (pad 'A'); uppercase. `.d.mts` + `.test.mjs` prati label-in-name obrazac (uz `test:user-initials` u paketu — 6/6 PASS). Sva tri mjesta (admin-layout, StylistLayout, public-layout) sada zovu JEDAN izvor; `|| 'S'` / `|| 'U'` mrtve grane uklonjene.
  - CI e2e korisnici (`ci_a11y_admin`, `ci_a11y_stylist`) → inicijali `CA` — interpretable („ca“), a accName „Admin meni, CA“ (labelWithVisibleText ne dira ime jer već sadrži vidljivi tekst) → očekuje se 0 incomplete čvorova za 2.5.3 u CI.
  - Registracija testova: `wcag-source-contracts.test.mjs` — ažurirane 2.5.3 grane ugovora (novi `userInitials` helper + novi contract koji zabranjuje 1-char fallback na sva tri mjesta) — 17/17 PASS.
- **ZADRŽANO:** label-in-name mehanizam (`label-in-name.mjs`) — nepromijenjen; WCAG 2.5.3 je i dalje odlučivo (accName ⊇ vidljivi tekst).
- Gates prije commita: build PASS (290.7 KiB / 300), diff-check PASS, kontrast 140/140 PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Commit `0e5137d` (fix) + `69c2269` (CI hygiene: `test:user-initials` dodat u ci.yml — `check_ci_index.py` PASS; prvotni run `44476000167` pao SAMO na hygiene poslu, ostalih 4 zeleno — poznata posljedica novog `test:*` bez CI koraka, sada otklonjeno).
- **CI `44476078583` (`69c2269`) = ALL GREEN (5/5). a11y annotacije: `2.5.3 label-content-name-mismatch: PROLAZ (passed 32, incomplete 0)`** (prije: 10 passed / 22 incomplete). Bonus: `1.4.3 color-contrast: NEPOTPUNO (incomplete 7)` (prije 15) — dio nestalih je isti uzrok (inicijali čvorovi).
- Vlasnički visual check: **OK** (avatar inicijali 2-znakovni).

### Faza E (3/) — ZATVORENO (2026-11-18)
- 2.5.3 incomplete → 0. Dijeljeni `userInitials` helper (`src/utils/user-initials.mjs`, 6/6 unit), sva tri omotača konsolidovana na jedan izvor; `wcag-source-contracts` 17/17.

### Faza E (4/) — WCAG 1.4.3 incomplete (7): dokazivanje human-judgment zaključka (2026-11-18)
- Odluka vlasnika: E (4/) istraživanje incomplete čvorova. Bez izmjena koda — ispostavilo se da je **svih 7 čvorova axe determination-blok, a ne defekt**; kompenzacije već u kodu i CI-ju su dovoljne; vlasnik je vizualno potvrdio.
- **Dokazi iz trenutnog stanja (CI `44477995617`) i iz source-a:**
  - `/admin/analytics` `.recharts-legend-item-text` ×3 (legend-item-0/1/2) — axe: „Element's background color could not be determined **because element contains an image node**“ (Recharts ikona serije je SVG susjed teksta). Recharts `<Legend labelStyle={{ color: 'hsl(var(--text))' }} />` (Analytics.tsx:357) — tekst je Token-backed (`--text` AAA na kartici); kontrast mjeri `inlineColorContrastViolations` probe u CI (a11y-admin.spec.ts + stylist-stylist + wcag-rendered) → 0 fail. Napomena uzrun `43000853379`: iza incomplete se KADA skrivao stvarni prekršaj (serijski boje 3.25/4.13/2.39:1) — otklonjeno (tekst sada `--text`).
  - `/blog` kicker `.tracking-wide` (Novosti i sav…, `text-content-strong` 12px uppercase) — „…due to **a background image**"; `/blog` h1 (title 30–36px) — isto; `/galerija` h1 — „…due to **a background gradient**".
    - Hero scene: blog/gallery vrh ima dekorativnu pozadinsku sliku na **opacity 0.08** + `pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white` (PublicBlogList.tsx L92, PublicGallery.tsx L133) — efectivno ≥85% bijela podloga pod tekst; kicker/h1 su `text-content-strong`/`text-content` — ≈9:1 / ≈14:1 na toj podlozi.
    - Dekorativne pozadine su `pointer-events-none` bez teksta — 1.4.5 inventory (zauzeto kroz anotacije) ih vodi kao „TRAŽI LJUDSKU PROCJENU“; vlasnik je vizualno potvrdio kontrast na sva 3 h/kicker čvora (+ analitičku legendu).
- **Anotacija-semantika** (potvrđeno čitanjem `e2e/axe-coverage.mjs`): anotacija „axe nepotpuni cvorovi po pravilu“ akumulira **uzorke** (`MAX_INCOMPLETE_NODES_PER_RULE = 3`/rute), otuda „15 nepotpunih čvorova“ za 1.4.3 dok pokrivenost-brojka glasi **7**; 2.5.3 anotacija je nakon E (3/) ZERO (nije se pojavila). Annotacija je INFORMATIVNA (warning-level), CI je oduvijek zelen s njom.
- **Zaključak:** 1.4.3 incomplete 7 = eloquent determination-blok; NE prekršaj; NE mijenjati kod zato; alarm ne dići. Ako ikad treba formalno na nulu — jedina održiva ruta je scrim → solid/`via-transparent` na bijelom (bijeli 95% je već gotovo-neka podloga) + `inlineColorContrastViolations` za objavljene h1/kicker; NE preporučuje se gaming axe-a.
- Vlasnički visual check: **OK** — /blog, /galerija hero tekstovi i /admin/analytics legenda čitljivi (preview :5173).
- Nema commit-ova osim ovog zatvaranja; nema novog koda.

### Faza E (4/) — ZATVORENO (2026-11-18)
- WCAG 1.4.3: 7 incomplete čvorova = human-judgment zaključen (bez izmjena). Faza E lanac sada: (1/) admin patch-CSS ✓, (2/) CTA ✓, (3/) 2.5.3 PROLAZ 32/0 ✓, (4/) 1.4.3 human-judgment ✓.
- Otvorene stavke ostaju po vlasničkim odlukama: 1.4.6 8× brand-on-nav-active; dark `--text-muted`; `features/** bg-white`; Button strukturna adopcija; orphan komentar-analitika na kraju globals.css.

### Faza E (5/) — WCAG 1.4.6 8× brand-on-nav-active: AAA brand-text (Aurum light) (2026-11-18)
- Odlukom vlasnika („A — Zatamni brand-text (7.73:1)"): Aurum light `--brand-primary-text(-light)` **#7A5A12 → #554308** (7.73:1 na #EFE6D4 — AAA 7:1; ranije 5.14:1, 1.4.6 enhanced kršeno na 8 čvorova, AA 4.5 je zadovoljeno).
  - Obuhvaća: `/admin/settings` aktivni tab „Sajt" + 5× `.bg-nav-active` anchor (`/stylist/debts|inbox|schedule|schedule/new|stats`) + `/admin/settings` ikonica u settings tab-nav/`.text-brand-rose-text` čvorove — **sve 8 1.4.6 annotacija je isti par**.
  - **NE dijeto:** sirovi `--brand-primary` #7A5A12 (Button/CTA/borderi), `--aurum-brand` #7A5A12 (NEJRA §10 — raw brand tokeni), `--brand-primary-ring`, classic `:root`/`.dark` (#632238/#E5B3C5 — 9.40/8.48 AAA već), Aurum dark (#D4AF6A — 7.57 AAA).
- **SSOT sync:** `theme-ssot-sync.test.mjs` — `brand-primary-text(-light)` izbačeni iz RAW_MAP (više se ne ravnaju na §10 brand by-design); nova dedicated asertacija: light block `#554308`/`#554308`, `brand-primary`/`aurum-brand` ostaju `#7A5A12`, dark ostaje `#D4AF6A` — **9/9 PASS**.
- **Contrast SSOT:** `check_ui_contrast.py` — parovi „brand-primary-text / surface" i „brand-primary-text / nav-active" podignuti na **AAA_TEXT_THRESHOLD (7.0)** (hard-enforced going forward). Rezultat strict runa: **140/140 PASS** — svi 4 stanja AAA (web light 9.39, web dark 8.47, aurum light 7.73, aurum dark 7.57).
- **Komentar** u `admin-nav-menu.tsx` (zastarjela tvrdnja „9.39:1 light" — bila je CLASSIC mjerenje) rewordovan preciznim vrijednostima po stanju.
- NEJRA §10 HTML **nemijenjan** (brand je 1 od 12 SSOT tokena; `#7A5A12` ostaje).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, 140/140 contrast strict PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- Commit `e8a5ec2`. **CI `44482691344` (`e8a5ec2`) = ALL GREEN (5/5). a11y annotacije: `1.4.6 color-contrast-enhanced: PROLAZ (passed 32, incomplete 0, inapplicable 0, violations 0, absent 0)`** — prvi put **nula** 1.4.6 čvorova; 1.4.3 ostaje (7) determination-blok, jednako kao E (4/).
- Vlasnički visual check: **OK** (aktivni nav/tab — tamniji brand tekst, champagne čip; /admin, /stylist, /admin/settings).

### Faza E (5/) — ZATVORENO (2026-11-18)
- 1.4.6 AAA čvorovi → 0. Lanac Faze E sada zatvorena: (1/) admin patch-CSS ✓ · (2/) CTA ✓ · (3/) 2.5.3 PROLAZ 32/0 ✓ · (4/) 1.4.3 human-judgment ✓ · (5/) 1.4.6 PROLAZ 32/0 ✓.
- Napomena: dark Aurum `--text-muted` (6.78:1 na surface-muted) ostaje known-issue po vlasnikovoj odluci (još neodobreno); Button adopcija ~50, `features/** bg-white`, Button strukturni scope, orphan komentari — čekaju vlasničke odluke.

### Faza F (1/) — `features/** bg-white`: mapa + migracija 15 čvorova → `bg-surface` (dark Aurum defect) (2026-11-18)
- Owner-scope (odabrano poslije zatvaranja Faze E): prvo mapa/procjena obima (18 solid čvorova / 9 fajlova, sva u `features/`; 0 u ostatku `src/`), zatim vlasnička odluka „Da — migracija sad“.
- **Razlog (uzrok defekta):** `Input`/`Select`/`Textarea` base je `bg-surface`; proslijeđeni `bg-white` ga poništava (`cn`/tailwind-merge — kasniji utility pobjeđuje) → u Aurum **dark** ove površine ostaju bijele uz `text-content` (near-white) ⇒ gotovo nečitljiv tekst. U light stanjima ponašanje je vizuelno identično (`--surface` = #FFFFFF), zato nije primijećeno.
- **Migrirano (15):** `setting-editor-form.tsx` ×6 (textarea/select/number/url/text + mono color-hex input), `setting-group-panel.tsx` (panel), `settings-module-page.tsx` (search kartica + skeleton), `settings-tab-nav.tsx` (neaktivni tab), `blog-comments-dialog.tsx` (odobren komentar; neapproved grana ostaje amber + `dark:` varijante), `blog-post-form-dialog.tsx` (language Select), `workbook-new-entry-page.tsx` ×3 (2× listbox dropdown + odabrana-usluga row).
- **ZADRŽANO (3 deliberate-keep, komentar dodan uz svaki):** color-swatch backdrop (`setting-editor-form.tsx` — kontrast native color pickera), toggle knob (`workbook-reschedule-preview-page.tsx` — kontrast na aktiviranom/tamnom track-u), email preview okvir (`email-visual-editor.tsx` — mailovi se renderuju na bijelo, nezavisno od teme aplikacije).
- `bg-white/xx` opacity-varijante na imagery overlay-jima (BeforeAfterSlider, Gallery, PublicServices, `button.tsx` onDark/overlay-hero) — van scope-a, namjerno (scrims/badge na slikama).
- **Bonus nalaz (NE dirano, van scope-a):** `settings-module-page.tsx` — hardcoded `text-[#8a624e]` ikonice (search row + skeleton loader); kandidat za zaseban token batch.
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (admin settings + stylist workbook u light/dark Aurumu).

### Faza F (1/) — ZATVORENO (2026-11-18)
- `features/** bg-white`: 15 čvorova migrirano na `bg-surface` (dark Aurum defect otklonjen), 3 deliberate-keep komentirana, opacity-overlay-ji namjerno netaknuti.
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44486871989` (`98cf7c4`) = ALL GREEN (5/5). a11y: 429 passed / 0 failed; `1.4.6 enhanced: PROLAZ (32/0)`; `1.4.3` ostaje 7 incomplete (human-judgment, kao E (4/)); nema novih nalaza.**
- Vlasnički visual check: **OK** (admin settings + stylist workbook u light/dark Aurumu).
- Otvorene stavke (čekaju vlasničke odluke, ne pokretati samoinicijativno): dark Aurum `--text-muted`; Button adopcija; orphan komentari (globals.css tail); dark 1.4.6/1.4.3; 1.4.6 accent #9B3D4F; AnalyticsHub child proofs; CI Node 20→24; bonus nalaz iz F (1/) — hardcoded `text-[#8a624e]` ikonice u `settings-module-page.tsx`.

### Faza F (2/) — `settings-module-page.tsx` hardcoded `#8a624e` → `brand-rose-text` (2026-11-18)
- Vlasnik je iz mape hardcoded-hex nalaza (poslije F (1/)) odabrao minimalni scope: samo 2 čvora — `Settings2` (search row status) i `Loader2` (skeleton loader ikonice) u `settings-module-page.tsx`.
- `text-[#8a624e]` → `text-brand-rose-text` (`var(--brand-primary-text)`): classic light 9.39 / classic dark 8.47 / Aurum light 7.73 / Aurum dark 7.57 na površini — sve AAA; isti token kao postojeći brand-ikonica obrazac u fajlu (L103, `bg-nav-active` + `text-brand-rose-text`).
- `dark:` grana sada kroz token (prije: uvijek #8a624e, bez dark varijante).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- **Zapis mape (NE dirano, čeka vlasničku odluku):** `PublicServices.tsx` 109 + `PublicServiceDetail.tsx` 38 hardcoded-hex čvorova (warm-paper paleta #49332d/#75645a/#e8ddd3…, `dark:` pokrivenosti 0) — javne stranice ne slijede Aurum temu; `email-visual-editor.tsx` 11 hex = white email preview (namjerno).
- Vlasnički visual check: u toku.

### Faza F (2/) — ZATVORENO (2026-11-18)
- `settings-module-page.tsx`: 2 ikonice `text-[#8a624e]` → `text-brand-rose-text` (token, AAA u sva 4 stanja).
- Gates: build PASS (290.7 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44496125943` (`903123c`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK**.
- Napomena: veći nalaz (`PublicServices.tsx` 109 + `PublicServiceDetail.tsx` 38 hardcoded-hex, 0 `dark:`) ostaje zabilježen u F (2/) logu — čeka vlasničku odluku (istraživanje / migracija / standstill).

### Faza F (3/) — PublicServices / PublicServiceDetail: hardcoded warm-paper paleta → semantički tokeni (2026-11-18)
- Vlasnik odabrao: migracija sad, **hex-patch blok u globals.css (L559–573) OSTAJE ovaj krug** (brisanje tek uz mimik dokaze u zasebnom krugu).
- **Scope:** `PublicServices.tsx` (~110 čvorova) + `PublicServiceDetail.tsx` (~38). Mapa: espressos `#49332d/#382a25/#352925/#2d1f1c/#4b3a35/#4b3830`→`text-content` odnosno `bg-/border-surface-inverse` (tamni čipovi) + `text-white`→`text-on-surface-inverse` (samo na čipovima; text-white na imagery scrim-ovima ZADRŽAN); taupe mutes → `text-content-strong`; bronze/plum akcenti → `text-brand-rose-text` (`#b79b87` separator → `text-content-muted`; `#80624f` kicker → brand); sve ivice → `border-line` (opacity/\"/25–/60\" plumbljeno na solid line — isto što patch i danas radi); hover ivice `#bea998/#b5937b`→`border-control-border`; sekcijski bg `#f4eee7`→`bg-surface-sunken`, `#fcfaf7/#fbf8f4/#f2e6de/#f3e8e0/#f1e3dc/#e8e9df/#eee4d7/#eee0e7/#f8f2ed/#efe7e0/#dfd1c2`→`bg-surface(-muted)`; `#b89b86`→`bg-line`; focus ring-ovi `#9d735d/#805b4c`→`ring-focus-ring`; `placeholder:text-[#75645a]`→`placeholder:text-content-muted`; `decoration-[#c5a88f]`→`decoration-line`; `divide-[#f0e9e2]`→`divide-line`; hex shadow-ovi `#6a4b3c/#574237/#49332d`/5–15 odbačeni (ostaju `shadow-sm/xl/lg`).
- **ZADRŽANO namjerno:** hero fallback gradijenti `from/via/to-[#c6aa96/#e6d8ca/#8e7060]` (imagery), `#241814` hero scrim, arbitrary rgba shadow-i, `text-[#554038]` na bijelom `bg-white/85` image badge-u (fiksno taman u svim temama — komentar u TSX-u).
- **Defekt otklonjen:** classic dark više nema light-paper ostrva — stranice sada prate temu (classic dark: slate tokeni; classic light: slate; Aurum ostaje champagne). Classic light vizuelno mijenja toplu paletu → slate (namjerno, theme fidelity; Aurum = default skin, tamo je vizuelna razlika zanemariva jer patch već ravna na iste tokene).
- **Poznato:** Aurum hex-patch (L559–573) sada bez ijednog TSX potrošača (provjereno grep-om) — brisanje u zasebnom krugu uz mimik dokaze; `text-content-muted` na `#b79b87` separatoru je malo blaži nego prije (dekorativno).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (/usluge + detalj usluge u 4 stanja: aurum light/dark, classic light/dark).

### Faza F (3/) — ZATVORENO (2026-11-18)
- PublicServices/PublicServiceDetail: ~148 hardcoded hex čvorova → semantički tokeni; classic-dark light-ostrva otklonjena; Aurum patch zadržan (brisanje uz mimik dokaze).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44508482933` (`7ec128e`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK** (/usluge + detalj usluge u 4 stanja).

### Faza F (4/) — Dark Aurum `--text-muted` → #BFAF96 (AAA 1.4.6) (2026-11-18)
- Vlasnik je iz odluke A odabrao minimalno brighteno: `#B7A98F` → **#BFAF96** (na surface-muted `#2A2217`: 6.78:1 → **7.31:1**; na surface `#1A1510`: 7.84 → 8.45; na page: 8.49 → 9.15). AA je oduvijek prolazio; AAA (7.0) nije na najtamnijoj tekstualnoj površini.
- **Mehanizam — kao i svijetla strana (#524738), NE kao brand-devijacija (E5):** NEJRA §10 SoT (`docs/design/NEJRA – beauty salon · Referentni dokument.html`, dark `muted`) ažuriran u isti #BFAF96 — SoT ostaje jedini izvor istine; `theme-ssot-sync.test.mjs` NE mijenjan (exact-match i dalje drži). `globals.css`: `--aurum-muted` + izvedene HSL trojke (`--muted-foreground`, `--text-muted`, `--neutral-fg` → `36.585 24.260% 66.863%`).
- **Contrast SSOT:** AAA pragovi za `text-muted/surface` i `text-muted/surface-muted` su dodani AURUM-ONLY (u `AURUM_EXTRA_PAIRS`) — klasični web (5.59/5.10 i 6.55/5.43 na AAA 7.0) namjerno ostaje na TEXT_THRESHOLD (AA). Prva verzija podigla pragove za sva 4 stanja → 4 FAIL-a u classic states, otklonjeno odmah. Strict run: **PASS — svih 144 para** (140 + 4 nova aurum-AAA).
- Napomena: ostali dokumenti u `docs/design/` (referentni-prijedlog-v2/v3, aurum-novi-identitet-koncept) nose istorijski #B7A98F — namjerno netaknuti (arhivski prijedlozi, nisu SoT koji čitaju gatesi).
- Gates: build PASS (289.7 KiB / 300), diff-check PASS, contrast strict **PASS (144/144)**, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (Aurum dark — muted tekstovi su ~7% svjetliji; nijedan drugi state se ne mijenja).

### Faza F (4/) — ZATVORENO (2026-11-18)
- Dark Aurum `--text-muted` #B7A98F → #BFAF96 (AAA na surface-muted/surface/page); NEJRA §10 SoT ažuriran kao light precedent; contrast SSOT: aurum-only AAA parovi (classic netaknut).
- Gates: build PASS (289.7 KiB / 300), diff-check PASS, contrast strict **PASS (144/144)**, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44512475492` (`cf7708e`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK** (Aurum dark; classic states nemijenjani).

### Faza F (5/) — Button variant reconciliation: `destructive` → `danger` (2026-11-18)
- Vlasnik odabrao opciju A (bez adopcije 50 raw `<button>` — svi su specijalizovani a11y/widget obrasci: segmented controls, listbox opcije, calendar ćelije, stretched-link kartice, disclosure/toggle switcheve, sort-header-i; nekoliko nosi eksplicitne komentare zašto raw `<button>` mora biti).
- **Reconciliation:** 5 preklapajućih upotreba Button `destructive` (hardcoded red-600/red-700) → `danger` (semantički `bg-danger` token; 5.22:1 light / 6.29:1 dark po contrast SSOT-u): `cancel-reservation-dialog.tsx`, `entry-delete-dialog.tsx`, `admin/ui/confirm-dialog.tsx` (isDestructive ternary), `aurum/ui/confirm-dialog.tsx` (isti), `Services.tsx` (deletionAction ternary). `destructive` varijanta obrisana iz `ui/button.tsx`.
- **ZADRŽANO:** `Alert variant="destructive"` (×3, rose-tint soft alert — vlastita komponenta/semantic), `Badge variant="danger"` (×3), svih 50 raw `<button>` widget čvorova, `--destructive` CSS tokeni (klasični shadcn sloj).
- **Opcionalna adopcija (B opcija, NIJE urađena):** BlogList retry/load-more ×3 (rounded-lg→pill), clear-search ikonice ×2 (ghost/icon, h-11→h-10) — ostaje za vlasnikovu odluku.
- Gates: build PASS (289.5 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.
- Vlasnički visual check: u toku (delete/cancel tok: /services brisanje usluge, dnevni log delete, cancel reservation; danger se sada renderuje semantičkim danger tokenom, nije red-600 — vizuelno vrlo slično).

### Faza F (5/) — ZATVORENO (2026-11-18)
- Button variant reconciliation: `destructive` → `danger` (5 pozivnih mjesta); `destructive` varijanta obrisana; 50 raw `<button>` widgeta dokumentovano zadržana.
- Gates: build PASS (289.5 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) 0 grešaka.
- **CI `44515714897` (`a18cc8a`) = ALL GREEN (5/5).**
- Vlasnički visual check: **OK**.

### Faza F (6/) — Orphan komentari (globals.css tail): reword + dopuna (2026-11-18)
- Owner je odabrao minimalni scope (A) iz inventure tail bloka (L1841–1887, analytics):
  - L1854–55: odbačena zastarjela referenca na nepostojeći `index.css` (istorijski artefakt) — zadržan WHY (reflow nezavisan od grafa na 320px; scope na hub).
  - L1849: `[data-analytics-hub] .grid > [data-default-card-surface]` dobilo komentar (min-width:0 ↔ grid track, mirror Recharts zero-width mjerenje).
- Inventura je potvrdila: svi ostali komentari u tail bloku tačno prate aktivna pravila (Recharts zero-width, portal-scoped client-analytics-dialog, badge surface pairs, hub text-muted-strong pairs) — nikakva pravila bez komentara osim L1849, nikakvi komentari bez pravila.
- Bez izmjena ponašanja (comment/CSS-rule description only).
- Gates: build PASS (289.6 KiB / 300), diff-check PASS, full `test:*` sweep (205 paketa) = 0 grešaka.

### Faza F (6/) — ZATVORENO (2026-11-18)
- Tail komentari: reword `index.css` reference + dodat komentar uz L1849; ništa drugo (inventura potvrdila — ostale komentare su žive dok.).
- **CI `44518166979` (`895feb1`) = ALL GREEN (5/5)** — taj run builda i F (5/) close-out commit (`a178a7d`) koji je prethodno otkazan auto-cancel mehanizmom (`concurrency: ci-<branch>`, cancel-in-progress na brzim uzastopnim pushovima); a178a7d je sadržajno podskup 895feb1, pa ga pokriva.
- Vlasnički visual check: **OK** (bez render izmjene; /admin/analytics nepromijenjen).
### Faza F (7/) — dark 1.4.6/1.4.3 (Aurum dark admin sweep) · 1.4.6 accent #9B3D4F → #8A3346 · AnalyticsHub child proofs · CI Node 20→24 (2026-11-18)
- Vlasnik je odabrao (iz ponude, po redu iz stavke): **rendered axe za Aurum dark admin** (za dark 1.4.6/1.4.3), **zamračenje accent-text tokena** (za 1.4.6 accent), **rendered axe child tabova s fiksturama** (AnalyticsHub child proofs) i **minimalni Node 24 bump action runtimes** (app ostaje na Node 22).
- **1.4.6 accent (Aurum light only):** `--brand-accent-text(-light)` **#9B3D4F → #8A3346** — 7.95:1 na surface (#FFFFFF) / 7.38:1 na page (sunken #FAF6EF) — AAA 7:1 (ranije 6.62 / 6.14, AA ali ne AAA). Sirovi `--brand-accent` #9B3D4F (Button/CTA/border/hero `--nejra-hero-rose`), `--brand-accent-ring`, `--aurum-accent` i NEJRA §10 NISU mijenjani — §10 ostaje jedini izvor istine; odstupanje text-tokena je namjerno i dokumentovano (isti obrazac kao E (5/) brand-primary-text i F (4/) text-muted). Classic light/dark netaknuti (#8A641E / #D4A843 — i dalje na AA, kao i do sada).
  - `theme-ssot-sync.test.mjs`: `brand-accent-text(-light)` izbačeni iz RAW_MAP + novi dedicated test (`light: --brand-accent-text(-light) namjerno odstupa od §10 accent`) — 10/10 PASS.
  - `check_ui_contrast.py`: novi `AURUM_EXTRA_PAIRS` unosi `brand-accent-text / surface (Aurum AAA)` i `brand-accent-text / surface-sunken (Aurum AAA)` (globalni AA par ostaje za classic i Aurum dark) — strict **148/148 PASS** (144 + 4 nova). Nav-active (#EFE6D4, #8A3346 = 6.41:1) namjerno NIJE podignut na AAA prag (accent-text se tamo ne koristi kao tekst; vlasnička odluka je surface+sunken).
- **AnalyticsHub child proofs (rendered, POPULIRANO):** `e2e/a11y-admin.spec.ts` — lazy child paneli `/admin/analytics?tab=clients` i `?tab=stylists` se prvi put renderuju u axe suite-u (do sada samo overview hub bez ?tab=): `populatedClientAnalyticsFixture` (rezervacije, recenzije, manual entries, top services, statistika; zaseban fixture za otvoreni dug — `clientDebtFixture`) i `populatedStylistAnalyticsFixture` (top services + recent entries), mockano preko `page.route`; provjera URL/`data-mode`/h1, `settleAnimations`, `recordAxeCoverage` pod rutama `/admin/analytics?tab=clients (aurum-light|dark)` itd.; assert `assertableViolations([])` u oba režima (4 nova testa).
- **Aurum dark admin sweep (rendered, 15 ruta):** novi `Aurum dark admin rendered axe (sweep)` za SVIH 15 `ADMIN_ROUTES`: `configureAurumTheme` (localStorage `nejra.theme.mode=dark` + `/api/settings/public` override → `theme_active_skin: aurum`, `theme_default_mode: dark`), očekivanje `data-skin="aurum"` + `data-mode="dark"`, `settleAnimations`, axe, `recordAxeCoverage` pod `/{path} (aurum-dark)`; AAA nalazi se samo ispisuju u log (`ADMIN_DARK_AAA <route>`, bez aserta — presuđuje se po A/AA kao i do sada). Ovo je prvi rendered axe dokaz za admin rute van classic (javne rute pokriva theme-policy.spec).
- **CI Node 20→24 (minimalni bump):** `actions/checkout@v4→v5`, `actions/setup-node@v4→v5`, `actions/setup-python@v5→v6`, `actions/upload-artifact@v4→v6` (sve na node24 runtime; upload-artifact v5 i dalje radi na node20, zato v6). `node-version: 22` za app nepromijenjen (repo-ovi Node 22 kontrakt). `check_ci_index.py` PASS (386/389; 3 interaktivnih izuzeto — nepromijenjeno).
- Gates: build **289.6 KiB / 300**; `git diff --check` PASS; contrast strict **148/148**; `typecheck:e2e` PASS; lint 0 grešaka (6 poznatih `exhaustive-deps` warn-ova, CI-dozvoljeni); full sweep **205/205 PASS**.
- Rendered rezultati su dokaz koji se generiše tek u CI — eventualni nalazi iz child/dark suite-a će biti dokumentovani (nije unaprijed tvrđeno da su čisti).
- Vlasnički visual check: u toku (rosé linkovi/kickeri na svijetlom Aurumu sada #8A3346 — tamniji, isti identitet).
### Faza F (7/) — ZATVORENO (2026-11-18)
- Owner visual check: **OK** (Aurum light — rosé linkovi/kickeri u #8A3346; 4 stanja preostala netaknuta).
- **CI `44523392570` (`a8b3899`) = ALL GREEN (5/5).** Rendered a11y: sve praćene Axe rules PROLAZ / 0 violations nad **51 izmjerenim stanjem** (prije 32; +19 novi: 4 child-proof zapisa (`/admin/analytics?tab=clients|stylists (aurum-light|dark)`) + 15 Aurum dark admin ruta). `1.4.6 color-contrast-enhanced: PROLAZ 51`; `2.5.3` ostaje 0 incomplete; `1.4.3 color-contrast incomplete 18` — isključivo poznati Recharts legend `.legend-item-*-text` determination-blokovi (izmjena: SVG serijski čvor uz tekst; `hsl(var(--text))`), sada izmjereno i u `/admin/analytics (aurum-dark)` — isti uzrok kao classic, ne novi defekt.
- Accent SSOT: contrast strict 148/148; theme-ssot-sync 10/10 (novi dedicated odstupanje-test).
- CI Node 20→24: action majors na node24 (checkout v5 / setup-node v5 / setup-python v6 / upload-artifact v6); app Node 22 nepromjenjeno.

---

## 2026-11-19 · Aurum light sweep, veličina fonta i O4 · u toku

**Light sweep:** commit `b0facb3` dodaje axe provjeru 15 admin ruta u Aurum light režimu; četiri postojeće proof provjere AnalyticsHub panela obuhvataju oba režima. CI `44534293560` je 5/5. Ovo je ograničen automatizirani dokaz, ne potpuna WCAG ocjena.

**Font:** po izričitom izboru vlasnika commit `e38552b` postavlja root na 17px za cijeli web, uključujući Classic, Aurum, javni i admin dio; rem skala raste u odnosu na podrazumijevanih 16px, dok hardkodirane px veličine ne rastu. CI `44536662139` je 5/5; vizuelni pregled i ručne provjere ostaju otvoreni. Fiksni root može nadjačati korisničku podrazumijevanu veličinu fonta u browseru; treba provjeriti pristupačnost i odluku prije zaključivanja izmjene.

**O4:** commit `1b06474` zamjenjuje 13 nativnih potvrda zajedničkim dijalogom. CI `44544674553` je **4/5**: rendered a11y suite 459 prošlih, četiri pala testa za korisnike (stari testovi čekali su nativni dijalog); ostali poslovi prošli. Detalji pada su iz GitHub check anotacije, jer log i artefakt nisu dostupni iz sandboxa. O4 nije završen niti je dokazano ponašanje svih 13 tokova.

**Izmjena postojećih testova:** četiri testa deaktivacije, uklanjanja uloge i reset-linka prilagođena su novom renderovanom dijalogu. Zadržane su provjere da nema zahtjeva prije potvrde i poslije odustajanja te da potvrda šalje tačno jedan zahtjev; prethodna zaštita za nepotvrđeni email i prikaz na 320px ostaje. Dodane su provjere sadržaja, Escape/odustajanja i axe pregleda dijaloga za desktop i mobilni prikaz. Lokalni `typecheck:e2e` i lint prolaze (6 postojećih upozorenja); Chromium i izolovana baza nisu dostupni lokalno. Čeka se novi CI, kao i dodatni dokaz preostalih tokova i ručni pregled.

**CI nakon prilagođavanja testova:** commit `a30698c` → run `44548185406` = **5/5 success**, uključujući rendered a11y. Tokovi izvan testova korisnika i dalje nisu zasebno dokazani interaktivnim testovima.

**Dopuna O4 — fokus:** dijalog sada pamti aktivni element prije automatskog fokusiranja i vraća fokus nakon zatvaranja kada element još postoji; oba prikaza (desktop i mobilni drawer) koriste isti mehanizam. Četiri postojeća testa korisničkih potvrda dodatno provjeravaju povrat fokusa, uz zadržane postojeće asercije; lokalno TypeScript, E2E typecheck, 5/5 source testova i lint prolaze (6 poznatih upozorenja). Renderovani dokaz čeka CI. Posebna potvrda svih 13 tokova i vizuelni pregled i dalje su otvoreni.

**Dopuna O4 — CI dokaz:** commit `9574e7b` → run `44550068368` = **5/5 success**, rendered suite **463 passed / 0 failed / 0 skipped**, uključujući ažurirane provjere fokusa za korisničke potvrde. O4 implementacija je isporučena, ali interaktivna provjera ostalih tokova, vizuelni pregled, ručni M1/M2/M4/M5 i razmatranje fiksnog root fonta ostaju otvoreni. Nema tvrdnje o potpunoj WCAG usklađenosti.

---

## Mrtvi `aurum-stat-grid` · odobrena stavka 6

Uklonjen `frontend/src/features/dashboard/aurum-stat-grid.tsx`: pregled referenci potvrđuje da nema uvoza ni potrošača ovog fajla; aktivni dashboard koristi `features/shell/admin/ui/stat-grid.tsx`, koji ostaje netaknut. Historijski planovi ostaju arhiva, ne naredbe. CI za uklanjanje je na čekanju.

**CI uklanjanja:** `d603042` → `44563869689` = 5/5. Lokalno: TypeScript, 25 dashboard testova i svi standardni Python gates prolaze.

## M2 · Admin reflow 320 CSS px · u toku

Dodaje se rendered mjerenje horizontalnog prelijevanja dokumenta za 15 admin ruta u oba Aurum režima uz provjeru autentificirane rute i teme. To pokriva početno učitano stanje na 320 CSS px, **ne** stvarni browser zoom od 400%, sve podatke, dijaloge, tekstualne razmake niti upotrebljivost tastaturom; ručni M2 ostaje otvoren. Lokalni browser/baza nisu dostupni, CI je potreban za stvarni nalaz.

**Prvi M2 nalaz:** `edddc74` / CI `44565781934` = 4/5; 489 prolaza, četiri pada: `/admin/settings` 328px i `/admin/reservations/calendar` 339px na 320px, u oba režima. Nije ukinut niti oslabljen test. Predložene korekcije: postavke prelaze na jednu kolonu na uskim prikazima; izbor prikaza kalendara može prelomiti dugmad umjesto širenja dokumenta. Test dodatno bilježi detalje unutrašnjih dimenzija radi dijagnostike. Lokalno typecheck i build prolaze; čekaju rendered CI i vizuelni pregled.

**M2 CI rezultat:** `7081698` / `44567932983` = 5/5, rendered suite 493 prošla / 0 pala / 0 preskočenih; svih 30 mjerenja širine dokumenta na 320 CSS px je prošlo. Prvi CI je pronašao 8px i 19px prelijevanja u postavkama i kalendaru; novi raspored je popravio izmjereno početno stanje u oba Aurum režima. Ovo nije dokaz stvarnog 400% zooma, unutrašnjeg clippinga ili svih stanja; vizuelni i ručni pregled ostaje.

## Sinhronizacija matrica · u toku

Matrice `aurum-theme` i `aurum-route-coverage` dobile su aktuelnu politiku, inventar 15 mjerenih ruta i jasne granice dokaza; prethodne S0–S5 tabele su označene arhivom. Najnoviji blok u CHECKLIST/HANDOFF ima prednost nad starijim statusom. CI za dokumentaciju čeka provjeru.

**CI matrica:** `534a694` → `44570089463` = 5/5 success. Historijski dijelovi matrica ostaju isključivo arhiva; aktuelni pregledi ne proglašavaju ručne provjere završenim.

## O4 · Interaktivni dokazi preostalih potvrda · u toku

Dodane Playwright fiksure za 10 prethodno zasebno neprovjerenih tokova (blog ×2, galerija ×2, recenzije, praznik, kategorija i potkategorija usluga, SMTP lozinka i retry kampanje). Provjeravaju poruku, odustajanje, fokus, potvrdu i izolovane zahtjeve, uključujući nested dijaloge i `confirmAtLeastOnce` payload. Svi relevantni zahtjevi su presretnuti fiksurama; nije kontaktirana produkcija. Typecheck E2E prolazi; rendered rezultat tek čeka CI, nije dokaz prolaza.

**Prvi nalaz:** `b533743` / `44575707833` = 4/5; 499 prošlo, 4 pala. Dva testa su pokazala stvarni problem Escape-a pri potvrdi iz blog komentara i detalja recenzije; druga dva su bila problem fiksura/lokatora (GET zahvaćen preširokim SMTP mockom i neprecizan lokator kategorije). Ispravka ugniježđuje potvrdu unutar odgovarajućeg roditeljskog dijaloga; fiksure su precizirane bez slabljenja asercija. Lokalno typecheck, lint, build i 18 fokusiranih source testova prolaze; rendered CI je potreban za verifikaciju.

**Drugi CI:** `b9f9fe1` / `44577643353` = 4/5; 500 prošlo, tri pala. Samo premještanje potvrde u React stablo roditeljskog dijaloga nije dovoljno: Escape još može završiti na roditelju. Dodana je zaštita da zahtjev zatvaranja roditelja najprije zatvori potvrdu, bez zatvaranja roditelja; testovi i dalje zahtijevaju povrat fokusa. SMTP test je čekao pogrešan tekst dugmeta „Sačuvaj email postavke”; lokator je ispravljen. CI ponovno potreban.

**O4 rezultat:** `5407b13` / CI `44579698293` = **5/5 success**, rendered suite **503 passed / 0 failed / 0 skipped**. Deset novih fiksura pokriva blog ×2, galeriju ×2, recenzije, praznik, usluge ×2 i email ×2; prethodni korisnički testovi pokrivaju preostala tri toka. Potvrđeni su odustajanje, fokus, izolovane mutacije i odgovarajući payload za retry; SMTP potvrda samo označava brisanje do spremanja. Escape najprije zatvara potvrdu, bez gašenja roditeljskog dijaloga. Novi tokovi mjereni su na desktopu, korisnička deaktivacija i na 320px; ne tvrdi se pokrivenost svih jezika, uređaja, stanja, čitača ekrana ni puna WCAG usklađenost. O4 je kompletiran do granice ovog dokaza; ručni M1/M2/M4/M5 i vizuelni pregled ostaju otvoreni.

## Globalni font · poštovanje korisničke browser veličine · u toku

Ranije odobreno povećanje s fiksnih 17px prilagođeno je na `106.25%`: kod standardnog defaulta 16px i dalje se dobija 17px, a drugačiji browser default više nije zamijenjen fiksnom vrijednošću. Obim ostaje isti (cijeli web, Classic i Aurum); px vrijednosti ostaju nepromijenjene. Dodano je šest Chromium testova za tri stanja i browser default 16/20px, s nezavisnim iframe mjerenjem. Postojeći test 200% teksta je **ojačan**, ne oslabljen: sada duplira stvarnu početnu veličinu korijena (17→34px umjesto 17→32px) i provjerava rezultat. Lokalno typecheck, build, 25 tematskih source testova i dokumentacijske kapije prolaze; rendered CI i korisnički vizuelni pregled tek predstoje. Test ne zamjenjuje stvarne ručne provjere zooma, text-spacinga ili svih browsera.

**CI fonta:** `caeebc4` / `44585484397` = 5/5; rendered suite **509 passed / 0 failed / 0 skipped**, uključujući svih šest Chromium provjera osnovne veličine browsera i pojačane 200% testove. Pri defaultu 16px root je 17px; pri defaultu 20px je 21.25px. Ostaju vizuelni pregled te ručni M1/M2/M4/M5; ne tvrdi se potpuna WCAG usklađenost ni provjera svih browsera.

## M2 · nastavak: prioritetni ekrani · u toku

Vlasnik je prijavio da je provjera dashboarda prema prethodnim uputama (200% i 400% zoom) prošla; browser, dimenzije prozora i dodatne teme nisu navedeni, pa se ne izvodi zaključak za druge ekrane ili konfiguracije. Predstoji sistematski pregled ostalih ekrana, prioritetno korisnika, rezervacija, kalendara, finansija i postavki, zatim ostalih admin, javnih i stylist ruta/stanja; za ručni pregled potrebna je saradnja vlasnika, posebno za stanje s podacima i stvarni browser zoom.

Dodano 20 automatizovanih dopunskih testova za 5 prioritetnih admin ruta × dva Aurum režima × 200% rem teksta i WCAG text-spacing. Diferencijalno mjere nove slučajeve vidljivog `overflow: hidden/clip`; to ne otkriva sva odsijecanja, ne testira sve panele, niti zamjenjuje stvarni zoom ili ručni pregled. Nema dodira s produkcijom; CI potreban za nalaze. Postojeći testovi nisu mijenjani niti oslabljeni.

**Prvi prioritetni CI:** `473ed13` / `44600466012` = 4/5; rendered suite 521 prošao / 8 palo. Svih 10 provjera razmaka je prošlo, kao i oba 200% testa kalendara; 200% testovi četiri preostale rute prijavljuju zajedničko odsijecanje logotipa i naziva u zaglavlju, a rezervacije i odsijecanje tabele. Putanje su potvrđene u routeru i testovi dodatno provjeravaju pathname. Predložene Aurum korekcije omogućavaju prelamanje zaglavlja i horizontalno skrolabilnu, imenovanu i tastaturom fokusabilnu regiju tabele rezervacija; Classic izgled se ne mijenja. Novi CI tek treba provjeriti rješenje; ovo nije dokaz stvarnog zooma niti upotrebljivosti s podacima.

**Drugi prioritetni CI:** `b713463` / `44602275237` = 4/5; rendered suite **529 prošlo / 0 palo / 0 preskočeno**, uključujući svih 20 novih mjerenja, ali frontend lint je pao jer JSX `tabIndex` na regiji nije dozvoljen pravilom lint-a. Tab fokus sada prati stvarno skrolabilno stanje preko `ResizeObserver`, kao postojeća zajednička DataTable; dodata je provjera fokusa i pomjeranja tabele strelicom pri 200% tekstu. Lokalno lint (6 ranijih upozorenja), build, E2E typecheck i dokumentacijske kapije prolaze. Renderovani dokaz ovog dodatka čeka novi CI.

**Prioritetni segment — potvrda:** `316aed6` / `44604005507` = **5/5**, rendered suite **529 prošlo / 0 palo / 0 preskočeno**. Pri simuliranom 200% rem tekstu u oba Aurum režima početno stanje rezervacija ima skrolabilnu, fokusabilnu tabelu i test potvrđuje pomjeranje strelicom; svih 20 dopunskih mjerenja prolazi. To je ograničen dokaz: test ne pokriva stvarni browser zoom, sva unutrašnja odsijecanja, dijaloge, tabove, sadržaj s podacima ni sve preglednike. Prioritetni ručni pregled i pregled ostalih admin, javnih i stylist ekrana ostaju otvoreni; nije izvršen merge/deploy.

## M2 · preostale admin rute · u toku

Vlasnik je nakon upute za korisnike, rezervacije, kalendar, finansije i postavke na 200% i 400% javio: „Testirano sve je prošlo uredno.“ Browser, dimenzije prozora i tema nisu navedeni; bilježi se korisnikov prijavljeni rezultat za zatraženi opseg, bez zaključivanja o drugim konfiguracijama ili svim stanjima.

Dopunski testovi se proširuju na preostalih deset ruta iz postojećeg inventara 15 admin ruta: dashboard, salon, usluge, stilisti, dnevnik, blog, galerija, recenzije, analitika i loyalty. Po dva Aurum režima × simulirani 200% rem i text-spacing daju 40 novih mjerenja početnog stanja; prethodnih 20 ostaje. Dinamični detalji, drugi tabovi, podaci, stvarni zoom i ručni pregled nisu time pokriveni. Rezultati čekaju CI, a javne i stylist rute ostaju za naredne segmente.

**Prvi CI preostalih ruta:** `f7cbc51` / `44619640792` = 4/5; rendered suite 563 prošlo / 6 palo. Dnevnik prijavljuje odsijecanje tabele pri 200% rem i razmaku, a recenzije pri 200% rem, u oba režima. Ostala 34 nova mjerenja prolaze. Predložena Aurum korekcija daje imenovane, horizontalno skrolabilne regije, fokusabilne kada skrol postoji; proširen je test tastaturnog skrolanja pri 200% u oba režima. Classic izgled nije mijenjan. Lokalno lint (6 ranijih upozorenja), E2E typecheck, build, 43 fokusirana source testa i dokumentacijske kapije prolaze; rendered verifikacija čeka CI.

**CI preostalih admin ruta:** `c63ade4` / `44621387657` = **5/5**, rendered suite **569 prošlo / 0 palo / 0 preskočeno**. Svih 40 novih provjera početnih stanja i prethodnih 20 prolazi; za dnevnik i recenzije pri 200% dodatno prolaze fokus i pomjeranje skrolabilne tabele strelicom u oba Aurum režima. Mjerenje je diferencijalno i ograničeno na vidljive `overflow: hidden/clip` elemente; nije potvrda svih mogućih odsijecanja, stvarnog zooma, svih tabova, dijaloga, stanja s podacima ili drugih browsera. Ručni pregled preostalih admin ruta, javnih i stylist ekrana i njihova dalja automatizovana provjera ostaju otvoreni; nije izvršen merge/deploy.

## M2 · stylist, zatim javni ekrani · u toku

Vlasnik je tražio da se odmah pređe na stylist ekrane, a zatim javne. Dodana su 48 mjerenja za osam postojećih stylist odredišta (uključujući namjerni redirect profila na `/profil`): Aurum light/dark × 320 CSS px, simulirani 200% rem i text-spacing. Potvrđuju odredišnu rutu i temu; mjere širinu dokumenta ili diferencijalni `hidden/clip`, ne stvarni browser zoom, sva odsijecanja ili sve funkcije. Detaljne rute s parametrima, dijalozi i stanja s podacima nisu pokriveni ovim mjerenjima. Autentifikacija i baza su izolovani u CI; rezultat tek predstoji. Za preostale admin ekrane još nema prijavljenog ručnog rezultata.

**Prvi stylist CI:** `b4cd23a` / `44628150504` = 4/5; rendered suite 615 prošlo / 2 palo. Na `/stylist/schedule` pri 320 CSS px dokument je širok 419px u oba Aurum režima; preostalih 46 novih mjerenja prošlo je. Uzrok u izmjerenom lancu je zaglavlje rasporeda s datumima i dvije akcije bez prelamanja. Predložena Aurum-only korekcija dozvoljava prelamanje i čitljiv datum, a test dodatno provjerava vidljivost i položaj obje akcije unutar viewporta. Lokalno build, E2E typecheck, lint (6 ranijih upozorenja), tri fokusirana testa i dokumentacijske kapije prolaze; CI tek treba verifikovati.

**Stylist CI:** `a0bd3f2` / `44630106358` = **5/5**; rendered suite **617 prošlo / 0 palo / 0 preskočeno**. Svih 48 novih mjerenja prolazi, a oba dugmeta zaglavlja rasporeda vidljiva su unutar viewporta pri 320 CSS px. To je dokaz početnih stanja i definisanih mjera, ne dokaz stvarnog zooma, detalja s ID-ovima, učitanih podataka, dijaloga ili svih funkcija. Ručni pregled ostaje otvoren.

**Javni segment:** dodano 66 mjerenja 11 početnih ekrana u Aurum light/dark × 320 CSS px / 200% rem / text-spacing. `unsubscribe` i reset lozinke mjere se bez tokena; dinamični detalji i druga prijavljena stanja nisu pokriveni. Tri javne feature zastavice uključene su samo u presretnutom CI odgovoru postavki, a `PublicFeatureGate` nije mijenjan; URL i tema se asertuju da redirect ne daje lažni prolaz.

**Prvi javni CI:** `bce4487` / `44631674617` = 4/5; rendered suite 677 prošlo / 6 palo. Svih šest padova bilo je na rezervaciji: stvarna ruta zahtijeva prijavljenog klijenta i redirektuje neprijavljenog na login, pa provjera putanje opravdano nije dopustila lažan prolaz. Dodana je izolovana fiksura klijenta i usluga kao u postojećim booking testovima; novi CI mora potvrditi izgled stvarnog obrasca. Nisu upućivane mutacije ni korišteni stvarni podaci.

**Javni CI:** `4e83f7a` / `44633285047` = **5/5**, rendered suite **683 prošlo / 0 palo / 0 preskočeno**. Svih 66 novih mjerenja početnih javnih ekrana prolazi, uključujući obrazac rezervacije s izolovanom fiksurom klijenta; deset ostalih ekrana su neprijavljena početna stanja. Testovi ne dokazuju stvarni zoom, sve detaljne rute, forme, dijaloge, stanja podataka, korisničku percepciju ili sve browsere. Lokalno su dodatno prošla 851 frontend source testa. Ručni pregled i preostali detalji/stanja ostaju otvoreni.

**Nastavak — popunjena radna knjiga:** 18 novih testova obuhvata fiksurni unos u listi, njegov detalj i otvoreni drawer novog unosa, po oba Aurum režima i tri mjere (320 CSS px / 200% rem / text-spacing). Ruta, tema, podatak i prisutnost drawer polja se asertuju; na 320px dodatno se provjerava okvir drawera. Ostale detalje, podatke i interakcije tek treba pregledati; rezultat novog segmenta čeka CI.

**CI popunjene radne knjige:** `e934b6c` / `44690776680` = **5/5**, rendered suite **701 prošlo / 0 palo / 0 preskočeno**. Svih 18 novih mjerenja prolazi za fiksurnu listu, detalj i otvoreni drawer u oba Aurum režima; dokaz je ograničen na tu fiksuru, definisane mjere i početno stanje obrasca. Nije pregledan stvarni zoom, svi inputi i opcije drawera, promjene podataka, druge rute s ID-ovima ni čitači ekrana. Ručni pregled i dalji sistematski rad ostaju otvoreni; nema merge/deploy.

## M2 · popunjeni raspored i detalj stiliste · u toku

Dodaje se 18 mjerenja za izolovanu fiksuru potvrđenog termina: popunjeni raspored, detalj i otvoreni dijalog otkazivanja, u Aurum light/dark × 320 CSS px, 200% rem i text-spacing. Asertuju se učitani podaci, tema i ruta; dialog se zatvara Escapeom bez mutacija. Ovo ne pokriva sve statuse, akcije, podatke, niti stvarni browser zoom; CI je potreban za rezultat.

**Prvi CI popunjenog termina:** `992e4ff` / `44694947607` = 4/5; check anotacije bilježe prelijevanje popunjenog rasporeda na 323px i detalja na 352px pri viewportu 320px. Isti detalj iza otvorenog dijaloga također prelijeva; svi nalazi koje su anotacije prikazale javljaju se u oba režima osim što nisu svi slučajevi dijaloga zasebno anotirani. Testovi nisu oslabljeni. Aurum-only korekcija dozvoljava prelamanje kartice, punog naziva i akcija; dodatno se asertuje da naziv nije odsječen. Lokalno build, E2E typecheck, lint (6 ranijih upozorenja), 17 ciljnih source testova i docs gates prolaze; rendered CI predstoji.

**CI popunjenog termina stiliste:** `b0f9824` / `44696637062` = **5/5**, rendered suite **719 prošlo / 0 palo / 0 preskočeno**. Svih 18 novih mjerenja prolazi za fiksurni raspored, detalj i dijalog otkazivanja; puni naziv usluge dodatno se provjerava bez odsijecanja. Rezultat ne obuhvata sve statuse, dijaloge, stvarni zoom ni stvarne podatke.

## M2 · popunjeni javni detalji · u toku

Dodano 12 provjera za fiksurni detalj usluge s prije/poslije sadržajem i blog članak s komentarom, u Aurum light/dark × 320 CSS px / 200% rem / text-spacing. Asertuju se stvarni URL, tema i učitan sadržaj. PublicFeatureGate ostaje netaknut; blog flag se uključuje samo u izolovanom odgovoru postavki. Testovi ne pokrivaju sve javne detalje, podvrste sadržaja ni stvarni browser zoom; CI tek predstoji.

**CI javnih detalja:** `df9f78a` / `44698049861` = **5/5**, rendered suite **731 prošlo / 0 palo / 0 preskočeno**. Svih 12 mjerenja fiksurnog detalja usluge i blog članka s komentarom prolazi; to nije dokaz drugih sadržaja, svih interakcija ni stvarnog zooma.

**Nastavak javnih stanja:** 12 novih mjerenja za odabranu uslugu u javnoj rezervaciji (izolovani klijent) i otvoreni lightbox galerije, u dva Aurum režima × tri M2 mjere. Testovi asertuju odabir i kalendar, odnosno učitanu sliku, Escape i povrat fokusa; bez slanja rezervacije. Rezultat čeka CI; nisu obuhvaćene sve faze obrasca ili sve slike.

**CI javnih interaktivnih stanja:** `1170639` / `44699661651` = **5/5**, rendered suite **743 prošlo / 0 palo / 0 preskočeno**. Svih 12 novih mjerenja prolazi za fiksurnu rezervaciju s odabranom uslugom i galerijski lightbox; Escape i povrat fokusa su potvrđeni u testiranim stanjima. Ovo ne pokriva sva stanja rezervacije, slike, tekstualno odsijecanje izvan metrike, stvarni zoom, sve browser konfiguracije ni ručni vizuelni pregled. Dalji rad i ručne M2 provjere ostaju otvoreni; nema merge/deploy.

## M2 · popunjena admin analitika i dijalozi · u toku

Dodano 48 rendered provjera: popunjeni pregled analitike, detalj stiliste, četiri taba analitike klijenta (rezervacije, ručni unosi, dugovanja, recenzije) i dva detaljna dijaloga × Aurum light/dark × 320 CSS px, simuliranih 200% root teksta i text-spacing. API podaci su izolovane read-only fiksure; asertuju se ruta, tema i sadržaj odabranog stanja. Na 320 px mjeri se prelijevanje dokumenta i granica dijaloga; na većoj širini diferencijalno se mjeri `hidden`/`clip`. Nije dokaz stvarnog zooma, svih načina odsijecanja, svih podataka, jezika ili upotrebljivosti; ručni M2 ostaje otvoren. Lokalni E2E typecheck i ESLint prolaze; čekaju se rezultati CI-ja.

**Prvi CI `44706064322` (`c7372c4`): 4/5; rendered 789 prošlo / 2 pala.** Oba pada su popunjeni tab ručnih unosa pri 200% root teksta: Card `overflow:hidden` odsijeca 166 px tabele u Aurum light i dark. Ostalih 46 novih slučajeva prošlo je u ovom runu. Ispravka: tabele analitike klijenta dobijaju imenovane regije koje se, samo u Aurumu kad zaista prelijevaju, mogu fokusirati i horizontalno skrolati; bilješke ručnih unosa u Aurumu prelome tekst umjesto odsijecanja. Proširena provjera traži stvarni tastaturni scroll i čitljivu bilješku. Lokalni typecheck, lint (6 postojećih upozorenja), build i analitika source testovi prolaze; novi rendered CI tek treba potvrditi popravku.

**Potvrda popravke:** `f0ddb8a` / CI `44707895870` = **5/5 success**. Svih 48 novih slučajeva analitike u oba Aurum režima prolazi, uključujući popunjene tabove i dijaloge; pri simuliranih 200% ručni unosi imaju imenovanu fokusabilnu scroll regiju i prolazi skrol strelicom. Ovo ne zatvara ručni M2: stvarni browser zoom i text-spacing, drugi podaci, oba jezika i preostali tabovi, dijalozi, tokovi i token stanja i dalje traže zasebnu provjeru.

## M2 · postavke: obavijesti, izdanja i email · u toku

Novi paket dodaje 72 fiksurne provjere: popunjena lista obavijesti, preference sa saglasnošću, mobilna izdanja, dijalog SMTP lozinke, email predlošci i popunjena kampanja × BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root tekst / text-spacing. Provjeravaju se stvarni URL, jezik, aktivni tab i relevantni podaci; za dijalog i Escape/povrat fokusa. Fiksure su čitajuće i ne potvrđuju mutacije. Širina dokumenta i diferencijalni `hidden`/`clip` ne pokrivaju svaki vid odsijecanja ni stvarni browser zoom; ručni M2 ostaje otvoren. Lokalni E2E typecheck i lint prolaze; rendered rezultati čekaju CI.

**Prvi CI `44712994449` (`067486a`): 4/5; rendered 859 prošlo / 4 pala.** Četiri pada su preview postojećeg email predloška pri 200% root teksta u oba jezika i režima, s 91 px horizontalnog overflowa unutar `overflow:hidden` okvira. Ostalih 68 novih slučajeva je prošlo. Aurum preview sada dopušta lom sadržaja, uključujući ogledni verifikacijski kod, bez mijenjanja generisanog maila ili Classic prikaza. Dodana je provjera granica previewa i punog koda, uključujući 320px. Lokalno typecheck, lint (6 poznatih upozorenja), build i editor testovi prolaze; rendered CI potvrda predstoji.

**Potvrda popravke:** `60788fc` / CI `44715185095` = **5/5 success**. Prošlo svih 72 novih slučaja, uključujući granice previewa i čitljiv ogledni verifikacijski kod na 320 CSS px, 200% root tekstu i text-spacingu u oba jezika i režima. Provjere su fiksurne i ne dokazuju stvarni browser zoom, sva stanja/podatke ili izgled poruke u email klijentima. Ostaju preostali admin paneli/dijalozi, booking/stylist i token stanja te ručni M2 pregled.

## M2 · booking i token stanja · u toku

Dodano 108 fiksurnih provjera u BS/EN i Aurum light/dark: booking greška pri učitavanju datuma, dostupni datumi, greška termina, dostupni/zauzeti termini i popunjeni sažetak s dugom i loyaltyjem; zatim token detalj s predloženom promjenom, istekli token i uspješna/neuspjela odjava kampanje. Svako stanje se provjerava na 320 CSS px te simuliranih 200% root teksta i text-spacing, uz asertovanje jezika, rute i ključnih podataka. Unsubscribe POST je izolovan fiksurom; rezervacija se ne šalje. Testovi nisu stvarni zoom niti dokazuju sva stanja, korisničke podatke, mutacije ili potpunu pristupačnost. Lokalni E2E typecheck i ESLint prolaze; čeka se CI.

**Prvi CI `44729461242` (`0dc9ce1`): 4/5.** Vidljive anotacije pokazuju pad novog testa odjave: brojač fiksure je provjeren odmah nakon klika, prije asinhronog zahtjeva (0 umjesto 1). Potpuni log je nedostupan, pa se ostala stanja iz ovog runa ne proglašavaju potvrđenim. Test sada čeka da tačno jedan zahtjev stigne, zadržava provjeru tokena i očekivanog odgovora/stanja. Čeka se novi cijeli CI.

**Booking/token potvrda:** `07080fe` / CI `44731561761` = **5/5 success**; sve 108 fiksurnih provjera prolaze. Rezultati ne zamjenjuju stvarni zoom, sve tokove ni ručni pregled.

## M2 · finansije i stylist dijalozi · u toku

Dodano 60 slučajeva u BS/EN i oba Aurum režima: popunjena knjiga rashoda i dijalog uređivanja procijenjenog datuma, stylist odbijanje zahtjeva, no-show i prijedlog pomjeranja × 320 CSS px / simulirani 200% root tekst / text-spacing. Fiksure su read-only; provjeravaju se sadržaj, ruta, jezik, izlaz iz dijaloga i odsustvo mutacija. Pregled izvora otkrio je i postojeći `truncate` na nazivu usluge u stylist inboxu: Aurum sada dopušta prelamanje kao prethodno popravljeni raspored/detalj; dodana je geometrijska provjera punog naziva. Classic ostaje netaknut. Lokalno E2E typecheck/ESLint prolaze, rendered CI tek predstoji.

**Prvi CI `44733690473` (`7f9ff42`): 4/5.** Vidljive anotacije: otvorena knjiga rashoda i njen dijalog prelijevaju dokument 287–301 px na 320 px; puni log nije dostupan, pa ostali novi slučajevi nisu zaključeni. Popravka ograničava širinu grid-staza na kartici i filterima te dopušta skrol vlastite tabele, bez skrivanja sadržaja ili mijenjanja Classic prikaza. Dodana preciznija dijagnostika prelijevanja; CI treba potvrditi stvarnu ispravku i ostale nove testove.

**Drugi CI `44736107932` (`8fa2d6f`): 4/5.** Isti izmjereni overflow knjige ostao je 287–301 px; prethodna hipoteza o grid-stazama nije dovoljna. Lokalni browser pokušaj nije uspio zbog nedostajućih NSS/NSPR biblioteka. Mjerenje prošireno na položaj i širinu elemenata izvan viewporta; dalje ne tvrditi da je popravak potvrđen.

**Treći CI `44738847071` (`36b89ca`): 4/5.** Geometrija je pokazala da `sr-only` tekst „Nema priloga” u scrollabilnoj tabeli ima statičku poziciju izvan viewporta i doprinosi širini dokumenta; nevidljivi tekst je zadržan, a njegov neposredni omotač postaje pozicionirani kontejner. Crtica je dekorativna za čitač ekrana. Dodana provjera imena i tastaturnog horizontalnog skrola regije knjige. CI treba potvrditi rezultat; prve mjere ograničavanja grida ne treba smatrati dokazanim rješenjem.

**Potvrda finance/stylist paketa:** `fb34344` / CI `44740804314` = **5/5**, rendered **1031 prošlo / 0 palo / 0 preskočeno**. Svih 60 novih fiksurnih slučajeva prolazi u BS/EN i oba Aurum režima, uključujući 320 CSS px i simulirane prilagodbe teksta; knjiga ima pristupačno imenovanu regiju, fokus i skrol strelicom. Axe 1.4.3 na 66 ruta: 57 passed, 9 incomplete, 0 violations; 21 nepotpun kontrastni čvor traži procjenu. Ove provjere ne zatvaraju stvarni zoom, ručni text-spacing, sve tokove/podatke niti potpuni WCAG audit. Preostali pregled: admin paneli/dijalozi, booking/stylist/token stanja i ručne tastatura/fokus, čitač ekrana, forced-colors, vizuelni/reduced-motion. Nema merge/deploy.

## M2 · sadržaj admina, stylist preview i token otkazivanje · u toku

Korisnik je naknadno potvrdio: **„Stvarni browser prošao.“** Bez navedene verzije/browsera, teme, uvećanja, ruta i opsega text-spacinga; ne pretvarati to u potvrdu svih kombinacija niti ručnog text-spacinga.

Dodaje se 96 fiksurnih slučajeva u BS/EN × Aurum light/dark × 320 CSS px, simuliranih 200% root teksta i text-spacing: admin komentar bloga, slika galerije i detalj recenzije s otvorenim potvrdama (Escape/povrat fokusa, bez brisanja); parametrizirani stylist preview rekalkulacije s ručnim pomakom, učitanim prijedlogom, potvrdom bez slanja te greškom i oporavkom; otkazani token termin s razlogom i privremena greška s oporavkom. Prijedlog se presreće i verificira, a commit ne smije biti poslan. Mjere ne dokazuju sve podatke/stanja niti samu upotrebljivost. Lokalno typecheck i ESLint prolaze, CI tek predstoji.

**Prvi CI `44748274729` (`cef5063`): 4/5.** Vidljive anotacije: 200% tekst odsijeca naziv kategorije, metapodatke slike i komentar recenzije; engleski retry je „Try again“, što test nije uključio. Potpuni spisak padova nije dostupan. Aurum galerija sada prelama kategoriju i prikazuje metapodatke i kontrole ispod slike, umjesto fiksnog overlayja; komentar recenzije se prelama. Classic zadržava prethodni raspored. Testovi dodatno mjere tekst i ispravljaju BS/EN retry selektor (uključujući stylist retry); CI potvrda tek slijedi.

**Drugi CI `44752331795` (`11aca5a`): 4/5; rendered 1123 prošlo / 4 pala.** Sva četiri pada su galerijska slika na simuliranih 200% root teksta u BS/EN light/dark; vanjski `overflow-hidden` okvir još siječe 19 px sadržaja. Preostala 92 nova slučaja su prošla. Grupa akcija slike sada se može suziti i prelomiti, a test dodatno provjerava geometriju teksta i dugmadi unutar kartice; čekati novi CI.

**Treći CI `44754778737` (`86c04d2`): 4/5; rendered 1125 prošlo / 2 pala.** Galerija i mjerenje njenih kontrola sada prolaze u sve četiri prethodno pale kombinacije. Dva druga admin slučaja ugniježđenog dijaloga pala su na `stillRunning: 1` poslije jednokratnog čekanja animacija; anotacije ne identifikuju konkretnu animaciju. Test sada ograničeno ponavlja stvarno čekanje do `stillRunning: 0` (ne preskače niti dozvoljava trajnu animaciju); treba novi CI. Svi ostali novi slučajevi su u ovom runu prošli.

**Četvrti CI `44757222553` (`ae0763f`): 4/5; rendered 1126 prošlo / 1 pao.** Svih 96 novih slučajeva prošlo je; jedini pad je raniji unsubscribe-success BS/light/text-spacing na `stillRunning: 1` nakon jednokratnog čekanja. Ograničeno čekanje stvarnog mirovanja primijenjeno je i na booking/token test; treba još potvrditi cijeli CI. Nije utvrđen identitet te animacije.

**Potvrda paketa:** `794f0b9` / CI `44760046621` = **5/5; rendered 1127 prošlo / 0 palo / 0 preskočeno**. Prošlo svih 96 slučajeva: popunjeni admin blog komentar, galerijska slika i recenzija s potvrdama bez brisanja; parametrizirani stylist preview ručnog pomaka, potvrda bez commita i retry; otkazani token termin i oporavak od privremene greške. Aurum prelama galerijske metapodatke/kontrole i komentar recenzije, uz mjerenje granica; Classic stil nije mijenjan. Testovi su fiksurni i ne dokazuju sve podatke ili ponašanja. Axe 1.4.3: 57 passed, 9 incomplete, 0 violations na 66 ruta; nepotpune nalaze ručno procijeniti. Preostaju drugi admin paneli/dijalozi i booking/stylist/token stanja, ručni text-spacing, fokus/tastatura, screen reader, forced-colors, reduced-motion i vizuelni pregled. Korisnik je naveo da je stvarni browser prošao, ali opseg/browser nisu specificirani. Nema merge/deploy.

## M2 · popunjena dugovanja, statistika stiliste i neuspjela rezervacija · u toku

Dodano 72 fiksurna slučaja × BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root tekst / text-spacing: admin dugovanja preko `?tab=debtors` (popunjena lista i serverska pretraga), dugovi stiliste (lista i dijalog naplate bez slanja) i popunjena statistika, te neuspjela rezervacija s ponovnim pokušajem. Booking POST je presretnut s greškom; provjerava se zadržan sadržaj i isti idempotency ključ na ponavljanju, bez stvarne rezervacije. Uočeno iz izvora: naziv klijenta je skraćivan; Aurum sada dozvoljava prelamanje imena i kartice, Classic ostaje netaknut. Asertuje se pun prikaz imena. Ovo su izolovane fiksure, ne dokaz svih tokova, backend transakcija ili ručnog pregleda. Rezultat rendered provjera čeka CI.

**Prvi CI `44790423155` (`92df67b`): 4/5; 1195 prošlo / 4 pala.** Svi admin/stylist slučajevi i booking 320 px/text-spacing prošli su; četiri booking retry testa pri 200% root teksta istekla su nakon 60 s bez detalja o uzroku. Drugi klik sada ima ograničeno čekanje i bilježi položaj/hit-test kad ne uspije; treba ponoviti CI. Ne zaključivati uzrok unaprijed.

**Drugi CI `44793283789` (`f14431a`): 4/5; 1195 prošlo / 4 pala.** Sva četiri booking retry pada pri simuliranom 200% tekstu uzrokovao je sticky javni header koji je presretao klik; izmjereni centar dugmeta bio je iza headera. Aurum sada mjeri visinu headera i prepušta ga normalnom skrolu kad pređe 30% visine viewporta; pri smanjenju ga vraća u sticky položaj. Mjeri se ResizeObserverom i na resize, bez prisilnog klika i bez promjene Classic ponašanja. Test provjerava visok header, stvarni klik, ponovnu upotrebu ključa i povrat sticky položaja. Čeka se potvrda CI-ja; ovo ne dokazuje sve scenarije fokusa i zaglavlja.

**Potvrda paketa:** `f5dd479` / CI `44797026431` = **5/5; rendered 1199 prošlo / 0 palo / 0 preskočeno**. Svih 72 novih fiksurnih slučaja prolazi: admin dugovanja i pretraga, stylist dugovanja/dijalog bez naplate i statistika, te izolovan booking neuspjeh/ponavljanje sa istim idempotency ključem. Pri simuliranih 200% testa header prestaje biti sticky kad je visok i ponovo postaje sticky kad se smanji; klik nije forsiran. Aurum imena dužnika prelamaju se umjesto skraćivanja. Rezultat nije potvrda stvarne transakcije niti svih stanja; axe kontrast na 66 ruta ostaje 57 passed / 9 incomplete / 0 violations. Ostaju drugi paneli/tokovi, ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, reduced-motion i vizuelni pregled. Stvarni browser pregled korisnik je prijavio kao prolaz bez detaljnog obima. Nema merge/deploy.


## M2 · Popunjena knjiga prihoda i direktna stylist rezervacija

- `f5515c1`: 48 izolovanih kombinacija u `a11y-admin.spec.ts` i `a11y-stylist.spec.ts` — BS/EN × Aurum light/dark × 320 CSS px, simulirani 200% root tekst i text-spacing; automatski i ručni prihod/edit bez spremanja, direktna rezervacija s odabranim klijentom/uslugom ili bez definisanog spola, bez slanja. Mutacije se presreću. Prvi CI `44822684989` 4/5: 320px overflow u popunjenoj knjizi prihoda.
- `99240d0`: Aurum grid i filter wrap, puni naziv usluge i relativni omotač skrivenog opisa automatskog reda; dopunjen ručni text-spacing postupak u `15_rucni-pregled.md`. [CI 44825519292](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44825519292) **5/5**, check `136596999321`: **1247 passed / 0 failed / 0 skipped**. Lokalno E2E typecheck, ciljano lintanje, frontend build, 688 Markdown linkova i hygiene prošli; opći lint bez grešaka uz 6 postojećih upozorenja.
- CSS override i mjera odsijecanja nisu stvarni zoom ni ručni vizuelni pregled. Fiksure ne potvrđuju stvarne rezervacije ili finansijske transakcije. Korisnik je ranije prijavio prolaz u stvarnom browseru bez konkretnog opsega; ručni text-spacing i širi tastatura/fokus, screen reader, forced-colors, reduced-motion i vizuelni pregled ostaju otvoreni. Axe kontrast 57 passed / 9 incomplete / 0 violations, 21 incomplete čvor za ljudsku procjenu. Nema merge/deploy.


## M2 · Klijentski detalj završene rezervacije — rad u toku

Pripremljen `frontend/e2e/m2-reservation-detail.spec.ts`: 48 fiksurnih kombinacija (BS/EN, Aurum light/dark, 320 CSS px i simulirani 200% root tekst/text-spacing), uključujući dvije stavke i prikazane iznose, nedostupnu uplatu, 503 s tastaturnim retryjem i 403 bez izlaganja serverske poruke. Zahtjevi koji mijenjaju rezervacije su blokirani. E2E typecheck, ciljano ESLint, statički recovery 3/3, frontend build, dokumentacijski linkovi i hygiene su lokalno prošli; renderovani Playwright testovi **nisu izvršeni** i njihovo ponašanje nije potvrđeno. Sandbox Chromium nema potrebne NSS/NSPR biblioteke, a GitHub TLS prekida vezu; CI `44827817777` za prethodni dokumentacijski commit i CI za ovaj rad nisu potvrđeni. Fiksurni prikaz ne dokazuje stvarne finansijske transakcije. Ručni text-spacing, širi pregled pristupačnosti i ostala M2 stanja ostaju otvoreni.


**Naknadna validacija:** GitHub veza obnovljena i `c5b23b1` pushan. CI `44830561289` 4/5: šest BS provjera iznosa nije prošlo zbog različitih Node/Chromium ICU formata (zarez/točka), bez utvrđenog pada prikaza. `28b819c` računa očekivano formatiranje u Chromiumu i zadržava provjeru svih pet konkretnih iznosa i njihovih redova. [CI 44832762454](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44832762454) **5/5, rendered 1295 prošlo / 0 palo / 0 preskočeno**, check `136621552753`. Prethodni CI `44827817777` također uspješan. Ovo je automatizovana fiksura, ne stvarna transakcija niti ručni pregled.

## M2 · Token prikaz prijedloga i dijagnostika kontrasta — provjera u toku

Dodano 48 fiksurnih slučajeva za token prikaz predloženog termina: gost i prijavljeni klijent, nepotpun termin te neispravan odgovor i tastaturni retry; BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root / text-spacing. Nema potvrđivanja, odbijanja niti pisanja. Izolovani lokalni Chromium uz mock API: **48/48**; nije stvarni backend niti ručni AT pregled. CI potvrda slijedi.

`axe-coverage.mjs` sada ispisuje sve zabilježene nepotpune uzorke, umjesto samo prvih šest, s podjelom anotacija po dužini. Dosadašnji broj 21 znači **zabilježene uzorke**, najviše tri po ruti i pravilu, ne nužno ukupan broj nepotpunih DOM čvorova. Postojeći test opisa promijenjen je samo zbog tačnijeg natpisa; garancija broja i prenosa cilja/poruke ostaje, uz novi test za svih 10 ruta i podjelu bez gubitka. Lokalno **40/40** node testova, E2E typecheck i ciljani lint. Ovo poboljšava dijagnostiku, ne mijenja axe presudu niti zatvara ručnu procjenu.

**Ciljani vizuelni pregled:** izolovani Chromium 153, BS/Aurum light i dark: statički snimak token prikaza pri 320 px i text-spacingu otkrio je oznake razlomljene slovo po slovo bez horizontalnog overflowa. `a5fdda3` stavlja te retke u jednu kolonu samo u Aurumu i dodaje mjerenje visine oznake na 320 px uz spacing; nakon popravke lokalno **48/48**. Dodatno su četiri gostujuća BS/EN light/dark slučaja provjerila stvarni Tab do linka, `:focus-visible`, outline i Enter uz emulirane forced-colors/reduced-motion; to je automatizacija, ne OS ili čitač ekrana. U [ciljanom pregledu](16_ciljani-vizuelni-pregled.md) su snimci i ručno pregledani izgled te parcijalna analiza šest uzoraka legende analitike (light 17,55:1, dark 15,60:1); ostali nepotpuni nalazi nisu zatvoreni. Fiksure nisu potvrda stvarnog booking toka ili finansijskih transakcija. CI provjera slijedi.

**CI potvrda:** [44920510427](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44920510427) na `2c98530` **5/5, rendered 1343 passed / 0 failed / 0 skipped**, check `136895376641`. Teardown iznosi sva 21 po ruti ograničena uzorka u tri anotacije; šest Aurum uzoraka legende je ciljano analizirano, tri podrazumijevane legende i 12 uzoraka drugih ruta nisu. Ručni pregled ostaje djelimičan i ne pokriva stvarni OS forced-colors ni čitač ekrana. Nema merge/deploy.

## M2 · Popunjena klijentska lista i dijalog otkazivanja — lokalno provjereno

- Nova fiksurna matrica `frontend/e2e/m2-client-list.spec.ts`: 60 slučajeva, BS/EN × Aurum light/dark × 320 CSS px / simulirani 200% root tekst / text-spacing, pet stanja: lista, zatvaranje dijaloga, simulirani uspjeh otkazivanja, neuspjelo odbijanje prijedloga i retry učitavanja. Lokalno Chromium **60/60**; E2E typecheck, ciljano lintanje i build prolaze. Sve rezervacijske zahtjeve presreće test; uspjeh i neuspjeh su simulirani, bez stvarnog otkazivanja.
- Uočena i popravljena odsječena duga napomena u Aurumu. Pristupačni opis dugmeta kartice sada uključuje referencu, status i detalje; test provjerava izračunati opis, ne stvarni čitač ekrana. Classic zadržava prethodno vizuelno skraćivanje napomene.
- Kontrolisani dijalog/drawer nije vraćao fokus nakon Escape. Dodan povrat na okidač ili naslov stranice ako okidač više nije dostupan; ako je fokus već premješten drugdje, ne vraća se prisilno. Test pokriva otvaranje Enterom, Escape i povrat na okidač, te simulirani uspjeh i naslov kao fallback na uskom i širokom prikazu.
- Statike lokalno: hygiene, CI index 386/389 (3 interaktivne izuzete), 695 lokalnih Markdown linkova, BS/EN 2778/2778 i 148 kontrastnih parova prolaze. Rendered CI za ovaj paket još čeka potvrdu. Ovo ne završava M2, ne dokazuje stvarne transakcije, čitač ekrana, stvarni zoom ili sistemski forced-colors; preostaje širi interaktivni i vizuelni pregled i 15 ostalih zabilježenih incomplete uzoraka.

## M2 · Kontrast auth bannera — lokalna provjera

Lokalni pregled izdvojio je četiri prethodno nepotpuna uzorka naslova i podnaslova bannera `/login` i `/register`. Default BS fiksura s fallback slikom bila je čitljiva, ali bijela podloga i duži podesivi tekst otkrili su 2,07:1 u novoj regresiji prije popravke. Aurum koristi postojeći tamni hero token kao podlogu teksta, a banner raste s tekstom; Classic nije promijenjen. Dodatnih 16 BS/EN × light/dark × normalni/simulirani 200% root fiksura prolazi lokalno; regresija mjeri screenshot podloge u cijelom pravougaoniku naslova i podnaslova (minimalno 4,5:1) i položaj unutar bannera. Test ne šalje login ni registraciju. Izmjene se odnose na snimljene slučajeve, ne na svaku stvarnu sliku ili viewport. Detalji i [dokazi](16_ciljani-vizuelni-pregled.md). Prethodni CI `44925142490` nije potvrđen jer GitHub API trenutno vraća EOF; CI novog paketa nije pokrenut. M2 i ručni/AT pregled ostaju otvoreni.

**Naknadna potvrda klijentskog paketa:** `cb8d7db` / [CI 44925142490](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44925142490) **5/5**, rendered check `136909467105`: **1403 passed / 0 failed / 0 skipped**. CI anotacije za `/rezervacija` sadrže iste naslove i selektore kao `/login`, ali ne bilježe konačni URL; gost je lokalno preusmjeren na login, bez dokaza o CI navigaciji.

## M2 · Javni hero kontrast — lokalna provjera

Na `/blog`, `/galerija` i `/kontakt` ciljano je vizuelno i konzervativnim mjerenjem podloge pregledano šest ranije zabilježenih nepotpunih uzoraka, BS, Aurum light/dark, fallback slika, 1440 × 900. U fiksuri najniži izračun bio je 14,31:1. Nova regresija koristi bijelu i crnu testnu podlogu iza postojećih slojeva, BS/EN i oba režima: **12/12 lokalno**; nema transakcija ili izmjene stvarnih postavki. Ovo nisu sva stanja ili sve slike, axe `incomplete` se ne mijenja, a pet ranije zabilježenih uzoraka još nije lokalno procijenjeno. Podaci, metode, snimci i ograničenja su u `16_ciljani-vizuelni-pregled.md`. CI za ovaj novi test nije još pokrenut.

**Potvrda auth paketa:** `2dc11c7` / [CI 44927850035](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44927850035) **5/5**, rendered check `136917772501`: **1419 passed / 0 failed / 0 skipped**. CI nije zamjena za stvarne fotografije, uređaje ili AT pregled.

## M2 · Dodatni lokalni pregled legende

U izolovanoj fiksuri analitike, s podrazumijevanim praznim postavkama (Aurum light) i izričito odabranim Classic light, tri teksta legende imaju redom **17,55:1** i **20,01:1** na neprozirnoj površini; pregledani su i statični izresci. Tri selektora iz ranijeg podrazumijevanog uzorka su lokalno procijenjena u oba konteksta, ali konkretna aktivna tema CI zapisa nije zabilježena. Dva uzorka pod `/rezervacija` i dalje su nerazriješena u CI kontekstu, a booking ekran, svi čvorovi i širi ručni/AT pregled nisu pokriveni ovim dokazom. Detalji u `16_ciljani-vizuelni-pregled.md`.

**CI potvrda javnog hero paketa:** `4dbee1d` / [CI 44929350606](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44929350606) **5/5**, rendered check `136922352871`: **1431 passed / 0 failed / 0 skipped**. To ne proširuje opseg fiksurnih provjera na stvarni OS, sve slike ili druge viewportove.

## M2 · Više usluga u bookingu i razjašnjenje gostujuće axe rute

Lokalno 72 fiksurna slučaja BS/EN × Aurum light/dark × 320px + text-spacing / 200% root / text-spacing: dva duga naziva, tastaturni odabir, dodavanje, uklanjanje jedne/zadnje usluge, čišćenje, Escape, i promjena usluga nakon izbora termina. Popravljeni su gubitak fokusa nakon nestanka opcije, nejedinstveni nazivi dugmadi i Aurum odsijecanje naziva; fokus se ne preuzima ako ga je korisnik već premjestio drugdje. Automatizovani forced-colors test fokusnog obrisa u četiri slučaja je emulacija, ne OS/AT pregled. Mjere fokusa provjeravaju centar dvije kontrole, ne sve stanje scrolla; izdvojen je rizik sticky headera pri vizuelnom pregledu. Lokalno dodatno **126/126** postojećih slučajeva s `booking` u naslovu i **1/1** gostujući axe s provjerom preusmjerenja na login. Svi upisi su blokirani i ne dokazuju transakcije. Izresci i ograničenja u `16_ciljani-vizuelni-pregled.md`. CI za ovaj paket još čeka potvrdu.

**Potvrda prethodne evidencije:** `0f2e855` / [CI 44933694910](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44933694910) **5/5**, rendered check `136935623273`: **1431 passed / 0 failed / 0 skipped**. Novi multi-service paket je zaseban i čeka svoj CI.

**CI potvrda multi-service paketa:** `70b6c37` / [CI 44935528819](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44935528819) **5/5**, rendered check `136941177403`: **1503 passed / 0 failed / 0 skipped**. Gostujući test potvrđuje konačni URL `/login` i u CI-ju; prethodna dva uzorka pod `/rezervacija` nisu samostalna potvrda pregleda booking ekrana. U novom runu je zabilježeno 15 nepotpunih uzoraka, do tri po ruti/pravilu; to nije broj svih čvorova.

**Dodatni lokalni axe sken bookinga:** postojeći multi-service test proširen je bez uklanjanja ranijih provjera: skenira `[data-aurum-page="reserve"]` u stanju s dvije usluge i u sažetku nakon izbora termina pri 320 CSS px + text-spacing, BS/EN i Aurum light/dark. Koriste se postojeći WCAG tagovi i filtriranje praćenih ozbiljnih/kritičnih nalaza; svi prijavljeni violations i incomplete ciljevi se spremaju u Playwright prilog, ne pretvaraju se u prolaz. Lokalno svih osam skenova nema prijavljenih violations niti incomplete u tom obuhvatu; kompletan spec **72/72**, E2E typecheck, ciljani ESLint i axe coverage unit **40/40** prolaze. Prvi lokalni pokušaj nije mogao pokrenuti browser zbog nedostajućeg Playwright cachea; ponovljen s postojećim izolovanim Chromiumom i bibliotekama. Sken ne pokriva ostatak stranice, sva stanja, čitač ekrana ni stvarne transakcije, a CI za dodatak još nije potvrđen. M2 i širi ručni pregled ostaju otvoreni.

**CI potvrda skenova:** `39ee738` / [CI 44938406334](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44938406334) **5/5**, rendered check `136950042746`: **1503 passed / 0 failed / 0 skipped**. Broj slučajeva je isti jer su skenovi dodani u postojeće slučajeve, bez ukidanja ranijih tvrdnji. Scoped axe nije pregled cijele stranice ni stvarnog asistivnog uređaja.

## M2/M3 · Javni sticky header i prethodna kontrola nakon skrola

Na 320 × 720, text-spacing override, fiksura s dvije dugačke usluge, dva jezika i Aurum light/dark: nakon fokusiranja drugog dugmeta uklanjanja, skrol postavlja centar prvog pod sticky header dok drugo ostaje vidljivo. `Shift+Tab` je fokusirao prekriveno prvo dugme; **4/4 ciljane provjere pale prije popravke**. U Aurum javnom shellu postojeći `ResizeObserver` sada upisuje stvarnu visinu sticky headera u scroll-padding dokumenta. Kad je header visok i statičan, offset je 0; pri resizeu i povratku u sticky stanje obnavlja se visina. Varijabla se uklanja pri izlasku iz javnog shella/promjeni skina, a Classic zadržava prethodni offset.

Test izričito provjerava da je header sticky, drugo dugme vidljivo i prvo zaista ispod headera prije `Shift+Tab`, zatim hit-testira centar fokusiranog prvog dugmeta; ne koristi prisilni klik ni isključeni header. Postojeći test visine je zadržan i dopunjen provjerom offseta u statičnom/sticky stanju. Novi lifecycle test provjerava Aurum i Classic, SPA izlaz na login i povratak. Lokalno Chromium **200/200** (72 multi-service, 126 postojećih booking, 2 lifecycle), E2E typecheck, ciljani lint, frontend build, header unit 1/1; prethodni neuspio test reprodukcija, ne CI ishod. Nema stvarnih upisa. CI za ovu popravku tek slijedi. Test mjeri centar, ne svaki piksel fokusnog obrisa ili sve moguće scenarije; stvarni browser zoom, ručni text-spacing, tastatura/AT i druge rute ostaju otvoreni. Izmijenjeni testovi zadržavaju prethodne provjere.

**Zatvaranje M2 i CI potvrda:** korisnik je prijavio Brave i Edge na Windowsu, sve rute, uloge, jezike i teme, uredan ishod bez preklapanja, odsijecanja i nedostupnih kontrola. Naknadno je izričito potvrdio da su korišteni 200% i 400% browser zoom, text-spacing override i verzija s popravkom `718fbe0`. Viewport, verzije browsera, vrijeme i pojedinačna stanja nisu navedeni. Ovo je korisnikova prijava, ne nezavisan audit. Automatizovane 320px fiksure i taj izvještaj zatvaraju M2, ne M1/M3/M4/M5/M6, sve interaktivne tokove, stvarne transakcije ili kompletan WCAG audit. [CI 44940081950](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44940081950) za `718fbe0`: **5/5; rendered 1505 passed / 0 failed / 0 skipped**, check `136955140124`; zabilježeno 15 nepotpunih kontrastnih uzoraka (najviše tri po ruti), koji se ne pretvaraju u prolaz. Evidencija: `15_rucni-pregled.md`.

## M1/M3 · Početni kontinuirani paket — keyboard upload, navigacija i izvoz

Potvrđen CI dokumentacije `9e65f3e` / [44942176458](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44942176458) **5/5**, rendered **1505/0/0**. U izolovanom Chromiumu reproduciran je nefunkcionalan Enter za file chooser stilističke radne knjige i gubitak fokusa kad se dugme onemogući tokom slanja. Sada dugme otvara odgovarajući skriveni input, a fokus se nakon uspjeha ili greške vraća samo kad nije namjerno premješten. Ispravljeno je i ugniježđeno dugme unutar linka: povratak radne knjige i 404, direktna rezervacija, detalj i naplata u rasporedu sada su po jedan semantički link uz isti tekst/odredište.

Dodanih **144/144** lokalnih fiksura: 96 file chooser/uspjeh/greška/pomjeranje fokusa/otkazivanje, 24 navigacija, 24 finance CSV i simulirana štampa; tri teme i dva jezika. Proširena postojeća klijentska matrica **60/60**: 12 slučajeva dodaje stvarni Tab do otvaranja, Tab/Shift+Tab unutar modalnog sadržaja, vidljiv fokus i hit-test centra te Escape/povratak, bez uklanjanja ranijih provjera. Modifikovani stylist 320px test i dodatni relevantni postojeći slučajevi **14/14** uz sintetičnu sesiju: direktna rezervacija je sada semantički link, a ranija provjera naziva, vidljivosti i granica je zadržana. Typecheck, ciljani lint, frontend build, 11 ciljnih stylist node testova, 20 tab-traversal i 4 finance-export-safety testa te i18n/contrast/CI index prolaze. Sve mutacije su mockovane/blokirane; štampa je simulirana. Devet ograničenih dijagnostičkih mjerenja indikatora fokusa i njihova ograničenja, cijeli opseg i preostali rad su u [M1/M3 izvještaju](17_m1_m3_izvjestaj.md). Rendered CI za ovaj paket još nije potvrđen. M1 i M3 ostaju otvoreni; nije stvarni OS file-picker, potpuni pregled tastature ni WCAG audit.

## M3 · Fokus landmarka nakon navigacije

Nakon tastaturne navigacije stylist fokus je zaista bio na `main`, ali je `outline-none` učinio obris transparentnim; ista klasa bila je i na admin landmarku. Oba sada imaju unutrašnji 3px `:focus-visible` obris, scroll-margin i `Highlight` u forced-colors. Lokalno 24/24 proširene navigacije i 12/12 novih admin skip-link/sidebar testova kroz tri teme, dva jezika i dvije emulacije boja, typecheck, lint, build i 20/20 shell unit testova. Provjeravaju se stil/transparentnost/širina i položaj vrha, ne ukupni kontrast ili svi browseri; CI za prethodni commit `b403b6a` je u toku. M1/M3 ostaju otvoreni; više detalja u [izvještaju](17_m1_m3_izvjestaj.md).

## M1/M3 · Izolacija testova nakon CI neuspjeha

`b403b6a` CI `44946893313` otkazan je novim pushom. `591f85c` CI [44947635332](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44947635332) **4/5**, rendered neuspješan; anotacije navode sve nove finance i admin focus slučajeve, puni log nije dostupan (EOF). Fiksure su prosljeđivale nepoznate API GET pozive backendu sa sintetičkim tokenom; lokalno ponovljen 401/logout u takvom okruženju, a fiksure sada sve `/api/**` GET-ove izolovano odgovaraju i blokiraju ili mockuju upise. Nakon ispravke **36/36** finance i admin focus slučajeva prolazi i s backendom koji inače odgovara 401; ostali novi testovi u zajedničkom runu prošli, jedan finance teardown trace kolizija pri paralelnom prethodnom procesu prošao je u naknadnom samostalnom runu. Uzrok nije potvrđen iz nedostupnog CI loga; novi CI ostaje potreban. Detalji u [izvještaju](17_m1_m3_izvjestaj.md).

CI nastavka `a8e2e74` [44950033390](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44950033390) **5/5**, rendered **1661/0/0**. Ovo potvrđuje izolovane fiksure u CI nakon ispravke, ne potpuni M1/M3, stvarni file-picker/štampu ili nezavisan audit.

## M1/M3 · Kalendar i fokus finansijskih dijaloga

`f1bee85` dokumentacijski CI [44951815302](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44951815302) 5/5. Reproduciran i popravljen gubitak fokusa pri promjeni kalendarskog perioda/prikaza i zatvaranju drawera; mjesečni i agenda događaji su do sada bili nedostupni tastaturom. Scheduler ostaje montiran, uz zaštitu od zastarjelih odgovora; dodana su nativna dugmad za događaje, datumi u imenima, označena odabrana stanja, retry/fallback fokusa i kontrastni inset indikatori. Axe na popunjenom mjesečnom prikazu otkrio je neispravnu semantiku biblioteke i slab kontrast datuma: pogrešna tabela zamijenjena je grupom sa zasebno imenovanim datumima i događajima, boja datuma potamnjena. To nije dokaz M4 niti potpune semantike kalendara.

Dijeljeni kontrolisani `ResponsiveDialog` vraća fokus okidaču ili glavnom sadržaju kad je obrisani red nestao, bez nadjačavanja specifičnih handlera, promjene rute i namjerno pomjerenog fokusa. Kod ručnog prihoda fokus prati izbor/uklanjanje klijenta. Lokalno **147/147** kalendar, **72/72** brisanje finansijskih redova, **12/12** tastaturni unos, **60/60** klijentske, **24/24** prethodne income M2 i **10/10** O4 regresije; build/typecheck/lint, 28 node i 20 Tab unit testova. Fiksure presreću upise, forced-colors je samo emulacija, a CSS mjere indikatora nisu puni pikselni ili ljudski pregled. CI ovog paketa tek treba potvrditi. Opseg i preostale provjere u [izvještaju](17_m1_m3_izvjestaj.md); M1/M3 ostaju otvoreni.

CI `20a2318` [44959857898](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44959857898) **4/5**, rendered **1889/3/0**: tri nova indikatorska slučaja; puni log nije dostupan (EOF). Lokalno je u tri ponavljanja reproducirano povremeno očitanje CSS-a prije osvježavanja `:focus-visible` (2/135), pa test čeka završetak učitavanja i dva animation framea; ponovljeno **135/135**. Dodana ograničena dijagnostika u CI anotaciji; uzrok baš CI padova nije potvrđen bez loga. Novi CI ostaje potreban. Detalji u [izvještaju](17_m1_m3_izvjestaj.md).

**Potvrda:** [CI 44962531926](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44962531926) za `84c0d80` **5/5**, rendered **1892 passed / 0 failed / 0 skipped**. Axe i dalje bilježi 15 uzoraka nepotpunog kontrasta, koji nisu automatski prolaz; M1/M3 ostaju otvoreni za preostale tokove i stvarni ručni pregled.

## M1/M3 · Nastavak dnevne knjige

Reproducirani i popravljeni su tastaturni Escape/ponovno otvaranje/Tab i aktivna opcija pretrage klijenata i usluga, fokus nakon uklanjanja usluge, kontrolisanih dijaloga i pojedinih asinhronih akcija; zaštita čuva namjerno pomjeren fokus. Sintetičke fiksure **156/156**, plus kalendarski skip **12/12** u završnom runu; tri scoped axe skena i ograničena mjerenja obrisa, ne pravi AT/OS pregled. Build, typecheck, lint i **40/40** daily-log node testova prolaze. Detalji i ograničenja u [izvještaju](17_m1_m3_izvjestaj.md). M1/M3 ostaju otvoreni za druge tokove i stvarni pregled.

Dokumentacijski `d02dd08` / [CI 44964674570](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44964674570) **4/5**, rendered **1891/1/0**, jedan calendar skip test; CI log EOF. Lokalno je isti slučaj jednom reproduciran: prvi Tab je poslan prije lazy mounta. Test sada čeka kalendar i početno učitavanje, i dalje zahtijeva prvi Tab; bez CI loga uzrok CI pada nije potvrđen. Širi lokalni run s novim mjerenjem forced-colors isprva 313/2, nakon čekanja ažuriranja stila relevantna ponavljanja prolaze; novi CI potreban.

## M1/M3 · Rashodi: dinamičke stavke i prilozi

Reproduciran pogrešan par prilog–stavka nakon brisanja prethodnog reda; sada se red i pridruženi prilog uklanjaju zajedno, a izmjena redova/kategorije je onemogućena dok upload traje. Za prilog stavke i uklonjeni red popravljeni su konkretni gubici fokusa bez nadjačavanja namjerno premještenog fokusa. Sintetičke upload/503/payload tastaturne fiksure **36/36** kroz tri teme, dva jezika i desktop/mobitel, uz prethodne finance regresije **120/120**; build/typecheck/lint i 15 expense node testova prolaze. Datum je `fill`, datoteke su `setInputFiles`, upisi i upload mockovani: nisu stvarni OS dijalog ili poslovna transakcija. Detalji i otvoreni opseg u [izvještaju](17_m1_m3_izvjestaj.md); CI novog dodatka čeka potvrdu.

**CI dnevne knjige:** [44968505389](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44968505389) za `d54b67d` **5/5**, rendered **2048/0/0**. Kasniji paket rashoda nije obuhvaćen tim runom i zahtijeva zasebnu CI potvrdu.

**CI rashoda:** [44970652335](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44970652335) za `3dcca32` **5/5**, rendered **2084 passed / 0 failed / 0 skipped**. Puni lint 0 grešaka / 6 prethodnih upozorenja, strict i18n 2779/2779 i source kontrast 148/148; preostala M1/M3 i ručna dokazivanja ostaju otvorena.

## M1/M3 · Fiksni i zajednički prilozi rashoda

Reproduciran gubitak fokusa poslije uspješnog/neuspješnog uploada fiksnog priloga te uklanjanja fiksnog i zajedničkog priloga. Fokus se vraća na odgovarajuću kontrolu samo ako nije namjerno premješten. Dugmad za uklanjanje fiksnog/pojedinačnog priloga dobila su razlučive lokalizovane nazive. **96/96** novih sintetičkih slučajeva (tri teme × BS/EN × desktop/mobitel × dva tipa × uspjeh/503/pomak fokusa/zatvaranje tokom odgođenog odgovora), šest scoped axe skenova, sa ranijih 36 stavki **132/132**; prethodno sa svim finance regresijama **216/216**. Build/typecheck/lint, 15 node testova, strict i18n i hygiene prolaze; simulirani upload i `setInputFiles` nisu stvarni OS izbor ili transakcija. [CI 44972835065](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44972835065) za raniju dokumentaciju `3280fd1` **5/5, 2084/0/0**, CI ovog paketa na čekanju; [izvještaj](17_m1_m3_izvjestaj.md).

## M1/M3 · Dnevna knjiga: uređivanje i reset vraćanja

Reproducirano zadržavanje prethodnog novog datuma nakon Escape i ponovnog otvaranja vraćanja; dijalog se ponovo inicijalizuje pri izboru zapisa. Dodano **60** kombinacija uređivanja, 503/ponovnog pokušaja, promjene i resetovanja datuma i upozorenja za buduću direktnu/standardnu rezervaciju. Dnevnički testovi **192/192**, dodatni budući slučajevi **24/24**; build, E2E typecheck, ciljani lint bez greške (jedno postojeće upozorenje stranice), 40 node testova, strict i18n i doc linkovi prolaze. Datum je `fill`, zahtjevi i nestanak reda su simulirani; ovo nije dokaz OS date pickera ili stvarne promjene podataka. Novi CI čeka potvrdu, M1/M3 i M4–M7 ostaju otvoreni; detalji u [izvještaju](17_m1_m3_izvjestaj.md).

## M1/M3 · Filteri dnevne knjige i asinhroni retry

Reproducirano zastarijevanje rezultata i greške kod preklopljenih filter zahtjeva te gubitak fokusa nakon retry. Sada važi samo posljednji odgovor, retry fokus se prebacuje na reset i status učitavanja ima lokalizovan pristupačni tekst. Lokalno **100/100** novih kombinacija, te **12/12** zasebnih slučajeva gdje zadnja greška nadživi stariji uspjeh. Širi run **300/316**: 216 ranijih dnevničkih slučajeva prošlo, 16 novih light/dark slučajeva palo zbog nejedinstvenog testnog lokatora statusa; nakon preciziranja svi novi gore prolaze. Dodatno 12/12 izračunatih kontrasta prstena prema njegovom offsetu ≥3:1; to nije pregled cijelog obrisa. Build/typecheck, ciljani lint s jednim prethodnim upozorenjem i 40 node testova prolaze. Datumi `fill`, podaci/GET simulirani, upisi blokirani; nije dokaz stvarnog date pickera/backend transakcije ni kompletnog kontrasta fokusa. Prethodni CI `890352f` otkazan novijim pushom; [CI 45009009454](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45009009454) za `da8062b` **5/5**, rendered **2240/0/0** uz 15 uzoraka nepotpunih axe nalaza kontrasta. CI ove izmjene na čekanju. M1/M3 i M4–M7 ostaju otvoreni. Detalji: [izvještaj](17_m1_m3_izvjestaj.md), [neizvršeni protokol pregleda](18_m1_m3_manualni_protokol.md).

## M1/M3 · Finance filteri, sortiranje i CI dnevnika

Fokus nakon čišćenja filtera prihoda/rashoda vraća se u pretragu; ručni prihodi dobijaju lokalizovane različite nazive akcija s brojem reda, datumom, uslugom i iznosom, uključujući identične stavke. Tastaturni filteri, prazan prikaz, reset i sortiranje/`aria-sort`, plus imena nakon promjene redoslijeda: **96/96** novih fiksura; ranije **180/180** sa finance regresijama, nakon naziva **96/96** imena i delete regresija. Šest scoped axe skenova bez assertable violations; provjerena boja punog obrisa sortiranja prema odabranoj podlozi, ne cijeli vizuelni obris. Sintetički GET, upisi blokirani. Build/typecheck/lint, **40/40** finance node, i18n i hygiene prolaze.

[CI 45011773852](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45011773852) za `e596747` **4/5**, rendered **2349/3/0**: tri `filters` slučaja dnevnika. Puni log EOF, tačan assertion nije utvrđen. Lokalno tri pogođena slučaja ponovljena 24/24; test sada sačeka dva framea prije očitanja CSS-a i daje ograničen opis greške u CI anotaciji; zatim 112/112 dnevničkih filtera i 24/24 ponavljanja. To je hipoteza o tajmingu, ne dokaz CI uzroka. Potreban novi CI; M1/M3 i M4–M7 ostaju otvoreni. [Izvještaj](17_m1_m3_izvjestaj.md).

## M1/M3 · Pregled fakture rashoda

Dugmad za dodatne stavke i ikone za pregled/izmjenu/brisanje dobila su razlučive lokalizovane nazive s brojem reda, i kada su nazivi jednaki. **48** tastaturnih fiksura obuhvata otvaranje preko oba okidača, kruženje Tab/Shift+Tab, zatvaranje Escape/dugmetom, povrat fokusa, sadržaj i različita imena poslije sortiranja; zajedno s finance filter/sort i delete testovima nakon svih izmjena **216/216**. Dodatna provjera centra, focus-visible i računatog kontrasta prstena/obrisa **24/24**, šest scoped axe skenova otvorenog dijaloga bez assertable violations. Podaci i GET simulirani, upisi blokirani, prilog nije zaista otvoren; nije pregled pomoću AT ili dokaz cijelog indikatora fokusa. Build/typecheck/lint, 64 finance node testa, strict i18n **2782/2782** i hygiene prolaze. Prethodni CI `76894a1` 4/5, dva neobjašnjena pada finance fiksura, lokalno ponovljeno 10/10; dodana dijagnostika za idući CI. Novi CI na čekanju, M1/M3 i M4–M7 nisu završeni; [izvještaj](17_m1_m3_izvjestaj.md).

## M4–M7 · Reduced motion, prisilne boje i rezervacija

Rezervacija s unaprijed izabranom uslugom sada pod `prefers-reduced-motion` koristi instant umjesto eksplicitnog smooth scrolla, uz zadržan smooth bez te postavke. Pojačan tekst neaktivnih brojeva koraka: Classic prethodno **6,73:1** za ciljani AAA tekst, sada izračunato **18,21:1** na konkretnoj fiksuri. Lokalno **90/90** (72 ranije booking i 18 novih scenarija), ponovljena nova matrica s provjerom semantike **36/36**; tri scoped axe skena bez prijavljenih violations/incomplete. Chromium emulacija forced-colors, sintetički GET i blokirani upisi ne dokazuju stvarni OS, AT ni transakcije. CI `b2fcf97` 5/5, rendered **2496/0/0**, uz 15 nepotpunih uzoraka; CI ove dopune tek slijedi. M4/M5, stvarni OS reduced-motion i potpuna M7 procjena ostaju otvoreni. [Izvještaj i neizvedeni protokol](19_m4_m7_protokol_i_izvjestaj.md).

## M4–M7 · Stanja rezervacije u emuliranim sistemskim bojama

U Chromium forced-colors fiksuri reproducirano je da pozadinski ispuni ne razlikuju trenutni korak i odabrane kontrole. Dodani su sistemski obrubi/spojnice, obris trenutnog koraka i obrubi odabranog datuma/termina; ovo ne zamjenjuje Windows pregled. Fiksure obuhvataju tri teme, BS/EN i svijetlu/tamnu emuliranu paletu te šest scoped axe skenova sažetka u običnim bojama; lokalni fokusirani paket **36/36**; M6 mjeri uhvaćene promjene inline visine datumske sekcije i ne dokazuje sve JS animacije. CI prethodnog `60bf38f` 5/5, **2514/0/0** i 15 nepotpunih axe uzoraka. U širim booking regresijama pri simuliranom 200% tekstu povremeno je fokus ostao ispod viewporta; uzrok još nije potvrđen, dodana dijagnostika i nalaz otvoren. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## M4–M7 · Filter usluga i izvorna CI provjera

Dodani forced-colors obrub odabranog filtera i zaseban fokusni obris te lokalizovani skriveni naslov kataloga kada urednički naslov nedostaje. Lokalna matrica filtera 12/12; završni kombinovani paket 30/30. Šest scoped axe skenova bez violations, Classic po dva `color-contrast` incomplete čvora. CI `a3988fd` ima frontend failure na redundant-entry koraku; lokalno reproducirano poklapanje izvornog grepa s novim progress atributom, heuristika sužena i 10/10 lokalno, bez dostupnog CI loga. Šira regresija tema 12/20 uz backend-ovisne slučajeve koji nisu dosegnuli katalog; detalji i neizvedeni OS/AT protokol u [izvještaju](19_m4_m7_protokol_i_izvjestaj.md).

## M4–M7 · Ciljani kontrast brojača kataloga

Classic brojači kategorija dobili su eksplicitnu površinu i boju, kao već u Aurum temama. Ciljani CSS parovi su 20,01/17,55/15,60:1, šest scoped axe skenova bez violations/incomplete. Filter 12/12, dodatni konfigurirani naslov 2/2; DOM `aria-live` promjena ne dokazuje AT najavu. Fokusna dijagnostika 40/40 nije ponovila raniji kvar; nalaz ostaje otvoren. CI za `6e53d12` u toku, novi lokalni nastavak namjerno čeka push da se ne otkaže rendered run. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## M4–M7 · CI booking axe i ustaljeno stanje

CI `45041037682` rendered **2543/1**, Classic booking s 17 contrast čvorova; stvarni uzrok nedokazan, CI log EOF. Lokalna umjetna prozirnost dala je slične nalaze, ne identičan CI dokaz. Ciljani sken sada čeka završetak dva imenovana omotača, a testovi potvrđuju da čekanje ne skriva namjerno loš kontrast niti trajnu prozirnost. Lokalno 8/8, ponavljanja 18/18 prije stabilizacije kontrolne animacije; ostali incomplete nalazi i ručni AT/OS ostaju otvoreni. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

Završni zajednički paket nakon stabilizacije kontrolne animacije: **46/46** lokalno, uključujući tri ciljana booking i 12 skenova kataloga/sažetka bez violations/incomplete. Ovo ne potvrđuje uzrok izvornog CI pada niti AT/OS.

## M4–M7 · Galerijski prije/poslije slider

Emulacija je na bijeloj sintetičkoj slici otkrila nerazlučiv bijeli razdjelnik; forced-colors sada koristi dvobojni sistemski obrub i obrubljenu ručku. Dva slidera su imala isti pristupačni naziv: galerija za više parova dodaje redni broj, a auto-kategorija i naziv kategorije; jednako nazvane kategorije i opis sadržaja slika ostaju ograničenja. Classic captioni imali su axe AAA 5,6:1, sad koriste jači token. Lokalno **39/39**; 12 scoped galerijskih skenova bez violations ali s po dva hero incomplete, tri scoped auto-category skena bez violations/incomplete. CI `cfd43a1` završio je 4/5, rendered 2547/1 na finance izboru; puni log EOF i uzrok nije potvrđen. Stvarni AT/OS i booking fokus otvoreni. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## M4/M7 · finance odgođeni izbor stiliste i kontrast

CI `45054726540` za `cfd43a1` završio 4/5, rendered 2547/1: Classic EN desktop `#manual-stylist` ostao prazan; cijeli log EOF. Sintetički odgođeni lookup demonstrira moguću utrku, ali ne dokazuje uzrok CI pada. Select je disabled dok traje dohvat, status je lokalizovan i povezan, postojeći test čeka opciju. Otklonjeni raniji scoped AAA nalazi summary labela i validacije. Lokalni objedinjeni paket 65/65, šest axe skenova bez violations s po jednim `color-contrast` incomplete za opis zbog preklapanja; 20/20 ciljanih ponavljanja. Stvarni AT i neuspješan lookup/retry nisu ispitani; novi CI tek treba potvrditi. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## CI `45071941627` — prag izvornog sweepa

Frontend posao je pao na `test:text-contrast-allowlist`; lokalno reproducirano: broj svijetlih sirovih paleta-klasa je 124, prethodni minimalni ratchet 125. Uklonjena je jedna `text-rose-600` upotreba u finance validaciji pri prelasku na semantičku boju; prag je precizno snižen za jedan na 124, bez promjene 4,5:1 pravila, allowliste ili izvornog skeniranja. Lokalno test 4/4. Repository, backend i mobile poslovi su prošli, rendered je još u toku u trenutku zapisa; ne zaključivati njegov rezultat. Ispravka je pushana na zahtjev; rendered je potom otkazan, a novi CI treba pratiti.

## M4 · oporavak od greške dohvaćanja stilista

Sintetički 503 prethodno je ostavio prazan aktivan select bez poruke. Dodani lokalizovani alert/opis, disabled kontrola i tastaturni retry s očuvanjem ili nenadjačavanjem fokusa; postojeći keširani rezultati se ne blokiraju zbog pozadinskog neuspjeha. Lokalno **54/54** novih i prethodnih finance testova, šest scoped axe error skenova bez violations ali po jedan incomplete opisa dijaloga zbog preklapanja; nisu stvarni AT ili backend. CI `45071941627` prekinut novim pushom, `45073812256` rendered u toku, ostala četiri posla success u trenutku zapisa. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## M1/M4 · greška dohvaćanja usluga stiliste

Lokalno dodani status/greška/retry i izolacija kasnog odgovora prethodnog stiliste. Pri uređivanju dok nema usluga spremanje je blokirano, a iznosi označeni nedostupnim; kontrolisana fiksura prije guarda pokazala aktivno Save. Regresija prije zadnjeg preciziranja pending stanja 102/102, poslije 24/24 ciljano; šest scoped error axe skenova bez violations s po jednim contrast incomplete. CI `45074650488` za prethodni commit ima četiri uspješna posla, rendered u toku; lokalni nastavak ne pripada tom runu. Nisu ispitani stvarni backend/AT niti slučaj historijske usluge koje nema u uspješno dohvaćenoj listi. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## Rad u toku · Finansije, saglasnost i S8 (nekomitovano)

Proširena lokalna regresija rezervacija, galerije, dnevne knjige i finansija nad ranijim buildom **210/210**. Svježi build, E2E TypeScript i frontend Node **854/854** prolaze; lint ima šest postojećih upozorenja. PostgreSQL backend E2E **79/79**, četiri suite, ali migracijska tabela je lokalno simulirana, a derivacija saglasnosti u HTTP testu mockirana. Ovo nije dokaz CI migracijskog deploya ni stvarnog čišćenja izvedenih slika.

Novi sintetički test kasnog booking pomaka obuhvata tri teme i oba motion moda **6/6**; izvorni intermitentni CI pad i dalje nije objašnjen. S8 prikaz uticaja brisanja izdvojen, dostupni nazivi akcija sadrže naziv zapisa i razlikuju istoimene zapise; šest sintetičkih browser fiksura **6/6**. Testovi su s mockiranim podacima i nisu potpuni pregled pristupačnosti niti potvrda cijele S8 faze.

Opis slike ostaje privatan bez zasebnog pristanka klijenta; implementirani su odvojeni snapshot i zaštita od zastarjelog opisa. Dalji rad obuhvata isprepletene grant/revoke pozive na stvarnoj bazi, stvarnu derivaciju i cleanup, deploy migracije, mobilni i web identity/race test, pregled privatnosti te OS/AT provjere. Identitetski guard u profilu ne dokazuje sigurnost cijelog auth storea: posebno treba provjeriti `refreshProfile` i odgovore 401 koji stignu nakon promjene sesije. Bez mergea/deploya i bez predstavljanja ovih rezultata kao završene faze.

## Rad u toku · Saglasnost: stvarna derivacija i konkurentne promjene

U izolovanom PostgreSQL HTTP testu reproducirano je da grant može uspjeti nakon što je zapis fotografije tokom generisanja izvedene kopije dodijeljen drugom klijentu (prije ispravke 201 umjesto 404). Grant sada u transakciji zaključava dnevni zapis pa fotografiju i ponovo provjerava vlasnika, status, klasifikaciju i original; neiskorištena kopija se čisti. Dvije kontrolisane varijante promjene vlasnika, uključujući stvarno čekanje PostgreSQL zaključavanja, prolaze. Sedam dodatnih unit fiksura pokriva druge promjene uslova; to nije dokaz svih mogućih rasporeda.

Dva HTTP testa koriste **stvarne** sintetičke JPEG fajlove, `sharp`, PostgreSQL i disk: istovremeni grantovi zadržavaju jednu WebP kopiju bez EXIF-a, suvišna baza/fajl se uklanjaju, strani klijent se odbija, audit ima jedan grant i jedan revoke, a javni fajl je nakon povlačenja 404. Drugi test zadržava prvi grant prije transakcije, izvršava drugi grant i revoke te provjerava 409 i čišćenje zastarjele kopije. To ne dokazuje potpunu anonimizaciju slike, pouzdan cleanup nakon pada procesa, sve utrke ni stvarno produkcijsko okruženje.

Otkriven i ispravljen netačan status „objavljeno“ za dodatne i neodobrene fotografije istog zapisa: inbox i javni feed sada koriste isti izbor para i stabilno sortiranje. MIME filter je usklađen. Lokalno **37/37** consent/public unit, **5/5** ciljanih stvarnih PostgreSQL HTTP provjera i **84/84** cijelog backend E2E paketa, build prolazi. Migracijska tabela i dalje je lokalno simulirana; puni migracijski deploy/izolovani CI, provjere identiteta sesije te OS/AT ostaju otvoreni. Nije rađen merge/deploy.

Nakon tih izmjena pokrenut je i kompletan backend Jest paket: **115/115 suite, 838/838 testova**. PostgreSQL E2E rezultat iznad ostaje uz navedeno ograničenje migracijske tabele.

## S8 · završni pregled i izdvajanje brisanja kategorija

`Services.tsx` 171 → 139 linija; identični handleri potvrda za brisanje kategorije i podkategorije premješteni su u `use-service-category-deletion.ts` (54), uključujući trigger, poruku, API, toast i koordinisani refresh. Source ugovor prati novu putanju. Nakon izmjene: ciljano **63/63**, puna mock S8 Chromium regresija **411/411**, Node **1005/1005**, build, E2E typecheck, pet Python provjera i diff check PASS; lint 0 grešaka/6 ranijih upozorenja. Testovi mock API-ja nisu dokaz produkcijskih mutacija, stvarnog AT ili OS pickera.

Prethodni CI [45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za `c34c12f` je **5/5**, rendered **3131/0/0**, 15 nepotpunih axe contrast uzoraka; ne pokriva `d6cde2c` i ovu ekstrakciju. Novi CI za nastavak tek treba potvrditi. [Pregled S8](24_s8_zavrsni_pregled.md) dokumentuje stanje, dokaze i dvije odluke prije STOP-a: read-only work gallery naspram CRUD teksta u planu i postojeća sidebar navigacija naspram planiranog ARIA tablista. S8 nije proglašen završenim; S9, merge i deploy nisu pokrenuti.

## S8 · odluke vlasnika i analitički tablist

Vlasnik je odabrao stvarni ARIA tablist te uređivanje work-gallery u S8, umjesto prethodno predloženog usklađivanja plana s read-only stanjem. Odabrani gallery ugovor: upload u postojeći završeni zapis, privatno do zasebne saglasnosti klijenta za svaku sliku; uklanjanje sakriva par u javnoj i admin galeriji bez brisanja originala ili saglasnosti; redoslijed utiče na admin i javni feed filtriran po usluzi, ostali javni feedovi ostaju nepromijenjeni. **Galerijske mutacije nisu implementirane**; zasebni Gallery ostaje u S9. [Detalji i rizici](24_s8_zavrsni_pregled.md).

Analitika je lokalno dobila Radix tablist/panele s automatskim izborom strelicama, Home/End, `?tab=` i očuvanjem ostalih parametara i historije; sidebar linkovi i stari redirecti ostaju. Nova fiksura prije **4/4 FAIL**, poslije objedinjeno **26/26**; četiri scoped axe skena tablista bez violations na pet imenovanih pravila. Prva puna S8 **407/415** zbog testnog selektora koji je brojao i vanjski i unutrašnji panel; selektor je ograničen na unutrašnji panel i ponovljena S8 **415/415**. Node **1005/1005**, build/typecheck PASS, lint 0/6. Testovi koriste mock API i ne predstavljaju stvarni AT audit. CI za ove promjene tek slijedi; nije S8 STOP.

## S8 · work-gallery sakrivanje i vraćanje (lokalno)

Dodani migracija `work_gallery_hidden`, vlasnički/admin HTTP API s compare-and-set zaštitom i paginiranom listom skrivenih zapisa; javni service/global/random feedovi filtriraju skriveno prije count/skip. Originalne slike i saglasnosti se ne brišu. Klijentov consent inbox skriveni automatski par ne označava kao objavljen, ali samostalno ručno objavljene fotografije i ranije poznat direktni URL derivata mogu ostati dostupni dok saglasnost vrijedi; potvrda to izričito navodi. Frontend ima BS/EN potvrdu, dostupne nazive, retry i fokus, vraćanje bez zaobilaženja saglasnosti te zaštitu od zastarjelog page odgovora nakon mutacije. Boolean CAS odbija istovremeni zahtjev s istim očekivanim stanjem, ali ne otkriva ABA ciklus sakrij–vrati–stari sakrij; verzionisanje treba dodati prije završetka S8. Upload i redoslijed **nisu implementirani**.

Lokalno: build oba projekta, frontend typecheck, Node **1005/1005**, backend unit **844/844**, API-error registry **7/7**, pet Python provjera; lint 0/6 ranijih upozorenja. S8 mock browser **423/423** prije zadnje ispravke nenametanja fokusa, nakon nje ciljano **9/9**, te konačna puna S8 **424/424**; četiri scoped axe skena potvrde bez violations na tri pravila. Prvi Node run nakon dodavanja backend kodova bio je **1004/1005** zbog nedostajućeg frontend pariteta kodova; mapa i BS/EN ključevi su dodani, zatim **1005/1005**. PostgreSQL HTTP **88/88**, uključujući četiri nova testa JWT/uloga, validacije, CAS konkurentnosti, feeda, consent inboxa, revokacije i očuvanja slika. Novi HTTP test koristi stvarno provjeravanje JWT potpisa i `RolesGuard`, uz mock `AuthService.validateUser` za testne uloge. Prvi puni HTTP run 87/88 zbog readiness probe: migracije su ručno primijenjene, ali nije bilo `_prisma_migrations`; nakon **simuliranja te tabele**, 88/88. Svih 23 SQL migracija primijenjeno je redom i na drugoj izolovanoj bazi, ali Prisma migrate deploy nije lokalno dokazan (schema engine nedostupan); nema stvarnog AT ni OS picker testa. CI za ovaj paket tek slijedi; prethodni [45458456025](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45458456025) za `87578b2` završio je **5/5**, rendered **3147/0/0**, uz 15 nepotpunih contrast uzoraka. [Ugovor i otvoreni rad](25_s8_work_gallery_implementacija.md).
