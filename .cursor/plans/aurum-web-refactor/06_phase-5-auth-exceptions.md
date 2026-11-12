# S5 — Auth + onboarding + NotFound

**Status:** ✅ **AKTIVAN 2026-11-11** — `approve_s5`; **O2 = `card_header`** (zaglavlje auth kartice). **Zatvara sve ekrane izvan tri shella.**

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

- ✅ 7 ekrana u 3 stanja; izbornik teme dostupan i van shellova (prema odobrenom mjestu iz §4).
- ✅ Guardovi/tokovi/`autocomplete`/OTP paste/busy-stale zaštite netaknuti; svi testovi zeleni.
- ✅ BS/EN paritet; build ≤300 KiB; CI 5/5; evidencija ažurirana.
- 🟡 Rendered fokus-redoslijed kroz auth tokove → S11.
- **STOP** → „Odobravaš li S6 (admin shell + Dashboard + Rezervacije + fullscreen kalendar)?"

---

## 9. Rizici / pitanja

- ✅ **Pitanje prije S5 razriješeno:** `card_header` (zaglavlje kartice, iznad `<h1>`); ne odlučuje se samostalno. Preostali rizici (fail-closed auth, `test:text-contrast-allowlist`, 3.3.7) ostaju aktivni.
- Auth rute su u CI fail-closed bez Redis-a; ne dirati rate-limiting, ne dirati `auth.setup.ts`.
- Ako Aurum tamna kartica padne kontrast s `test:text-contrast-allowlist` → **STOP**, ne ublažavati test.
- `Register` ima najviše polja; ne uvoditi `3.3.7` regresiju (ponovni unos istih podataka).
