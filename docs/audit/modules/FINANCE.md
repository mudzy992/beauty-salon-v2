# Finance module audit

- **Audit date:** 2026-11-05
- **Audited revision:** `57f6a80219c4f9a8aa1046b645a5e38637970c53` (synchronized with `origin/master` before this audit)
- **Status:** source review complete for the listed flows; export-safety fixes are implemented, remaining phases are open

## Scope and evidence

This report covers the admin Finance UI and directly connected endpoints reviewed in this pass: KUF/expense books, KIF/income books, CSV and print exports, expense-category lookups, integrity reporting, and the admin open-debts list. Stylist workbooks and daily-log entry flows are separate modules, even where their records feed Finance.

Findings below are **source-inspection findings**. No production data, production logs, browser exploit, spreadsheet application, device, or live deployment was used to verify impact. Static evidence is cited by repository path and symbol/flow so later implementation can be rechecked against source.

### Positive controls observed

- Finance book, expense, and income controllers are role-restricted to `SYSTEM_ADMIN`/`OWNER` at the controller level.
- Income and expense book lists already distinguish query errors and expose retry states.
- Finance client lookups use the bounded `GET /api/users/clients` picker rather than downloading the full user list.

## Findings

### FIN-01 — Unescaped report data is written into a print document

- **Priority:** P1 — security
- **Status:** Fixed in source; focused regression coverage added
- **Evidence:** At the audited revision, `frontend/src/features/finance/export.utils.ts`, `printReport()` inserted the title, subtitle, headers, table cells, summary labels, and summary values directly into a string passed to `window.open()`'s document via `document.write()`.
- **Impact:** Expense titles/categories/notes and income service, stylist, or client names can contain user-controlled content. If a stored value contains markup/script, opening the generated report may interpret it as HTML in the print window. This is a stored HTML-injection/XSS risk by source inspection; an exploit was not run.
- **Remediation:** Implemented shared HTML text escaping for every dynamic text position, retained the `lang` allowlist, detached the child window from `opener`, and added regression tests with markup payloads in each dynamic field.

### FIN-02 — CSV export does not defend against spreadsheet formulas or carriage-return cells

- **Priority:** P1 — security/data handling
- **Status:** Fixed in source; focused regression coverage added
- **Evidence:** At the audited revision, `frontend/src/features/finance/export.utils.ts`, `escapeCsvCell()` quoted only double quotes, semicolons, and LF. It did not neutralize formula prefixes (`=`, `+`, `-`, `@`, including prefixes after whitespace/control characters) and did not quote CR.
- **Impact:** User-controlled report text may be interpreted as a spreadsheet formula when a CSV is opened in compatible spreadsheet software. An embedded CR can also break expected row structure. No spreadsheet application test was run.
- **Remediation:** Implemented a tested CSV-cell serializer that neutralizes formula-like strings before quoting and quotes both CR and LF, while preserving numeric values as numeric cells. Coverage includes formula prefixes, whitespace/control prefixes, quotes, separators, CR/LF, and ordinary text.

### FIN-03 — Admin open-debts endpoint and screen retrieve an unbounded result set

- **Priority:** P2 — performance/availability
- **Status:** Open
- **Evidence:** `backend/src/finance/client-debts.controller.ts`, `GET /api/client-debts/all` is limited to `SYSTEM_ADMIN`/`OWNER`, but `backend/src/finance/client-debts.service.ts` `listAll()` performs an unpaginated `findMany`. `frontend/src/pages/Debtors.tsx` downloads that complete set and applies search/filtering in the browser.
- **Impact:** Response size and database work grow with historical/open debt volume; the admin list can become slow or memory-heavy. No production volume/load test was run.
- **Remediation:** Add stable server pagination and bounded search/filter parameters, a suitable index after query-plan review, and a paginated client contract. Preserve the existing authorization and verify totals/count semantics.

### FIN-04 — Debt-query failures can be presented as a genuine empty debt list

