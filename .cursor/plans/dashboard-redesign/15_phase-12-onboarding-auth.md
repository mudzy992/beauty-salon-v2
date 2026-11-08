# Faza 12 — Onboarding / ForceChangePassword (+ Profile ako Q2 tako odluči)

**WCAG 3.3.8 Accessible Authentication je ovdje najkritičniji.**

---

## 1. Inventar funkcionalnosti

| Ruta | Guard | Page | Testovi |
|---|---|---|---|
| `/force-change-password` | `ProtectedRoute` | `pages/ForceChangePassword.tsx` | `test:force-change-password-i18n`, `-accessibility` |
| `/onboarding/gender` | `ProtectedRoute` | `pages/onboarding/OnboardingGender.tsx` | `test:onboarding-gender-i18n`, `-accessibility` |
| `/onboarding/email` | `ProtectedRoute` | `pages/onboarding/OnboardingEmail.tsx` | `test:onboarding-email-i18n`, `-accessibility` |
| `/profil` | javna ruta (`PublicLayout`) | `pages/Profile.tsx` (841 ln) | 7 testova — **Q2: u obimu ili ne** |

**ForceChangePassword:** trenutna lozinka (`autoComplete="current-password"`), nova (`new-password`), potvrda (`new-password`).
**OnboardingGender:** izbor spola (uticaj na `getClientMandatoryOnboardingPath`).
**OnboardingEmail:** email (`autoComplete="email"`) + **OTP verifikacija** (`OtpInput`).

## 2. Inventar podataka

`mustChangePassword` flag iz profila; `roles`; onboarding koraci iz `utils/clientOnboarding.ts`.
**Logika redoslijeda onboardinga se ne mijenja** — `ProtectedRoute` je vodi.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `ForceChangePassword` **nema `<h1>`** → `PageHeader` | 1.3.1, 2.4.6 |
| D2 | `OtpInput`: dodati `autocomplete="one-time-code"` na polja (paste cijelog koda **već radi** — `handlePaste`); zadržati `inputMode="numeric"`, `aria-label` po polju | **3.3.8** |
| D3 | **Nema blokiranja paste-a** ni u jednom polju (provjera `onPaste`/`onCopy` handlera) | **3.3.8** |
| D4 | **Bez kognitivnih testova** (nema „prepiši tekst sa slike“, nema memorisanja) — potvrđeno čitanjem koda | **3.3.8** |
| D5 | Polja: vidljiv `label`, `aria-describedby` (zahtjevi za lozinku), `aria-invalid`, `required` vizuelno + programski | 3.3.1–3.3.2 |
| D6 | Zahtjevi za lozinku prikazani **kao lista** (`ul`), ne samo bojom/ikonom | 1.4.1, 1.3.1 |
| D7 | Greške: `role="alert"` + `aria-live="polite"` (obrazac već postoji u `ui/input` testovima) | 3.3.1, 4.1.3 |
| D8 | `FormSection` + fokus na prvo polje sa greškom | 2.4.3 |
| D9 | Tokeni umjesto `slate-*` | 1.4.3 |
| D10 | **AAA 3.3.9:** bez vremenskog ograničenja za unos (2.2.1) — provjeriti da li backend ima timeout; ako da, to je **backend** pitanje → zabilježiti, ne mijenjati | 2.2.1 |

## 4. Razbijanje fajlova

```
features/onboarding/
  force-change-password-page.tsx
  password-requirements-list.tsx      ← NOVO (1.4.1)
  onboarding-shell.tsx                ← već postoji (build pokazuje OnboardingShell chunk)
  onboarding-gender-page.tsx
  onboarding-email-page.tsx
  otp-verification-panel.tsx
```

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 2.2.1 · 2.4.3 · 2.4.6 · 3.3.1 · 3.3.2 · 3.3.3 · **3.3.8** · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| `OtpInput` je **dijeljen** (koristi ga `Profile.tsx`) | promjena je aditivna (dodaje `autocomplete`); `Profile` se ne dira bez Q2 odluke |
| 6 postojećih testova asertuje markup | ažurirati uz obrazloženje |
| Onboarding redoslijed | `utils/clientOnboarding.ts` netaknut; `test:route-guards-i18n` zelen |

## 7. Testovi

**Postojeći:** `test:force-change-password-i18n`, `test:force-change-password-accessibility`,
`test:onboarding-gender-i18n`, `test:onboarding-gender-accessibility`, `test:onboarding-email-i18n`,
`test:onboarding-email-accessibility`, `test:profile-email-verification` (ako se dira `OtpInput`).

**Novi:** `test:otp-accessible-authentication` (paste cijelog koda, `autocomplete="one-time-code"`, bez blokiranja paste-a),
`test:onboarding-a11y` (jedan `h1`, `ul` za zahtjeve lozinke, `aria-invalid`).

## 8. Definition of Done

Standardni DoD + 3.3.8 zadovoljen za sva tri ekrana; `OtpInput` podržava paste i `autocomplete`;
onboarding redoslijed identičan; `Profile` diran **samo** ako Q2 tako odluči.

## 9. Obim

~8 fajlova (2 nova), 1–2 commita.
