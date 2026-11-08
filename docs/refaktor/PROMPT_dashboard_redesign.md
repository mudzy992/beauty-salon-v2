# PROMPT: Plan + implementacija potpunog redizajna dashboarda (Beauty Salon Nejra v2)

> Kopiraj sve ispod ove linije u agenta (Cursor Agent / Plan mode). Prompt je podijeljen u dvije obavezne etape: **ETAPA A – samo plan (bez izmjene koda)**, pa tek nakon mog odobrenja **ETAPA B – implementacija modul po modul**.

---

## 0. ULOGA I CILJ

Ti si senior frontend inženjer i accessibility specijalista. Zadatak je **potpuni redizajn i refaktor web dashboarda** projekta `beauty-salon-v2` tako da bude **profesionalan, konzistentan i u potpunosti usklađen sa WCAG 2.2**, uz **nulte promjene u funkcionalnosti, tačnosti podataka i poslovnoj logici**.

Radiš **prvo plan (ETAPA A), zatim implementaciju tog plana (ETAPA B)**. Ne smiješ pisati produkcijski kod prije nego što je plan odobren.

Prije bilo čega pročitaj, redom:
1. `SOURCE_OF_TRUTH.md`
2. `.cursorrules` i `.cursor/rules/*.mdc` (posebno `plan-first.mdc`, `code-hygiene-and-matrices.mdc`, `testing-strategy.mdc`, `full-stack-workflow.mdc`)
3. `docs/audit/FINDINGS.md` (posebno **A11Y-01** i **I18N-01**), `docs/audit/HANDOFF.md`, `docs/codebase-map/FRONTEND.md`
4. `.cursor/plans/frontend_refactor_modularity_*.plan.md`, `frontend_chakra_removal_*.plan.md`, `admin_drawer_+_full_responsive_pass_*.plan.md` (da ne ponavljaš/ne poništiš ranije odluke)
5. `.cursor/docs/matrices/*/MATRIX.md` za module koje diraš (reservations, daily-log, finance, client-debts)

Kod je izvor istine za trenutno ponašanje; dizajn dokumenti nisu dokaz implementacije.

---

## 0a. REFERENTNI HTML (priložen uz ovaj prompt)

Uz prompt dolazi **`dashboard-reference.html`** – samostalan statički primjer ciljnog izgleda i a11y ugovora. Otvori ga u pregledniku (testiraj tastaturom, zoomom 200/400%, širinom 320 px, tamnom temom i dugmetom „Prikaži oznake WCAG“). Koristi ga kao **vizuelnu i strukturnu referencu**, ne kao kod za kopiranje:

- Pokazuje: skip link, shell (header, sidebar, mobilni disclosure), `PageHeader`, `StatCard`, `FilterBar`, `DataTable` (caption, `aria-sort`, jedinstvena imena akcija, kartice ispod 640 px), `StatusBadge` (tekst + ikona + boja), stanja prazno/greška, `ConfirmDialog`, toast (`role="status"`), fokus prsten, `prefers-reduced-motion`, `forced-colors`.
- Tabela tokena na dnu stranice sadrži **izračunate omjere kontrasta** za postojeću paletu (light/dark) – prenesi ih u `globals.css` i `scripts/check_ui_contrast.py`.
- Implementacija ostaje React + Tailwind + Radix, sa i18n ključevima (BS/EN). Ako se HTML primjer i ovaj prompt razlikuju, **prompt je mjerodavan za pravila, HTML za izgled i strukturu**.
- Ova referenca ilustruje jedan ekran (Rezervacije). Isti šabloni važe za sve module. U ETAPI A agent treba predložiti dopune šablona ako neki modul (npr. kalendar, grafikoni, višekoračne forme) traži nešto što referenca ne pokriva.
- Prekidač teme u referenci služi samo za demonstraciju; za repo vrijedi tačka iz A1 (prvo potvrditi gdje se `.dark` klasa uopšte primjenjuje).

---

## 1. OBIM (SCOPE)

### U obimu (web dashboard – svi ekrani iza prijave)
**Admin** (`/admin/*`, `layouts/DashboardLayout` → `features/shell/admin/*`):
Dashboard (home), Analytics, ClientAnalytics, StylistAnalytics, Reservations (lista), **Reservations Calendar** (`/admin/reservations/calendar`, full-screen, izvan layouta), DailyLog, Salon, Services (+ ServiceWorkGallery), Stylists, Users, Finance (KIF/KUF, knjige prihoda/rashoda, katalog kategorija, dužnici – `/admin/debtors` je redirect), Loyalty, Blog, Gallery, Reviews, Settings (+ Operations, Appearance, SEO), AppReleases, Notifications, EmailSettings.

**Stylist portal** (`/stylist/*`, `layouts/StylistLayout`): inbox, workbook (lista/novi unos/detalj/reschedule preview), schedule (+ direct booking, detalj rezervacije), debts, stats.

