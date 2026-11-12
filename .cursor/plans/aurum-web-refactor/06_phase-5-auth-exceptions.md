# S5 — Auth + onboarding + NotFound

**Status:** ✅ **ZAVRŠEN 2026-11-11** — `approve_s5` + O2 = `card_header`; commit `90acca2` (`90acca29ec760a48a0dea489c6f004c2d9409780`), CI run **`43181880043` = 5/5 success**, rendered axe **252 passed | 0 failed | 0 skipped** / 32 rute na default `classic`. **Zatvara sve ekrane izvan tri shella.**

---

## 1. Cilj

Refaktor 7 preostalih samostalnih ekrana (`/login`, `/register`, `/reset-password`, `/force-change-password`, `/onboarding/gender`, `/onboarding/email`, `*`) prema NEJRA §09/§11/§12, uključujući **postavljanje `ThemeSwitcher`-a na ekrane bez layouta** (Q3: sve web rute; Q8: izbornik dostupan svugdje). Bez promjene autentifikacijskih tokova, guardova i poruka grešaka.

---

## 2. Ulaz

S4 završen (5/5); `ThemeSwitcher` postoji i montiran je u 3 shella; NEJRA §12 definira gdje se izbornik pojavljuje na ekranima bez shella.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/Login.tsx` | **IZMJENA** — forma, `ThemeSwitcher`, `LanguageSwitcher` ako već postoji |
| `frontend/src/pages/Register.tsx` | **IZMJENA** — višepoljna forma, sažetak grešaka |
| `frontend/src/pages/ResetPassword.tsx` | **IZMJENA** — token čišćenje URL-a ostaje |
| `frontend/src/pages/ForceChangePassword.tsx` | **IZMJENA** — obavezna promjena lozinke |
| `frontend/src/pages/onboarding/OnboardingGender.tsx`, `OnboardingEmail.tsx` | **IZMJENA** — izbor / OTP |
| `frontend/src/pages/NotFound.tsx` | **IZMJENA** — recovery navigacija |
| `frontend/src/features/auth/*`, `features/onboarding/*` | **IZMJENA** — prezentački sloj; error mapping i validacija netaknuti |
| `frontend/src/components/ui/otp-input.tsx` | **BEZ IZMJENE** (3.3.8 ugovor) |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |
| `frontend/src/app/router.tsx` | **BEZ IZMJENE** (rute/guardovi ostaju) |

---

## 4. Ugovor

- Guardovi: `PublicOnlyRoute` (`/login`, `/register`), `ProtectedRoute` (`/force-change-password`, oba onboardinga), `/reset-password` bez guarda, `*` → `NotFound`. **Ništa se ne mijenja.**
- `3.3.8`: `autocomplete` na ime/email/telefon/lozinku, `one-time-code` za OTP, paste dozvoljen, password manager dozvoljen, bez kognitivnih testova, bez blokade paste-a.
- Zadržati: busy/duplicate/stale-request zaštite, `aria-live` statuse, `reset-password` čišćenje tokena iz URL-a, `OnboardingGender` `aria-pressed` grupu, OTP grupu s nazivom, sažetak grešaka s linkovima na polja, jedan `<h1>` po ekranu, `aria-describedby`/`aria-invalid`/`required`.
- `NotFound` ostaje jedina recovery navigacija; ne dodaju se nove rute.
- `ThemeSwitcher` na ovim ekranima: ✅ **RIJEŠENO odlukom `card_header` (2026-11-11)** — u **zaglavlju auth kartice**, uz logo i `LanguageSwitcher`, **iznad `<h1>`**; ne ide ispod forme. Zabilježeno u `CHANGELOG.md` §12 **prije implementacije**. Redoslijed polja, `<h1>` i primarni CTA ostaju netaknuti.

---

## 5. Koraci

1. Zajednički „auth kartica" obrazac (novi mali komponent u `features/auth/`): logo, `<h1>`, forma, `ThemeSwitcher` + `LanguageSwitcher`, jedan primarni CTA; Aurum varijanta s tamnom karticom i zlatnim CTA-om, klasična ostaje identična.
2. `Login` / `Register`: nove `FormSection`/`ErrorState`; zadržati `test:login-i18n` placeholder ključ, `test:login-accessibility`, `test:registration-errors`, `test:registration-accessibility`; sažetak grešaka s linkovima na polja za dužu registraciju.
3. `ResetPassword` / `ForceChangePassword`: zadržati 6-znak minimum, `autocomplete="new-password"`, busy/success/error najave, token cleanup, duplicate/stale zaštite.
4. Onboarding: izbor spola kao `role="group"` s `aria-pressed`; OTP `autocomplete="one-time-code"` + paste cijelog koda (ne dirati `otp-input.tsx`; ako dizajn traži izmjenu → **STOP + pitanje**).
5. `NotFound`: jedan `<h1>`, jedan primarni CTA na `/`, `ThemeSwitcher`, bez novih linkova.
6. i18n: svi novi stringovi (uključujući `aria-label` izbornika teme) u oba jezika.

---

## 6. Testovi

Zadržati zelenima: `test:login-i18n`, `test:login-accessibility`, `test:registration-errors`, `test:registration-accessibility`, `test:reset-password-accessibility`, `test:force-change-password-i18n`, `test:force-change-password-accessibility`, `test:onboarding-gender-i18n`, `test:onboarding-gender-accessibility`, `test:onboarding-email-i18n`, `test:onboarding-email-accessibility`, `test:onboarding-a11y`, `test:route-guards-i18n`, `test:wcag-source-contracts`, `test:form-error-suggestion`, `test:theme-switcher-a11y`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + build + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**. `a11y-e2e` i dalje pokriva auth rute u default stanju (CI ima Redis jer su auth rute fail-closed bez njega).

---

## 8. DoD + dokazi

- ✅ 7 ekrana u 3 stanja; izbornik teme + jezik u **zaglavlju kartice, iznad `<h1>`** (`card_header`).
- ✅ Guardovi/tokovi/`autocomplete`/OTP paste/busy-stale zaštite netaknuti; **204/204** `test:*` zeleno.
- ✅ BS/EN paritet **2730/2730**; build **281,6/300 KiB**; CI **5/5**; evidencija ažurirana.
- 🟡 Rendered fokus-redoslijed kroz auth tokove → S11; rendered axe za `aurum-light`/`aurum-dark` → S11.
- **STOP** → „Odobravaš li S6 (admin shell + Dashboard + Rezervacije + fullscreen kalendar)?"

---

## 9. Rizici / pitanja

- ✅ **Pitanje prije S5 razriješeno:** `card_header` (zaglavlje kartice, iznad `<h1>`); ne odlučuje se samostalno. Preostali rizici (fail-closed auth, `test:text-contrast-allowlist`, 3.3.7) ostaju aktivni.
- Auth rute su u CI fail-closed bez Redis-a; ne dirati rate-limiting, ne dirati `auth.setup.ts`.
- Ako Aurum tamna kartica padne kontrast s `test:text-contrast-allowlist` → **STOP**, ne ublažavati test.
- `Register` ima najviše polja; ne uvoditi `3.3.7` regresiju (ponovni unos istih podataka).

## 10. Realizacija S5 (2026-11-11) — dokazi i obrazložena odstupanja

**Odobrenje:** `ask_user s5_approval` → **`approve_s5`** („plan → implementacija → 5/5 CI → evidencija → STOP"; bez diranja auth tokova, guardova, poruka grešaka, `PublicFeatureGate`-a i bez novih odluka o paleti). **O2 (`s5_theme_switcher_place`) → `card_header`**: `ThemeSwitcher` + `LanguageSwitcher` u **zaglavlju kartice, iznad `<h1>`**. Odluka je upisana u `CHANGELOG.md` §12 **prije** ikakve izmjene koda, a `HANDOFF.md` O2 je zatvoreno.

**Implementirano (13 fajlova / +156 −24):** novi `features/auth/auth-card-header.tsx` (24 linije) + 6 samostalnih ekrana + `components/OnboardingShell.tsx` (pokriva `ForceChangePassword`, `OnboardingGender`, `OnboardingEmail`) + `globals.css` (84 append-only Aurum-only linije, `postcss.parse` **124 pravila**). Svih 7 ruta ima `data-aurum-page` + `data-aurum-auth-page`, kartice `data-aurum-auth-card`/`data-aurum-surface`, primarni CTA `data-aurum-cta="primary"`, onboarding koraci `data-aurum-progress`, savjet `data-aurum-auth-tip`, banner `data-aurum-auth-banner`. `NotFound` je dobio jedan `<h1>` umjesto `<div>404</div>` (2.4.6; nijedan source-contract ga nije zaključao).

**Ključna odluka:** **nema `useTheme()` u S5**. Nijedna grana se ne razlikuje po stanju — oba Aurum stanja dijele iste `--aurum-*` / `hsl(var(--*))` tokene, pa je dovoljan CSS `[data-skin="aurum"]`. Time je izbjegnut svaki rizik za `test:hooks-order` i sačuvan doslovni klasični markup. S2/S3/S4 CSS blokovi (`:432`, `:646`, `:811`) imaju **0 uklonjenih linija**; novi blok ne definira nijednu CSS promjenljivu niti tvrdi boju; bez `data-skin="aurum"` klasični prikaz je identičan, uz **jedinu namjernu iznimku** — odobreni red s izbornikom teme/jezika (Q8 / NEJRA §12). Nema novih stringova → `bs.json`/`en.json` **0 diff**, **2730/2730**.

**Ugovor netaknut (`git diff -U0 -- frontend/src`):** svi `api.post`/`api.put`, `/auth/*` endpointi, `getRegistrationErrorKey`, `getPostAuthRedirectPath`, `getClientMandatoryOnboardingPath`, `replaceToken`/`refreshProfile`, `loginRequestGeneration`/`registrationRequestGeneration`/`requestGeneration`/`*InFlight`, `previousToken` cleanup i `window.history.replaceState`, `minLength={6}`/`{8}`, `autoComplete` tokeni (`username`, `current-password`, `new-password`, `email`, `tel`, `given-name`, `family-name`), `aria-busy`/`role="status"`/`role="alert"`, `aria-describedby="newPasswordRequirements"`, `aria-pressed` za spol, `fieldset/legend`, `<OnboardingShell>` na 3 stranice, `components/ui/otp-input.tsx`, `PublicOnlyRoute`/`ProtectedRoute`/`StylistRoute`, `app/router.tsx`, `PublicFeatureGate`, `/backend`, `/mobile`, `package-lock.json`, `frontend/package.json`, `ci.yml`. **Nijedan test nije diran, oslabljen ni dodan**; nema novih `test:*` skripti ni npm zavisnosti.

**Lokalno izmjereno:** **204/204** `test:*` PASS / 0 FAIL; 5 Python gate-ova PASS (`check_repo_hygiene` **1789 → 1790 nakon commit-a**, `check_ci_index` **385/388**, `check_doc_links` **687/222**, `check_i18n.py --strict` **2730/2730**, `check_ui_contrast.py --strict` **140/140 source-only**); `npm run build` **281,6 / 300 KiB** gzip (**+0,3 KiB** prema S4 281,3; analytics 114,7/140, calendar **100,1/125**); `npm run typecheck:e2e` 0; `npm run lint` **0 grešaka / 7 poznatih warninga**; `git diff --check` čist; `postcss.parse` **124 pravila**.

**CI dokaz:** commit **`90acca2`** (`90acca29ec760a48a0dea489c6f004c2d9409780`), run **`43181880043`** = `completed/success`, **5/5**: `Backend build and tests`, `Frontend typecheck and production build`, `Rendered a11y (axe) nad izolovanom CI bazom` (job `131059574192`), `Repository hygiene and static reports`, `Mobile TypeScript check`. `a11y-e2e`: **252 passed | 0 failed | 0 skipped (2.4m)** nad **32 rute**, artifact `playwright-a11y-report` ID **`13926547985`** / **331785 B** / SHA256 `327fbb67622b9e59667d929fb12babfafcaf31ea67d7ff0fd4f12afa117042f5`. Rendered axe pokriva **default `classic`** = dokaz da klasični auth tok nije regresirao. Coverage `2.5.3` se pomjerio sa `passed 6 / incomplete 22 / inapplicable 4` na **`passed 9 / incomplete 22 / inapplicable 1`** jer su na `/login` i `/register` dodana 4 dugmeta s pristupačnim imenom; **violations i dalje 0**. `1.4.3` (8 ruta / 18 čvorova) i `2.5.3` (22 čvora) ostaju NEPOTPUNO, `1.4.6` AAA ostaje **PAD** (28 violations / 70 čvorova).

**Obrazložena odstupanja od §5:**
- ➖ **Jedan veliki „auth kartica" komponent s logom, `<h1>` i formom:** oblik `<h1>` u `Login`/`Register`/`ResetPassword`/`OnboardingShell` zaključava 5 source-contract testova doslovnim regexom, a redoslijed polja i `autocomplete` je zabranjeni ugovor. Umjesto restrukturiranja napravljen je **mali `AuthCardHeader`** (samo red s izbornicima) i zadržan postojeći `OnboardingShell`; time je „zajednički obrazac" ostvaren bez diranja ijednog locked markupa.
- ➖ **Nove `FormSection`/`ErrorState`/`DataTable` primitive u auth formama:** uvođenje bi promijenilo redoslijed polja i `aria-describedby` koje §4 zabranjuje; stil je ostvaren kroz `data-aurum-*` + CSS.
- ➖ **Novi i18n ključevi:** `ThemeSwitcher` i `LanguageSwitcher` već imaju `shell.theme.*` / `shell.*` ključeve u oba jezika; nijedan novi vidljivi string nije uveden, pa je `check_i18n.py --strict` ostao zelen bez izmjene lokalnih fajlova.
- ➖ **Sažetak grešaka s linkovima na polja za `Register`:** greške idu kroz `toast.error(t(getRegistrationErrorKey(...)))`; uvođenje polje-specifičnog sažetka bi diralo error mapping koji je u §4 zabranjen. Zadržani su `fieldset/legend`, `required`, `minLength`, `autoComplete`.
- ➖ **`otp-input.tsx`:** **0 diff** (3.3.8 ugovor); `autocomplete="one-time-code"` i paste rade kao i prije.
- ➖ **Rendered fokus-redoslijed i axe za `aurum-light`/`aurum-dark`, 320 px / 400%, čitač ekrana, `1.4.6` AAA:** 🟡 do S11 / ručne checkliste. **Ne tvrdi se WCAG 2.2/AAA usklađenost**; `140/140` i `test:theme-ssot-sync` su **source-only**.

**Sljedeći korak:** **STOP** → „Odobravaš li S6 (admin shell + Dashboard + Rezervacije + fullscreen kalendar)?"; O3 (grupisanje navigacije + `ThemeSwitcher` u fullscreen kalendaru) i O4 (`window.confirm` u adminu) ostaju otvorena pitanja.
