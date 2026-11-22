# HANDOFF — Aurum web refaktor

> **Najnoviji M1/M3 nastavak:** finance filteri/sortiranje i različita imena ručnih prihoda; 96/96 novih fiksura, raniji finance regresijski run 180/180, te 6 scoped axe skenova. CI `e596747` je **4/5, 2349/3/0**, tri dnevnička slučaja, puni log EOF; dijagnostika i čekanje mjerenja dodani, novi CI potreban. M1/M3 ostaju otvoreni; detalji u `17_m1_m3_izvjestaj.md`, neizvršeni ručni protokol u `18_m1_m3_manualni_protokol.md`.

> **Najnoviji M1/M3 nastavak:** filteri dnevne knjige, odgođeni odgovori i retry; reproducirana i popravljena dva problema sa zastarjelim odgovorima i gubitak fokusa. Lokalno 100/100 plus dodatnih 12/12, 216 prethodnih dnevničkih slučajeva prošlo u široj regresiji. CI `da8062b` 5/5, rendered 2240/0/0 uz 15 nepotpunih axe uzoraka; CI novog paketa čeka potvrdu. M1/M3 nisu završeni. Stvarni pregled prema `18_m1_m3_manualni_protokol.md` nije izvršen; detalji u `17_m1_m3_izvjestaj.md`.

> **Najnoviji M1/M3 nastavak:** reset dijaloga vraćanja dnevne knjige i tastaturno uređivanje/vraćanje: 60 novih sintetičkih slučajeva, matrica s ranijim testovima 192/192 i buduće rezervacije zasebno 24/24. CI novog paketa na čekanju; M1/M3 i M4–M7 ostaju otvoreni. Ograničenja u `17_m1_m3_izvjestaj.md`.

> **M1/M3 nastavak:** fiksni i zajednički prilozi rashoda, 96 novih sintetičkih slučajeva; završno sa ranijim stavkama 132/132, prethodno s finance regresijama 216/216. CI koda na čekanju; M1/M3 i M4–M7 ostaju otvoreni. Detalji u `17_m1_m3_izvjestaj.md`.

> **Najnoviji nastavak:** rashodi, uklanjanje stavke/priloga i fokus; lokalno 36 novih fiksura, s ranijim finance regresijama 120/120. Upisi/upload su simulirani, CI `3dcca32` [44970652335](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44970652335) 5/5, rendered 2084/0/0; M1/M3 i M4–M7 ostaju otvoreni. Detalji u `17_m1_m3_izvjestaj.md`.

> **Najnoviji M1/M3 paket:** dnevna knjiga: 156 sintetičkih keyboard/focus slučajeva i 12 kalendarskih skip slučajeva, završni lokalni run 168/168; detalji i ograničenja u `17_m1_m3_izvjestaj.md`. CI `d02dd08` 4/5, 1891/1/0; novi CI paketa treba provjeriti. M1/M3 i M4–M7 nisu zatvoreni.

> **M1/M3 nastavak:** novi kalendarski i finance keyboard/focus paket lokalno 231/231, uz ciljane regresije; CI `84c0d80` [44962531926](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44962531926) je 5/5, rendered 1892/0/0; prethodni CI `20a2318` pao je na tri indikatorska testa, potom lokalno stabilizovana mjerenja 135/135. M1/M3 su i dalje otvoreni za preostale tokove i stvarni ručni pregled; opseg i granice u `17_m1_m3_izvjestaj.md`.

> **M1/M3 u toku:** početni paket lokalno 144/144 novih fiksura, 60/60 klijentskih i 14/14 ciljnih stylist regresija; popravljeni izbor fotografija tastaturom, povrat fokusa i ugniježđene navigacijske kontrole. CI koda `a8e2e74` 5/5, rendered 1661/0/0; M1/M3 nisu zatvoreni. Cjeloviti radni opseg, rezultati, ograničenja i sljedeći koraci su u `17_m1_m3_izvjestaj.md`.

> **M2 završen prema korisnikovoj potvrdi i automatizovanim fiksurama:** korisnik je prijavio Brave i Edge na Windowsu, sve rute, uloge, jezike i teme, bez preklapanja, odsijecanja i nedostupnih kontrola; izričito je potvrdio 200%/400% browser zoom, text-spacing override i verziju `718fbe0`. Viewport, verzije browsera i pojedinačna stanja nisu specificirani. [CI 44940081950](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44940081950) za `718fbe0` **5/5, rendered 1505/0/0**. Izvještaj nije nezavisni audit niti dokaz screen readera, OS forced-colors, svih interaktivnih stanja ili stvarnih transakcija. Detalji: `15_rucni-pregled.md`. Stariji statusi ispod su historijski.

> **M2 fokus ispod javnog headera:** lokalno je reproducirano prekrivanje prethodnog dugmeta pri `Shift+Tab` nakon skrola u fiksuri s dvije usluge. Aurum javni shell sada koristi izmjerenu visinu sticky zaglavlja za browserov scroll-padding; pri visokom statičkom headeru offset je nula, a pri izlasku iz shella se uklanja. Lokalno 200/200 ciljanih booking i lifecycle testova, uključujući Classic; CI je potvrđen u bloku iznad. To ne dokazuje sve skrol pozicije. Detalji u `16_ciljani-vizuelni-pregled.md`.

> **M2 širi booking paket:** `70b6c37` / [CI 44935528819](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44935528819) **5/5, rendered 1503 passed / 0 failed / 0 skipped**, uključujući provjeru da gostujuća `/rezervacija` završava na `/login`. Lokalno ponovo 72/72 multi-service kombinacija, s osam dodatnih axe skenova dvije odabrane usluge i sažetka na 320px + spacing (BS/EN, Aurum light/dark): bez prijavljenih violations ili incomplete u obuhvaćenom booking sadržaju. To su fiksure, ne puni axe pregled stranice ili stvarne rezervacije; CI za dodatne skenove još slijedi. Sticky header pri nekim pozicijama pokriva dio sadržaja, potrebno ručno testiranje. Detalji i ograničenja u `16_ciljani-vizuelni-pregled.md`.

> **M2 dalji parcijalni pregled:** tri preostala selektora analitičke legende pregledana su lokalno u podrazumijevanom Aurum light i u Classic light (17,55:1 / 20,01:1); CI tema nije zabilježena. Dva uzorka pod `/rezervacija` ostaju nerazriješena u CI kontekstu; to nije pregled cijelog booking toka ni svih čvorova. [CI hero testa 44929350606](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44929350606) 5/5, rendered 1431/0/0. Ograničenja i dokazi: `16_ciljani-vizuelni-pregled.md`.

> **M2 novi lokalni hero pregled:** `/blog`, `/galerija`, `/kontakt`, šest ranije nepotpunih uzoraka na BS Aurum light/dark fiksuri; 12/12 lokalnih BS/EN testova na crnoj/bijeloj podlozi. Ostaje pet prethodno zabilježenih uzoraka i širi ručni/AT pregled. CI ovog testa tek slijedi; auth [CI 44927850035](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44927850035) je 5/5, rendered 1419/0/0. Detalji i snimci u `16_ciljani-vizuelni-pregled.md`.

