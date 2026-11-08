# Faza 5 — Lojalnost

Mali modul: `pages/Loyalty.tsx` (296 ln) + `features/loyalty` — ukupno **2 produkcijska fajla / 478 linija / 1 test**.

---

## 1. Inventar funkcionalnosti

| # | Kontrola | API |
|---|---|---|
| F1 | Lista loyalty računa (filteri, paginacija) | `GET /api/loyalty/accounts` |
| F2 | Detalj računa | `GET /api/loyalty/accounts/${id}` |
| F3 | Ručna korekcija bodova (+ razlog) | `POST /api/loyalty/accounts/${id}/adjust` |
| F4 | Iskorištavanje bodova | `POST /api/loyalty/accounts/${id}/redeem` |
| F5 | Postavke programa | `GET /api/loyalty/settings`, `GET/PUT /api/settings/${key}` |

**Netaknuto:** pravila obračuna bodova (backend), `loyaltyDiscountPercent`/`loyaltyDiscountAmount`/`loyaltyPointsUsed`
koje koriste Rezervacije i Dnevna knjiga.

## 2. Inventar podataka

Bodovi (broj), vrijednost, pragovi, status računa, historija transakcija. Formatiranje: `formatLocalizedNumber`,
`formatLocalizedAmount`. Datumi: `formatDateOnlyLocale` / `formatLocalizedDateTime`.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `PageHeader` (trenutno `Loyalty.tsx` ima 1 `<h1>` ✅) + `FilterBar` + `DataTable` + `TablePagination` | 1.3.1 |
| D2 | Adjust / redeem → `ConfirmDialog` (finansijska promjena = 3.3.4 „legal/financial/data“) | 3.3.4 |
| D3 | Stat kartice → `StatGrid` | 1.3.1 |
| D4 | `th scope`, `caption`, `aria-sort` ako postoji sortiranje | 1.3.1, 4.1.2 |
| D5 | Tokeni umjesto `slate-*` | 1.4.3 |
| D6 | Card prikaz tabele ispod 640px | 1.4.10 |

## 4. Razbijanje fajlova

```
features/loyalty/
  loyalty-page.tsx        (< 100)
  loyalty-accounts-table.tsx
  loyalty-account-detail.tsx
  loyalty-adjust-dialog.tsx
  loyalty-redeem-dialog.tsx
  loyalty-settings-panel.tsx
  use-loyalty-data.ts
  types.ts
```

## 5. WCAG stavke

1.3.1 · 1.4.3 · 1.4.10 · 2.1.2 · 3.3.1–3.3.4 · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| Bodovi = novčana vrijednost (koriste ih Rezervacije i Dnevna knjiga) | ne dirati API sloj ni pravila; `test:admin-loyalty-i18n` zelen |
| Samo 1 test → slaba sigurnosna mreža | dodati `test:loyalty-a11y` i `test:loyalty-parity` **prije** refaktora |

## 7. Testovi

**Postojeći:** `test:admin-loyalty-i18n`.
**Novi:** `test:loyalty-a11y`, `test:loyalty-parity` (adjust/redeem payload isti).

## 8. Definition of Done

Standardni DoD + bodovi/pragovi identični; `Loyalty.tsx` postaje tanka kompozicija (< 60 ln).

## 9. Obim

~8 fajlova (7 novih), 1–2 commita.
