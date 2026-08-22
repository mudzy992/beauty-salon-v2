# Repo Tooling & Workflows

**Last verified:** 2026-04-10

## Root structure (multi-app)

- **No root `package.json`**: each app is installed/built independently.
- **Primary app directories:**
  - `backend/`: NestJS API + Prisma (MySQL) + uploads
  - `frontend/`: React (Vite) web app (admin + public site)
  - `mobile/`: Expo / React Native app (Expo Router)
  - `docs/`: project documentation (non-code)
- **Developer workspace (VS Code):** `beauty-salon-v2.code-workspace`
- **Agent/intent docs:** `.cursor/` exists and is ignored by git via root `.gitignore`

## Package managers & install workflow

- **Package manager:** npm
- **Lockfiles (per app):**
  - `backend/package-lock.json`
  - `frontend/package-lock.json`
  - `mobile/package-lock.json`
- **Install pattern:**

```bash
cd backend && npm ci
cd ../frontend && npm ci
cd ../mobile && npm ci
```

## Local development setup (non-Docker)

### Backend (`backend/`)

- **Start (watch):** `npm run start:dev` (`backend/package.json`)
- **Port:** `process.env.PORT ?? 3000` (`backend/src/main.ts`)
  - The committed `backend/.env` sets `PORT=10001`
- **Uploads:** served at `/uploads/` from `UPLOAD_ROOT` (`backend/src/main.ts`)
- **Env loading:** `.env.local` then `.env` (`backend/src/config/config.module.ts`)

### Frontend (`frontend/`)

- **Dev server:** `npm run dev` (`frontend/package.json`)
- **Port:** `10000` (`frontend/vite.config.ts`)
- **Dev proxy:** `/api` and `/auth` → `http://localhost:10001` (`frontend/vite.config.ts`)

### Mobile (`mobile/`)

- **Expo start:** `npm run start` (`mobile/package.json`)
- **Platform runners:** `npm run android`, `npm run ios`, `npm run web` (`mobile/package.json`)

## Scripts (per app)

### Backend scripts (`backend/package.json`)

- **Build:** `npm run build`
- **Start:** `npm run start` | `npm run start:dev` | `npm run start:prod`
- **Prisma:** `npm run db:generate` | `npm run db:migrate` | `npm run db:seed` | `npm run db:init` | `npm run db:studio`
  - Prisma 7 config: `backend/prisma.config.ts` (reads `DATABASE_URL`)
  - Prisma schema: `backend/prisma/schema.prisma`
- **Tests:** `npm run test` | `npm run test:watch` | `npm run test:cov` | `npm run test:e2e`
  - `test:e2e` references `./test/jest-e2e.json`, but **`backend/test/` is not present in the repo** (likely local-only or missing).
- **Lint/format:** `npm run lint` | `npm run format`

### Frontend scripts (`frontend/package.json`)

- **Dev/build/preview:** `npm run dev` | `npm run build` | `npm run preview`
- **Lint:** `npm run lint`
  - Script exists, but **ESLint is not installed/configured** (no `eslint` dependency and no `frontend/eslint.config.*` / `frontend/.eslintrc*`).

### Mobile scripts (`mobile/package.json`)

- **Expo:** `npm run start` | `npm run android` | `npm run ios` | `npm run web`
- **Lint:** `npm run lint`
  - Script exists, but **ESLint is not installed/configured** (no `eslint` dependency and no `mobile/eslint.config.*` / `mobile/.eslintrc*`).
- **EAS build profiles:** `mobile/eas.json` (sets `EXPO_PUBLIC_*` env per profile)

## TypeScript configuration

- **Backend:** `backend/tsconfig.json`, `backend/tsconfig.build.json`
  - Notable: `module`/`moduleResolution`: `nodenext`, `target`: `ES2023`, `noImplicitAny: true`, `strictNullChecks: true`
- **Frontend:** `frontend/tsconfig.json`, `frontend/tsconfig.node.json`
  - Notable: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, alias `@/*` → `src/*`
- **Mobile:** `mobile/tsconfig.json`
  - Extends `expo/tsconfig.base`, `strict: true`, alias `@/*` → `src/*`