**Autentifikovani onboarding ekrani:** `ForceChangePassword`, `onboarding/OnboardingGender`, `onboarding/OnboardingEmail`.

### Van obima (NE DIRATI)
- Javne stranice (`app/routes/public.routes.tsx`, `PublicLayout`, `features/public-catalog`, javni blog, javni rezervacioni tok, kontakt, galerija…)
- Mobilna aplikacija (`/mobile`)
- Backend (`/backend`), Prisma, API ugovori, Socket.IO događaji
- `Login`, `Register`, `ResetPassword` i `Profile` – **plan mora provjeriti** u kojem su layoutu i ko ih koristi (klijenti/javno?). Ako su javno-orijentisani, ostaju van redizajna, ali se u planu navodi da li ih treba samo WCAG-popraviti (odluka je moja).

### Kritično upozorenje o dijeljenim komponentama
`components/ui/*` (button, dialog, drawer, input, tabs…), `BeforeAfterSlider`, `media-image`, `brand/*`, `styles/globals.css` i tailwind tokeni **koristi i javni sajt**. Svaka izmjena dijeljene komponente mora biti **dokazano nekvarljiva za javne stranice** (grep upotrebe + vizuelna/markup provjera). Ako postoji rizik, napravi **admin-scoped varijantu** (npr. nova varijanta kroz `cva`, ili `features/shell/admin/ui/*`) umjesto da mijenjaš postojeće ponašanje. Javni sajt mora ostati vizuelno i funkcionalno identičan.

---

## 2. NEPREGOVARAJUĆA PRAVILA (HARD CONSTRAINTS)

1. **Funkcionalnost ostaje ista.** Nema novih feature-a, nema uklanjanja feature-a. Funkcije se samo usavršavaju (UX, struktura, pristupačnost).
2. **Preglednost i tačnost podataka ostaju iste.** Svaki broj, iznos, datum, status, filter, sortiranje, paginacija, ukupni zbir i badge prikazuje **iste vrijednosti** kao prije. Formatiranje (locale BS/EN) se ne mijenja. Finansijski proračuni (KIF/KUF, dugovanja, loyalty bodovi), FSM rezervacija, dostupnost termina, idempotency ključevi – **netaknuti**.
3. **API ugovori netaknuti:** isti endpointi, query parametri, payload-i, `queryKeys`, socket event-i, role guard-ovi (`ProtectedRoute`, `StylistRoute`).
4. **Rute:** nijedna postojeća URL ruta ne smije prestati raditi. Ako se ekrani objedinjuju, stari URL ostaje kao `<Navigate replace>` na novi (kao što već radi `/admin/debtors`). Deep-linkovi sa `?tab=` i dalje rade.
5. **Paleta boja se zadržava** (vidi §4). Nema novog branda.
6. **Postojeći testovi moraju ostati zeleni.** Repo ima ~110 `node --test` source-contract testova (a11y, i18n, recovery, API ugovori). Ako namjerna promjena markupa traži izmjenu testa, test se **ažurira tako da zadrži istu garanciju** – nikad se ne briše niti slabi. Svaka izmjena testa se obrazlaže u CHANGELOG-u.
7. **i18n:** BS/EN parity je strogi gate (`scripts/check_i18n.py`). Svaki novi string ide u `bs.json` **i** `en.json`. Nema hard-coded stringova (uključujući `aria-label`, `title`, `alt`, placeholder, toast, tooltip). Ne mijenjaj značenje postojećih ključeva.
8. **Code hygiene (`code-hygiene-and-matrices.mdc`):** produkcijski fajlovi ~100–150 linija; ekstrahuj u module/helpere; **odmah briši mrtav kod**. Trenutno prekoračenja: `Users.tsx` (~1535), `Services.tsx` (~1528), `EmailSettings.tsx` (~1377), `Profile.tsx` (~841), `ClientAnalytics.tsx` (~753), `Reservations.tsx` (~660), `Salon.tsx` (~603), `Gallery.tsx` (~600). Tokom refaktora modula razbij ih u `features/<modul>/…` pri čemu `pages/*.tsx` postaje tanka kompozicija.
9. **Ne uvoditi nove zavisnosti bez odobrenja.** Ako plan zahtijeva (npr. `@axe-core/playwright`, `eslint-plugin-jsx-a11y`), navedi u planu s obrazloženjem i čekaj odobrenje. Radix, Tailwind, lucide, recharts, react-big-calendar, sonner, framer-motion, TanStack Query su postojeći stack – koristi ih.
10. **Plan-first i evidencija:** poštuj `plan-first.mdc` (plan sa >3 faze = folder `.cursor/plans/dashboard-redesign/` sa `00_overview.md`, `01_phase-*.md`, `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`). Za svaki modul održavaj `.cursor/docs/matrices/<modul>/MATRIX.md` + `CHANGELOG.md`.
11. **Iskrenost o verifikaciji.** Repo kultura razlikuje „source/CI dokaz“ od „rendered/browser/screen-reader dokaza“. Ako nemaš mogućnost da pokreneš preglednik/axe/čitač ekrana, **to izričito napiši** i označi stavku kao „nije verifikovano u renderu“. Nikad ne tvrdi da je WCAG kriterij zadovoljen ako nije provjeren – označi status: ✅ verifikovano (kako), 🟡 zadovoljeno u kodu, nije provjereno u renderu, ❌ nije zadovoljeno, ➖ nije primjenjivo (zašto).
12. **Ne dodiruj** tracked `.env`, tajne, migracije. Ne pokreći ništa prema produkciji.

