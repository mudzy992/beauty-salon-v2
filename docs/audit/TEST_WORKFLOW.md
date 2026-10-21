# Reproducibilan test workflow

**Datum:** 2026-10-21 (UTC)<br>
**Audit evidence:** [FINDINGS.md](FINDINGS.md) · [Arhitektura](ARCHITECTURE.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [CI scope](CI.md)

## 1. Test safety / preconditions

- Testirati samo na local/disposable DB i accounts. **Nikada ne koristiti production `DATABASE_URL`, production push tokens, SMTP recipients ili stvarne client fotografije.**
- Pri implementaciji koristiti ignored local env fajlove iz safe `.env.example`; nikad kopirati pravi secret u tracked file, log, screenshot ili test fixture.
- Testni data mora biti sintetički/anonymized i removable. Finance tests koriste isolated `beauty_salon_test` DB/period, ne shared DB.
- Prije DB-backed tests utvrditi PostgreSQL major verziju koja je deployed; lokalni/CI service mora odgovarati. Repo ne definiše DB version/service.
- Ne pokretati `prisma migrate dev` na staging/production; deployment migrations imaju odvojenu runbook/review.
- Database tests/race scenarios ne pokretati paralelno nad istom DB schema-om osim ako test harness pravi per-worker DB/schema.

## 2. Baseline provedene u ovom auditu

- `npm ci --no-audit --no-fund` prošao u `backend/`, `frontend/`, `mobile/`.
- Frontend `npm run build` prolazi (Vite warning za ~2,000 kB JS chunk).
- Mobile `npx tsc --noEmit` prolazi (raniji audit run).
- From `backend/`, `npm run test:blog-sanitizer` passes 2/2, `npm test -- --runInBand src/blog` passes 4 suites/16 tests, and `npm test -- --runInBand src/security/security-contract.spec.ts` passes 3 in-process Nest HTTP contract tests (real routing/JWT/role guards, mocked services; no database).
- Backend full build/test/Prisma checks nisu potpuno potvrđeni: generated client/engine download je blokiran sandbox TLS problemom.
- Browser, Playwright, mobile device, real SMTP/push, PostgreSQL race and live/production endpoints are untested.
- `npm audit --omit=dev --json` bilježi findings u [FINDINGS.md § SCM-01](FINDINGS.md#scm-01--npm-audit-snapshot-sadrži-61-advisory-među-njima-2-critical); `npm audit fix` nije pokrenut.

## 3. Machine/tool prereqs

- Node.js 22.x (usklađeno s backend Docker builder); npm included version; Git.
- PostgreSQL: disposable instance iste major verzije kao deployment za migration/integration workflow.
- Docker/Compose po želji za local DB/E2E; audit sandbox nema Docker CLI, zato Docker workflow nije lokalno izvršen.
- `npm ci` se pokreće odvojeno po svakoj aplikaciji — nema repo root lockfile/package.
- Prisma engine/client prvi put može zahtijevati pristup npm/Prisma engine downloadu. U audit sandboxu TLS prekinuo engine preuzimanje; ponoviti u standardnom CI/dev networku ili preconfigured cache-u, ne koristiti neprovjeren generated artifact.

## 4. Čista instalacija i baseline checks

```bash
cd backend && npm ci --no-audit --no-fund
cd ../frontend && npm ci --no-audit --no-fund
cd ../mobile && npm ci --no-audit --no-fund
```

Nakon promjena: `git status --short` i `git diff --check`; pregledati da `npm ci` nije izmijenio lockfiles/untracked generated files.

### Static repo checks (branch deliverables)

```bash
python3 scripts/check_repo_hygiene.py
python3 scripts/check_doc_links.py
python3 scripts/check_i18n.py                 # report-only dok legacy gaps postoje
python3 scripts/check_ui_contrast.py          # report-only dok paleta ne bude popravljena
```

`--strict` opcije su gate za novo stanje nakon baseline cleanup-a; ne prikrivati postojeće gaps. Repo hygiene check je gate od početka.

## 5. Backend local test sequence

### 5.1 Prisma client, schema i compile

U `backend/` i uz local disposable env:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run lint
```

- `db:generate` mora završiti prije Jest suite-a koji importuje `@prisma/client`.
- `db:validate` čita Prisma config/schema, ne dokazuje konekciju/permissions/target deployment status.
- `npm run lint` je read-only nakon ovog audit tooling change-a; `npm run lint:fix` je namjerno mutirajući i pokreće se samo kad se želi automatsko uređivanje. Prvobitni backend lint baseline imao je hiljade diagnostics uz missing client; prvo generisati client i klasificirati/fixati baseline.
- Build ne zamjenjuje tests ni migrations test.

### 5.2 Unit suite

```bash
npm run test:blog-sanitizer
npm test -- --runInBand src/blog
npm test -- --runInBand src/security/security-contract.spec.ts
npm test -- --runInBand
```

The Node test runner is used for the direct sanitizer regression because the current Jest CJS runtime cannot load sanitize-html's ESM parser dependency directly; blog Jest specs mock the sanitizer module at the service/controller boundary, while the Node test exercises the real package. BlogService tests verify create/update/public-read paths call the sanitizer. The security contract suite starts a local Nest HTTP app with the actual JWT/role guards but mocked data services; it checks route status/response boundaries, not Prisma queries or DB behavior. Run the independent sanitizer regression before the full Jest suite so its result is retained if a later suite fails. Očekivanje nakon generated client/network setup-a: pokrenuti cijeli backend Jest suite (`src/**/*.spec.ts`); test fail se istražuje, ne preskače radi zelenog statusa. Coverage:

```bash
npm run test:cov -- --runInBand
```

Nema tracked `backend/test/jest-e2e.json` i `backend/test/` direktorija na baseline-u, pa je postojeći `npm run test:e2e` trenutno nevažeći. Kreirati test config/fixtures prije upotrebe te komande.

### 5.3 PostgreSQL migration/integration suite

1. Napraviti empty disposable DB iste major verzije kao deployment.
2. Postaviti `DATABASE_URL` iz local environment/secret managera; ne echo-ati/printati je.
3. Iz `backend/`:

```bash
npm run db:validate
npm run db:migrate:deploy
npm run db:migrate:status
```

4. Seed samo nakon pregleda [`backend/prisma/seed.ts`](../../backend/prisma/seed.ts) — provjeriti da seed ne kreira production-like shared credentials. Koristiti dedicated integration fixtures.
5. Integracijski testovi planirani su za `backend/test/` (Prisma real DB, no prod data). Na trenutnom baseline-u e2e config nedostaje.
6. Po završetku ugasiti test DB/volume i očistiti sintetičke push/email/test user podatke.

### 5.4 Obavezni backend security/business contract tests

| Area | Test matrix |
|---|---|
| Public reviews | Anonymous detail/list; approved vs unapproved; serializer ne sadrži password hash, verification data, email/phone/social IDs. |
| Users/clients | CLIENT self/other, STYLIST, OWNER/ADMIN; forbidden field absence; default/max pagination. |
| Debt privacy | Own stylist/other stylist/unrelated client/admin matrix; policy expectation confirmed by product owner. |
| Uploads | Anonymous public asset vs private document, owner/other-owner delete, attachment referenced delete, MIME spoof/size/traversal, retention. |
| Before/after | No consent hidden, consented visible, revoked hidden, deleted/completed policy, response paths. |
| Blog/comments/reviews | Public defaults published/approved only; admin preview protected; `sanitizeBlogContent` allows intended formatting but removes active HTML, unsafe protocols/attributes; legacy public slug content is sanitized too; HTML payloads inert. |
| Auth | Missing/weak production secrets fail startup; rate limits; verification expiry/replay; reset token single-use; forced password blocks protected mutation endpoints. |
| Socket.IO | Anonymous sees only allowlisted public events; PRIVATE setting never broadcast; removed role loses admin room; expired/revoked token rejected. |
| Booking | Inactive service rejects; stale slot; policy/penalty; multi-service duration; idempotent retry; cancelled/lock expiry. |
| Booking race | `N` simultaneous requests to same one-capacity stylist/date/time: one active booking; legal separate stylist capacity remains available. |
| Daily log/KIF | Inject failure at each state transition; retry completion yields exactly one KIF entry/loyalty earn; outbox retry is idempotent. |
| Debt repayment | Two concurrent repayment requests result in one settlement/payment/ledger entry; repeat idempotency key returns prior result. |
| Loyalty | Atomic balance cannot go below zero; reservation marker and transaction commit together; replay/reversal idempotent. |
| Finance book | Close-vs-expense write, close-vs-manual income, double lock/unlock, cancellation count parallel increment. |
| Time | `TZ=UTC` and `TZ=Europe/Sarajevo`; 00:00–02:30 local, month boundary, CET/CEST transitions, business date filters. |

Use transaction barriers/two Prisma clients for race tests. A pair of sequential Jest mocks does not prove a PostgreSQL race is closed.

## 6. Frontend workflow

### Current checks

```bash
cd frontend
npm run build
npm run lint
```

- `build` executes `tsc -b` and `vite build`; preserve and review Vite bundle-size warning.
- `lint` is not an established gate until ESLint dependency/config are present and legacy errors resolved. The command must not mutate source.
- No frontend test runner/test files were detected in baseline.

### Add as implementation progresses

- Vitest/RTL component tests for auth/role gates, booking step validation, inactive catalog filtering, amount/date helpers, locale/theme.
- Playwright public/admin/stylist smoke tests against disposable seeded API; do not test through a real production API.
- Security contract tests must verify API response schema independently from what UI renders.
- `@axe-core/playwright` for automated WCAG checks + manual keyboard/focus/contrast/zoom/screen reader review.
- Network/timezone tests use explicit test clock/timezone; do not rely on runner local timezone.

Suggested browser flows: public home/services/blog/reviews; login/onboarding/forced password; client booking and cancellation; stylist inbox/accept/daily log/debt; owner finance close/audit; settings and brand image safety.

## 7. Mobile workflow

### Current checks

```bash
cd mobile
npm run typecheck
npm run lint
```

`typecheck` script is added in this branch; equivalent baseline command `npx tsc --noEmit` passed. `lint` remains non-gating until ESLint is installed/configured.

### Add as implementation progresses

- Jest + React Native Testing Library with Expo preset for stores, API error handling, navigation/auth guards, booking form, date helpers, consent visibility, locale/theme.
- Expo compatibility check (`npx expo-doctor`) in environment with working registry/network; audit sandbox Expo compatibility command failed at TLS network stage.
- Android emulator and iOS simulator smoke where available; test physical-device API URL (`localhost` is not host machine), deep links, secure token storage, push permission denied/accepted, foreground/background notification, APK hash mismatch/release optional update.
- Accessibility: large font, TalkBack/VoiceOver, labelled controls, contrast in light/dark/system, reduced motion, error announcement, minimum touch target.
- Do not create a production EAS build as a CI side effect; use an approved manual release profile.

## 8. Dependency audit workflow

Per package, from its directory:

```bash
npm audit --omit=dev --json > /tmp/<app>-audit.json
npm audit --json > /tmp/<app>-audit-all.json
```

`npm audit` can exit non-zero when advisories exist; preserve/parse JSON, do not treat that as a shell interruption. Evaluate each advisory by direct/transitive path, affected version, fix range, actual runtime/build reachability, Expo compatibility and lockfile diff. Apply targeted upgrades one app at a time; run build/unit/native compatibility and post-update audit. Never run `npm audit fix --force` or bulk major updates without a reviewed upgrade matrix. Root `npm audit` is invalid because no root lockfile exists.

## 9. Accessibility, locale and privacy review

1. `check_i18n.py` records BS/EN key differences; run `--strict` only after all intentional key/translation scope decisions are complete.
2. `check_ui_contrast.py` recalculates named token pairs from source, prints WCAG ratio and threshold; static token result is not a substitute for browser-computed color with opacity/gradient/dynamic brand.
3. Run axe/browser across public home, public booking, admin settings and finance, plus color contrast with computed styles.
4. Manual check keyboard-only, focus order/visible focus, error summary, labels, `aria-live`, zoom/reflow, disabled states, high contrast and reduced motion.
5. Mobile TalkBack/VoiceOver, device font scaling, display contrast and touch target review.
6. Verify before/after consent and private upload policy with product/privacy owner before any public-data migration.

## 10. CI acceptance and artifact safety

- CI workflow uses read-only checkout, Node 22, package-local npm ci, branch/manual trigger, no deployment/SSH/GitHub write token, no production secrets.
- CI baseline runs repo hygiene, web build, mobile typecheck, backend client/schema/build, Node blog-sanitizer regression, and Jest unit suite where engine download works, and report-only locale/contrast checks; flaky/external SMTP/FCM/Expo tests are mocked.
- **Future PostgreSQL integration job (not configured in current workflow):** use an ephemeral service and synthetic seed, then tear it down. Do not place shared Redis service credentials in CI.
- npm audit findings are reported in a separate/manual scheduled workflow until existing critical advisories have a reviewed action plan; do not hide current critical counts with a broad allowlist.
- Once lint/test baseline is repaired, promote lint, full E2E, locale parity and contrast to hard gates.
- Workflow must not deploy, merge, open a PR, push to `master` or act on production.

## 11. Final local release checklist

- [ ] `git status --short`; no `.env`, service-account or signing secrets staged/tracked.
- [ ] `git diff --check`.
- [ ] `python3 scripts/check_repo_hygiene.py` passes.
- [ ] `npm ci` in each app from committed lockfile.
- [ ] Prisma generate/validate, all backend unit tests and build pass.
- [ ] Database migrations apply to empty disposable DB of deployment major; migration SQL reviewed.
- [ ] Booking/finance concurrency and security response tests pass.
- [ ] Frontend build/component/e2e/a11y and mobile typecheck/test/simulator checks pass.
- [ ] Dependency upgrades reviewed and full audit snapshot retained in approved CI artifact, no secret data.
- [ ] Manual security/privacy/accessibility/product owner sign-off.
- [ ] Manual deployment/merge decision by user; no automatic workflow.
