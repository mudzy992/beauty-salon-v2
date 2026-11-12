# S4 — Javni tokovi: Rezervacija, Moj termin, Moje rezervacije, Unsubscribe, Profil

**Status:** ✅ **ZAVRŠEN 2026-11-11** — odluka `approve_s4`, commit `7d2ab0e` (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`), CI run **`43177106881` = 5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute na default `classic`. **Najosjetljiviji segment: rezervacijski FSM i podaci — `git diff -U0` potvrđuje 0 izmjena logike (vidi §10).**

---

## 1. Cilj

Refaktor svih javnih *tokova* (ne samo ekrana) prema NEJRA §07 (rezervacija u koracima), §09 (stanja) i §11 (forma/dijalog): višekoračna rezervacija, token pregled termina, povijest i detalj klijenta, odjava s kampanje, profil. **Nulta promjena poslovne logike, dostupnosti, FSM-a, idempotency ključeva i API ugovora.**

---

## 2. Ulaz

S3 završen (5/5); nove primitive + 3 stanja teme spremni; NEJRA §09 ima retke za 6 ekrana + `PublicReservationView`.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/public/PublicReserve.tsx` | **IZMJENA** — koraci 1–4, `steps` indikator, `chips`, legende kalendara, potvrda |
| `frontend/src/features/reservations/*` (javni scheduler/calendar dijelovi) | **IZMJENA** — prezentački sloj; `reservation-list-api-contract`, availability parseri, slot-hold, idempotency **bez izmjene** |
| `frontend/src/pages/public/PublicReservationView.tsx` | **IZMJENA** — token pregled, razlikovanje „link nedostupan" vs „transient greška" |
| `frontend/src/pages/public/MyReservations.tsx`, `MyReservationDetail.tsx` | **IZMJENA** — liste/detalj, statusi, retry |
| `frontend/src/features/client-reservations/*` | **IZMJENA** — samo prikaz; akcije i error mapping netaknuti |
| `frontend/src/pages/public/CampaignUnsubscribe.tsx` | **IZMJENA** — potvrdni ekran |
| `frontend/src/pages/Profile.tsx` | **IZMJENA** — profil (koristi ga i stylist meni preko `/profil`) |
| `frontend/src/features/profile/*`, `features/media-consent/*` | **IZMJENA** — prezentački sloj; OTP, avatar upload/privacy, username availability logika netaknuta |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |

---

## 4. Ugovor (stroži nego u ostalim segmentima)

- **Rezervacijski tok:** isti koraci, isti `service/date/slot` odabir, iste validacije (ime+prezime, `+387` telefon), isti `B`/`steps` semantički ekvivalent, isti `aria-pressed`, iste poruke grešaka uz polje, isti poziv na kreiranje rezervacije, isti idempotency ključ, ista dostupnost iz backend-a.
- **Statusi:** `PENDING`/`CONFIRMED`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`/`STYLIST_REVIEW` prikazuju iste vrijednosti; `StatusBadge` dodaje tekst + ikonu, nikad ne mijenja značenje.
- **Stanja:** svaki ekran zadržava razlikovanje loading / transient error (retry) / 403·404 / uspješno prazno; stale-request `useRef` generacije netaknute.
- **3.3.8 Accessible Authentication / OTP:** `autocomplete="one-time-code"`, paste cijelog koda, bez blokiranja paste-a i bez kognitivnih testova — `components/ui/otp-input.tsx` se ne smije oslabiti.
- **3.3.7 Redundant Entry:** ne tražiti ponovni unos istih podataka unutar toka.
- `Profile` je javna ruta koju koristi i stylist meni → promjena mora biti jednako ispravna u oba konteksta.
- Bez novih zavisnosti; bez diranja `/backend`, `/mobile`, `queryKeys`, socket event-a.

---

## 5. Koraci

1. `PublicReserve`: novi `PageHeader` + `FormSection`/`fieldset/legend` po koraku; `steps` indikator s `aria-current` i tekstom (ne samo bojom); `chips` s `aria-pressed` i 44 px metama; legende za datum/vrijeme; zasebne poruke neuspjeha za uslugu/datum/slot s retry; potvrda prije slanja (`3.3.4`); jedan primarni CTA po koraku.
2. `PublicReservationView`: token ekran s jasnim `h1`, `role="status"`/`role="alert"` najavama, retry, bez otimanja fokusa; razlika „nedostupan link" vs „mrežna greška" ostaje u kodu i u i18n ključevima.
3. `MyReservations` / detail: nove `DataTable`/`StatusBadge`/`DataState` primitive; jedinstvena imena akcija („Otkaži – {usluga}, {datum}"), `ConfirmDialog` prije otkazivanja s fokus-povratkom na okidač, `<time datetime>` za datume, puni iznos u `aria-label` gdje je skraćen.
4. `CampaignUnsubscribe`: potvrdni ekran, `role="status"`, jedan CTA, bez novih API poziva.
5. `Profile`: nove `FormSection`/`ErrorState`, zadržati sve `aria-live` statuse, OTP paste, avatar privacy/upload, email verifikaciju, username availability stale-response zaštitu; `label-in-name` helper ostaje.
6. Aurum: serifni naslovi, zlatni CTA samo za primarnu akciju, tamni hero gdje §07 kaže; sve kroz tokene.

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje): `test:public-reservation-accessibility`, `test:public-reservation-view-recovery`, `test:reservation-errors`, `test:public-reservation-error`, `test:reservation-list-api-contract` (dio `prebuild`), `test:my-reservations-recovery`, `test:my-reservation-detail-recovery`, `test:client-reservation-errors`, `test:profile-accessibility`, `test:profile-save-accessibility`, `test:profile-avatar-privacy`, `test:profile-avatar-upload`, `test:profile-email-verification`, `test:profile-username-availability`, `test:profile-api-errors`, `test:onboarding-a11y`, `test:form-control-labels`, `test:api-error-keys-i18n`, `test:raw-api-error-exposure`, `test:amount-format-consistency`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + `npm run build` (uključuje `prebuild`: `reservation-list-api-contract` + `route-code-splitting`) + puna `test:*` petlja + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `backend` posao ostaje zelen jer se API ne dira; `a11y-e2e` pokriva javne rezervacijske rute u default stanju.

---

## 8. DoD + dokazi

- ✅ 6 ekrana + 4 dijeljene komponente u 3 stanja; rezervacijski FSM/validacije/idempotency/API **diff-om potvrđeno netaknuti** (vidi §10).
- ✅ **204/204** `test:*`; BS/EN **2730/2730**; build **281,3/300 KiB**; CI **5/5** na runu `43177106881`.
- ✅ `ConfirmDialog` prije povlačenja saglasnosti (Radix fokus-povratak), `ResponsiveDialog` prije otkazivanja rezervacije; `role=status/alert` zadržani; `<time dateTime>` dodan u 3 prikaza datuma.
- 🟡 Tastaturni end-to-end prolaz kroz 4 koraka rezervacije u renderu → S11 / ručna checklista; rendered axe za `aurum-light`/`aurum-dark`, 320 px / 400% i čitač ekrana → S11.
- **STOP** → „Odobravaš li S5 (auth + onboarding + NotFound)?"

---

## 9. Rizici / pitanja

- **Najveći rizik:** vizuelni refaktor `PublicReserve` ne smije slučajno promijeniti redoslijed koraka ni uvjete `disabled` na „Dalje". Svaka takva promjena = funkcionalna → **STOP**.
- Ako novi `DataTable` traži drugačiji oblik podataka iz API-ja → **STOP** (Q10: API ugovori netaknuti).
- `Profile` dijele javni i stylist kontekst; ako Aurum izbornik teme nije dostupan u oba → pitanje u S5/S10.
- Ne izmišljati nove statuse rezervacije niti nove poruke grešaka; koristiti postojeće i18n ključeve.

## 10. Realizacija S4 (2026-11-11) — dokazi i obrazložena odstupanja

**Odobrenje:** `ask_user s4_approval` → **`approve_s4`**: „Po istom režimu (plan → implementacija → 5/5 CI → evidencija → STOP)"; „PublicFeatureGate ostaje netaknut bez nove odluke". Nije traženo novo odobrenje za S3/S4 ni ponovljen STOP za NEJRA kontrast.

**Implementirano (12 fajlova / +220 −40):** 6 stranica (`PublicReserve`, `PublicReservationView`, `MyReservations`, `MyReservationDetail`, `CampaignUnsubscribe`, `Profile`) + 3 dijeljene komponente (`my-reservation-card`, `payment-summary-block`, `media-consent-panel`; `cancel-reservation-dialog` nije diran, pokriva ga globalni `[role="dialog"]` CSS) + 2 i18n fajla + `globals.css`. Obrazac je isti kao u S3: `useTheme()` **prije svih early return-a**, `isAurum ? publicAurum.* : ''` i `data-aurum-*` markeri; klasični markup, `disabled` uslovi, `aria-pressed`, `role="progressbar"`/`aria-valuetext`, `fieldset/legend`, poruke grešaka uz polje, OTP `autoComplete="one-time-code"`, svi `*Generation`/`*InFlight` refovi i error mapping ostaju **doslovno netaknuti**.

- **CSS:** novi SAMO-Aurum blok na kraju `globals.css` (**130 linija**, marker `:811`, `postcss.parse` = **110 pravila**). S2 (`:432`) i S3 (`:646`) imaju **0 uklonjenih linija**. Sva pravila su pod `[data-skin="aurum"]`; boje isključivo `hsl(var(--*))`, `var(--aurum-*)`, `var(--nejra-hero-*)`. Pokriveni su legacy rose/orange/purple/emerald/blue paneli, `--primary/--primary-foreground` za odabrane dane/termine i default dugmad, zlatni CTA, indikator koraka 1–4, status/alert regije, `<time>`, Radix dijalog u portalu, vidljiv fokus i `forced-colors`.
- **A11y / semantika:** `<time dateTime={...}>` u `MyReservationDetail`, `MyReservationCard` i `PublicReservationView`; jedinstvena imena akcija (`openDetailsNamed`, `cancelReservationNamed` s `{{service}}`/`{{date}}`) kao `aria-label` koja sadrže vidljivi tekst (2.5.3); `role=status/alert` zadržani.
- **Destruktivne radnje:** `mediaConsent.revoke` više ne koristi `window.confirm`, nego `ConfirmDialog` (`isDestructive`, Radix `DialogTitle`/`DialogDescription`, povratak fokusa na okidač); otkazivanje rezervacije i dalje ide kroz `CancelReservationDialog`/`ResponsiveDialog`. **O4 iz `HANDOFF.md` ostaje otvoreno za masovnu zamjenu `window.confirm` u S6–S9** — S4 je dirao isključivo javni `media-consent-panel.tsx` jer to traži vlastiti DoD.
- **i18n:** +2 ključa u oba jezika (**2730/2730**); nijedan novi status, poruka greške ni izmišljeni podatak. Nijedan `t()` nije ostao bez leaf/plural ključa ni bez prosljeđene interpolacije.

**Ugovor netaknut (`git diff -U0` — jedine uklonjene funkcionalne linije su `window.confirm` i njegov `onClick`, oba dio gornje zamjene):** `api.get`/`api.post`/`api.patch`, `/api/reservations/availability/*`, `/api/client-debts/me`, `/api/loyalty/client/me`, `/api/notifications/campaigns/unsubscribe`, `/api/media/consents/*`, `createIdempotencyKey`, `bookingAttemptRef`, redoslijed `setSelectedSlot` → `setStep(4)` → debts → loyalty, `datesRequestIdRef`/`slotsRequestIdRef`/`requestIdRef`, 403/404/410 mapiranje, `queryKeys`, `'availability:changed'`, `PublicFeatureGate`, `components/ui/otp-input.tsx`, `components/ui/*`, `reservation-list.api.ts`, `labels.ts`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`. Nema novih zavisnosti ni novih `test:*` skripti.

**Lokalno izmjereno:** **204/204** `test:*` PASS / 0 FAIL (nijedan test nije diran, nijedan source-contract regex nije proširen); 5 Python gate-ova PASS (`check_repo_hygiene` **1789**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2730/2730**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **281,3 / 300 KiB** gzip (**+0,4 KiB** prema S3 280,9; analytics 114,7/140, calendar 99,4/125); `npm run typecheck:e2e` 0; `npm run lint` **0 grešaka / 7 poznatih warninga**; `git diff --check` čist; `postcss.parse` 110 pravila.

**CI dokaz:** commit **`7d2ab0e`** (`7d2ab0eebafdd08f7fcaf106b134ff4098f73344`), run **`43177106881`** = `completed/success`, **5/5**: `Backend build and tests`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom` (job `131043916664`), `Repository hygiene and static reports`, `Mobile TypeScript check`. `a11y-e2e`: **252 passed | 0 failed | 0 skipped (2.5m)** nad **32 rute**, artifact `playwright-a11y-report` ID **`13924239127`** / **331564 B** / SHA256 `735f02371338766b49288e49bddd249112f148e037ff5d6a3c001502edcb6ae2`. Rendered axe pokriva **default `classic`** = dokaz da klasični tok nije regresirao.

**Obrazložena odstupanja od koraka u §5 / popisa u §6:**
- ➖ **„novi `PageHeader` + `FormSection` po koraku" / „`aria-current` na steps":** `PublicReserve` već ima `role="progressbar"` + `aria-valuetext` i `fieldset/legend`; tačkice su `aria-hidden`. Dodavanje `aria-current` unutar skrivenog kontejnera ili novog `<h1>` bi promijenilo **`B`/`steps` semantiku** koju §4 zabranjuje, pa je zadržan postojeći, testovima zaključan oblik.
- ➖ **„nove `DataTable`/`StatusBadge` primitive" za listu rezervacija:** lista je već kartična (`MyReservationCard`) i `DataTable` bi tražio drugačiji oblik podataka iz API-ja → STOP uvjet iz §9. Umjesto toga su dodani `data-aurum-surface`, `<time>` i jedinstvena `aria-label` imena akcija bez diranja `partitionClientReservations`.
- ➖ **Stara imena testova u §6:** `test:public-reservation-error` **ne postoji** u `frontend/package.json`; stvarni ugovor pokrivaju `test:reservation-errors`, `test:public-reservation-accessibility`, `test:client-reservation-errors`, `test:campaign-unsubscribe-recovery`, `test:profile-api-errors`, `test:form-control-labels`, `test:amount-format-consistency`. Svi su zeleni u 204/204; nijedan nije mijenjan, pa „ažuriranje uz obrazloženje" nije bilo potrebno.
- ➖ **`ConfirmDialog` za otkazivanje rezervacije:** već postoji `CancelReservationDialog` (Radix `ResponsiveDialog`, `cancel-reason`, fokus-povratak). Zamjena bi promijenila validaciju razloga (S4: **nulta promjena validacija**), pa je zadržan.
- ➖ **Tastaturni end-to-end kroz 4 koraka i rendered axe za Aurum stanja:** 🟡 do S11 / ručne checkliste; CI log i dalje ima nepotpune `1.4.3` (8) / `2.5.3` (22) i poznate `1.4.6` AAA padove (28 violations / 70 čvorova). **Ne tvrdi se WCAG 2.2/AAA usklađenost**; `140/140`, `test:theme-ssot-sync` i `test:public-aurum-hero-contrast` su **source-only**.

**Sljedeći korak:** **STOP** → „Odobravaš li S5 (auth + onboarding + NotFound)?"; `PublicFeatureGate` se ne dira bez nove odluke.
