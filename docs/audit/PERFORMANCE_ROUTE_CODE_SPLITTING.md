# Frontend route-level code splitting

## Scope

Page components are loaded on demand at route boundaries for public, admin, auth/onboarding, stylist portal, analytics, and calendar routes. Shared application providers and route layouts remain eager so the existing route guards and UI flows are unchanged. The router wraps pending imports in a translated, polite `role="status"` fallback (`common.loading`).

No dependency upgrades or `manualChunks` configuration were introduced. The `recharts` code is isolated to the admin Analytics route, and `react-big-calendar` is isolated to the admin reservations calendar route.

## Production transfer measurements

Measured from clean production builds using gzip-compressed emitted JS and CSS assets:

| Transfer | Before | After | CI budget |
| --- | ---: | ---: | ---: |
| Initial JS + CSS | 691.25 kB gzip | 275.46 kB gzip (269.0 KiB) | 300 KiB |
| Analytics route, incremental | bundled into initial entry | 114.3 KiB gzip | 140 KiB |
| Reservations calendar route, incremental | bundled into initial entry | 95.1 KiB gzip | 125 KiB |

The prior entry included 673.81 kB gzip JavaScript (plus 17.44 kB gzip CSS). The new initial entry has 260.69 kB gzip JavaScript plus 14.77 kB gzip CSS, about a 60% reduction in initial compressed transfer.

The production build confirms the initial entry does not contain Recharts or React Big Calendar markers. Those markers are present only in the corresponding route chunk graphs. Public home, admin dashboard, and stylist inbox are also emitted as dynamic route entries.

## Automated guardrails

`npm run build` now runs `scripts/check-bundle-budget.mjs` after Vite builds. It checks the Vite manifest's initial static graph and route entry graphs, enforces the gzip budgets above, and guards the heavy chart/calendar libraries from returning to the initial chunk. The regular build typecheck and route/source tests run before the production build.

Vite still reports the initial JavaScript file's **raw minified** size above its generic 500 kB advisory threshold (824.14 kB raw); the custom CI gate uses compressed JS+CSS transfer, and no manual chunk grouping was added because the measured initial transfer is within budget.