---

## 3. DIZAJNERSKI CILJEVI (profesionalan dashboard)

Postojeće stanje (provjereno u kodu) i šta se očekuje:

- **Boje su razbacane kao Tailwind `slate-*` klase** (npr. ~380× `text-slate-500`, ~283× `text-slate-900`, ~238× `text-slate-50`) umjesto semantičkih tokena, a dark-mode (`dark:`) je prisutan u ~104 fajla nekonzistentno. → Uvedi **semantički sloj** (surface, surface-muted, border, text, text-muted, accent, danger, success, warning, info, focus-ring) mapiran na postojeće CSS varijable (`--background`, `--card`, `--muted`, `--border`, `--primary`, `--ring`…) i brand tokene. Cilj: stranice koriste semantičke klase/tokene, ne sirove `slate-*`.
- **Dva različita shell-a:** admin (header + drawer navigacija, `AdminLayout`) i stylist (`StylistLayout`, gornji nav). → Ujednači shell obrasce (skip link, landmark-i, header, navigacija, korisnički meni, language switcher, tema), uz zadržavanje razlika u sadržaju navigacije po ulozi.
- **Navigacija:** `admin-nav.ts` ima 7 sekcija. → Predloži (u planu, uz obrazloženje) logičnije grupisanje; kandidati za objedinjavanje (**samo ako funkcionalnost ostaje ista**, stari URL-ovi ostaju redirecti):
  - Analytics + ClientAnalytics + StylistAnalytics → jedna „Analitika“ sa tabovima/podnavigacijom
  - Settings + Operations + Appearance + SEO (+ Email settings, Notifications, AppReleases) → jedan „Postavke“ hub sa podnavigacijom
  - Blog + Gallery + Reviews → „Sadržaj“ (već grupa u navu; razmotri zajednički obrazac stranice)
  - Dužnici (već u Finance), Loyalty (trenutno u Finance sekciji) – provjeri smisao
  Za **svako** objedinjavanje u planu navedi: šta se spaja, šta se tačno ne mijenja, mapu starih ruta → novih, rizik. Objedinjavanje se **ne implementira bez mog odobrenja u planu**.
- **Ujednačeni obrasci stranica (page templates):** `PageHeader` (naslov h1, opis, primarne akcije), `FilterBar`, `DataTable` (sortiranje, prazno/učitavanje/greška stanja, paginacija), `StatCard`, `FormSection`, `ConfirmDialog`, `EmptyState`, `ErrorState` (retry), `StatusBadge` (tekst + ikona, ne samo boja), `ResponsiveDialog/Drawer`. Iskoristi i konsoliduj postojeće (`finance/components/*`: `data-state`, `confirm-dialog`, `responsive-dialog`, `summary-cards`; `app-table` klase u `index.css`) umjesto da praviš paralelne.
- **`window.confirm(...)`** se koristi u `Users`, `Services`, `Gallery`, `Reviews`, `EmailSettings` → zamijeni pristupačnim `ConfirmDialog` (ista poruka, isti uslov, isti efekat; fokus se vraća na okidač).
- **Tabele:** `table.app-table { table-fixed }` i `xl:overflow-x-visible` – provjeri reflow na 320px/zoom 400%, čitljivost, zaglavlja `scope`, caption/aria-label, responzivni „card“ prikaz gdje tabela ne staje, bez gubitka kolona/podataka.
- **Gustina i hijerarhija:** konzistentan spacing ljestvica, tipografska skala (zadrži sistemski font stack iz `tailwind.config.js`), konzistentni radijusi/sjene (`shadow-soft`), jasna vizuelna hijerarhija primarnih/sekundarnih akcija.
- **Stanja:** svaki ekran ima jasna stanja loading / empty / error (sa retry) / success; skeleton gdje postoji učitavanje; bez layout shift-a.
- **Pokret:** `framer-motion` i animacije moraju poštovati `prefers-reduced-motion`.

---

## 4. KOLOR ŠEMA – ZADRŽAVA SE

