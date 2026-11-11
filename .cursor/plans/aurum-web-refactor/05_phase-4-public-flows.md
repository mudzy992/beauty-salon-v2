# S4 — Javni tokovi: Rezervacija, Moj termin, Moje rezervacije, Unsubscribe, Profil

**Status:** 🟡 čeka odobrenje S3 · **Najosjetljiviji segment: rezervacijski FSM i podaci.**

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

- ✅ 6 ekrana + dijeljene komponente u 3 stanja; rezervacijski FSM/validacije/idempotency/API **diff-om potvrđeno netaknuti**.
- ✅ Svi navedeni testovi zeleni; BS/EN paritet; build ≤300 KiB; CI 5/5.
- ✅ `ConfirmDialog` prije svake destruktivne radnje; fokus-povratak; `role=status/alert`.
- 🟡 Tastaturni end-to-end prolaz kroz 4 koraka rezervacije u renderu → S11 / ručna checklista.
- **STOP** → „Odobravaš li S5 (auth + onboarding + NotFound)?"

---

## 9. Rizici / pitanja

- **Najveći rizik:** vizuelni refaktor `PublicReserve` ne smije slučajno promijeniti redoslijed koraka ni uvjete `disabled` na „Dalje". Svaka takva promjena = funkcionalna → **STOP**.
- Ako novi `DataTable` traži drugačiji oblik podataka iz API-ja → **STOP** (Q10: API ugovori netaknuti).
- `Profile` dijele javni i stylist kontekst; ako Aurum izbornik teme nije dostupan u oba → pitanje u S5/S10.
- Ne izmišljati nove statuse rezervacije niti nove poruke grešaka; koristiti postojeće i18n ključeve.
