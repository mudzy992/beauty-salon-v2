# HANDOFF — Aurum web refaktor

## Aktuelni handoff — provjera 2026-11-18

Podržani su samo **Aurum light/dark**, s fiksnom paletom. Retired theme settings su uklonjeni iz UI/API registra; DB cleanup migration je dodana. Historijski CI/run zapisi ispod ostaju historijski i ne potvrđuju ovaj diff.

- Frontend: **209/209** `test:*`, production build (293.6 KiB gzip / 300 KiB budget) i `typecheck:e2e` prolaze. Lint ima 0 grešaka i 5 upozorenja. Mobile lint prolazi.
- Repo hygiene, CI-index, lokalni Markdown links (769), BS/EN parity (2,891/2,891), source-token contrast (96/96) i `git diff --check` prolaze.
- Backend lint nije green: **15,592 grešaka / 845 upozorenja**. `prisma generate --no-engine` nije uspio jer se sandbox nije mogao spojiti na `binaries.prisma.sh`.
- Rendered CI/browser test nije potvrđen; posljednji provjereni CI run `45864317438` je otkazan. Manual **200%/400% zoom** i **text-spacing** provjere ostaju obavezne i otvorene; screen-reader provjera je nepotvrđena. Upute: [`S11_USER_VERIFICATION.md`](S11_USER_VERIFICATION.md).
- Worktree je necommitovan; nema push-a. Prije bilo kakvog commit/push-a dovršiti pregled cijelog diff-a i dogovorenu verifikaciju.

> Svi raniji statusi i rezultati ispod su historijska evidencija, ne aktuelna potvrda.


## Aktuelni status — S11 zoom/reflow ispravka u toku, grana `arena/dadb4053-beauty-salon-v2`

S10 [run `45781994850`](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45781994850) je 5/5. S11 adds 15 rendered Chromium cases × BS/EN (30 axe scans) for public home/guest booking, admin dashboard/settings and stylist inbox across Classic/Aurum Light/Aurum Dark. Existing baseline local checks were Node **1042/1042**, WCAG source contracts **18/18**, E2E typecheck/discovery, build **294.7/300 KiB gzip**, repo gates. The new follow-up has targeted source tests **18/18**, navigation drawer **6/6**, shell **14/14**, inbox accessibility **3/3**, inbox i18n **1/1**, `typecheck:e2e` and production build PASS. Local rendered Playwright still SKIPS because Chromium is unavailable.

CI [run `45828686415`](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45828686415) is complete 4/5: rendered suite **3195 passed / 5 failed** after **51.3 minutes**. All five failures are the S11 320px visible-container overflow assertion, not critical/serious axe violations: `/admin` and `/admin/settings` Classic/BS, and `/stylist/inbox` BS in Classic/Aurum Light/Aurum Dark. GitHub’s diagnostic annotation exposed the routes/criterion but not the offending element list; report-artifact download failed with blob EOF. User independently reports that 200–400% browser zoom hides the admin sidebar. At narrow widths the desktop sidebar is intentionally replaced by a drawer, but its prior avatar-only trigger was not a clear affordance.

Responsive patch now replaces that avatar-only control with a localized, visible menu icon (44px target); wraps admin/stylist header controls; constrains the stylist horizontal nav and inbox heading/card rows; and adds an S11 320px test that opens/closes the drawer and verifies navigation/focus restoration. The overflow assertion now prints offending DOM measurements in the next CI report. Local source tests, E2E typecheck and build pass; **no rendered CI verification yet**. The user has reported theme/language, guest redirect, admin/stylist access, keyboard/focus, OS forced-colors and reduced-motion as passing; screen-reader testing is N/A/unavailable; zoom + actual text-spacing must be rechecked after I send the verified build. Exact single retest: [`S11_USER_VERIFICATION.md`](S11_USER_VERIFICATION.md). The hardcoded hero CTA BS/EN editing suggestion is recorded as separate follow-up scope, not implemented in S11.

Legacy `features/shell/admin/ui` census: all 14 production TS/TSX modules have code consumers; none was deleted without proof it is dead. No PR/merge/deploy. See `12_phase-11-finalization.md`, `CHECKLIST.md`, and `S11_USER_VERIFICATION.md`.

> **S9 — admin sadržaj + postavke hub, motion i boje (lokalno, 2026-11-25):** svih 11 admin
> stranica su tani orkestratori (`Blog.tsx` 90, `Gallery.tsx` 132, `Reviews.tsx` 65, `SettingsHub.tsx`
> 67, `Settings.tsx` 28, `SettingsOperations.tsx` 33, `SettingsAppearance.tsx` 65, `SettingsSeo.tsx`
> 20, `AppReleases.tsx` 56, `Notifications.tsx` 68, `EmailSettings.tsx` **101** linija — bivši
> monolith 1416), a logika je u `features/{gallery,reviews,blog,email-settings,notifications,app-releases,settings}/`.
> `EmailSettings` je razbijeno na 11 modula (SMTP hook → `-state`/`-config`/`-actions`, kampanje →
> `-settings`/`-audience`/`-job`, vizuelni editor → orkestrator/`-blocks`/`-preview`/`-types`).
> **Motion:** svih **31** `animate-*` instanci u S9 opsegu ima `motion-reduce:animate-none`;
> `transition-all` sveden na `transition-[width] motion-reduce:transition-none`. **Boje:** sirove
> Tailwind palete prevedene u semantičke tokene (`text-ok-foreground`, `text-danger`,
> `text-info-foreground`, `text-brand-rose-text`, `bg-ok`, `bg-warn`, `text-warn-foreground`,
> `text-content-strong`) sa **tri** obrazložena izuzetka (email preview okvir, gallery photo
> scrim, native color picker). Dokazi: `tsc --noEmit` čist, ESLint **0 grešaka / 5 upozorenja**
> (sva 5 van S9 opsega), `test:*` **209/210** (jedini pad `test:auth-session-rendered` je
> **okolina** — Playwright nema browser, `cdn.playwright.dev` blokiran), build zelen (initial
> **294,6/300 KiB**, Analytics 116,4/140, Calendar 101,1/125), `typecheck:e2e` čist, pet Python
> provjera PASS, `git diff --check` PASS, novi ugovori `test:s9-reduced-motion` **5/5** i
> `test:s9-semantic-colors` **6/6** (oba dodata u CI; druga tvrdnja pokriva forced-colors).
**CI [45694496238](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45694496238)** za `bef75dc`
je **5/5** — repo higijena, mobilni TypeScript, backend build+testovi, frontend typecheck+build i
rendered a11y nad izolovanom CI bazom; i **CI [45702072097](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45702072097)**
za `071ad50` je **5/5**. `AdminConfirmDialog` tok u `Reviews` je
> **revidiran prema S6** — poruka, uvjet, efekat i fokus-povratak identični su originalu.
> **Otvoreno:** stvarni AT/zoom (200%/400%) i ručni pregled ostaju
> vlasnikova potvrda. **Nema merge/deploya; STOP prije S10.**

