# Repository tooling and workflows

**Verified snapshot:** 2026-10-21. For test limitations and audit evidence see [TEST_WORKFLOW](../audit/TEST_WORKFLOW.md), [CI](../audit/CI.md) and [HANDOFF](../audit/HANDOFF.md).

## Repository structure

- No root `package.json`; `backend/`, `frontend/` and `mobile/` each have independent npm manifests and lockfiles.
- `.cursor/` is version-controlled project design/rules material; it documents intent and is not proof of runtime implementation.
- `backend/`: NestJS API, PostgreSQL/Prisma, Socket.IO, jobs and uploads.
- `frontend/`: React/Vite public site and admin SPA.
- `mobile/`: Expo/React Native client/stylist app.
- `docs/audit/`: architecture, evidence-based findings, phased plan, test workflow, CI scope and handoff.
- `scripts/check_*.py`: read-only repository hygiene, Markdown-link, locale-key and selected-token contrast checks.

## Install and local development

Use the app-specific lockfile; do not run a root `npm install`.

```bash
(cd backend && npm ci --no-audit --no-fund)
(cd frontend && npm ci --no-audit --no-fund)
(cd mobile && npm ci --no-audit --no-fund)
```

Create ignored local `.env` files from each `.env.example` and configure only local/test services. `backend/.env.example` uses port `10001` to align with Vite proxy; `main.ts` falls back to `3000` if `PORT` is unset.

| App | Commands | Notes |
|---|---|---|
| Backend | `npm run start:dev`, `npm run build`, `npm test -- --runInBand` | PostgreSQL `DATABASE_URL` required for runtime/migrations. `db:generate`/`db:validate` need Prisma engine. `test:e2e` points to missing `test/jest-e2e.json`. |
| Frontend | `npm run dev`, `npm run build`, `npm run preview` | Build runs `tsc -b` then Vite. Package scripts explicitly select `vite.config.ts`; dev proxies `/api`, `/auth`, `/uploads` and WebSocket `/socket.io` to `http://localhost:10001`. |
| Mobile | `npm run start`, `npm run android`, `npm run ios`, `npm run web`, `npm run typecheck` | Expo; set `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_API_FILES_URL` to a host reachable from the emulator/device. `localhost` is not the host from a physical device. |

## Package scripts and lint state

- Backend scripts are declared in `backend/package.json`. `npm run lint` is read-only; `npm run lint:fix` is the explicitly mutating autofix command. The existing type-aware lint baseline currently reports 6,418 problems in this environment, with generated Prisma Client missing; it is not a CI gate.
- Frontend `npm run lint` and mobile `npm run lint` call ESLint, but a compatible installed/configured ESLint setup was not found. They are not CI gates.
- Mobile `npm run typecheck` runs `tsc --noEmit`.
- No frontend/mobile automated test runner/files were found at audit time; browser/device checks are planned in the test workflow.

## TypeScript and UI config

- Backend: `backend/tsconfig.json`, `backend/tsconfig.build.json`, `backend/eslint.config.mjs`.
- Frontend: `frontend/tsconfig.json`, `frontend/tsconfig.node.json`; build runs the TypeScript project check.
- Mobile: Expo base config via `mobile/tsconfig.json`; strict TypeScript.
- Web style tokens: `frontend/src/styles/globals.css`; mobile palette/theme: `mobile/src/theme/`.

## Docker and Compose

- Backend and frontend each have a `.dockerignore`; root `.dockerignore` is a fallback. Local `.env`, dependency trees, generated bundles, uploads and key-like files are excluded from app build contexts; backend also excludes the inactive `prisma/migrations_mysql_backup/` archive from its image build context. Keep real service-account/private-key files out of context.
- `docker-compose.yml` declares only `backend` and `frontend`; it defines no database, Redis, healthcheck, published port, Traefik labels or deployment job.
- Backend uses external network `db_net`, receives runtime `DATABASE_URL`, JWT and app encryption config from host Compose interpolation, and mounts `/mnt/shared-app-files/beauty-salon-v2` at `/usr/app/uploads`.
- Frontend Docker build accepts `VITE_API_URL` and `VITE_API_FILES_URL`; these are public client configuration, not secrets. Backend Docker builder uses a dummy generate-only URL; runtime DB/JWT values are not baked in.
- The backend container runs `prisma migrate deploy` at startup before starting Nest. Deploy/migration ownership, backup, rollback, proxy and external network setup remain operator responsibilities and were not runtime-tested. `mobile/Dockerfile` is a placeholder, not a native release pipeline.

## CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs checks only on `arena/**` pushes or manual dispatch, with `contents: read`. It runs repository checks; backend Prisma validate/generate/build/unit tests; frontend build; and mobile typecheck. It has no pull-request/master trigger, deploy/merge step, production database, secret or SSH access. Exact caveats and future extension gates: [CI.md](../audit/CI.md).

## Environment and credential handling

- Tracked templates: `backend/.env.example`, `frontend/.env.example`, `mobile/.env.example`. Real `.env` files are ignored; templates must contain no real credentials.
- Web/API base variables: `VITE_API_URL`, `VITE_API_FILES_URL`; mobile public config: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_FILES_URL`, `EXPO_PUBLIC_PUSH_ENABLED`, optional EAS project ID.
- Backend: `DATABASE_PROVIDER`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `UPLOAD_ROOT`, `APP_SETTINGS_ENCRYPTION_KEY`, optional Expo push token.
- Firebase Admin service-account material is not tracked in the current index. `mobile/google-services.json` is client-side Firebase configuration and should be restricted through Firebase project settings.
- Current index cleanup did not rewrite Git history. Credential revocation/rotation is an external owner action; do not copy values into docs or CI.
