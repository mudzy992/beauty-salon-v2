# Faza 4 — Finansije (KIF/KUF, knjige prihoda/rashoda, katalog kategorija, dužnici)

**Najrizičniji modul (novac).** 55 produkcijskih fajlova / 6798 linija / **21 test**.
Matrice: [`finance`](../../docs/matrices/finance/MATRIX.md) i [`client-debts`](../../docs/matrices/client-debts/MATRIX.md) — **ne mijenjaju se.**

---

## 1. Inventar funkcionalnosti

| Tab | Ruta | Feature fajlovi |
|---|---|---|
| Prihodi (KIF) | `/admin/finance?tab=income` | `income/income-books-tab.tsx`, `income-book-detail.tsx` (409), `income-entries-table.tsx`, `manual-entry-dialog.tsx` (249), `integrity-panel.tsx` |
| Rashodi (KUF) | `?tab=expense` | `expense/expense-books-tab.tsx`, `expense-book-detail.tsx` (369), `expense-table.tsx`, `expense-dialog.tsx`, `line-items-editor.tsx`, `expense-attachments.tsx`, `expense-invoice-preview.tsx` |
| Katalog kategorija | `?tab=categories` | `catalog/expense-categories-tab.tsx` (270), `category-fields-editor.tsx` (298), `category-wizard-dialog.tsx` |
| Dužnici | `?tab=debtors` (i `/admin/debtors` → redirect) | `pages/Debtors.tsx` (embedded prop) |

**Zajedničko (već postoji, koristi se kao temelj):** `components/data-state.tsx`, `confirm-dialog.tsx`,
`responsive-dialog.tsx`, `summary-cards.tsx`, `book-list.tsx`, `book-lock-controls.tsx`, `book-period-picker.tsx`,
`export-menu.tsx`, `history-panel.tsx`.

**API:** `/api/income-books`, `/api/expense-books`, `/api/expenses`, `/api/expense-categories`, `/api/expense-templates`,
`/api/client-debts`, `/api/client-debts/all`, `/api/client-debts/${id}/repay`, `/api/client-debts/${id}/write-off`,
`/api/uploads`, `/api/users/clients`.

## 2. Inventar podataka

**Netaknuto:** `finance.types.ts` (271 ln), `amounts`/proračuni, `export-safety.mjs` (HTML export sa escape-om),
`api/*.api.ts` slojevi, `hooks/use-*` (TanStack Query + `queryKeys`).

Formatiranje: `formatLocalizedAmount(value, i18n.language)`. Datumi: `shared/business-date.mjs`.

**Zbir/ukupno:** svaka knjiga ima svoje zbirove; `SummaryCards` ih prikazuje. Refaktor **ne smije** mijenjati izvor vrijednosti.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | **Finance postaje referentna implementacija šablona** — `data-state`, `confirm-dialog`, `responsive-dialog`, `summary-cards` se promoviraju u `features/shell/admin/ui/*` (faza 0), finance prelazi na njih | — |
| D2 | `SummaryCards` `hint` = `text-slate-400` (**2.56:1, FAIL**) → `--text-muted` | 1.4.3 |
| D3 | `SummaryCards` `tone` (positive/negative) mijenja **samo boju** → dodati ikonu/tekst | 1.4.1 |
| D4 | `expense-attachments.tsx:51` i `income-entries-table.tsx:219` — „—“ u `text-slate-400` → `--text-muted` + `sr-only` kontekst | 1.4.3 |
| D5 | `aria-sort` već postoji u `expense-table.tsx` i `income-entries-table.tsx` → **proširiti na sve tabele** i uskladiti obrazac | 4.1.2 |
| D6 | `<caption>` na sve tabele; `th scope` | 1.3.1 |
| D7 | CSV/print/izvoz: `export-menu.tsx` dobija `role="menu"` provjeru i jedinstvena imena | 4.1.2 |
| D8 | `category-wizard-dialog.tsx` (višekoračna forma): koraci kao tekst/`ol`, **3.3.7** — ne tražiti ponovno iste podatke | 3.3.7 |
| D9 | Dužnici: repay/write-off → `ConfirmDialog` sa razlogom (postoji `reasonLabel`) | 3.3.4 |
| D10 | Card prikaz tabela ispod 640px | 1.4.10 |

## 4. Razbijanje fajlova

`income-book-detail.tsx` (409) → `income/book-detail-header.tsx`, `book-detail-summary.tsx`, `book-detail-integrity.tsx`.
`expense-book-detail.tsx` (369) → isto. `category-fields-editor.tsx` (298) → `field-row.tsx` + `use-category-fields.ts`.

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 1.4.11 · 2.1.2 · 2.4.11 (sticky tab bar) · 3.3.1–3.3.4 · **3.3.7** · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Regresija proračuna** (KIF/KUF, dugovi, integrity resync) | ne diraju se `finance.types.ts`, `export-safety.mjs`, `api/*`, `hooks/*`; 21 test zelen; `test:finance-export-safety` bez izmjene |
| Premještanje `components/*` u `shell/admin/ui/*` lomi 21 test | re-export ili atomski commit; testovi se ažuriraju uz obrazloženje |
| `?tab=` deep-link | obrazac ostaje isti (`isFinanceTab`, `searchParams`) |
| Najveći chunk: `Finance` 102.85 kB raw / 25.99 kB gzip | bez novih zavisnosti |

## 7. Testovi

**Postojeći (21):** `test:finance-manual-entry-i18n`, `test:finance-manual-entry-accessibility`,
`test:finance-data-state-accessibility`, `test:finance-responsive-dialog-accessibility`,
`test:finance-confirm-dialog-accessibility`, `test:finance-export-safety`, `test:finance-read-recovery`,
`test:finance-integrity-resync-accessibility`, `test:finance-book-period-picker-accessibility`,
`test:finance-table-sort-accessibility`, `test:finance-client-picker-contract`, `test:debtors-i18n`,
`test:finance-expense-form-i18n`, `test:finance-expense-upload-recovery`, `test:finance-expense-list-i18n`,
`test:finance-income-list-i18n`, `test:finance-income-detail-i18n`, `test:finance-expense-detail-i18n`,
`test:finance-book-navigation-i18n`, `test:finance-expense-categories-i18n`, `test:finance-category-fields-accessibility`.

**Novi:** `test:finance-summary-parity` (zbir/ukupno: svaki isti izvor), `test:finance-table-a11y` (caption/scope na svim tabelama).

## 8. Definition of Done

Standardni DoD + **svaki zbir, iznos i status identičan**; `finance.types.ts`, `export-safety.mjs`, `api/*`, `hooks/*` bez diff-a;
`finance` i `client-debts` `MATRIX.md` ažurirani.

## 9. Obim

~20 fajlova, 4 commita (income → expense → katalog → dužnici).