Zadrži identitet: **bordo/rose `#632238`** (primary), **zlatna `#D4A843`** (accent), **champagne `#F5E6CC`**, tamna `#1A1A1A`/`#2D2D2D`, bijela; postojeći `--brand-*`, `--background/--foreground/--primary/--secondary/--muted/--accent/--destructive/--border/--ring` tokeni u `src/styles/globals.css` i `tailwind.config.js` (`brand.*`). Light i dark varijante postoje – zadrži ih.

Pravila:
- **Runtime brand override** (`theme_primary`, `theme_accent`, derivacije u `utils/brand-colors.mjs`, test `brand-colors.test.mjs`) mora nastaviti raditi. Ne hard-code-uj brand boje u komponente; koristi tokene.
- Zlatna kao **pozadina** sa bijelim tekstom ili zlatna kao **tekst** na bijelom ne prolazi kontrast → koristi postojeće odvojene tokene `gold-text` / `gold-ring`, `rose-text` / `rose-ring`.
- Ako neki par u dark/light temi ne zadovoljava WCAG kontrast (npr. `--destructive` u dark temi `0 62.8% 30.6%` sa tekstom, `muted-foreground` na `muted`, disabled stanja, placeholder, badge-evi, grafikoni), **koriguj minimalno (samo svjetlinu/zasićenost, ne nijansu)** i **eksplicitno navedi svaku takvu izmjenu u planu i CHANGELOG-u** (token, staro → novo, omjer kontrasta). To je jedini dozvoljeni oblik „promjene boje“.
- Proširi `scripts/check_ui_contrast.py` novim tokenima/parovima (trenutno 44 para) i drži ga `--strict` zelenim.
- Boja nikad nije jedini nosilac informacije (status, greška, trend, grafik) – dodaj tekst/ikonu/uzorak.

---

## 5. WCAG 2.2 – KOMPLETAN STANDARD

**Ciljni nivo: A + AA u potpunosti za sve ekrane u obimu**, i **AAA kriteriji gdje su izvodivi bez narušavanja brenda/funkcije** (svaki odbačen AAA kriterij se u planu navodi sa razlogom – W3C ne preporučuje AAA kao opštu politiku, ali ga primijeni gdje je jeftino i korisno). Napomena: 4.1.1 Parsing je uklonjen u 2.2.

U ETAPI A napravi **WCAG matricu** (`.cursor/docs/matrices/dashboard-a11y/MATRIX.md`): za svaki kriterij → kako se rješava u dashboardu (globalno / po komponenti / po modulu), ko je vlasnik (shell/ui primitive/modul), i način verifikacije. U ETAPI B matrica se ažurira po modulu.

### 5.1 Obavezni kriteriji (pregled sa dashboard-specifičnim napomenama)

**Perceivable**
- 1.1.1 Non-text content: `alt`/`aria-label` za avatare, ikone-dugmad, logotip, grafikone; dekorativne ikone `aria-hidden`.
- 1.2.x: ako dashboard ima audio/video (npr. mediji u galeriji/blogu uređivaču) – titlovi/alternativa ili ➖ s obrazloženjem.
- 1.3.1 Info and relationships: semantički headings (jedan `h1` po stranici, bez preskakanja), landmark-i (`header`, `nav`, `main`, `aside`), prave `table` strukture (`th scope`, `caption`), grupisanje formi (`fieldset/legend`), liste.
- 1.3.2 Meaningful sequence, 1.3.3 Sensory characteristics, **1.3.4 Orientation**, **1.3.5 Identify input purpose** (`autocomplete` na poljima ime/email/telefon/lozinka).
- 1.4.1 Use of color, **1.4.3 Contrast (min)** 4.5:1 / 3:1 velik tekst, **1.4.4 Resize text** (200%), **1.4.5 Images of text**, **1.4.10 Reflow** (320 CSS px bez 2D skrola, osim tabela/kalendara sa pristupačnom alternativom), **1.4.11 Non-text contrast** 3:1 (okviri inputa, fokus, ikone, segmenti grafikona), **1.4.12 Text spacing**, **1.4.13 Content on hover or focus** (tooltip/dropdown: dismissible, hoverable, persistent).
- AAA gdje izvodivo: 1.4.6 (7:1), 1.4.8, 1.4.9.

