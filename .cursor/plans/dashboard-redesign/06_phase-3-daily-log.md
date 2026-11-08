# Faza 3 — Dnevna knjiga

Matrica: [`.cursor/docs/matrices/daily-log/MATRIX.md`](../../docs/matrices/daily-log/MATRIX.md) — **izvor istine za poslovnu logiku, ne mijenja se.**

---

## 1. Inventar funkcionalnosti

`pages/DailyLog.tsx` (~120 ln, već tanka kompozicija) + `features/daily-log/` (**21 produkcijski fajl / 2922 linije / 7 testova**).

| # | Komponenta | Odgovornost |
|---|---|---|
| F1 | `entry-filters.tsx` | datum raspon, klijent, status |
| F2 | `entry-stats.tsx` | sažetak (iznosi, dugovi) |
| F3 | `entry-table.tsx` (293 ln) + `entry-table-helpers.tsx` + `entry-table-actions.tsx` | tabela + akcije po redu |
| F4 | `entry-form-dialog.tsx` (298) + `entry-form-fields.tsx` (320) + `use-daily-log-form.ts` (290) + `form-helpers.ts` | unos/izmjena |
| F5 | `pricing-panel.tsx` | cijena, bakšiš, popust |
| F6 | `entry-detail-dialog.tsx` + `entry-detail-helpers.ts` | detalj |
| F7 | `entry-delete-dialog.tsx`, `entry-restore-dialog.tsx` | brisanje/vraćanje (soft delete) |
| F8 | `entry-status-label.ts`, `amounts.ts`, `date-range.ts`, `types.ts` | **logika — NE DIRATI** |
| F9 | `use-daily-log-data.ts`, `use-daily-log-mutations.ts` | API + socket (`daily-log:updated`, `useReservationSocketRefresh`) |

**API:** `/api/daily-log`, `/api/daily-log/${id}`, `/api/daily-log/${id}/complete`, `/api/daily-log/${id}/restore`,
`/api/daily-log-clients`, `/api/client-debts`, `/api/loyalty/stylist/client/${clientId}`.

## 2. Inventar podataka

Iznosi: `amounts.ts` (**netaknut**). Formatiranje: `formatLocalizedAmount` / `formatLocalizedNumber`.
Datumi: `date-range.ts` + `shared/business-date.mjs`. Statusi: `entry-status-label.ts`.
Dugovi: `/api/client-debts` (matrica `client-debts`).

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `FilterBar` / `DataTable` / `StatGrid` / `FormSection` umjesto ad-hoc markupa | 1.3.1 |
| D2 | `entry-stats.tsx` → `StatGrid` (konsolidacija) | 1.3.1 |
| D3 | Forma: `fieldset`/`legend` po sekciji, `aria-describedby` za hint+grešku, `aria-invalid`, sažetak grešaka sa linkovima | 3.3.1–3.3.3 |
| D4 | **3.3.7 Redundant entry:** provjeriti da se klijent/usluga ne traže dvaput u istom toku (forma + pricing panel) | 3.3.7 |
| D5 | Delete/restore → `ConfirmDialog` (već postoje kao Dijalozi; konsolidovati) | 3.3.4 |
| D6 | `Search` ikona `text-slate-400` (`entry-form-fields.tsx:130,161`) → `--text-muted` | 1.4.3 / 1.4.11 |
| D7 | Card prikaz tabele ispod 640px | 1.4.10 |

## 4. Razbijanje fajlova

`entry-form-fields.tsx` (320) → `fields/client-picker.tsx`, `fields/service-picker.tsx`, `fields/amount-fields.tsx`.
`entry-form-dialog.tsx` (298) → kompozicija + `use-entry-form-submit.ts`. Cilj: svi fajlovi < 150 ln.

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.2 · 3.3.1–3.3.4 · **3.3.7** · 4.1.2 (combobox client picker) · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Iznosi i dugovi** — najosjetljiviji podaci poslije Finance | `amounts.ts` netaknut; 7 testova zeleno; uporedni prikaz prije/poslije |
| `use-daily-log-form.ts` (290 ln) drži složeno stanje | refaktor samo strukture, ne redukcije stanja |
| Client picker contract | `test:daily-log-client-picker-contract` zelen bez izmjene |

## 7. Testovi

**Postojeći:** `test:daily-log-list-i18n`, `test:daily-log-table-i18n`, `test:daily-log-dialog-accessibility`,
`test:daily-log-detail-i18n`, `test:daily-log-restore-delete-i18n`, `test:daily-log-form-i18n`,
`test:daily-log-client-picker-contract`.

**Novi:** `test:daily-log-form-a11y` (fieldset/legend/aria-invalid/sažetak grešaka), `test:daily-log-amount-parity`.

## 8. Definition of Done

Standardni DoD + svi iznosi/dugovi identični; `amounts.ts` bez diff-a; `MATRIX.md` + `CHANGELOG.md` daily-log ažurirani.

## 9. Obim

~14 fajlova (4 nova), 2–3 commita.