- **Priority:** P2 — correctness/recovery UX
- **Status:** Fixed in source; source-contract regression coverage added
- **Evidence:** At the audited revision, `frontend/src/pages/Debtors.tsx` used the fetched rows for local filtering but had no explicit `query.isError` branch, so the empty filtered result could be rendered as “no open debts” after a failed read. `frontend/src/pages/Users.tsx` also caught client-debt read failures by setting `clientDebts` to `[]` in the edit-user view.
- **Impact:** A transient API/network failure was indistinguishable from a verified zero-debt result, weakening financial decision-making and recovery.
- **Remediation:** Added explicit error/retry state to both views and kept loading, error, empty, and data states distinct. The user editor now uses a client-scoped query key, preventing a previous client's response from replacing current-client state; failed/loading totals are not shown as zero.

### FIN-05 — Income-book integrity failure can leave a permanent loading skeleton

- **Priority:** P2 — correctness/recovery UX
- **Status:** Fixed in source; source-contract regression coverage added
- **Evidence:** At the audited revision, `frontend/src/features/finance/income/income-book-detail.tsx` passed the integrity result, `isLoading`, and resync state to `frontend/src/features/finance/income/integrity-panel.tsx`, but not the integrity query's error/retry state. The panel rendered a loading skeleton when no report existed.
- **Impact:** After the integrity request failed with no cached report, the integrity section could continue to look as if it was loading and offer no retry/error explanation. No browser/network-failure simulation was run.
- **Remediation:** The detail now passes `isError` and `refetch` into the panel. The panel renders an accessible shared error/retry state distinct from loading and a valid report.

### FIN-06 — Expense-category lookup errors are collapsed into an empty category list in book detail

- **Priority:** P3 — correctness/recovery UX
- **Status:** Fixed in source; source-contract regression coverage added
- **Evidence:** At the audited revision, `frontend/src/features/finance/expense/expense-book-detail.tsx` passed `categoriesQuery.data ?? []` to detail filters and the expense form without exposing the category query's loading/error state. The category management tab itself already had an error/retry state.
- **Impact:** A failed lookup could make category-dependent filters or the add/edit form appear to have no categories rather than communicating a read failure; validation/submission behavior could then be confusing.
- **Remediation:** The detail now exposes category loading/error/retry while leaving the expense table visible. The form reports and retries lookup errors and disables submission only when no category data is available.

## Remediation phases

1. **Export safety (FIN-01, FIN-02) — complete in source:** added shared, unit-tested HTML and CSV serializers, wired focused tests into frontend CI, and verified with focused tests plus frontend typecheck/production build. Browser exploit and spreadsheet-app verification remain unperformed.
2. **Read-state correctness (FIN-04, FIN-05, FIN-06) — complete in source:** separated loading/error/empty/data states, added retry, and added source-contract regression tests. Existing generic Finance state copy was reused; no translation changes were needed.
3. **Bounded debt listing (FIN-03) — open:** implement paginated backend query/contract and frontend pagination/search together; add service/controller/API-contract tests and review database indexes. Verify existing authorization remains intact.
4. **Cross-module closeout:** rerun relevant Finance tests, frontend build, backend tests affected by the endpoint contract, inspect final diff, update statuses/evidence in this report, then proceed to the next module only after the Finance slices are committed and pushed.

## Verification log

- Initial static source review against the audited revision identified FIN-01 through FIN-06 above.
- `npm run test:finance-export-safety` — passed (4 focused regression tests).
- `npm run test:finance-read-recovery` — passed (4 source-contract recovery tests).
- Relevant existing Finance/UI contracts passed: `test:debtors-i18n`, `test:finance-income-detail-i18n`, `test:finance-expense-detail-i18n`, and `test:admin-user-list-contract`.
- `npm run build` in `frontend/` — passed, including TypeScript project build and Vite production build. Vite emitted the existing large-chunk advisory (>500 kB).
- Targeted ESLint was not completed: the frontend install did not provide the configured ESLint binary, and `npx` selected ESLint 10, which cannot consume this repository's legacy config. No source lint result is claimed.
- No browser, production, load, spreadsheet application, or device verification has been performed.