> **M2 lokalni napredak, CI nepotvrđen:** klijentska lista `cb8d7db` lokalno 60/60; [CI 44925142490](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44925142490) potvrđen 5/5, rendered 1403 passed / 0 failed / 0 skipped. Zatim auth banner: 16 lokalnih fiksura kontrasta i reflowa, tamna podloga za podesivi tekst u Aurumu; četiri uzorka login/register lokalno pregledana, 11 od ranijih 21 ostaje, uključujući dva `/rezervacija` dok se ne potvrdi CI cilj. Detalji i ograničenja u `16_ciljani-vizuelni-pregled.md` i `CHANGELOG.md`; ne proglašavati M2 gotovim.

> **Najnoviji M2 dokaz:** `2c98530` / CI `44920510427` **5/5, rendered 1343 prošlo / 0 palo / 0 preskočeno**. 48 fiksurnih token-proposal stanja (BS/EN, oba Aurum režima, 320 CSS px/200% root/text-spacing), uključujući nepotpun odgovor, retry i gost/prijavljeni prikaz; 320px + spacing i automatizovani Tab/Enter uz forced-colors emulaciju. Ispravljen razlomljeni tekst oznaka. Vizuelno su pregledani ciljani statični snimci i šest uzoraka legende analitike; ostali nepotpuni kontrastni uzorci i širi stvarni ručni/AT pregled ostaju otvoreni. Fiksure ne dokazuju stvarne transakcije. Detalji: `.cursor/plans/aurum-web-refactor/16_ciljani-vizuelni-pregled.md`.

> **Najnoviji M2 dokaz:** `28b819c` / [CI 44832762454](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44832762454) **5/5; rendered 1295 prošlo / 0 palo / 0 preskočeno**. Dodatnih 48 fiksurnih kombinacija klijentskog detalja završene rezervacije: sažetak stavki i iznosa, nedostupna uplata, 503 + tastaturni retry i 403 bez otkrivanja poruke. BS/EN × Aurum light/dark × 320 CSS px/simulirani 200% root/text-spacing. Mutacije su blokirane; fiksure ne dokazuju stvarne transakcije. Ručni text-spacing i širi pristupni pregled ostaju otvoreni. Prethodni dokumentacijski CI `44827817777` je također potvrđeno zelen.

> **Najnoviji M2 paket:** `99240d0` / CI `44825519292` **5/5, rendered 1247 prošlo / 0 palo / 0 preskočeno**. 48 dodatnih fiksurnih kombinacija: popunjena knjiga prihoda i edit dijalog bez spremanja; direktna stylist rezervacija s odabirom klijenta/usluge ili nedostajućim spolom, bez slanja. BS/EN, Aurum light/dark, 320 CSS px / simulirani 200% root / text-spacing. Ispravljen overflow knjige na 320px; automatizacija nije ručni pregled ni dokaz stvarne finansijske transakcije. Ručni protokol je dopunjen, ali ručni text-spacing i širi pristupni pregled ostaju otvoreni.

> **Novi M2 paket:** `f5dd479` / CI `44797026431` **5/5, rendered 1199/1199**. Dodatno 72 fiksurna slučaja za popunjena admin/stylist dugovanja i statistiku te neuspješan booking i retry; Aurum visoki javni header prelazi u normalni tok da ne prekrije kontrole. Detalji, ograničenja i preostali rad u `CHANGELOG.md`.

> **Novi M2 paket:** `794f0b9` / CI `44760046621` **5/5, rendered 1127/1127**. Potvrđeno 96 fiksurnih kombinacija za admin blog komentar/galeriju/recenziju s potvrdama, parametrizirani stylist preview/confirm/retry i token otkazivanje/retry u BS/EN, oba Aurum režima, 320 CSS px i simuliranom 200% root tekstu/text-spacingu. Korisnik je prijavio da je stvarni browser prošao, bez specifikacije browsera, tema ili obima; to ne zatvara sve M2 slučajeve ni ručni text-spacing. Detalji i preostali rad: `CHANGELOG.md`.

> **Naknadna korisnička potvrda:** korisnik je rekao „Stvarni browser prošao.“ Browser, režim, zum, obuhvaćene rute i text-spacing nisu specificirani; ne proširivati ovu potvrdu na sve M2 slučajeve niti tvrditi da je text-spacing ručno provjeren.

## Najnoviji M2 dokaz — CI `44740804314`

`fb34344` / [CI 44740804314](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44740804314): **5/5; rendered 1031 prošlo, 0 palo, 0 preskočeno**. Fiksurno su potvrđeni popunjena knjiga rashoda i edit dijalog, stylist inbox/odbijanje/no-show/pomjeranje (60 slučajeva), booking i token stanja (108, prethodni CI `44731561761`), te analitika i postavke; opseg i raniji nalazi su u `CHANGELOG.md`. Mjere su 320 CSS px, simulirani 200% root tekst i text-spacing; nisu stvarni browser zoom ni dokaz svih podataka i stanja. Knjiga ima imenovanu, tastaturom skrolabilnu regiju. Axe kontrast na 66 ruta: 57 prošlo, 9 incomplete, 0 violations; nepotpune nalaze treba ručno pregledati.

**Otvoreno:** ostali admin paneli/dijalozi i booking/stylist/token stanja, stvarni zoom i ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, vizuelni pregled i reduced-motion. Korisnik je ranije prijavio 200%/400% prolaz prioritetnih ruta bez specifikacije browsera/teme; to ne zatvara cijeli M2. S8 razbijanje velikih fajlova nije odobreno; nema merge/deploy. Stariji statusi ispod su historijski i ne nadjačavaju ovaj blok.


> ⚠️ **SUPERSEDED kao radna predaja (2026-11-19).** Ovaj dokument je arhiva perioda kickoff → S5 na grani `arena/71be6ba3-beauty-salon-v2` (2026-11-11, bazni commit `a82020e`). Sve ispod ovog bloka NE opisuje trenutno stanje i NE smije se koristiti kao uputa. Važeće stanje i preostali rad: blok **„Ažurirani status“**. Evidencija po fazama (commit + CI run) = `CHANGELOG.md`; tokeni = NEJRA §10 + `scripts/check_ui_contrast.py`.


## Najnoviji status — nakon CI `44567932983`

Ovaj blok ima prednost nad starijim „Ažurirani status“ i arhivom ispod: light admin axe je urađen; O4 potvrde imaju interaktivne fiksure za svih 13 tokova (`5407b13`, CI `44579698293` 5/5); nekorišteni `aurum-stat-grid.tsx` uklonjen (`d603042`, CI `44563869689` 5/5). M2: 15 admin ruta × Aurum light/dark na 320 CSS px prošlo, nakon popravki postavki i kalendara (`7081698`, CI `44567932983` 5/5, suite 493/493). To ne dokazuje stvarni zoom, sve dijaloge i sadržaj; ručni M1/M2/M4/M5 ostaju otvoreni. Aktuelne matrice su u `.cursor/docs/matrices/aurum-theme/` i `aurum-route-coverage/`; njihovi stari dijelovi su arhiva. Root font je globalno `106.25%` (17px uz browser default 16px); Chromium provjera browser defaulta 16/20px prošla (`caeebc4` / `44585484397` 5/5). Vizuelni pregled i ručne provjere ostaju otvoreni. S8 razbijanje velikih fajlova nije odobreno ovim radom.

