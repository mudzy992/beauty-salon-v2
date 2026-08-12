# Phase 1 — Backend

- Prisma `AppRelease` + migration `20260812140000_app_releases`
- Module `backend/src/app-releases/`
  - `POST /api/app-releases/upload`
  - `POST|GET|PATCH /api/app-releases`
  - `GET /api/public/app-releases/android/latest` (`@Public()`)
- Publish retires previous PUBLISHED
- Unit tests: `app-releases.service.spec.ts`
- Matrix files created
