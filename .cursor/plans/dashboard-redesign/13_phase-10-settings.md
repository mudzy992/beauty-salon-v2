# Faza 10 — Postavke (+ Operations, Appearance, SEO, EmailSettings, Notifications, AppReleases)

**24 produkcijska fajla / 3879 linija / 18 testova.** Ovdje živi paralelna „smeđa“ hex paleta i `EmailSettings.tsx` (1377 ln) sa vizuelnim editorom.
**Ovdje se odlučuje o objedinjavanju M2 (Q3).**

---

## 1. Inventar funkcionalnosti

| Ekran | Fajl | Linija |
|---|---|---:|
| Postavke sajta | `pages/Settings.tsx` (~160) → `features/settings/settings-module-page.tsx` (246) | — |
| Operacije | `pages/SettingsOperations.tsx` | — |
| Izgled | `pages/SettingsAppearance.tsx` | — |
| SEO | `pages/SettingsSeo.tsx` | — |
| Email | `pages/EmailSettings.tsx` | **1377** |
| Notifikacije | `pages/Notifications.tsx` | 376 |
| AppReleases | `pages/AppReleases.tsx` | — |

**Settings mehanizam (netaknut):** `useAdminSettings`, `registryMap`, `SettingGroup`, `setting-editor-*`
(boolean→switch, number→number, string→text — po `full-stack-workflow.mdc`), pretraga po grupama/poljima.
**API:** `/api/settings`, `/api/settings/registry`, `/api/settings/${key}`, `/api/uploads/public`,
`/api/app-releases`, `/api/app-releases/upload`, `/api/app-releases/${id}`,
`/api/notifications`, `/api/notifications/${id}/read`, `/api/notifications/preferences`,
`/api/notifications/campaigns/*` (audience, consent, send, `${id}`, cancel, retry).

**EmailSettings podsistemi:** SMTP postavke (uklj. „obriši lozinku“), šabloni, kampanje, vizuelni editor (drag&drop blokovi).

## 2. Inventar podataka

Svaki `setting key` ima: vrijednost, tip, grupu, labelu, opis, `helpText`, placeholder.
**Runtime brand override** (`theme_primary`, `theme_accent`) se podešava ovdje → **ne smije se hardkodirati** (§4 prompta).
Email šabloni: HTML + varijable. Kampanje: auditorij, consent, status, brojači.
AppReleases: verzija, APK fajl, changelog.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | **Ukloniti paralelnu hex paletu** iz `features/settings/*` (`#49332d`, `#9d735d`, `#9b735f`, `#fffaf6`, `#d9c4b5`, `#f3e8df`, `#6e493c`, `#fffdfa`) → semantički tokeni | 1.4.3, konzistentnost identiteta |
| D2 | Focus ring `#9b735f` (4.19:1) → `--focus-ring` (11.56:1) | 2.4.13 |
| D3 | `setting-editor-display.tsx:54` `suffix` u `text-slate-400` (**2.56:1 FAIL**) → `--text-muted` | 1.4.3 |
| D4 | Pretraga postavki: rezultat se najavljuje (`role="status"`, „Prikazano X od Y“); `aria-controls` već postoji | 4.1.3 |
| D5 | `EmailSettings`: 2× `window.confirm` (`:757`, `:880`) → `ConfirmDialog` | 3.3.4 |
| D6 | **Vizuelni email editor (2.5.7):** pored `draggable` blokova dodati dugmad **gore/dolje** i `aria-live` najavu | 2.5.7, 4.1.3 |
| D7 | SMTP lozinka: `autocomplete` dozvoljen, bez blokiranja paste-a; maskirano polje ima vidljivu labelu i „Obriši lozinku“ potvrdu | 3.3.8, 3.3.4 |
| D8 | Kampanje: slanje = 3.3.4 (legal/financial/data) → `ConfirmDialog` sa pregledom auditorija; retry „at-least-once“ upozorenje ostaje | 3.3.4 |
| D9 | Notifikacije: `role="status"` za nove; „Označi kao pročitano“ sa jedinstvenim imenom | 4.1.3, 2.4.4 |
| D10 | AppReleases upload → native input + `role="progressbar"` | 2.5.7 |
| D11 | **M2 (ako je odobren):** `/admin/settings` hub sa `?tab=site\|operations\|appearance\|seo\|email\|notifications\|releases`; stare rute → `<Navigate replace>` | 2.4.5, 3.2.3 |
| D12 | `SettingsShell` navigacija (4 kartice) → dosljedan pod-nav obrazac za sve tabove | 3.2.3 |

## 4. Razbijanje fajlova

```
features/email-settings/
  email-settings-page.tsx (< 120)
  smtp/smtp-panel.tsx · smtp-credentials-dialog.tsx
  templates/templates-panel.tsx · template-editor.tsx
  campaigns/campaigns-panel.tsx · campaign-audience.tsx · campaign-send-dialog.tsx · campaign-job-actions.tsx
  visual-editor/visual-editor.tsx · block-list.tsx · block-reorder-controls.tsx  ← 2.5.7
  use-email-settings.ts
features/notifications/  notifications-page.tsx · notifications-list.tsx · campaign-composer.tsx · use-notifications.ts
features/app-releases/   app-releases-page.tsx · release-form-dialog.tsx · use-app-releases.ts
features/settings/       ← tokeni + settings-shell bez hex-ova
```

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 1.4.11 · 2.1.2 · **2.5.7** · 2.5.8 · 3.2.3 · 3.2.6 · 3.3.1–3.3.4 · **3.3.8** · 4.1.2 (switch/number) · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Runtime brand override** — `theme_primary`/`theme_accent` se podešavaju ovdje | `test:brand-colors` zelen bez izmjene; ne hardkodirati brand boje |
| `admin-settings-accessibility.test.mjs` asertuje **doslovan** `className` na `<h1>` u `settings-shell.tsx` | test se ažurira na semantički token uz obrazloženje (garancija ostaje: jedan `h1` sa očekivanim stilom) |
| 18 testova u modulu | svi moraju ostati zeleni |
| `EmailSettings` 1377 linija sa 4 podsistema | jedan commit po podsistemu |
| M2 spajanje mijenja 7 ruta | bez odobrenja se ne radi |
| **Enkriptovane postavke** (`APP_SETTINGS_ENCRYPTION_KEY`) | ne dirati; `SOURCE_OF_TRUTH.md` upozorenje važi |

## 7. Testovi

**Postojeći (18):** `test:admin-settings-accessibility`, `test:admin-settings-seo-i18n`,
`test:admin-settings-operations-appearance-i18n`, `test:admin-settings-site-*-i18n` (6),
`test:email-settings-smtp-i18n`, `test:email-settings-templates-i18n`, `test:email-settings-campaigns-i18n`,
`test:email-visual-editor`, `test:admin-notifications-i18n`, `test:notifications-campaign-consent`,
`test:campaign-unsubscribe-recovery`, `test:app-releases-i18n`, `test:brand-colors`.

**Novi:** `test:settings-semantic-tokens` (bez hex-ova u `features/settings`),
`test:email-visual-editor-keyboard` (reorder dugmadima, 2.5.7), `test:settings-hub-redirect` (samo ako M2 odobren).

## 8. Definition of Done

Standardni DoD + nijedan hex u `features/settings`; `test:brand-colors` zelen bez izmjene;
vizuelni editor ima tastaturnu alternativu; nijedan `window.confirm`; `EmailSettings.tsx` < 120 linija.

## 9. Obim

~26 fajlova (16 novih), 4–5 commita (settings tokeni → SMTP/šabloni → kampanje → vizuelni editor → notifikacije/releases).