## Ažurirani status (2026-11-19)

**Grana:** `arena/dadb4053-beauty-salon-v2` (iz master `c5267fa`) · **Zadnji push:** `b1206f3` (close-out, samo changelog) — CI `44525141061` **5/5 success**. `PublicFeatureGate` netaknut bez posebne vlasničke odluke; paleta zaključana (NEJRA §10 je izvor istine); Classic se ne uklanja i ne dira bez odluke.

Šta se suštinski dogodilo nakon S5 (evidencija u `CHANGELOG.md`, §15–§30 i faze C–F):

1. **2026-11-16/17 — revidirani smjer:** vlasnik odobrava koncept novog identiteta (`docs/design/aurum-novi-identitet-koncept.html`) i temelj `approve_foundation` (§15): administrator bira aktivni identitet i početni režim za cijeli web (`whole_web` + `admin_skin_and_mode`), posjetilac pamti samo light/dark (`persist_mode`), zadano **Aurum + light** (`aurum_initial`), klasični identitet skriva javni prekidač (`hide_when_classic`); minimalne backend izmjene bez migracije (`allow_minimal_backend`); `/mobile` izvan opsega; Classic ostaje dok tranzicija traje; S6 lokalni WIP sačuvan, ne commitovan. **`13_revidirani-plan-novi-identitet.md` je ostao označen „PRIJEDLOG“ u svom zaglavlju** — naslijeđena historijska oznaka; stvarna odluka je `approve_foundation` iz §15.
2. **Identity re-skin i čišćenje kroz Faze C, D, E, F** — admin shell/nav/dashboard (§16, §30), javni portal redoslijedom (§17–§29), tokenizacija, WCAG 2.5.3/1.4.3/1.4.6, dark Aurum kontrast, hardcoded-hex migracija. Svaki batch je zasebno praćen CI-jem; svi navedeni close-outovi su **5/5**:
   - Faza D (5/) — mrtvi patch CSS nakon C (16/)/(18/): `44353945386` (`eb84cf8`)
   - Faza E (1/) — admin patch-CSS batch 1: `44382663785` (`c9bbe0f`)
   - Faza E (2/) — dead S2 gold CTA pravilo obrisano: `44392890535` (`bbd74b4`)
   - Faza E (3/) — WCAG 2.5.3 napredak: `44476078583` (`69c2269`) — `2.5.3 label-content-name-mismatch: PROLAZ (32/0)` (prije 10 passed / 22 incomplete; 11 admin ruta × 2 dugmeta)
   - Faza E (4/) — WCAG 1.4.3: 7 incomplete = human-judgment (Recharts legend `.legend-item-*-text` determination-blok); bez izmjena; dokazi u CI `44477995617`
   - Faza E (5/) — WCAG 1.4.6 Aurum light nav-active: `44482691344` (`e8a5ec2`) — `1.4.6 PROLAZ (passed 32, incomplete 0)` (prvi put nula 1.4.6 čvorova)
   - Faza F (1/) — `features/** bg-white` → `bg-surface` (dark Aurum defekt): `44486871989` (`98cf7c4`) — axe 429 passed / 32 rute
   - Faza F (2/) — `settings-module-page.tsx` `#8a624e` → `brand-rose-text` (AAA sva 4 stanja): `44496125943` (`903123c`)
   - Faza F (3/) — javne stranice warm-paper hex → semantički tokeni: `44508482933` (`7ec128e`)
   - Faza F (4/) — dark `--text-muted` #B7A98F → **#BFAF96** (AAA; NEJRA §10 SoT ažuriran kao izvor istine; classic AA netaknut): `44512475492` (`cf7708e`) — contrast strict 144/144
   - Faza F (5/) — Button `destructive` → `danger` (5 pozivača); varijanta obrisana: `44515714897` (`a18cc8a`)
   - Faza F (6/) — orphan komentari u `globals.css` tail (reword `index.css` ref + L1849 komentar): `44518166979` (`895feb1`)
   - Faza F (7/) — Aurum **dark admin** rendered axe sweep (15 `ADMIN_ROUTES`) + 4 AnalyticsHub **child-proof** testa s popunjenim fiksturama (`/admin/analytics?tab=clients|stylists` × light/dark) + Aurum-light accent-text #9B3D4F → **#8A3346** (AAA surface+sunken; §10 sirovi accent netaknut) + CI action majors na Node 24 (`checkout@v5`, `setup-node@v5`, `setup-python@v6`, `upload-artifact@v6`; app `node-version: 22` netaknut): `44523392570` (`a8b3899`) — rendered axe nad **51 izmjerenim stanjem** (prije 32; +19 novih), `1.4.6 PROLAZ 51`; `1.4.3` incomplete 18 = isti Recharts determination-blok, sada izmjeren i na `/admin/analytics (aurum-dark)`; `2.5.3` = 0 incomplete.
   - **Zaključak/close-out:** `b1206f3` / CI `44525141061` — 5/5 (changelog-only).
3. **S6, S7, S8, S9, S10 nikad nisu isporućeni kao zasebni segmenti.** S6 je odobren uz revidirane odluke (§16) i realizovan kroz revidirani identitet i Faze C/D/E/F; S7–S10 pokriveni su tokenizacijom i WCAG batchevima bez pojedinačnih releasea. **S11 (završni prolaz, sync matrica, dokazni paket) NIJE urađen.**
4. **Matrice** `.cursor/docs/matrices/aurum-theme/MATRIX.md` i `aurum-route-coverage/MATRIX.md` imaju zadnje unose iz S5 ere (2026-11-11) i **ne predstavljaju aktuelno stanje**; njihovu evidenciju od Faza C–F drži `CHANGELOG.md`. Sinkronizacija matrica = posebna vlasnička odluka.

**Izmjereno 2026-11-18 (F (7/) close-out):** build **289.6/300 KiB** · `frontend test:*` **205/205 PASS** · i18n **2776/2776** BS/EN · contrast strict **148/148** (classic ostaje AA, Aurum-only AAA parovi) · `check_ci_index.py` PASS (386/389; 3 interaktivna izuzeta) · `check_doc_links.py` PASS · `check_repo_hygiene.py` PASS (1826 putanja) · lint 0 grešaka (6 poznatih `exhaustive-deps` warn-ova, CI-dozvoljeni) · CI Node 22 (app) / Node 24 (action runtimes).