**Operable**
- 2.1.1 Keyboard, 2.1.2 No keyboard trap (dialozi/drawer-i sa fokus trap-om i izlazom), 2.1.4 Character key shortcuts (ako postoje).
- 2.2.1 Timing adjustable, 2.2.2 Pause/stop/hide (auto-refresh, `setInterval` – npr. polling `blog/comments/pending-count` svakih 60 s, socket osvježavanja, toast trajanje, carousel).
- 2.3.1 Three flashes; AAA 2.3.3 Animation from interactions + `prefers-reduced-motion`.
- 2.4.1 **Bypass blocks (skip link)**, 2.4.2 Page titled (jedinstven `<title>` po ruti, `react-helmet-async` je dostupan), 2.4.3 Focus order, 2.4.4 Link purpose, 2.4.5 Multiple ways (nav + pretraga/breadcrumb gdje ima smisla), 2.4.6 Headings and labels, 2.4.7 Focus visible.
- **2.4.11 Focus Not Obscured (Minimum) – NOVO u 2.2:** sticky header (`sticky top-0 z-20`), sticky kolone/trake, toast-ovi i drawer-i ne smiju prekrivati fokusirani element → `scroll-padding-top/bottom`, `scroll-margin`, provjera u svim sticky kontekstima uključujući kalendar. AAA 2.4.12, **2.4.13 Focus Appearance** → primijeni (jasan 2px+ prsten, 3:1, konzistentno kroz `--ring`/`brand-*-ring`).
- 2.5.1 Pointer gestures, 2.5.2 Pointer cancellation, 2.5.3 Label in name (vidljiv tekst je dio pristupačnog imena), 2.5.4 Motion actuation.
- **2.5.7 Dragging Movements – NOVO:** svako povlačenje (drag&drop u kalendaru `react-big-calendar`, reorder, before/after slider, sortiranje, upload zona) mora imati **jednokursorsku/tastatursku alternativu** (dugmad, input, meni).
- **2.5.8 Target Size (Minimum) – NOVO:** interaktivne mete ≥ 24×24 CSS px (ili dozvoljen razmak/izuzetak); gdje je izvodivo AAA 2.5.5 (44×44), posebno na mobilnim/tablet viewportima i u gustim tabelama (ikone-akcije u redovima).

**Understandable**
- 3.1.1 Language of page (`<html lang>` prati i18n prebacivanje BS/EN), 3.1.2 Language of parts (dinamički sadržaj na drugom jeziku gdje je poznato).
- 3.2.1 On focus, 3.2.2 On input, 3.2.3 Consistent navigation, 3.2.4 Consistent identification.
- **3.2.6 Consistent Help – NOVO:** ako dashboard nudi pomoć/kontakt/podršku, na istom relativnom mjestu na svim ekranima (u shell-u).
- 3.3.1 Error identification, 3.3.2 Labels or instructions, 3.3.3 Error suggestion, 3.3.4 Error prevention (legal/financial/data) – **kritično za finansije, brisanja, role, deaktivacije**: potvrda/mogućnost povrata/pregled prije slanja.
- **3.3.7 Redundant Entry – NOVO:** ne tražiti ponovni unos istih podataka u istom toku (npr. višekoračne forme, klijent/usluga u formama).
- **3.3.8 Accessible Authentication (Minimum) – NOVO:** `ForceChangePassword`, onboarding verifikacija emaila (OTP): dozvoli paste i password manager (`autocomplete`, bez blokiranja paste), bez kognitivnih testova; OTP komponenta (`components/ui/otp-input.tsx`) mora podržati paste cijelog koda i `autocomplete="one-time-code"`. AAA 3.3.9.

**Robust**
- 4.1.2 Name, role, value (Radix primitivi + custom widgeti: tabovi, combobox/client picker, kalendar, switch, accordion – ispravni ARIA obrasci), **4.1.3 Status messages**: toast-ovi (`sonner`), rezultati filtera/pretrage, brojači, učitavanje/greške → `role="status"` / `aria-live="polite"` (greške `role="alert"`), bez otimanja fokusa.

### 5.2 Prelazni (cross-cutting) zahtjevi
- **Tastatura end-to-end** za svaki tok (CRUD, filteri, dijalozi, kalendar, upload, izvoz).
- **Fokus management:** otvaranje dijaloga → fokus unutra; zatvaranje → vraća na okidač; nakon brisanja reda → fokus na smislen sljedeći element; nakon route promjene → fokus/announce na `h1`.
- **Forme:** vidljive `label`, `aria-describedby` za pomoć/greške, `aria-invalid`, `required` sa vizuelnom i programskom oznakom, sažetak grešaka sa linkovima na polja gdje je forma duga.
- **Grafikoni (recharts):** tekstualni sažetak + tabela podataka kao alternativa, ne samo boja, pristupačne legende, tooltip dostupan tastaturom.
- **Kalendar (react-big-calendar / `ReservationScheduler`):** pristupačna alternativa prikazu (lista termina), tastaturna navigacija, jasne oznake statusa (tekst/ikona), 2.5.7 alternativa za premještanje.
- **Tabele:** sortiranje (`aria-sort`, dugme u `th`), paginacija (`nav` + `aria-current`), selekcija, akcije po redu sa jedinstvenim pristupačnim imenom („Obriši – {ime}“, ne samo „Obriši“).
- **Brojevi/valuta/datumi:** čitljivi čitaču (puni format u `aria-label`/`<time datetime>` gdje je skraćeno).
- **Forced colors / high contrast:** ne oslanjati se na pozadinske boje za granice/stanja; `forced-colors` provjera.
- **Zoom/reflow** 200% i 400%, **text spacing** override bez gubitka sadržaja.

