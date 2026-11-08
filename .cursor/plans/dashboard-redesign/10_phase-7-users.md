# Faza 7 — Korisnici

**Najveći fajl u repou: `pages/Users.tsx` = 1535 linija, 1 produkcijski fajl, 1 test.**
Osjetljivo: role, deaktivacija, privremene lozinke, write-off duga.

---

## 1. Inventar funkcionalnosti

| # | Kontrola | API |
|---|---|---|
| F1 | Lista korisnika (filteri, pretraga, paginacija) | `GET /api/users`, `/api/users/clients/admin`, `/api/users/stylists`, `/api/users/system-admins`, `/api/users/password-reset-candidates` |
| F2 | Novi / izmjena korisnika | `POST /api/users`, `PUT /api/users/${id}` |
| F3 | Provjera username-a | `GET /api/users/username-availability`, `/api/users/${id}/username-availability` |
| F4 | **Privremena lozinka** | `window.confirm` na `Users.tsx:432` |
| F5 | **Deaktivacija** | `window.confirm(t('users.confirmDeactivate', { username }))` (`:516`) |
| F6 | Dodavanje/uklanjanje role | `POST /api/users/${id}/roles`, `DELETE /api/users/${id}/roles/${roleName}`, `window.confirm` (`:629`) |
| F7 | **Uklanjanje stylist role** (sa preview-om) | `GET /api/users/${id}/stylist-removal-preview`, `POST /api/users/${removeStylistUser.id}/remove-stylist-role` |
| F8 | Write-off duga | `POST /api/client-debts/${debtToWriteOff}/write-off` |
| F9 | Toast / greške | `getErrorMessage` |

**Role guard logika i `client-debts` matrica — ne diraju se.**

## 2. Inventar podataka

Korisnik: `username`, `email`, ime/prezime, telefon, `roles[]`, `isActive`, avatar, `createdAt`.
Dugovi: `client-debts`. Privremene lozinke: `test:temporary-user-credentials` štiti ponašanje.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `PageHeader` + `FilterBar` + `DataTable` + `TablePagination` | 1.3.1 |
| D2 | **3× `window.confirm` → `ConfirmDialog`** (ista poruka, isti uslov, isti efekat, fokus na okidač) | 2.1.2, 3.3.4 |
| D3 | Forma: `fieldset`/`legend` po sekciji (osnovni podaci / role / lozinka), `aria-invalid`, `aria-describedby`, sažetak grešaka | 3.3.1–3.3.3 |
| D4 | `Search` ikona `text-slate-400` (`Users.tsx:952`) → `--text-muted` | 1.4.3 |
| D5 | Role badge-evi → `StatusBadge` (tekst + ikona) | 1.4.1 |
| D6 | Akcije po redu: jedinstvena imena („Deaktiviraj – {username}“) | 2.4.4, 4.1.2 |
| D7 | Stylist-removal preview → `ConfirmDialog` sa prikazom posljedica | 3.3.4 |
| D8 | Card prikaz tabele ispod 640px; ciljevi ≥24px | 1.4.10, 2.5.8 |

## 4. Razbijanje fajlova

```
features/users/
  users-page.tsx (< 100)
  users-table.tsx
  users-filters.tsx
  user-form-dialog.tsx
  user-form-fields.tsx
  user-roles-panel.tsx
  user-temporary-password-dialog.tsx
  user-deactivate-dialog.tsx
  stylist-removal-dialog.tsx
  debt-writeoff-dialog.tsx
  use-users-data.ts
  use-user-mutations.ts
  types.ts
  users.helpers.ts        ← getRoleLabel, getClientName, badge mapa
```

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.2 · 2.4.4 · **2.5.8** · 3.3.1–3.3.4 · 3.3.8 (privremena lozinka — paste dozvoljen) · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **1535 linija bez strukture** → lako se nešto izgubi | prvo napisati inventar + `test:users-parity` (API pozivi i payload-i), pa tek onda rezati |
| Role/deaktivacija = sigurnosno osjetljivo | guard logika i API pozivi netaknuti; samo UI sloj |
| `test:admin-user-list-contract` i `test:temporary-user-credentials` | moraju ostati zeleni **bez izmjene** |
| Samo 1 test za 1535 linija | dodati testove **prije** refaktora |

## 7. Testovi

**Postojeći:** `test:admin-user-list-contract`, `test:temporary-user-credentials`.
**Novi:** `test:users-parity` (endpointi + payloadi), `test:users-a11y` (bez `window.confirm`, jedinstvena imena akcija, fieldset/legend),
`test:users-temporary-password-paste` (3.3.8 — bez blokiranja paste-a).

## 8. Definition of Done

Standardni DoD + nijedan `window.confirm`; sve role/deaktivacije/privremene lozinke rade identično;
`Users.tsx` < 100 linija; nijedan fajl u `features/users` > 150 linija.

## 9. Obim

~14 fajlova (13 novih), 3 commita (tabela+filteri → forma+role → dijalozi).