**Rendered a11y (stanje):** classic 32 rute (`a11y-e2e`) ✅ · javni portal oba Aurum režima (theme-policy) ✅ · **Aurum dark 15 admin ruta** ✅ (F (7/)) · **AnalyticsHub child proofs** ✅ (4 zapisa) — **Aurum light admin 🟡 nije mjereno**; **M1 (tastatura), M2 (320 px/400 % zoom) — admin nije mjeren, M4 (čitač ekrana), M5 (`forced-colors`) 🟡/➖**; ručne provjere ostaju obaveza prije javne WCAG tvrdnje.

**Još uvijek otvoreno — isključivo vlasničke odluke (NIJE pokrenuto, NE pokretati samoinicijativno):**

1. **O4** — 13× `window.confirm` u adminu → pristupačni `ConfirmDialog` (Blog ×2, EmailSettings ×2, Gallery ×2, Reviews, Salon, Services ×2, Users ×3 — isti obrazac kao `features/media-consent/media-consent-panel.tsx`).
2. **Aurum light admin** rendered axe sweep (simetrija F (7/) dark dokaza).
3. **M2** — admin 320 px reflow / 400 % zoom (public ima; admin nema; public 320 px je dokazano).
4. **M1 / M4 / M5** — tastaturni e2e, čitač ekrana, `forced-colors`.
5. **Veliki fajlovi (S8):** `pages/Users.tsx` ~1700 ln, `pages/Services.tsx` ~1504 ln, `pages/EmailSettings.tsx` ~1400 ln — razbijanje je zaseban projekat.
6. **Dead code:** `frontend/src/features/dashboard/aurum-stat-grid.tsx` (37 ln, **0 potrošača**) — brisanje čeka odluku.
7. **Sync matrica** aurum-theme + aurum-route-coverage sa stanjem nakon Faze F.
8. **WCAG claim:** ne tvrditi WCAG 2.2 AA/AAA usklađenost izvan izmjerenog (rendered axe + source kontrasta); ručne provjere i light-admin sweep su preduslovi.

**Pravila koja i dalje važe:** **ne brisati Classic** (tranzicija; `keep_palette`) · **ne mijenjati NEJRA paletu** bez STOP odobrenja · **ne dirati `PublicFeatureGate`** · **`/mobile` izvan opsega** · **nikakve nove npm zavisnosti bez odluke** · **testovi se ne brišu niti slabe** (izmjene uz obrazloženje u changelogu) · **nijedan push bez 5/5 CI**.

**Sljedeći korak:** **STOP**. Sve iznad čeka vlasničku odluku. Ne pokretati S6–S11 niti bilo koju otvorenu stavku po vlastitoj procjeni.

---