### 5.3 Verifikacija
Ne postoji u repou rendered a11y test (A11Y-01 je „otvoren do rendered/browser/device/manual acceptance“). U planu predloži (uz moje odobrenje) minimalni pristupačnosni test-harness: npr. `@axe-core/playwright` smoke po ruti i/ili `eslint-plugin-jsx-a11y` (napomena iz audita: ESLint izvršni fajl nije dostupan u trenutnoj instalaciji – ustanovi i prijavi). Do tada nastavi pisati **source-contract testove** istim stilom kao postojeći (`*-accessibility.test.mjs`, `node --test`), registrovane u `package.json` (`test:<slug>`) i CI (`.github/workflows/ci.yml`). Za ono što se ne može automatizovati napravi **ručnu checklistu** (tastatura, zoom, screen-reader prolaz NVDA/VoiceOver) u `CHECKLIST.md` i jasno označi šta je odrađeno a šta čeka ručnu provjeru.

---

# ETAPA A – PLAN (bez izmjene produkcijskog koda)

Cilj etape: proizvesti **odobriv plan** u `.cursor/plans/dashboard-redesign/`. U ovoj etapi smiješ samo čitati kod i kreirati dokumentaciju. Zaustavi se na kraju i čekaj moje odobrenje.

### A1. Audit trenutnog stanja (činjenice, ne pretpostavke)
Za sve ekrane u obimu napravi **inventar** (`01_phase-audit.md` ili prilog u `00_overview.md`):
1. Mapa ruta → page → feature folderi → uloge/guardovi → dijeljene komponente.
2. Veličina fajlova i prekoračenja pravila 100–150 linija.
3. Upotreba sirovih `slate-*`/hex boja vs tokeni; upotreba `dark:`; **da li se `dark` klasa uopšte primjenjuje i gdje se tema prebacuje** (u kodu nisam našao očigledan ThemeProvider – potvrdi; ako tema ne može da se uključi, **ne uvodi tema-prekidač kao novi feature bez mog odobrenja**, nego predloži opcije).
4. Duplirani obrasci (tabele, filteri, dijalozi, stat kartice, empty/error stanja, `window.confirm`).
5. A11Y gap analiza po WCAG 2.2 kriterijima (pregled koda + postojećih `*-accessibility.test.mjs` – šta već pokrivaju, šta ne).
6. Upotreba dijeljenih komponenti na javnom sajtu (da se zna šta je „zaštićeno“).
7. Zavisnosti/ograničenja: bundle budget (`scripts/check-bundle-budget.mjs`; poznato upozorenje o velikom main chunk-u), i18n parity, postojeći testovi koje bi redizajn mogao dirnuti.

### A2. Dizajn sistem (dokument `02_design-system.md`)
- Semantički tokeni (boje, razmaci, radijusi, sjene, tipografska skala, z-index, motion) mapirani na postojeću paletu; tabela kontrasta (par, omjer, prolaz) za light i dark.
- Katalog komponenti (stanja, varijante, a11y ugovor, ARIA obrazac, tastatura) – šta se **koristi iz postojećeg**, šta se **proširuje**, šta je **novo**.
- Shell specifikacija: landmark-i, skip link, header, navigacija (desktop sidebar/mobile drawer), korisnički meni, language switcher, consistent help (3.2.6), titulacija stranica, focus-on-navigate.
- Predlog nove informacione arhitekture navigacije + **mapa objedinjavanja** (stari URL → novi) sa rizicima.

### A3. Redoslijed modula i plan po modulu
Modul po modulu (ne sve odjednom), svaki sa istom šablonom. **Predloženi redoslijed (možeš obrazložiti izmjenu):**

| # | Modul | Napomena |
|---|---|---|
| 0 | **Temelj**: tokeni, a11y infrastruktura, shell (AdminLayout + StylistLayout), osnovni primitivi, `ConfirmDialog`, page templates | Najveći uticaj; dijeljene komponente – pažnja na javni sajt |
| 1 | **Dashboard (home)** | Mali, idealan **pilot**; `dashboard-count-contract` test |
| 2 | **Reservations** (lista + fullscreen kalendar + drawer-i) | Drag&drop → 2.5.7; socket refresh |
| 3 | **Daily log** | Matrica `daily-log`; iznosi/dugovi |
| 4 | **Finance** (KIF/KUF, knjige, katalog, dužnici) | Najrizičniji (novac) – maksimalni parity oprez |
| 5 | **Loyalty** | |
| 6 | **Analitika** (Analytics + Client + Stylist) | Grafikoni; moguće objedinjavanje |
| 7 | **Users** | 1.5k linija; role, deaktivacija, privremene lozinke |
| 8 | **Salon / Services / Stylists** (+ ServiceWorkGallery) | |
| 9 | **Sadržaj**: Blog, Gallery, Reviews | |
| 10 | **Postavke**: Settings(+Operations/Appearance/SEO), EmailSettings, Notifications, AppReleases | EmailSettings 1.4k linija; vizuelni editor |
| 11 | **Stylist portal** (inbox, workbook, schedule, debts, stats, direct booking, detalj) | |
| 12 | **Onboarding/ForceChangePassword** (+ Profile ako je u obimu) | 3.3.8 |
| 13 | **Zaključak**: globalni a11y prolaz, dead-code sweep, ažuriranje docs | |