> **S8 — refaktor navigacije (lokalni nastavak, 2026-11-25):** bočna traka nosi **jednu stavku po području**; pod-pogledi analitike žive u tablistu `/admin/analytics` (isti obrazac kao sedam tabova postavki), a „Klijenti“ i „Stilisti“ imaju **vlastite pickere** umjesto skoka na `/admin/users` / `/admin/stylists`. Zadani analitički tab više ne piše `?tab=` (isto pravilo kao `finance-page.tsx` i `settings-tab-nav.tsx`), pa stavka u traci i tablist daju **istu adresu za isti pogled** — time je uklonjen uzrok axe naloga `identical-links-same-purpose` („Klijenti“/„Stilisti“ su imali isti naziv kao stavke za upravljanje). „Nazad“ u analitici klijenta vraća na listu klijenata **u istom tabu**. Lokalni dokazi: frontend Node **891/891**, `tsc --noEmit` čist, ESLint 0 grešaka / 6 upozorenja, build zelen (initial 294,8/300 KiB, Analytics 116,4/140 KiB), mock Chromium S8 **449/449**, novi `backend/test/analytics-picker.e2e-spec.ts` (pravi HTTP + PostgreSQL) **5/5**, i **autentificirani** admin/stylist a11y suite uz pravi backend/PostgreSQL/Redis **830/830** u ponovljenom pokretanju — prvi run imao 828/2, a oba pada bila su zastarjela očekivanja („nazad na korisnike“ i navigacija pod-pogledom u traci), ispravljena bez gubitka iste garancije. **CI [45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** za `cf147bd` (tačno završni HEAD) je **5/5** — repo higijena, mobilni TypeScript, backend build+testovi, frontend typecheck+build i rendered a11y nad izolovanom CI bazom; svi koraci zeleni. Tačan broj prošlih testova u rendered a11y koraku nije izvučen iz CI loga u ovoj sredini (host za logove i artifikate nije dostupan iz sandboxa), pa se ne navodi izmišljen broj — autoritativni signal su zaključci runa i koraka. S8 **ostaje otvoren**: stvarni AT/400%, ručni pregled i reduced-motion/forced-colors; STOP prije S9, bez merge/deploya. Detalji u `CHANGELOG.md` i `24_s8_zavrsni_pregled.md`.

> **S8 — privatni upload before/after para (lokalni nastavak):** tri nova endpointa pod `RolesGuard` (`OWNER`/`SYSTEM_ADMIN`) — `eligible-entries`, `pending-consent` i `private-pair` (multipart). Par se veže za postojeći završeni zapis usluge; **jedan par po zapisu** (drugi dobija 409, ništa se ne piše). Tip se provjerava **sadržajem** (sharp), najviše 10 MB, fajlovi u `private/work-gallery/` sa `storageClass=PRIVATE`. Upload **ne stvara saglasnost i ne objavljuje**: par ostaje van javnog i admin feeda dok klijent ne odobri svaku fotografiju pojedinačno. Dva istovremena uploada: jedan 201, drugi 409, fajlovi gubitnika se brišu; procesni prekid može ostaviti privatne orphan fajlove (prijavljena granica). Backend unit **14/14**, PostgreSQL/JWT HTTP **8/8** (cijeli backend e2e **99/99**, unit **860/860**), frontend Node upload **8/8** i skup **998/998**, upload mock Chromium **8/8**, build/typecheck i pet Python provjera PASS. Tri starija OWNER spec dobila su dijeljeni fixture za nove read endpointe (`e2e/work-gallery-upload-fixtures.ts`) jer je njihov catch-all mock vraćao `{}` i panelov alert je kolidirao s `getByRole('alert')`; nijedna postojeća asertcija nije uklonjena — mock S8 prije **437/8**, poslije **445/445**. Odvojeno: `m1-expense-attachments-keyboard` je u CI-ju pao na axe kontrastu `disabled` selecta (trka u testu, frontend kod za finansije nije diran od zelenog `2a8dfc3`) i sada skenira ustaljeno stanje; `m1-calendar-keyboard` (`agenda-enter`) je CI-flake, lokalno **66/66**. [CI 45559422184](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45559422184) za `24109f8` je **4/5**: rendered a11y **3181/0/0**, ali backend posao pao na straži `api-error-codes` zbog 8 hardkodiranih poruka koje je donio commit redoslijeda `352a622` (nikad nije bio u CI-u); ispravka `650c0c2` ih prevodi u kodove. **[CI 45566994361](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45566994361)** za `0119905` je **5/5**, rendered a11y **3181/0/0** uz 15 nepotpunih axe `color-contrast` uzoraka. S8 **nije završen** (ostaju završne/ručne provjere); STOP prije S9, bez merge/deploya. Detalji `25_s8_work_gallery_implementacija.md`.

> **S8 — ručni redoslijed (lokalni nastavak):** OWNER/SYSTEM_ADMIN pomjera susjedne učitane parove, uz CAS reviziju reda, provjeru revizija vidljivosti, eligibility/susjednosti i osvježenje pri konfliktu; red je samo po usluzi. Prvi/nerangirani pomak može normalizovati sve zapise usluge i opterećenje nije profilisano. Revizija ne pokriva sve izmjene saglasnosti ili zapisa. Migracijski SQL lokalno ručno primijenjen, ne Prisma migrate deploy. Mock S8 browser 437/437, Node 1005/1005, backend unit 846/846, PostgreSQL/JWT 7/7, build/typecheck i pet Python provjera prolaze; CI za novi paket još nije potvrđen; lokalni nastavak treba pushati nakon završetka prethodnog [CI 45502852329](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45502852329), jer novi push otkazuje postojeći run. **Privatni upload nije implementiran**, S8 nije završen; STOP prije S9, bez merge/deploya. Detalji `25_s8_work_gallery_implementacija.md`.

> **S8 — revizijska zaštita vidljivosti:** reproducirani ABA (stari hide nakon hide/restore vraćao 200) sada je blokiran atomski poređenim stanjem i rotirajućim UUID-om; admin feed/lista daju token, javni feed ne, konflikt traži osvježenje. PostgreSQL/JWT HTTP **6/6** (auth lookup mock), ABA oba smjera i paralelne mutacije; 24 migracijska SQL fajla ručno primijenjena, ne Prisma migrate deploy. Mock S8 browser **427/427** uz dodatni zasebni test 1/1 PASS, Node **1005/1005**, backend unit **845/845**, build/typecheck i pet Python PASS. Ovo ne verzionira sve promjene zapisa/saglasnosti; stari frontend bez tokena dobija 400, pa budući rollout zahtijeva koordinaciju. [CI 45488631000](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45488631000) za prethodni `2a8dfc3` **5/5**, novi paket treba svoj CI. S8 nije završen: preostaju privatni upload, redoslijed, završne i ručne provjere. STOP prije S9; nema merge/deploya. Detalji u planu `25_s8_work_gallery_implementacija.md` i CHANGELOG-u.

> **S8 — CI ispravka ugniježđenih panela:** [CI 45469817621](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45469817621) na `4c0fc1c` pao je u rendered a11y zbog višeznačnog tabpanel selektora; dva selektora ograničena su na aktivni unutrašnji panel bez uklanjanja asertacija. Lokalno **48 M2 + 4 tastaturna slučaja**, uz 2 auth setupa po runu, prošla su uz pravu prijavu i izolovani DB/Redis, ali mock analitičke podatke; migracije su primijenjene kao SQL, ne Prisma deploy. Novi CI treba potvrditi. S8 ostaje otvoren: ABA verzionisanje vidljivosti, privatni upload i redoslijed nisu implementirani; detalji u `25_s8_work_gallery_implementacija.md`. Bez merge/deploya i bez S9 prije STOP-a i odobrenja.

> **S8 — međudijaloški refresh (lokalno):** kasni mock save/delete uz drugi dijalog prije **8/8 fail** (spor read uklanja dijalog). Sada se refresh odgađa, nacrt ostaje vidljiv, alert traži kopiranje i zatvaranje, a fokusabilne `aria-disabled` akcije imaju guard protiv writea; obuhvaćene i potvrde kategorije/potkategorije. Prvi objedinjeni run **399/407** otkrio je regresiju fokusa poslije zatvaranja; nakon fallbacka ciljano **32/32**, završni mock S8 **411/411**, šest scoped axe skenova bez violations. Node **1005/1005**, build/typecheck, pet Python provjera, lint 0/6. Nacrt se ne sačuva sam; već poslani zahtjevi se ne otkazuju. Nije dokaz stvarnog backenda/OS/AT. [CI 45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za pushani `c34c12f` još traje (četiri success, rendered u toku) i ne pokriva lokalni nastavak: sačekati ga prije pusha pa pratiti novi CI. S8 otvoren zbog CI/DoD i nesklada galerije/tablist-sidebar; STOP prije S9, bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — lokalni async editor:** kasni upload ne mijenja drugi obrazac/novi upload, Save čeka upload; kasni uspješan save ne zatvara novi editor, refresh odgađa do njegovog zatvaranja, dok ishod ostaje vidljiv. Prije: blokada Save **8/8 fail**, zamjena slike **4/4 fail**, kasni uspjeh save **4/4 fail**; sada novi test **24/24** s četiri scoped axe skena bez violations, mock potpuni S8 **395/395** prije dodavanja tih axe skenova. Prvi S8 run **390/391** otkrio je retry axe sken prije pojave error čvora; eksplicitno čekanje bez uklanjanja asertacija, ponovljeni retry **20/20**. Node **1005/1005**, build/typecheck, lint 0/6. Zahtjev se zatvaranjem ne otkazuje; upload može ostati na serveru. Nije backend/AT audit, ni zaštita svih drugih dijaloga. [CI 45416015805](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45416015805) za `f58097f` završio je **5/5**, rendered **3107/0/0**, uz 15 nepotpunih axe contrast uzoraka. Novi paket nije obuhvaćen tim CI-jem; nakon pusha pratiti novi CI. S8 ostaje otvoren: nesklad plana za gallery upravljanje i tablist/sidebar; STOP prije S9, bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — CI admin test uloga:** [CI 45407428201](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45407428201) za `097d82d` je **4/5**, rendered **3066/1/0**, pao admin test upravljanja ulogama; CI log EOF pa tačan stack nije poznat. Isti test lokalno uz izolovani mock ranije je čekao POST prije nove potvrde i pao **1/1**, a nakon dodavanja potvrde i zadržavanja svih ranijih asertacija prolazi **5/5**; admin deactivation/reset/roles ciljano **4/4**. Mock nije CI baza ni dokaz produkcijskog efekta. Ove testne promjene i fokusni paket ispod trebaju novi CI; S8 ostaje otvoren, STOP prije S9.

> **S8 — lokalni fokus korisnika:** stvarni okidači potvrda reset linka, uklanjanja uloge i deaktivacije vraćaju fokus i pri sintetičkom nefokusirajućem kliku (prije 4/4 fail, poslije 4/4 sa sva četiri dijaloga). Retry i krajnje stranice prije 16/16 fail, sada fokusiraju stabilan naslov samo kad okidač nestaje/disabled; kontrole koje ostaju čuvaju fokus. Greška pretrage/stranice prije 8 fail/8 pass, sada 16/16 s uslovnim fallbackom i bez oduzimanja već pomjerenog fokusa. Završni mock S8 **371/371**, Node **1005/1005**, build/typecheck/pet Python PASS, lint 0/6; četiri scoped axe error skena bez violations. Mock, sintetički pointer i viewport nisu AT/OS audit niti stvarni write. [CI 45407428201](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45407428201) za `097d82d` je **4/5**, pad admin testa uloga; analiza i ispravka iznad. Fokusni nastavak treba novi CI. S8 nije zatvoren; STOP prije S9, bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — CI paginacija:** [CI 45399201915](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45399201915) za `9360e86` završio je **4/5**, rendered **3042/1/0**, pad `s8-users-pagination` 1280; log i artefakt nedostupni zbog EOF pa tačan uzrok nije poznat. Lokalno je utvrđena moguća testna utrka: sinhrona provjera zahtjeva može prestići route; bez intervencije 1280 50/50 pass, sa 500 ms odgodom 2/2 fail, nakon `expect.poll` iste query asertacije 20/20. Sve stare garancije zadržane. Konačni objedinjeni mock S8 **331/331**, E2E typecheck i Python PASS. To nije dokaz uzroka CI pada; pushati nastavak s korisničkim potvrdama i provjeriti novi CI. Bez merge/deploya i bez S9 prije STOP-a.

> **S8 — lokalne potvrde korisnika:** dodjela uloge i deaktivacija kroz editor ranije su zaobilazile potvrdu (početna matrica **8/8 fail**). Sada se potvrđuju s identitetom, cancel ne šalje zahtjev, a postojeći POST/PATCH payload ostaje; obični edit i aktivacija ne traže novu potvrdu. Pending dodjele blokira dodatnu dodjelu za istog korisnika; nakon greške dozvoljava retry. Kod neuspjele deaktivacije forma ostaje i retry opet traži potvrdu. Novi testovi **24/24**, osam scoped axe skenova bez violations, završni S8 mock **331/331**, Node **1005/1005**, build/typecheck/pet Python PASS, lint 0/6. Mock ne dokazuje backend mutaciju ili AT/OS; druge vrste konkurentnih promjena nisu serijalizirane. [CI 45399201915](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45399201915) prethodnog `9360e86` završio je 4/5; detalji iznad. Potvrde i testna ispravka trebaju novi CI. S8 nije zatvoren, STOP prije S9 i bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — lokalni nastavak galerije:** backend može vratiti prazan `items` uz `hasMore: true` jer paginira zapise prije filtriranja nevažećih parova. Ranije UI lažno prikazivao praznu galeriju; prije ispravke **12/12 fail**, sada navigira i retryuje na tačnom offsetu, uz test dva uzastopna prazna pagea. Također retry usluge čuva stabilan fokus (prije 4 service fail / 4 pairs pass; poslije **8/8**). Ciljana galerija **51/51**, cijeli S8 mock **307/307**, frontend Node **1005/1005**, build/typecheck i pet Python provjera PASS, lint 0/6. Backend unit **12/12** koristi mock baze i test-only Prisma enum stub jer engine nije moguće lokalno preuzeti; standardni backend build/test čekaju CI. [CI 45392038969](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45392038969) prethodnog `f2bd682` je **5/5**, rendered **3019/3019**, ali ne pokriva nastavak; nakon pusha provjeriti novi CI. Nije AT/OS audit, S8 ostaje otvoren, STOP prije S9 i bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — lokalni nastavak:** eksplicitni okidači Services dijaloga za nefokusirajući pointer klik (prije 4/4 fail, poslije 4/4 prolazi devet okidača po testu), te alternativna ručna paginacija read-only galerije (prije 4/4 fail; 8/8 uz tihi ili nedostajući observer). Puni mock S8 **283/283**, Node **1005/1005**, build/E2E typecheck i pet Python provjera PASS, lint 0/6. Chromium 153 i sintetički klik/observer nisu stvarni OS/AT audit; backend upisi su mock. Plan navodi gallery upload/delete/reorder, ali ovaj ekran takve akcije nema; to i raniji tablist/sidebar nesklad ostaju za razjašnjenje. [CI 45385829364](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45385829364) prethodnog `482fa2f` je **5/5**, rendered **3007/3007**, ali ne pokriva novi paket; nakon pusha provjeriti njegov CI. S8 nije zatvoren; STOP prije S9, bez merge/deploya. Detalji u CHANGELOG-u.

> **S8 — najnoviji objedinjeni paket:** [CI 45376878389](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45376878389) za prethodni `258ad4b` **5/5**, rendered **2991/2991**, uz 6 incomplete `color-contrast` uzoraka. Novi lokalni paket: tastaturni Recharts tooltip i vidljivi povezani sažetak, fokus retry/save/delete u uslugama, razlučivi checkboxi i fokus kompetencija, te izdvajanje većih modula salona/usluga/frizera/korisnika. Lokalni S8 **271/271**, Node **1005/1005**, build/typecheck, pet Python provjera i diff check; lint 0/6, initial 293,6/300 i Analytics 116,4/140 KiB. Preostalo je šest modula 151–173 linije; svi page fajlovi su 46–150. Mock nije stvarni backend/AT. **S8 nije zatvoren:** konačni CI tek treba potvrditi, S11 AT/400% ostaju, i treba razjasniti razliku plana `role=tablist` prema postojećem M1/Q7 sidebar navigacijskom dogovoru (`?tab=`, `aria-current`). Testove, baseline, ograničenja i raspad modula vidi u `CHANGELOG.md`. Nema merge/deploya.

> **S8 — katalog i status paketa:** odvojeni buttoni kategorije od accordion triggera (baseline 4/4: po šest nested buttona), BS/EN jedinstveni nazivi dodavanja usluge i istoimenih triggera, povrat fokusa editoru ako okidač ostaje u DOM-u. Nova fiksura pokriva oba jezika, 320/1280, tastaturu, axe i mock POST ispravne kategorije. Konačna objedinjena lokalna S8 regresija **255/255**, Node **1003/1003**, build/E2E typecheck, 5 Python provjera; lint 0/6, bundle 293,5/300 i Analytics 116,4/140 KiB. Test kreiranja koristi novo kontekstualno ime bez uklanjanja asertacija. Mock/Chromium 153 nisu stvarni AT/WCAG ni produkcijske transakcije. [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za prethodni `73726f6` još je radio pri zapisivanju; završni CI mora se zasebno provjeriti. S8 ostaje otvoren: završni CI 5/5, potpuni pregled DoD-a i 13 izdvojenih modula preko 150 linija, tooltip tastatura/AT i fokus ako se okidač ukloni. Nema merge/deploya. Detalji u CHANGELOG-u.

> **S8 — najnoviji lokalni nastavak:** `edit-user-dialog.tsx` **213 → 158 linija**, dugovanja izdvojena u 76-linijski panel s razlučivim BS/EN nazivima otpisa (usluga/fallback, iznos, redni broj). Popravljen je i intermitentni Escape u ugniježđenoj potvrdi: ako roditelj primi zahtjev za zatvaranje dok je potvrda otvorena, zatvara se potvrda umjesto editora. Prije: nazivi **4/4 fail**, potom desktop nested Escape **2 pada** u široj regresiji; guard pozitivan **20/20**, namjerno isključen **3 fail / 7 pass**, izvor/build vraćeni. Konačno mock S8 **251/251**, Node **1003/1003**, build/typecheck, lint 0/6 i pet Python provjera; bundle 293,5/300 KiB, Analytics 116,4/140 KiB. Mock nije stvarni otpis ni AT/WCAG audit, niti guard otkazuje već poslani zahtjev. Detalji u `CHANGELOG.md`. [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za `73726f6` još traje (četiri success i rendered u toku); lokalni commit treba pushati nakon završetka jer bi novi push otkazao CI. S8 ostaje otvoren, bez merge/deploya.

> **S8 — CI ažuriranje:** [CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` završen je **5/5**, rendered **2963 prošla / 0 pala / 0 preskočenih**, uz 15 nepotpunih axe uzoraka. Lokalni commitovi `39421cd`, `d09f266`, `ab2e229` i `73726f6` su potom pushani. [CI 45370301929](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45370301929) za `73726f6` tek počinje; provjeriti njegov stvarni zaključak prije tvrdnje 5/5. Dok traje, novi push bi ga otkazao. S8 ostaje otvoren zbog nepotpunog pregleda DoD-a i preostalih predugih izdvojenih modula; nema merge/deploya.

> **S8 — najnovije:** `ClientAnalytics.tsx` **161 → 134 linije**, postojeća prezentacija izdvojena u 32-linijski hook; route, izračuni i UI tokovi ostaju. Fiksura promjene jezika, fallbacka i datuma u dvije vremenske zone **4/4 prije i poslije**, klijentske regresije **21/21**, kompletan mock S8 **247/247**, Node **1003/1003**, build/typecheck, lint 0/6 i pet Python provjera prolaze. Chromium 153 ima ograničen BS ICU i nije CI 158; mock nije AT/WCAG audit. Detalji u `CHANGELOG.md`. Svi glavni S8 page fajlovi su sada ispod 150 linija, ali brojni izdvojeni moduli prelaze okvir i DoD nije kompletno pregledan. Lokalni nastavci `39421cd`, `d09f266`, `ab2e229` i ovaj čekaju push dok [CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) traje — novi push ga otkazuje. Nakon zaključka provjeriti rezultat, pushati i pratiti CI za sve nastavke. S8 ostaje otvoren, bez merge/deploya.

> **S8 — najnoviji nastavak:** izdvojena frizerska paginacija; `Stylists.tsx` **159 → 146 linija**, novi modul 36. Pri promjeni stranice ili retryju fokus se sinhrono premješta na trajni naslov prije uklanjanja okidača i ne otima se naknadno. Prije popravke negativne kontrole paginacija **4/4**, retry **2/2**; nakon toga puni mock S8 **243/243**, Node **1003/1003**, build/typecheck, lint 0/6 i pet Python provjera prolaze; ciljana regresija **40/40** prije dodatnog error/retry scenarija. Podaci su mock, Chromium 153 nije CI 158 i nema stvarnog AT/WCAG audita. Lokalni nastavci `39421cd`, `d09f266` i ovaj commit čekaju push dok [CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` traje: novi push bi ga otkazao. Po završetku provjeriti zaključak, pushati nastavke i pratiti novi CI. S8 ostaje otvoren, nema merge/deploya.

> **S8 — najnoviji nastavak:** `Salon.tsx` **162 → 128 linija**, izdvojeni praznični panel 57 linija; zadržani retry, blokada i fokus, a source test dokazuje lanac stranica → panel → tabela. Salon **64/64**, mock S8 **235/235**, Node **1002/1002**, build/typecheck, lint 0/6 i pet Python provjera prolaze; bundle 293,4/300 KiB, Analytics 116,4/140 KiB. Prethodni lokalni `39421cd` s jedinstvenim imenima klijentskih detalja i ovaj nastavak još čekaju push: [CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) za `8dc9e02` pri zapisivanju još radi (četiri success, rendered u toku), a novi push bi ga otkazao. Nakon završetka provjeriti zaključak, pushati lokalne commitove i pratiti novi CI. S8 nije završen; nema merge/deploya. Mock fiksure nisu stvarni AT/WCAG audit ni server mutacije.

> **S8 — najnovije:** `8dc9e02` je pushan s blokadom zastarjelih prazničnih akcija i ispravljenom O4 fiksurom; [CI 45362275720](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45362275720) pri pisanju ima 4 uspješna posla i rendered a11y u toku. Lokalni nastavak daje razlučiva imena detaljima rezervacija i recenzija u klijentskoj analitici, uključujući isti datum/uslugu: usluga, datum, po potrebi vrijeme i redni broj u listi, bez promjene podataka. Prije popravke **8/8 fail**, poslije mock S8 **235/235**, a dodatni ciljano prošireni test s axe **8/8**, Node **1001/1001**, build/typecheck, lint 0 grešaka/6 ranijih upozorenja i pet Python provjera prolaze. Ovo nisu stvarni AT/WCAG pregled ni stvarni server upisi. Detalji u `CHANGELOG.md`. Workflow otkazuje prethodni run pri novom pushu: sačekati završetak `45362275720`, provjeriti njegov zaključak, zatim pushati ovaj lokalni nastavak i provjeriti novi CI. S8 DoD nije potpuno pregledan i faza ostaje otvorena; nema merge/deploya.

> **Najnoviji S8 nastavak:** Analytics, galerija i read/retry praznika su pushani kao `1458f91`; CI [45349480169](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45349480169) završio je **4/5**, rendered 2953 prošla / 1 pala (O4 potvrda brisanja praznika timeout), uz 15 incomplete axe uzoraka. Puni CI log EOF, anotacija ne sadrži tačnu liniju čekanja. Stara O4 fiksura nema `message`/`pushSentAt`; lokalno ista fiksura daje timeout na tabu i grešku validacije, dopunjena stvarnim nullable poljima prolazi O4 **5/5** u izolovanoj mock sesiji. Lokalni simptom je reproduciran, ali CI tačan korak nije potvrđen; nakon ispravke potreban je novi CI. Prethodni galerijski `3eb6c15` ima [45342433244](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45342433244) 5/5. Lokalno je zatvoren zabilježeni rizik interaktivnih zastarjelih redova: dok holiday read traje ili je neuspješan, dodavanje i akcije redova te spremanje u već otvorenom editoru blokirani su; otvorena potvrda brisanja se zatvara, ref guard odbija zakašnjele evente. Status/greška su lokalizovani, fokus se vraća na tab samo kad je prethodni okidač postao nedostupan; već poslani server write se ne otkazuje. Negativne kontrole i prilagodba utrka opisane su u `CHANGELOG.md`. Puni mock S8 **227/227**, Node **1001/1001**, build **293,4/300 KiB**, Analytics **116,4/140 KiB**, E2E typecheck, lint 0 grešaka/6 ranijih upozorenja i pet Python provjera prolaze. Lokalni Chromium 153 razlikuje se od očekivanog 158; CI za ovaj lokalni nastavak tek slijedi. S8 ostaje otvoren: Salon 162, ClientAnalytics 161, Stylists 159, salon hook 221 i drugi moduli prelaze okvir; svi DoD kriteriji nisu kompletno pregledani. Nema merge/deploya.

> **Najnoviji M4–M7 nastavak:** rezervacija ima zasebne oznake koraka i odabranih datuma/termina u emuliranim sistemskim bojama; provjerava se i JS širenje datuma; lokalni fokusirani skup 36/36. CI `60bf38f` 5/5, 2514/0/0, 15 nepotpunih axe uzoraka. **Otvoren nalaz:** u simuliranom 200% tekstu fokus na „Dodaj još“ povremeno ostaje ispod viewporta; uzrok nije potvrđen. M4/M5 i stvarni OS reduced-motion ostaju otvoreni. [Izvještaj](19_m4_m7_protokol_i_izvjestaj.md).

> **Najnoviji M4–M7 nastavak:** CI `b2fcf97` 5/5, 2496/0/0, uz 15 incomplete uzoraka. Ispravljen reduced-motion automatski scroll i AAA kontrast brojeva koraka rezervacije; lokalno 90/90 i dodatno 36/36. M4/M5 i stvarni OS reduced-motion ostaju otvoreni; [dokazi i neizvedeni protokol](19_m4_m7_protokol_i_izvjestaj.md). CI nove dopune na čekanju.

> **Najnoviji M1/M3 nastavak:** pregled fakture rashoda, povrat fokusa i razlučivi nazivi „još stavki“; 48 novih fiksura, s finance/delete matricom 216/216. Prethodni CI 4/5, dva finance scenarija pala s nepoznatim uzrokom; lokalno ponovljeni 10/10, nova dijagnostika dodana. CI ove dopune na čekanju; M1/M3 i M4–M7 ostaju otvoreni. Detalji u `17_m1_m3_izvjestaj.md`.

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

## Nastavak M4–M7: katalog i CI

Filter kataloga ima forced-colors selekciju i fokus, a naslov kataloga fallback `h2`; lokalno 30/30 fokusiranih scenarija i 10/10 redundant-entry testova nakon preciziranja tekstualne heuristike. CI `a3988fd` frontend failed u redundant-entry, log nedostupan, lokalna reprodukcija identificira konflikt s progress atributom; rendered u toku. Classic axe po dva incomplete čvora brojača u BS i EN; M4/OS i booking fokusni nalaz ostaju otvoreni. Šira tema regresija 12/20 uz nepotpun lokalni backend. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## Nastavak M4–M7: brojači i CI u toku

Classic brojači imaju eksplicitnu podlogu, šest ciljnih axe skenova bez violations/incomplete; CSS parovi 20,01/17,55/15,60:1, filter 12/12 i urednički naslov 2/2. Prolaz dodatne dijagnostike fokusa 40/40 nije razriješio prethodne padove. `a3988fd` CI cancelled nakon novog pusha; `6e53d12` CI `45041037682` ima četiri prošla posla, rendered još traje. Novi lokalni commit namjerno nije pushan dok rendered ne završi kako se run ne bi otkazao; zatim pushati isključivo aktuelnu granu i provjeriti novi CI. [Izvještaj](19_m4_m7_protokol_i_izvjestaj.md).

## CI za `6e53d12`: završen s jednim axe padom

`45041037682` 4/5, rendered 2543/1: Classic booking reduce imao je 17 čvorova `color-contrast`, plus 15 uzoraka incomplete; log nedostupan. Vještačka 0,25 opacity intervencija lokalno proizvela je slične axe nalaze, ali tačan CI uzrok nije utvrđen. Sken sada čeka konkretan intro i date panel da dostignu opacity 1 i završe Web Animations, ne filtrira axe: kontrolni test dokazuje čekanje, pad pri trajnoj prozirnosti i hvatanje stvarno lošeg kontrasta. Lokalno 8/8 pa 18/18 ponovljeno prije stabilizacije kontrolne animacije. CI je sada završen, pa lokalni nastavak treba pushati nakon završnih testova; novi CI tek slijedi. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## M4–M7: galerijski slider

Lokalno 39/39: emulirane boje (24), nazivi više parova (12) i tri category axe fiksure. Prije je linija bila bijela na bijelom, a dva poređenja imala isti accessible name; implementirani sistemski obrubi, indeksi i kontekst kategorije te jači Classic caption. Opis slike i jednako nazvane kategorije ostaju ograničenja. Hero ima dva incomplete čvora po galerijskom scoped skenu. `45054726540` za `cfd43a1` završen je 4/5, rendered 2547/1: Classic EN desktop finance tastaturni izbor stiliste. Nove lokalne izmjene nisu u tom CI-ju; puni log nije dostupan i uzrok nije potvrđen. [Izvještaj](19_m4_m7_protokol_i_izvjestaj.md).

## Finance lookup i M7 nalaz — lokalni nastavak

Prije promjene sintetički odgođeni odgovor omogućavao je korištenje praznog izbora stiliste. Sada je select disabled dok se učitava, uz BS/EN status vezan kao opis; postojeći tastaturni test čeka opciju. Nakon odgovora testira se uklanjanje statusa i opisa te izbor tastaturom. Šest scoped axe skenova novih stanja bez violations, svaki ima jedan `color-contrast` incomplete na opisu dijaloga zbog preklapanja. Prethodni AAA nalazi summary labela (Classic 6,73:1) i validacije (4,69:1 light, 6,73:1 dark) otklonjeni su jačim tekstom; validacija zadržava ikonu i rub. Lokalno objedinjeno 65/65; 20/20 ponavljanja pogođenog Classic EN desktop scenarija i odgođenog lookup-a. Kontrolisana reprodukcija je moguća hipoteza za CI, ne dokaz njegovog uzroka. Nema stvarnog čitača ekrana ni provjere neuspjelog lookup/retry stanja. Nastavak je pushan; novi CI pratiti. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## CI `45071941627` — prag izvornog sweepa

Frontend posao je pao na `test:text-contrast-allowlist`; lokalno reproducirano: broj svijetlih sirovih paleta-klasa je 124, prethodni minimalni ratchet 125. Uklonjena je jedna `text-rose-600` upotreba u finance validaciji pri prelasku na semantičku boju; prag je precizno snižen za jedan na 124, bez promjene 4,5:1 pravila, allowliste ili izvornog skeniranja. Lokalno test 4/4. Repository, backend i mobile poslovi su prošli, rendered je još u toku u trenutku zapisa; ne zaključivati njegov rezultat. Ispravka je pushana na zahtjev; rendered je potom otkazan, a novi CI treba pratiti.

## Finance lookup — neuspjeli odgovor i retry

Sintetički 503 prije izmjene ostavio je praznu aktivnu kontrolu bez informacije o grešci. Nakon inicijalnog neuspjeha (uključujući jedan automatski retry React Queryja), select je disabled, lokalizovani alert je povezan s opisom i postoji zasebno imenovano retry dugme. Tokom ponovnog pokušaja dugme ostaje fokusabilno s `aria-disabled`, a dupli zahtjev se blokira; greška se vraća ako retry ne uspije. Ako uspije i fokus je ostao na dugmetu, vraća se na select; ako se korisnik pomjerio ili zatvorio dijalog, fokus se ne preuzima. Ako postoje ranije dohvaćeni podaci, pozadinski neuspjeh ih ne uklanja. Sintetički testovi 36 kombinacija, s postojećim loading/create ukupno **54/54**, tri teme × BS/EN × desktop/mobilni viewport. Šest scoped axe error skenova bez violations, ali po jedan `color-contrast` incomplete na opisu dijaloga zbog preklapanja; stvarni AT i backend nisu provjereni. Build, typecheck, lint, relevantni Node i strict i18n prolaze. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

Prethodni CI `45071941627` cancelled nakon pusha, frontend je prethodno pao na ratchetu; CI `45073812256` za `c8286c6` dosad ima četiri uspješna posla, rendered još traje. Recovery promjene nisu u tom CI-ju.

## Finance: učitavanje usluga — lokalni nastavak

Izbor usluga sada pokazuje BS/EN status i alert/retry uz onemogućenu kontrolu ako dohvat nema podatke. Nova keyed picker instanca sprječava da rezultat ranijeg stiliste promijeni fokus ili opcije nakon promjene stiliste. Kod uređivanja, dok usluge nisu dostupne, spremanje je onemogućeno, a iznosi cijene/napojnice/duga prikazani kao nedostupni; poslije uspjeha ponovo se računaju. Kontrolisana intervencija vratila je stari guard i pokazala da je spremanje prije popravke bilo omogućeno tokom učitavanja. Regresija prije posljednjeg preciziranja pending stanja **102/102** (48 novih + 54 prethodnih), nakon njega ciljano **24/24**, te zasebno matrica uređivanja **12/12** prije preciziranja. Šest scoped error axe skenova bez violations, svaki ima jedan contrast incomplete za preklopljeni opis. Sve su sintetičke fiksure, ne stvarni backend ili AT. Uspješna lista koja ne sadrži historijsku uslugu nije riješena. CI `45074650488` za `f7689a0` četiri posla uspješna, rendered još traje; ove nove lokalne izmjene nisu u tom CI-ju. Nakon završetka pusha se nastavak i prati njegov CI. [Detalji](19_m4_m7_protokol_i_izvjestaj.md).

## S8 · završni pregled, odluke i CI nastavka

CI [45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za `c34c12f` završio **5/5**, rendered **3131/0/0** uz 15 contrast incomplete; ne pokriva lokalni `d6cde2c` ni sljedeću ekstrakciju. `Services.tsx` sada 139 linija; delete handleri kategorije/podkategorije izdvojeni u hook bez namjerne promjene ponašanja. Nakon ekstrakcije puna mock S8 Chromium regresija **411/411**, ciljana **63/63**, Node **1005/1005**, build, E2E typecheck, pet Python i diff provjera PASS, lint 0/6. Pushati nastavak i provjeriti njegov CI; ovo nije puni audit, stvarni backend ili AT.

[Završni pregled](24_s8_zavrsni_pregled.md) precizira početne i trenutne veličine, pokrivenost i otvorene odluke. Izvorni work-gallery bio je read-only, a zasebni Gallery CRUD je S9; M1/Q7 analytics ima sidebar linkove umjesto `tablist`. Ne mijenjati plan bez vlasnikove odluke i ne proglašavati S8 završenom. Nakon odluka i CI-ja pripremiti STOP za odobrenje S9, bez mergea/deploya.

## S8 · odobrena promjena opsega: work-gallery i tablist

Vlasnik je izričito odabrao **implementirati** work-gallery CRUD u S8 i pravi analytics tablist. Dodatno: upload na postojeći završeni zapis usluge, privatno do pojedinačnih klijentskih saglasnosti; uklanjanje samo skriva par iz admin/javne galerije bez brisanja originala/saglasnosti; sortiranje vrijedi u adminu i javnom feedu filtriranom po usluzi, ne u ostalim feedovima. **Galerijski dio nije urađen**: potrebni su zaštita ovlasti i saglasnosti, dizajn skladištenja skrivenosti/reda, migracija, paginacija, utrke i testovi. Postojeći endpoint za brisanje dnevne slike nije ispravan za skrivanje. Pogledati [pregled](24_s8_zavrsni_pregled.md) i [tehnički kontrolni spisak](25_s8_work_gallery_implementacija.md); ne počinjati S9, merge ili deploy.

Analitički tablist lokalno implementiran; sidebar/URL redirecti sačuvani. Prije nova fiksura 4/4 FAIL, zatim ciljani paket 26/26; nakon prilagodbe ugniježđenog selektora puna mock S8 415/415, Node 1005/1005, build i typecheck PASS, lint 0/6, četiri scoped axe skena bez violations u pet pravila. Nije stvarni AT audit. CI `45458456025` za prethodni `87578b2` još u toku u trenutku zapisa; ne pokriva tablist. Ne pushati dok taj run traje, zatim provjeriti zasebni CI tablista.

## S8 · work-gallery vidljivost, upload/redoslijed otvoreni

Lokalno implementirano sakrivanje i vraćanje automatskog para: `work_gallery_hidden` migracija, OWNER/SYSTEM_ADMIN API s CAS i paginacijom, filtriranje prije paginacije javnog feeda, consent inbox usklađen, BS/EN potvrde/retry/fokus i odbacivanje zastarjelog read odgovora. Ne brišu se originali ni klijentova saglasnost. Poznat direktni URL derivata ostaje dostupan dok saglasnost vrijedi; ručno objavljene pojedinačne fotografije nisu uklonjene i inbox ih ispravno pokazuje. **Upload i ručno sortiranje ostaju za implementaciju**, kao i revizijski token za vidljivost (trenutni boolean CAS ne sprečava ABA ciklus) i CI za sve lokalne commitove; S8 nije završen, nema S9/merge/deploy.

Frontend build/typecheck, Node **1005/1005**, backend build/unit **844/844**, registry **7/7**, pet Python provjera PASS, lint 0/6. Mock S8 Chromium **423/423** prije zadnje ispravke nenametanja fokusa, poslije ciljano **9/9** i konačno **424/424**; četiri scoped axe skena potvrde (tri pravila). DB HTTP **88/88**, uključujući četiri nova testa stvarnog PostgreSQL-a uz stvarni JWT potpis i RolesGuard, ali mock `AuthService.validateUser`; prije simulacije migracijske tabele 87/88 zbog readiness, a 23 SQL migracije su na drugoj izolovanoj bazi primijenjene ručno redom. To nije dokaz Prisma migrate deploya niti stvarnog AT. [Nastavak i granice](25_s8_work_gallery_implementacija.md). Prethodni CI [45458456025](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45458456025) za `87578b2` završio **5/5**, rendered **3147/0/0**, 15 contrast incomplete; ne pokriva tablist ni novu galerijsku vidljivost. Nakon lokalne regresije pushati nastavak i provjeriti njegov CI.