**Stanje:** ✅ **S0 → S1 → S2 → S3 → S4 → S5 ZAVRŠENI (svaki 5/5).** Plan je odobren (`approve_s0`); vlasnik je odobrio S1, S2, S3 (`approve_s3`), S4 (`approve_s4`) i S5 (`approve_s5` + O2 `card_header`), a na S2 STOP uvjet odabrao `dopuna_ssot`. S5 je realizovan po [06_phase-5-auth-exceptions.md](06_phase-5-auth-exceptions.md).
**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e47c1b21a3c05113e843f853a8e64baaf0` · **S0 commiti:** `fa6d73a` (dizajn) + `bbd7ca5` (CI fallback) + `3ed3069` (konačna evidencija)
**Zeleni runovi S0:** `43043182552` (5/5, rendered axe 252/252) i `43046250037` (5/5, docs-only) · **S1:** `ae87acf` / `43100889990` · **S2:** `d1fb55d` / `43110763869` · **S3 commit:** `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`) · **S3 CI:** `43116167107` = **5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`), artifact `13899570263` · **Datum:** 2026-11-11 · **S4 commit:** `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`) · **S4 CI:** **`43177106881` = 5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`), artifact `13924239127` (331564 B) · **S5 commit:** `90acca2` (`90acca29ec760a48a0dea489c6f004c2d9409780`) · **S5 CI:** **`43181880043` = 5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute (default `classic`), artifact `13926547985` (331785 B) · **Sljedeći korak:** **STOP** → pitanje „Odobravaš li S6 (admin shell + Dashboard + Rezervacije + fullscreen kalendar)?". R2/O2 su riješeni; `PublicFeatureGate` nije diran.

---

## 1. Šta je urađeno

- Pročitan cijeli relevantni repozitorij: `docs/design/`, `docs/refaktor/`, `docs/audit/CI.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md`, `SOURCE_OF_TRUTH.md`, `.cursor/rules/*`, `.cursor/plans/dashboard-redesign/*`, `frontend/src/app/router.tsx` + oba route fajla, `SettingsContext.tsx`, `utils/brand-colors.mjs`, `app/providers.tsx`, `styles/globals.css`, `tailwind.config.js`, `scripts/check_ui_contrast.py`, `frontend/scripts/design-reference.test.mjs`, `.github/workflows/ci.yml`.
- Izmjerena baseline stanja (vidi §5).
- Postavljena **dva kruga pitanja** (Q1–Q6, zatim Q7–Q11); sve nejasnoće razriješene odlukama vlasnika, ništa nije pretpostavljeno.
- Napisan plan: `00_overview.md` + 12 faznih planova + `CHECKLIST.md` + `CHANGELOG.md` + `HANDOFF.md`; kreirane 2 matrice (`aurum-theme`, `aurum-route-coverage`).

**S0 urađeno (2026-11-11):** NEJRA dokument dograđen na 14 sekcija (mapa 58 ruta, 3 stanja tokena, 22/22 uživo izračunata kontrastna para, 11 šablona, ugovor teme, paritet + CI matrica, 12 segmenata); kreirana 2 vizuelna koncepta (`referentni-prijedlog-v2.html` 446 KiB, `-v3.html` 329 KiB) sa po 2 ugrađene AI ilustracije i 19 `.demo` ekrana; novi `test:design-spec` (2 testa + 7 mutacija) + CI korak; privremeni JPEG-ovi nisu u Gitu.

**Nije urađeno u S0:** produkcijski UI kod (`frontend/src`), `backend/`, `mobile/`, PR/merge/deploy. S1 je uveo jedini novi feature (izbornik teme), S2 je refaktorisao javni shell + 3 kataloške stranice; `backend/`, `mobile/` i PR/merge/deploy i dalje nisu dirani.

---

## 2. Donesene odluke (Q1–Q11) i razlozi

| Odluka | Razlog / posljedica |
|---|---|
| NEJRA dokument = **jedini izvor istine**, dograđen u punu specifikaciju | Q1 + Q7; v2/v3 su samo ilustrovani koncepti, ne ugovor |
| v2/v3 se **kreiraju** na ovoj grani | Q5; popravlja jedini baseline FAIL bez kopiranja s tuđe grane |
| **3 stanja teme**, default klasična svijetla | Q2 + Q8; jedini novi feature u cijelom projektu |
| **Aurum fiksira paletu**; runtime override neaktivan u Aurumu | Q9; `SettingsContext.tsx` se gasi za `skin=aurum`, napomena u Postavke → Izgled |
| **Sve web rute**, bez `/mobile` i `/backend` | Q3; 58 deklaracija |
| **Novi plan od nule** (zamjena šablona/tokena) | Q4; stari `.cursor/plans/dashboard-redesign/` ostaje arhiva, ne nastavlja se |
| **Strogi paritet + dopušteno grupisanje navigacije** | Q10; rute/API/podaci/guardovi/i18n/bez novih zavisnosti; `<Navigate replace>` + `?tab=` |
| **Nove AI ilustracije** ugrađene kao base64 JPEG | Q11; privremeni fajlovi se ne commit-aju |
| **Plan → odobrenje → 12 segmenata sa STOP-om** | Q6; svaki segment: commit + push + `gh run watch` do 5/5 + lokalne provjere |

---

## 3. Hijerarhija izvora (da se ne ponovi stara greška)

1. `docs/design/NEJRA – beauty salon · Referentni dokument.html` (nakon S0) — **jedini dizajn ugovor**.
2. Kod — izvor istine za **trenutno ponašanje**; dizajn nije dokaz implementacije (`SOURCE_OF_TRUTH.md`).
3. `docs/refaktor/PROMPT_dashboard_redesign.md` + `dashboard-reference.html` — historijski, **ne obavezuju** (drugačija paleta, javne stranice isključene).
4. `.cursor/plans/dashboard-redesign/` — arhiva; koristi se samo za inventar i dokaze o testovima.
5. Baseline/audit dokumenti — ažuriraju se tek u S11 sa stvarnim stanjem.

---

## 4. Otvorena pitanja / rizici (ne rješavati bez odobrenja)

| # | Pitanje | Gdje se postavlja |
|---|---|---|
| O1 | **R2:** smije li `Aurum tamna` dodijeliti `.dark` klasu (aktivira `dark:` varijante u 85 fajlova) ili samo `data-mode`? | ✅ **RIJEŠENO odlukom `dark_yes` (2026-11-11):** da, `Aurum tamna` dodaje `.dark` + `data-skin="aurum"`; Aurum tokeni moraju imati veću specifičnost. S1 je završen 5/5 (`43100889990`); R2 više nije otvoreno. |
| O2 | Gdje stoji `ThemeSwitcher` na auth/onboarding ekranima bez layouta? | ✅ **RIJEŠENO `card_header` (2026-11-11, uz `approve_s5`):** u **zaglavlje auth kartice**, uz logo i `LanguageSwitcher`, iznad `<h1>`; ne ispod forme. Odluka upisana u `CHANGELOG.md` §12 prije implementacije. |
| O3 | Hoće li se koristiti dopušteno **grupisanje navigacije** (Q10), i gdje `ThemeSwitcher` u fullscreen kalendaru? | STOP-sažetak S5, prije S6 |
| O4 | Smije li se `window.confirm` zamijeniti pristupačnim `ConfirmDialog`om (ista poruka/uvjet/efekat)? | **I dalje OTVORENO za S6–S9.** S4 je po vlastitom DoD-u zamijenio **samo** `media-consent-panel.tsx` (javni tok, `features/media-consent/*`); ostalih ~14 `window.confirm` u admin stranicama nije dirano. Pitanje se postavlja na STOP-sažetku S5/S6. |
| O5 | Ako NEJRA §05 KPI skup / §06 tok odstupa od stvarnog koda → kod je mjerodavan; razlika se bilježi i pita | S6 / S10 |
| O6 | Ako rendered axe u S11 otkrije kontrastni propust u Aurumu → minimalna korekcija samo uz odobrenje (Q9) | S11 |
| R1 | Nema Chromium-a/čitača ekrana u sandboxu → sve rendered tvrdnje 🟡 dok `a11y-e2e` ne bude zelen | cijeli projekt |
| R6 | Baseline CI je crven (1 test) → **nema pusha prije S0** | K0 |

---

## 5. Test status (izmjereno 2026-11-11)

| Provjera | Rezultat |
|---|---|
| `check_repo_hygiene.py` | PASS (1772 putanje) |
| `check_ci_index.py` | PASS (380/383; 3 interaktivna izuzetka; 199 frontend skripti, svaka ima CI korak) |
| `check_doc_links.py` | PASS (685 linkova / 222 fajla) |
| `check_i18n.py --strict` | PASS (BS 2711 / EN 2711) |
| `check_ui_contrast.py --strict` | PASS (80/80) |
| `frontend`: `npm run build` | PASS (276,9 / 300 KiB gzip; `public home` 45,3 · `admin dashboard` 13,3 · `stylist inbox` 17,9 · `analytics` 114,7/140 · `calendar` 99,4/125) |
| `frontend`: svih **199** `test:*` (nakon `test:design-spec`) | **199 PASS / 0 FAIL**; `test:design-reference` 6/6, `test:design-spec` 2/2 |
| `frontend`: `npm run typecheck:e2e` | 0 grešaka |
| `git diff --check HEAD` | čist |
| GitHub Actions `43032814134` (push, `fa6d73a`) | 4/5 ✅; `a11y-e2e` ❌ na koraku 15 `Install Chromium for Playwright` (3 pokušaja) — historijski, vanjski DNS |
| GitHub Actions `43038425689` (`workflow_dispatch`, isti commit) | 4/5 ✅; isti ❌ na koraku 15 — historijski, vanjski DNS |
| **GitHub Actions `43043182552` (push, `bbd7ca5`)** | ✅ **5/5 success**: `repo-checks`, `backend`, `frontend`, `a11y-e2e`, `mobile` |
| Rendered axe u `43043182552` | ✅ **252 passed \| 0 failed \| 0 skipped**, 32 rute; korak 15 i 16 oba ✅; `SKIPPED` zaštita nije aktivirana |
| `test:a11y-routes` lokalno | `SKIPPED` (Chromium nije instaliran u sandboxu) — rendered dokaz dolazi isključivo iz gornjeg CI runa |
| `git status` | svi S0 commiti pushani na `arena/71be6ba3-beauty-salon-v2`; radno stablo čisto |

---

## 6. Next steps (konkretno)

1. ~~Vlasnik odobrava plan (K0b).~~ ✅ `approve_s0`
2. ~~**S0** po `01_phase-0-design-docs.md`.~~ ✅ implementiran lokalno, sve provjere zelene.
3. ~~`commit` + `push` na ovu granu.~~ ✅ `fa6d73a`, pushan.
4. ✅ **5/5 ostvareno** na `43043182552` nakon odobrenog `ci_fallback` u commitu `bbd7ca5`. Prva dva historijska runa ostaju zapisana radi sljedivosti.
5. ✅ **O1/R2 je riješeno** odlukom `dark_yes`. **Sada slijedi STOP**: eksplicitno pitanje „Odobravaš li S1?" — bez odgovora se S1 ne pokreće.
6. Zatim redom S1 → S11, svaki s 5/5 CI i ažurnim `CHECKLIST.md` / `CHANGELOG.md` / ovim `HANDOFF.md` / matricama.
7. S11 predaje dokazni paket i navodi šta ostaje za ručnu provjeru (čitač ekrana, fizički uređaj, stvarni email klijent). Bez PR-a, merge-a i deploya.

---

## 6a. Riješena blokada CI — izmjereni uzrok i dokaz (2026-11-11)

Sva 4 ne-a11y posla zelena su u oba runa. U `a11y-e2e` poslu korak 15 `npx playwright install --with-deps chromium` pokreće `apt-get`, a GitHub Ubuntu 24.04 runner ne može razriješiti `azure.archive.ubuntu.com`:

```
E: Failed to fetch .../fonts-ipafont-gothic_00303-21ubuntu1_all.deb  Temporary failure resolving 'azure.archive.ubuntu.com'
E: Unable to fetch some archives, maybe run apt-get update or try with --fix-missing?
Failed to install browsers
Error: Installation process exited with code: 100
```

Korak 16 `Run rendered a11y (axe) suite` je **skipped**, pa rendered/axe dokaz ne postoji — ovo nije a11y regresija aplikacije, ali ni zelen CI. Većina sistemskih biblioteka (`libnss3`, `libatk*`, `xvfb`, `fonts-liberation`, …) već je instalirana na runneru; `apt` pokušava dohvatiti samo 9 dodatnih font paketa (21,1 MB). Zato je tehnički moguć **CI-only fallback**: prvo `npx playwright install chromium` (bez `--with-deps`), pa tek onda pokušaj `install-deps`, bez diranja axe suite, bez novih npm zavisnosti i bez `continue-on-error`. To je ipak **izmjena `ci.yml` ugovora** i ne radi se bez odobrenja vlasnika („Ne izmišljaš, sve nejasnoće pitaš").

Dodatno: ponovljeni `gh run watch` pozivi su privremeno iscrpili GitHub API rate-limit (reset 14:45 UTC); konačni status runa `43038425689` pročitan je nakon reset-a. `gh run watch` je u jednom navratu vratio `0` dok je posao još bio u toku, pa se **ne koristi** kao dokaz 5/5.

**Odluka vlasnika (2026-11-11, `ci_fallback`):** odobren je CI-only fallback u `ci.yml`: ako `npx playwright install --with-deps chromium` padne na `apt` DNS-u, pokušava se `npx playwright install chromium` (samo browser binary), zatim `node` provjerava da `chromium.executablePath()` stvarno postoji. Axe korak dodatno odbija `SKIPPED` izlaz iz `run-a11y-routes.mjs`, pa nema lažno zelenog `a11y-e2e`. Nema `continue-on-error`, nema novih npm zavisnosti, nema izmjena u `frontend/src`. Istovremeno je odlukom `dark_yes` potvrđeno R2.

**Rezultat (run `43043182552`, commit `bbd7ca5`):** svih **5/5 poslova success**. U `a11y-e2e` su korak 15 `Install Chromium for Playwright` i korak 16 `Run rendered a11y (axe) suite` ✅; job log daje `252 passed | 0 failed | 0 skipped` nad 32 rute, uz axe anotaciju pokrivenosti. Napomena: anotacija `1.4.6 color-contrast-enhanced` (AAA) prikazuje 28 prekršaja, ali to pravilo nije dio asertiranog praga suite-a; **ne tvrdi se WCAG AAA/2.2 potpuna usklađenost**, niti zamjena za čitač ekrana, zoom/reflow i fizički uređaj. S0 time ispunjava „5/5 + STOP".

---

## 7. Pravila ponašanja za nastavak

- **Ne izmišljati.** Svaka nejasnoća → STOP + pitanje, bez „privremenog" rješenja.
- Ako refaktor zatraži backend/API izmjenu → STOP + pitanje.
- Ako se pronađe bug u postojećoj logici → ne popravljati tiho; upisati ovdje i pitati.
- Test se nikad ne briše niti slabi; ažuriranje samo uz obrazloženje u `CHANGELOG.md`.
- Svaka ✅ tvrdnja mora imati dokaz; rendered dokaz dolazi isključivo iz `a11y-e2e`.
- Raditi **samo** na `arena/71be6ba3-beauty-salon-v2`; ne dirati druge grane.

---

## 8. S1 realizacija (2026-11-11) — predaja S2

**Odobrenje:** vlasnik je nakon finalnog S0 STOP-a eksplicitno rekao „Možeš nastaviti, odobravam S1 - Temelj: tokeni + 3-state tema + primitive". Nije traženo novo odobrenje za S1; **S2 je naknadno odobren („Možeš krenuti sa S2") i završen, a S3 je naknadno odobren (`approve_s3`) i završen (5/5 CI `43116167107`)**.

**Jedina nova nejasnoća riješena pitanjem:** plan je tvrdio „30 postojećih kontrastnih parova × 2 = +60", a stvarni `check_ui_contrast.py` ih je imao **26** po stanju (ukupno 80). Vlasnik je odabrao **`use_140_four`**: zadržati 140, dodati 4 para iz NEJRA §10 (`text/page`, `muted/page`, `brand/page`, `accent/page`) po Aurum stanju. Nijedna boja nije izmišljena niti korigovana. Detalji u `02_phase-1-foundation.md` §10.

**Implementirano:** `features/shell/theme/` (čista state mašina + `ThemeProvider`/`useTheme` + `ThemeSwitcher` + 4 nova testa), `features/shell/aurum/ui/` (8 novih primitiva), 2 Aurum CSS bloka s 12 tačnih NEJRA hexova, `fontFamily.serif`, `ThemeProvider` iznad `SettingsProvider`, Q9 guard u `SettingsContext.tsx`, i18n napomena u `SettingsAppearance.tsx`, 6 novih BS/EN ključeva, 4 `test:*` skripte (203 ukupno), 4 nova CI koraka, `check_ui_contrast.py` na 140 parova. Stari `features/shell/admin/ui/*` i dalje rade i brišu se tek u S11.

**Lokalno izmjereno:** 203/203 `test:*`; 4 nova testa 5/5 + 6/6 + 5/5 + 8/8; 5 Python gate-ova PASS (`check_ui_contrast.py --strict` **140/140**, `check_i18n.py --strict` **2717/2717**, `check_ci_index.py` **384/387**, `check_doc_links.py` **687/222**, `check_repo_hygiene.py` **1788 nakon S1 commit-a** (prije 1772)); `npm run build` **279,1 / 300 KiB** (delta **+2,2 KiB** prema S0 276,9 KiB; analytics 114,7/140, calendar 100,0/125); `npm run lint` 0 grešaka; `typecheck:e2e` 0; `git diff --check` čist.

**CI dokaz:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`. `140/140` ostaje source-only; CI log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove, pa se ne tvrdi WCAG 2.2/AAA usklađenost.

**Šta još NIJE dokazano (ostaje 🟡 do S11):** rendered axe nad `aurum-light` / `aurum-dark` (CI axe pokriva samo default `classic`), zoom/reflow 320 px, čitač ekrana, fizički uređaj, `1.4.6` AAA. `test:theme-ssot-sync` i `check_ui_contrast.py` su **source-only** dokazi.

**Za S2 (ostvareno):** `ThemeSwitcher` je bio u sva 3 shella; S2 je konzumirao 6 od 8 S1 primitiva (`FilterBar`, `TableSkeleton`, `EmptyState`, `ErrorState`, `PageHeader`, `StatusBadge`) isključivo u Aurum granama. CI 5/5 je ostvaren; **S3 je pokrenut tek nakon eksplicitnog `approve_s3` vlasnika (bez diranja `PublicFeatureGate`)**.


---

## 9. S2 realizacija (2026-11-11) — predaja S3

**Odobrenje + STOP odluka:** „Možeš krenuti sa S2"; na blokadu „NEJRA §10 nema izračunat `#F5EDE0` na hero gradientu" vlasnik je odabrao **`dopuna_ssot`**. U §10 su upisana 4 omjera iz §07 bez izmjene palete; `test:public-aurum-hero-contrast` + CI korak ih ponavljaju iz `const T`.

**Implementirano:** Aurum-only CSS (155 linija) za filmski hero, serifne naslove, semantičke tokene, `aria-current` + oblik, 44 px mete, rezervisanu visinu async blokova; `publicAurum` mapa; 6 S1 primitiva u Aurum granama `PublicServices`/`PublicServiceDetail`; opcioni `showSubmit` na `FilterBar`. Klasični DOM, API, `queryKey`, stale brojači, retry, feature flagovi, `components/ui/*`, `data/*.mjs` i `package-lock.json` imaju **0 diff**. Nijedan novi vidljivi string → `bs.json`/`en.json` 0 diff.

**Lokalno izmjereno:** **204/204** `test:*` (novi 4/4); 5 Python gate-ova (`check_repo_hygiene` **1789 nakon S2 commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n` **2717/2717**, `check_ui_contrast` **140/140 source-only**); build **279,9/300 KiB** (+0,8 prema S1); `typecheck:e2e` 0; `lint` 0 grešaka / 7 warninga; `git diff --check` čist.

**CI dokaz:** commit `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`), run **`43110763869`** = **5/5 success**; `a11y-e2e` job `130825854913`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `13896851237` (331270 B, SHA256 `b27443d74d6a31b714ebf8d8a7f66958594f9147ee7bb506602d53907a7e56f4`). `140/140` i `test:theme-ssot-sync` su source-only; log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove — bez tvrdnje o WCAG 2.2/AAA usklađenosti.

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA.

**Za S3 (ostvareno):** vlasnik je odabrao `approve_s3`; 5 ruta + dijeljene blog komponente su u Aurum grani, `PublicFeatureGate` (`public_feature_blog/gallery/reviews`) nije diran. **S4 je naknadno odobren (`approve_s4`) i završen (5/5 `43177106881`)**.

---

## 10. S3 realizacija (2026-11-11) — predaja S4

**Odobrenje:** `ask_user s3_approval` → **`approve_s3`**, uz „Ne dirati PublicFeatureGate bez nove odluke". Nije traženo novo odobrenje za S2/S3 ni ponovljen STOP za kontrast.

**Implementirano:** 12 fajlova / +386 −90. 5 stranica + 2 dijeljene blog komponente koriste `isAurum ? <Aurum> : <doslovno klasični markup>`; 164 Aurum-only CSS linije; `EmptyState` (sljedeći korak), `ErrorState` (retry), `PageHeader`, `DialogDescription`, `fieldset/legend`, `aria-describedby`, `aria-label` iz i18n, `aria-busy`, `autoComplete="name"`, `data-aurum-cta="primary"`, ikone uz tekst, `forced-colors`, 44 px mete, `overflow-wrap`. 11 novih BS/EN ključeva (**2728/2728**). Jedini dirani test: `public-blog-share-accessibility.test.mjs` (regex + novi assert, obrazloženje u §10 S3 plana); `check_ci_index` ostaje 385/388.

**Lokalno izmjereno:** **204/204** `test:*`; 5 Python gate-ova (`check_repo_hygiene` 1789, `check_ci_index` 385/388, `check_doc_links` 687/222, `check_i18n` 2728/2728, `check_ui_contrast` 140/140 source-only); build **280,9/300 KiB** (+1,0 prema S2); `typecheck:e2e` 0; `lint` 0 grešaka / 7 warninga; `postcss.parse` 90 pravila; `git diff --check` čist.

**CI dokaz:** commit `a12cf5b` (`a12cf5b3a169d8315fb1c1bd23b522178ab1022f`), run **`43116167107`** = **5/5 success**; `a11y-e2e` job `130844618383`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `13899570263` (330688 B, SHA256 `d360f1ffc3df2b390b855a2a46eac2d38db941862b4db2c535e9f7626b456627`). `140/140` i `test:public-aurum-hero-contrast` su source-only; log i dalje ima nepotpune `1.4.3`/`2.5.3` i poznate `1.4.6` AAA padove — bez tvrdnje o WCAG 2.2/AAA usklađenosti.

**Nije dirano (grep dokaz 0 diff):** endpointi, paginacija, `approved` projekcija, `parse*`, stale brojači, share/`AbortError`, validacija komentara, `dangerouslySetInnerHTML` i backend sanitizacija, `PublicFeatureGate`, `queryKey`, feature flagovi, `components/ui/*`, `BeforeAfterSlider.tsx`, `data/*.mjs`, `media-image.tsx`, `/backend`, `/mobile`, `package-lock.json`, `ci.yml`. Kontakt vrijednosti isključivo iz postavki; NEJRA §07 ilustrativni podaci nisu hard-code-ani. Nema audio/video sadržaja u dozvoljenim tagovima, pa titlovi nisu izmišljani i STOP uvjet iz §9 nije aktiviran.

**Obrazložena odstupanja (➖, detalj u §10 S3 plana):** `aria-current` na paginaciji i `aria-pressed` na kategorijama (nema numeričke paginacije ni filter tipki), `StatusBadge`/ocjena (nema statusa/ocjene u payloadu), `aria-invalid`/sažetak grešaka (greška je toast, submit logika je zabranjena), audio/video titlovi (sanitizer ih ne dozvoljava).

**Šta još NIJE dokazano (🟡 do S11):** rendered axe nad `aurum-light`/`aurum-dark`, 320 px / zoom 400%, čitač ekrana, fizički uređaj, `1.4.6` AAA.

**Za S4 (ostvareno):** `approve_s4`; 6 javnih tokova je u 3 stanja teme uz nulti FSM/API diff, run **`43177106881` = 5/5**. **S5 je naknadno odobren (`approve_s5` + `card_header`) i završen (5/5 `43181880043`)**.

---

## 11. S4 realizacija (2026-11-11) — predaja S5

**Odobrenje:** `ask_user s4_approval` → **`approve_s4`**; režim „plan → implementacija → 5/5 CI → evidencija → STOP". `PublicFeatureGate` ostaje netaknut bez nove odluke.

**Šta je urađeno:** 12 fajlova / +220 −40 na `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`). 6 javnih tokova + 3 dijeljene komponente + `globals.css` (130 append-only Aurum-only linija) + 2 i18n fajla. `useTheme()` je dodan **prije** `if (!user) return null` u `PublicReserve`/`MyReservations`/`MyReservationDetail`; `Profile` je jednako ispravan u javnom i stylist kontekstu (`/profil`). `<time dateTime>` ×3; jedinstvena `aria-label` imena akcija kroz 2 nova BS/EN ključa; `ConfirmDialog` za revoke saglasnosti (Radix fokus-povratak). `components/ui/otp-input.tsx`, OTP `autoComplete`, svi stale `useRef` i error mapping netaknuti.

**Dokazi:** lokalno **204/204** `test:*`, 5 Python gate-ova, **2730/2730** i18n, **140/140** source-only kontrast, build **281,3/300 KiB**, `typecheck:e2e` 0, `lint` 0/7, `git diff --check` čist. CI run **`43177106881`** = **5/5 success**; `a11y-e2e` job `131043916664` = **252 passed | 0 failed | 0 skipped**, artifact `13924239127` / 331564 B / SHA256 `735f02371338766b49288e49bddd249112f148e037ff5d6a3c001502edcb6ae2`. Rendered axe je **samo default `classic`**; `1.4.6` AAA i `1.4.3`/`2.5.3` nepotpunosti ostaju u logu — bez tvrdnje o WCAG 2.2/AAA.

**Nije dirano:** rezervacijski FSM, `disabled` uslovi, `aria-pressed`/`progressbar`, validacije, idempotency, backend dostupnost, statusi, stale zaštite, API/`queryKeys`/socket, `PublicFeatureGate`, `/backend`, `/mobile`, `package-lock.json`, `ci.yml`. Nijedan test nije oslabljen ni izmijenjen.

**Za S5 (ostvareno):** `approve_s5` + **O2 = `card_header`**; 7 ekrana izvan shellova, `AuthCardHeader` u zaglavlju kartice. **O3 i O4 ostaju otvorena za S6**. Sve rendered/manualne provjere Aurum stanja (M1–M7) ostaju 🟡 do S11.

---

## 12. S5 realizacija (2026-11-11) — predaja S6

**Odobrenje:** `approve_s5` + **`card_header`** (O2 zatvoreno). Režim „plan → implementacija → 5/5 CI → evidencija → STOP".

**Šta je urađeno:** 13 fajlova / +156 −24 na `90acca2` (`90acca29ec760a48a0dea489c6f004c2d9409780`). Novi `AuthCardHeader` (`ThemeSwitcher` + `LanguageSwitcher`) montiran u zaglavlje kartice **iznad `<h1>`** na `Login`, `Register`, `ResetPassword`, `NotFound` i u dijeljeni `OnboardingShell` (koji pokriva `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`). `globals.css` +84 SAMO-Aurum linije (append-only, bez novih promjenljivih). `NotFound` dobio jedan `<h1>`. **Nema `useTheme()`** — CSS `[data-skin="aurum"]` pokriva oba Aurum stanja.

**Dokazi:** **204/204** `test:*`, 5 Python gate-ova, **2730/2730** i18n, **140/140** source-only kontrast, build **281,6/300 KiB**, `typecheck:e2e` 0, `lint` 0/7, `diff --check` čist, `postcss` 124. CI **`43181880043`** = **5/5 success**; `a11y-e2e` job `131059574192` = **252 passed | 0 failed | 0 skipped** / 32 rute, artifact `13926547985` / 331785 B. Rendered axe **samo default `classic`**; `1.4.6` AAA i `1.4.3`/`2.5.3` nepotpunosti ostaju u logu.

**Nije dirano:** auth tokovi, guardovi, error mapping, `autocomplete`, OTP paste, busy/stale zaštite, token cleanup, `PublicFeatureGate`, `app/router.tsx`, `otp-input.tsx`, `/backend`, `/mobile`, `ci.yml`, lokalni fajlovi. Nijedan test nije oslabljen ni izmijenjen.

**Otvoreno za S6:** **O3** (hoće li se koristiti dopušteno grupisanje navigacije Q10 i gdje `ThemeSwitcher` u fullscreen kalendaru) i **O4** (smije li se `window.confirm` u adminu zamijeniti `ConfirmDialog`-om). Oba se postavljaju na ovom STOP-u. Sve rendered/manualne provjere Aurum stanja (M1–M7) ostaju 🟡 do S11.

---

## 13. Nastavak: standardizacija admin dashboarda (post-audit, 2026-11-16)

**Kontekst:** Nakon S5 STOP-a, urađen je audit admin dashboarda i vizuelni pregled (vlasnik).
Rezultat: analytics popravke (kontrast / chart / grupisana navigacija) su **ZAVRŠENE i CI zeleno
5/5** (HEAD `921db1b`, run `43853267180`). **Pravi audit-cilj — standardizacija svih admin
komponenti preko djеljenih, token-driven komponenti s varijantama — NIJE implementiran**; urađeno
je samo istraživanje + specifikacija (Faza A). Grana je u čistom CI-zelenom stanju.

**Autoritativni handoff za ovaj nastavak:** **`23_admin-dashboard-standardization-handoff.md`**
(samodostatan: referencira izvorne dokumente, definiše fazu, daje tabelarnu specifikaciju Faze A i
redoslijed B→C→D). Novoj sesiji to je startna tačka — ne počinjati iz nule.

**Dogovoreni redoslijed (odobrio vlasnik):** `tokenize_first` — prvo tokenizovati djеljene
primitive (Card/Button/Badge/Input/Alert/Tabs/Dialog) preko semantičkih CSS varijabli, pa migrirati
stranice. Svi semantički tokeni su definisani za **obje** skinu (Classic `:root`/`.dark` = slate
vrijednosti, Aurum = smeđe/brand), pa je zamjena `bg-white dark:bg-slate-950` → `bg-surface
text-content border-line` **no-op za Classic, fix za Aurum**.

**Faza A — šta je tačno sljedeće:**
1. Primijeniti tabelu u `23_…md` (tokenizovati 7 primitiva + neutralne Button/Badge varijante;
   "uvijek tamne" pillove `bg-slate-900` ostaviti kako jest — nemaju mode-invariant token).
2. Lokalno: `npm run test:render-smoke`, `npm run lint`, `npm run typecheck:e2e`, `npm run build`;
   push → CI mora biti 5/5.
3. Faza B (tokenizirati `default` Button/Badge pillove preko novog `--surface-inverse` tokena;
   zatvoriti rupe u komponentama) → Faza C (migrirati admin stranice s raw Tailwind-a na djеljene
   komponente; cilj 903→~0 raw `slate-*` i 54→0 raw `<button>`) → Faza D (obrisati redundantne
   `[data-skin="aurum"]` patch CSS).
4. **Vizuelna provjera od vlasnika** — ne proglašavati gotovim bez nje.

**Nije dirati:** `frontend/src/features/dashboard/aurum-stat-grid.tsx` (untracked WIP), `/backend`,
`/mobile`, `ci.yml`, `package-lock.json`. Automatski axe NE dokazuje vizuelnu standardizaciju.