## Linting & formatting

- **Backend:**
  - **ESLint:** `backend/eslint.config.mjs` (includes type-checked `typescript-eslint` + `eslint-plugin-prettier/recommended`)
  - **Prettier:** `backend/.prettierrc` (`singleQuote: true`, `trailingComma: all`)
- **Frontend:** no ESLint/Prettier config detected under `frontend/`
- **Mobile:** no ESLint/Prettier config detected under `mobile/`

## Docker & docker-compose

### Compose (`docker-compose.yml`)

- **Services:** `frontend`, `backend`
- **Traefik routing (labels):**
  - Frontend: host `nejra-v2.ba101.top` → service port `10000`
  - Backend: host `nejra-v2.ba101.top` + `PathPrefix(/backend)` → service port `10001`
  - Backend uses stripPrefix middleware for `/backend`
- **Env files (compose):**
  - `frontend`: `env_file: ./frontend/.env`
  - `backend`: `env_file: ./backend/.env`
- **Uploads bind mount:** `/mnt/shared-app-files/beauty-salon-v2:/usr/app/uploads`
- **Network:** `web` is `external: true` (must exist on the host)

### Dockerfiles

- **Backend:** `backend/Dockerfile`
  - Multi-stage build on `node:22-alpine`
  - Sets a `DATABASE_URL` placeholder in-image to allow `prisma generate` during build/runtime layers
- **Frontend:** `frontend/Dockerfile`, runtime Nginx config `frontend/nginx.conf` (listens on `10000`)
- **Mobile:** `mobile/Dockerfile` is explicitly a placeholder (starts Expo via tunnel)

## CI/CD (GitHub Actions)

- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** push to `master`
- **Deployment style:** SSH to a server and redeploy with Docker Compose
- **Secrets used:** `SSH_PRIVATE_KEY`, `SERVER_IP`, `SERVER_USER`, `SERVER_SSH_PORT`, `APP_PATH`
- **What it does:**
  - Detects changes under `backend/` and/or `frontend/`
  - On server: `git fetch` + `git reset --hard origin/master`
  - Rebuilds/recreates only changed services (or bootstraps if containers missing)
  - Uses `docker compose build --no-cache` and `docker compose up -d`
  - Prunes Docker cache/images when changes are detected
- **What it does not do:** no lint/test/typecheck/build verification before deploying

## Environment variable conventions

- **Backend (Nest):**
  - Prisma DB: PostgreSQL via `DATABASE_URL` (`backend/.env.example`, `backend/prisma.config.ts`)
  - JWT: `JWT_SECRET`, `JWT_EXPIRES_IN` (`backend/.env.example`)
  - Upload root: `UPLOAD_ROOT` (used in `backend/src/main.ts`)
- **Frontend (Vite):** `VITE_*` in `frontend/.env`
  - `VITE_API_URL`, `VITE_API_FILES_URL`
- **Mobile (Expo):** `EXPO_PUBLIC_*` in `mobile/.env` and `mobile/eas.json`
  - `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_FILES_URL`, `EXPO_PUBLIC_EAS_PROJECT_ID`, optional `EXPO_PUBLIC_PUSH_ENABLED`

## Local dev via Docker (backend + frontend)

```bash
docker compose up -d --build
```

- `docker-compose.yml` expects an existing external Docker network named `web`
- The uploads bind mount uses a Linux host path: `/mnt/shared-app-files/beauty-salon-v2`

## Repo-level risks (tooling/workflow)

- **Committed secrets / sensitive files:**
  - `backend/.env` contains PostgreSQL `DATABASE_URL`, JWT secret, and `APP_SETTINGS_ENCRYPTION_KEY`
  - `mobile/beauty-salon-v2-firebase-adminsdk-fbsvc-8ad4c42277.json` is a Firebase Admin SDK credential
- **Lint scripts likely broken in frontend/mobile:** ESLint is not installed/configured despite `lint` scripts.
- **Backend e2e test script likely broken in-repo:** references missing `backend/test/jest-e2e.json`.