Za **svaki modul** plan sadrži (`01_phase-<n>-<modul>.md`):
1. **Inventar funkcionalnosti** – svaka kontrola, akcija, filter, sortiranje, stanje, uloga, API poziv, socket event, i18n ključevi (ovo je **paritetni ugovor** koji se ne smije narušiti).
2. **Inventar podataka** – svaka prikazana vrijednost i njen izvor/formatiranje (za dokaz „tačnost ista“).
3. **Dizajn izmjene** – šta se vizuelno/strukturno mijenja, koje šablone koristi, šta se objedinjuje.
4. **Razbijanje fajlova** – ciljna struktura foldera/fajlova.
5. **WCAG stavke specifične za modul** (iz matrice).
6. **Rizici** i kako se izbjegavaju (posebno regresije poslovne logike).
7. **Testovi:** koji postojeći moraju ostati zeleni, koje novo dodajemo.
8. **Definition of Done** modula (§6).
9. Procjena obima (broj fajlova, redoslijed commit-ova).

### A4. Obavezni izlazi etape A
- `.cursor/plans/dashboard-redesign/` → `00_overview.md`, `01_phase-*.md` (audit, design system, temelj, po jedna faza po modulu), `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`
- `.cursor/docs/matrices/dashboard-a11y/MATRIX.md` (WCAG 2.2 matrica) + `CHANGELOG.md`
- Lista **otvorenih pitanja** za mene (npr. tema/dark prekidač, Profile/Login u obimu, objedinjavanja, nove dev zavisnosti, AAA odluke)
- Lista **rizika** i **pretpostavki** (označeno šta je potvrđeno kodom, a šta pretpostavka)

**STOP.** Ne počinji ETAPU B dok ne dobiješ eksplicitno „plan odobren“ (uz moje odgovore na otvorena pitanja).

---

# ETAPA B – IMPLEMENTACIJA (nakon odobrenja)

### B1. Radni ciklus za SVAKI modul (isti redoslijed, bez preskakanja)
1. **Zamrzni paritet:** pokreni baseline (`npm run build`, relevantni `node --test` skripte, `check_i18n.py`, `check_ui_contrast.py`, `check_repo_hygiene.py`, `check_doc_links.py`). Zabilježi rezultat. Ažuriraj `MATRIX.md` modula (inventar funkcija/podataka iz plana).
2. **Napiši/ažuriraj testove prvo** gdje je moguće: kontrakt testovi koji štite paritet (API pozivi/parametri, formatiranje, statusi, i18n ključevi) i a11y source-contract testovi za nove obrasce.
3. **Implementiraj** po šablonima iz dizajn sistema; razbij velike fajlove; ukloni mrtav kod; koristi tokene umjesto sirovih boja.
4. **Pristupačnost modula:** prođi kroz modulsku WCAG listu (§5), uključujući tastaturu, fokus management, live regione, ciljeve dodira, 2.4.11, 2.5.7, 3.3.7, 3.3.8 gdje je primjenjivo.
5. **Verifikuj:** `npm run build` (uključuje `tsc -b`, prebuild testove, bundle budget), sve relevantne test skripte, locale parity (strict), contrast (strict), hygiene, doc links, `git diff --check`. Ako je moguće – browser/axe prolaz; ako nije – to jasno napiši.
6. **Dokaz pariteta podataka:** u `CHANGELOG.md` modula navedi kako je potvrđeno da su vrijednosti, filteri, sortiranje i ukupni zbirovi isti (test, uporedni prikaz, ručna provjera – šta je od toga zaista urađeno).
7. **Provjera javnog sajta:** ako je diran dijeljeni fajl – navedi grep upotreba i dokaz da javni sajt nije promijenjen.
8. **Dokumentacija:** `MATRIX.md` + `CHANGELOG.md` modula, `CHECKLIST.md`, WCAG matrica (statusi kriterija za modul), kratki `HANDOFF.md` zapis.
9. **Commit granica:** jedan modul = jedan ili više malih, pregledljivih commit-ova (npr. `a11y/ui(dashboard): …`), bez miješanja modula.

