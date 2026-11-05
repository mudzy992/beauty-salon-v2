# Finance module audit

- **Audit date:** 2026-11-05
- **Audited revision:** `57f6a80219c4f9a8aa1046b645a5e38637970c53` (synchronized with `origin/master` before this audit)
- **Status:** source review complete for the listed flows; remediation is phased and ongoing

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
- **Status:** Open; first remediation slice planned
- **Evidence:** `frontend/src/features/finance/export.utils.ts`, `printReport()` inserts the title, subtitle, headers, table cells, summary labels, and summary values directly into a string passed to `window.open()`'s document via `document.write()`.
- **Impact:** Expense titles/categories/notes and income service, stylist, or client names can contain user-controlled content. If a stored value contains markup/script, opening the generated report may interpret it as HTML in the print window. This is a stored HTML-injection/XSS risk by source inspection; an exploit was not run.
- **Remediation:** Centralize HTML text escaping for every dynamic text position; keep `lang` constrained to its current allowlist; detach the child window from `opener` where supported; add regression tests with markup payloads in each dynamic field.

### FIN-02 — CSV export does not defend against spreadsheet formulas or carriage-return cells

- **Priority:** P1 — security/data handling
- **Status:** Open; first remediation slice planned
- **Evidence:** `frontend/src/features/finance/export.utils.ts`, `escapeCsvCell()` quotes only double quotes, semicolons, and LF. It does not neutralize formula prefixes (`=`, `+`, `-`, `@`, including prefixes after whitespace/control characters) and does not quote CR.
- **Impact:** User-controlled report text may be interpreted as a spreadsheet formula when a CSV is opened in compatible spreadsheet software. An embedded CR can also break expected row structure. No spreadsheet application test was run.
- **Remediation:** Add a tested CSV-cell serializer that neutralizes formula-like strings before quoting and quotes both CR and LF, while preserving numeric values as numeric cells. Cover formula prefixes, whitespace/control prefixes, quotes, separators, CR/LF, and ordinary text.

### FIN-03 — Admin open-debts endpoint and screen retrieve an unbounded result set

- **Priority:** P2 — performance/availability
- **Status:** Open
- **Evidence:** `backend/src/finance/client-debts.controller.ts`, `GET /api/client-debts/all` is limited to `SYSTEM_ADMIN`/`OWNER`, but `backend/src/finance/client-debts.service.ts` `listAll()` performs an unpaginated `findMany`. `frontend/src/pages/Debtors.tsx` downloads that complete set and applies search/filtering in the browser.
- **Impact:** Response size and database work grow with historical/open debt volume; the admin list can become slow or memory-heavy. No production volume/load test was run.
- **Remediation:** Add stable server pagination and bounded search/filter parameters, a suitable index after query-plan review, and a paginated client contract. Preserve the existing authorization and verify totals/count semantics.

### FIN-04 — Debt-query failures can be presented as a genuine empty debt list

- **Priority:** P2 — correctness/recovery UX
- **Status:** Open
- **Evidence:** `frontend/src/pages/Debtors.tsx` uses the fetched rows for local filtering but has no explicit `query.isError` branch, so the empty filtered result can be rendered as “no open debts” after a failed read. `frontend/src/pages/Users.tsx` also catches client-debt read failures by setting `clientDebts` to `[]` in the edit-user view.
- **Impact:** A transient API/network failure is indistinguishable from a verified zero-debt result, weakening financial decision-making and recovery.
- **Remediation:** Add explicit error state and retry in both views; keep loading, error, empty, and data states distinct. Prevent responses for a previously selected client from overwriting the current client's debt state.

### FIN-05 — Income-book integrity failure can leave a permanent loading skeleton

- **Priority:** P2 — correctness/recovery UX
- **Status:** Open
- **Evidence:** `frontend/src/features/finance/income/income-book-detail.tsx` passes the integrity result, `isLoading`, and resync state to `frontend/src/features/finance/income/integrity-panel.tsx`, but not the integrity query's error/retry state. The panel renders a loading skeleton when no report exists.
- **Impact:** After the integrity request fails with no cached report, the integrity section can continue to look as if it is loading and offers no retry/error explanation. No browser/network-failure simulation was run.
- **Remediation:** Pass `isError` and `refetch` into the panel and render an accessible localized error/retry state distinct from loading and a valid empty report.

### FIN-06 — Expense-category lookup errors are collapsed into an empty category list in book detail

- **Priority:** P3 — correctness/recovery UX
- **Status:** Open
- **Evidence:** `frontend/src/features/finance/expense/expense-book-detail.tsx` passes `categoriesQuery.data ?? []` to the detail filters and expense form without exposing the category query's loading/error state. The category management tab itself does have an error/retry state.
- **Impact:** A failed lookup can make category-dependent filters or the add/edit form appear to have no categories rather than communicating a read failure; validation/submission behavior may then be confusing. Exact user-visible effect should be confirmed when the state handling is exercised.
- **Remediation:** Propagate category query loading/error/retry state into the detail/form as appropriate; do not block unrelated expense viewing if only the category lookup fails.

## Remediation phases

1. **Export safety (FIN-01, FIN-02):** add shared, unit-tested HTML and CSV serializers; wire focused tests into frontend CI; verify with focused tests and frontend typecheck/build. Do not claim browser exploit or spreadsheet-app verification unless those checks are separately performed.
2. **Read-state correctness (FIN-04, FIN-05, FIN-06):** separate loading/error/empty/data states and add retry; add targeted component/source-contract tests. Keep translation changes isolated in a dedicated i18n commit if required.
3. **Bounded debt listing (FIN-03):** implement paginated backend query/contract and frontend pagination/search together; add service/controller/API-contract tests and review database indexes. Verify existing authorization remains intact.
4. **Cross-module closeout:** rerun relevant Finance tests, frontend build, backend tests affected by the endpoint contract, inspect final diff, update statuses/evidence in this report, then proceed to the next module only after the Finance slices are committed and pushed.

## Verification log

- Initial static source review against the audited revision identified FIN-01 through FIN-06 above.
- No browser, production, load, spreadsheet application, or device verification has been performed.
