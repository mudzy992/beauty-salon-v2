# S9 — Admin sadržaj + Postavke hub (+ 7 tabova)

**Status:** 🟡 čeka odobrenje S8 · **Zatvara svih 24 admin rute.**

---

## 1. Cilj

Refaktor preostalih admin ekrana prema NEJRA §05/§09/§11: Blog, Galerija, Recenzije i `SettingsHub` sa svih 7 tabova (operations, appearance, seo, releases, notifications, email, + postojeći). Zadržati sav sadržaj, sve postavke, sve `?tab=` deep-linkove i sve editore; napomena o Aurum paleti iz S1 ostaje vidljiva u tabu Izgled.

---

## 2. Ulaz

S8 završen (5/5); odluka o `window.confirm` poznata; `SettingsAppearance.tsx` iz S1 već ima Q9 napomenu; NEJRA §09 ima retke za ovaj segment.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/Blog.tsx`, `Gallery.tsx`, `Reviews.tsx`, `features/content/*`, `features/reviews/*`, `features/gallery/*` | **IZMJENA** — liste, editori, moderacija, galerija |
| `frontend/src/pages/SettingsHub.tsx`, `Settings.tsx`, `SettingsOperations.tsx`, `SettingsAppearance.tsx`, `SettingsSeo.tsx`, `AppReleases.tsx`, `Notifications.tsx`, `EmailSettings.tsx` | **IZMJENA** — hub + tabovi |
| `frontend/src/features/settings/*`, `features/email-settings/*`, `features/notifications/*`, `features/app-releases/*` | **IZMJENA (+ razbijanje `EmailSettings` ako mjera pokaže >150 ln)** |
| `frontend/src/features/shell/admin/tab-redirect.tsx` | **BEZ IZMJENE logike** |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |

---

## 4. Ugovor

- `SettingsHub` s 7 tabova i `?tab=` ostaje; svih 6 `TabRedirect` ruta (`/admin/settings/operations`, `/appearance`, `/seo`, `/app-releases`, `/notifications`, `/email-settings`) i `/admin/debtors` i dalje rade; `test:settings-hub-redirect` zelen.
- **Postavke:** isti ključevi (`theme_primary`, `theme_accent`, `app_logo*`, `public_feature_*`, SEO, maintenance, site pages/modules/comments, campaign consent, email templatei), iste validacije (`isSupportedHexColor`), isti `SettingsSocketSync` refresh, isti `getSetting` fallback. **Q9 napomena iz S1 se ne smije izgubiti.**
- **Sadržaj:** ista moderacija recenzija, isti blog editor (uključujući `blog_language`/SEO polja), ista galerija s tastaturnim reorderom i `DialogTitle`, isti bound-ovi paginacije, isti sanitizirani HTML preview u `EmailSettings` (raw HTML campaign mode ostaje).
- `window.confirm` u `Gallery`/`Reviews`/`EmailSettings`: zamjena `ConfirmDialog`om **samo ako je odobrena** u S6 (ista poruka/uvjet/efekat + fokus-povratak), uz upis u `CHANGELOG.md`.
- `3.3.4`: potvrda prije brisanja sadržaja, slanja kampanje, promjene sistemskih postavki; pregled prije slanja.
- `3.2.6 Consistent Help`, `4.1.3 status messages`, `role="status"`/`role="alert"`, bez otimanja fokusa.
- Bez novih zavisnosti, bez novih postavki, bez diranja backend-a.

---

## 5. Koraci

1. `SettingsHub`: novi `PageHeader` + tabovi s ispravnim ARIA obrascem, `aria-current` / `aria-selected`, tastaturnom navigacijom, bez promjene mapiranja `?tab=` → komponenta.
2. Svi settings editori: nove `FormSection`/`FormField` primitive s `fieldset/legend`, `Label` povezan `useId` ID-jem, `aria-describedby`, `aria-invalid`, `required` vidljivo + programski, sažetak grešaka s linkovima; zadržati `setting-editor-form.tsx` validaciju boja.
3. `SettingsAppearance`: provjeriti da je Q9 napomena („Aurum paleta aktivna → override neaktivan") i dalje tu, lokalizovana i povezana s trenutnim `useTheme()` stanjem; ne hard-code-ati boje.
4. `Blog`/`Gallery`/`Reviews`: nove `DataTable`/`StatusBadge`/`DataState`; jedinstvena imena akcija; moderacija s potvrdom; galerija s `2.5.7` alternativom i `admin-gallery-keyboard` ugovorom; blog `fieldset` za cijelu formu; `blog-language-a11y` ostaje.
5. `EmailSettings`: razbiti ako >150 ln; zadržati live sample preview, campaign/raw HTML mod, sve i18n ključeve i `eslint-a11y-severity` ugovor.
6. Aurum: semantički tokeni, serifni naslovi, zlato samo za primarnu akciju; tamna radna površina u Aurum tamnoj.

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje): `test:admin-blog-i18n`, `test:admin-reviews-i18n`, `test:admin-content-a11y`, `test:blog-language-a11y`, `test:admin-gallery-keyboard`, `test:admin-settings-seo-i18n`, `test:admin-settings-operations-appearance-i18n`, `test:admin-settings-accessibility`, `test:admin-settings-site-maintenance-i18n`, `test:admin-settings-site-home-i18n`, `test:admin-settings-site-contact-i18n`, `test:admin-settings-site-pages-i18n`, `test:admin-settings-site-modules-i18n`, `test:admin-settings-site-comments-i18n`, `test:settings-semantic-tokens`, `test:admin-settings-controls-a11y`, `test:settings-hub-redirect`, `test:admin-notifications-i18n`, `test:eslint-a11y-severity`, `test:generic-aria-and-row-actions`, `test:form-control-labels`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (`EmailSettings` 40,73 KiB baseline; `settings-module-page` 18,33 KiB) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `a11y-e2e` pokriva settings/content rute.

---

## 8. DoD + dokazi

- ✅ Svih 24 admin rute refaktorisano; `?tab=` i 6 redirecta rade; Q9 napomena vidljiva.
- ✅ Svi setting ključevi/validacije/editoriji netaknuti; svi navedeni testovi zeleni; BS/EN paritet.
- ✅ Build u budžetu; CI 5/5; `HANDOFF.md` s brojem preostalih potrošača starih šablona (treba biti 0 za admin prije S11).
- 🟡 Rendered email preview u stvarnom email klijentu ostaje ➖ (izvan opsega, kao i u baseline auditu).
- **STOP** → „Odobravaš li S10 (Stylist portal: 10 ekrana + 2 redirecta)?"

---

## 9. Rizici / pitanja

- `EmailSettings` raw HTML campaign mod: ne mijenjati dozvoljeni markup niti sanitizaciju; ako dizajn traži promjenu → **STOP** (backend/HTML ugovor).
- Ako se `SettingsHub` tabovi vizuelno objedine s nekim drugim hubom (Q10 dopušta grupisanje), to je **nova odluka** → STOP + mapa starih ruta, ne radi se u S9 bez pitanja.
- Napomena Q9 mora biti i18n ključ, ne hard-coded rečenica; `check_i18n.py --strict` to ne hvata, pa ga hvata `test:admin-settings-operations-appearance-i18n` / ručni pregled u STOP-sažetku.
- Ako `window.confirm` zamjena nije odobrena, ostaje postojeći mehanizam; ne miješati dva obrasca u istom modulu.