### B2. Kapije (gates)
- **Nakon Temelja (modul 0) i Pilota (modul 1: Dashboard) – ZAUSTAVI SE i traži moj pregled** prije nastavka. Priloži: šta je urađeno, screenshot-ove ili opis ako možeš, status testova, WCAG status, otvorena pitanja.
- Poslije toga prelaziš na sljedeći modul **tek kad prethodni ispuni Definition of Done**. Ako modul ne može ispuniti DoD (npr. ne možeš nešto verifikovati), označi to u izvještaju i nastavi samo ako je jasno da to nije blokirajuće; u suprotnom pitaj.
- Ako naiđeš na **bug u postojećoj logici** (npr. netačan zbir, pogrešan status): **ne popravljaj tiho u okviru redizajna**. Zabilježi u `HANDOFF.md`/`FINDINGS` kao zaseban nalaz sa dokazom i pitaj da li se rješava odvojeno – cilj je paritet.
- Ako redizajn zahtijeva izmjenu **backend-a ili API ugovora** – STOP i pitaj.

### B3. Izvještaj na kraju svakog modula (kratak, strukturisan)
1. Šta je urađeno (fajlovi, objedinjeno, obrisano)
2. Paritet: dokaz da su funkcije i podaci isti
3. WCAG 2.2: tabela kriterija modula sa statusom (✅/🟡/❌/➖) i načinom provjere
4. Izmjene boja/tokena (ako ih je bilo): staro → novo, omjer kontrasta
5. Testovi: šta je pokrenuto i rezultat; šta nije i zašto
6. Rizici/otvorena pitanja; sljedeći korak

---

## 6. DEFINITION OF DONE (po modulu)

- [ ] Sve funkcionalnosti iz inventara rade identično (paritetni ugovor ispunjen); nijedna ruta nije pokvarena (stari URL-ovi redirectuju)
- [ ] Prikazani podaci/iznosi/formatiranje identični; finansijska i rezervaciona logika netaknuta
- [ ] Koristi semantičke tokene i zajedničke obrasce; nema sirovih boja/hex-ova/`slate-*` van tokena (osim opravdanih izuzetaka)
- [ ] Fajlovi razbijeni na ~100–150 linija; mrtav kod obrisan; nema duplih obrazaca
- [ ] `window.confirm` zamijenjen `ConfirmDialog`-om; svi dijalozi imaju fokus trap, povrat fokusa, `Esc`, pristupačan naslov/opis
- [ ] WCAG 2.2 A + AA zadovoljeno za modul (matrica ažurirana, svaki status obrazložen); AAA stavke primijenjene ili obrazložene
- [ ] Tastatura: kompletan tok bez miša; vidljiv fokus (2.4.7/2.4.13), neprekriven (2.4.11); ciljevi ≥ 24px (2.5.8); alternativa za povlačenje (2.5.7)
- [ ] Statusne poruke najavljene (4.1.3); greške identifikovane i objašnjene (3.3.1–3.3.4)
- [ ] Reflow 320px / zoom 200–400% / text spacing bez gubitka sadržaja i funkcije
- [ ] `prefers-reduced-motion` poštovan; boja nije jedini nosilac informacije
- [ ] i18n: nema hard-coded stringova; BS/EN parity strogo zelen
- [ ] `npm run build` prolazi (uključujući prebuild testove i bundle budget – bez pogoršanja main chunk-a bez obrazloženja); svi postojeći i novi testovi zeleni; contrast/hygiene/doc-links zeleni
- [ ] Javni sajt i mobilna aplikacija nepromijenjeni (dokaz za svaku diranu dijeljenu komponentu)
- [ ] `MATRIX.md`, `CHANGELOG.md`, `CHECKLIST.md`, `HANDOFF.md` ažurirani; novi test skriptovi registrovani u `package.json` i CI

## 7. ZAVRŠNA FAZA (modul 13)

- Globalni a11y prolaz kroz sve rute (tastatura, zoom, kontrast, landmark/heading struktura, titulacija stranica, live regioni, forced-colors)
- Dead-code sweep i provjera nekorištenih komponenti/tokena/ključeva prevoda
- Konačna WCAG 2.2 matrica sa statusima i **iskrenom listom onoga što nije verifikovano u renderu/čitaču ekrana**
- Ažuriranje `docs/audit/FINDINGS.md` (A11Y-01 – status i ostatak), `docs/audit/HANDOFF.md`, `docs/codebase-map/FRONTEND.md`, `SOURCE_OF_TRUTH.md` (kratko, bez preuveličavanja)
- Izvještaj: šta je objedinjeno, mapa starih → novih ruta, poznata ograničenja, preporuke za naredne korake

---

## 8. KAKO ZAPOČETI

Pokreni **ETAPU A**: pročitaj dokumente iz §0, uradi audit (A1), napiši dizajn sistem (A2), plan po modulima (A3) i izlaze (A4). Na kraju daj sažetak (do ~30 linija) sa: ključnim nalazima, predloženim objedinjavanjima, otvorenim pitanjima i rizicima – pa čekaj moje odobrenje. **Ne piši produkcijski kod u ETAPI A.**
