# OPS-03 — Migration job i readiness runbook

## Namjena i granice

Ovo je source/config runbook za razdvajanje Prisma migracija od API procesa. Nije odobrenje za deployment niti dokaz da Coolify, host, volumen ili baza rade kako je očekivano. U ovoj izmjeni nema nove Prisma schema migracije. Agent nije pokrenuo Docker, migration job, produkcijsku/shared bazu niti deployment.

## Compose tok

- `backend/Dockerfile` runtime target pokreće samo `node dist/src/main.js`; API container ne izvršava `prisma migrate deploy` pri svakom restartu.
- `migrate` je odvojeni, non-root one-shot target. U `docker-compose.yml` je u `migrations` profilu, pa nije pokrenut običnim `docker compose up`.
- Operator za odobreni release s novim migracijama ručno pokreće posao prije API start/rollout-a:

  ```sh
  docker compose --profile migrations run --rm migrate
  ```

  Job koristi samo runtime `DATABASE_URL` i PostgreSQL CA mount, povezan je na `db_net`, nema Redis mrežu niti JWT/SMTP/app-encryption env varijable. Agent ne izvršava ovu naredbu. Migrate exit code mora biti nula prije nastavka; nakon neuspjeha ne pokretati API release dok vlasnik ne pregleda uzrok i rollback plan.

- `GET /health` je procesni/liveness odgovor. `GET /health/ready` je javna, minimalna readiness provjera: radi DB query i potvrđuje da su svi direktoriji migracija u image-u završeni u `_prisma_migrations` (bez unresolved/rolled-back-only stanja). Greška ili pending migracija vraća generički `503`, bez URL-a, SQL-a ili DB exception detalja. Compose healthcheck koristi samo ovaj endpoint.
- Healthcheck ne pokreće migracije i nije zamjena za backup, migration review, owner release signoff ili ručnu odluku o routingu unhealthy containera. Redoslijed migracija pa API mora se poštovati u deployment procesu.

## Image i uploads

- API runtime target radi kao UID/GID `10001:10001`, ima samo production npm dependencies i uključuje generisani Prisma Client te migration-name manifest (direktoriji pod `prisma/migrations`).
- Migration target je odvojen i zadržava Prisma CLI i njegove build dependencies; nema API `dist` i nema build-time DB URL.
- Compose upload mount ostaje `/mnt/shared-app-files/beauty-salon-v2:/usr/app/uploads`. Samo `UPLOAD_ROOT/public/` se statički izlaže; `private/` ne smije postati statički public root. Dockerfile priprema image direktorije za UID/GID 10001, ali host bind mount prekriva image ownership. Prije upotrebe vlasnik mora potvrditi/namjestiti host-directory owner i permissions tako da UID/GID 10001 može pisati, a privatni fajlovi nisu javno čitljivi. Agent nije pregledao ni mijenjao host folder.

## Runtime follow-up: upload permissions and HTTP rate-limit Redis

**User-reported symptom (2026-10-25):** `POST /api/users/profile/avatar` returns 500 at `EPERM: operation not permitted, chmod '/usr/app/uploads/private'`. Source control flow calls `mkdir/chmod` before writing the file or creating the Upload database row. The backend runs as UID/GID `10001:10001`; the Compose bind mount hides the image directory ownership, so an image-layer `chown` does not fix the host directory. This strongly indicates that the mounted `private/` directory is not owned/writable by UID 10001 or that the mounted filesystem denies chmod; host state has not been independently inspected. Do not remove the private chmod or use mode `0777`—the upload still may not be writable and the private-data boundary would be weakened.

Operator-only host procedure (not run by the agent): first confirm the exact dedicated mount path and inspect owner/mode without reading file contents:

```sh
sudo stat -c '%F owner=%u:%g mode=%a path=%n' \
  /mnt/shared-app-files/beauty-salon-v2 \
  /mnt/shared-app-files/beauty-salon-v2/private
```

Only after confirming this is the app's dedicated volume, that existing ownership changes are acceptable, and the path is not a shared/NFS-managed directory, grant the backend UID access to the **private subtree only**:

```sh
private=/mnt/shared-app-files/beauty-salon-v2/private
sudo mkdir -p "$private"
sudo chown 10001:10001 "$private"
sudo chmod 0700 "$private"
sudo chown -R 10001:10001 "$private"
sudo find "$private" -type d -exec chmod 0700 {} +
sudo find "$private" -type f -exec chmod 0600 {} +
```

Do not change `public/` or the whole mount unnecessarily. If ownership changes fail because the backend is on NFS/ACL-managed storage, grant UID/GID 10001 equivalent write/search rights through that storage system instead. After the host-side permission correction, retry the upload; no schema migration is involved. Existing private avatars are delivered through the authenticated content route to authorized viewers. Other users/public pages receive an avatar only when its owner explicitly enables avatar visibility (`isAvatarPublic`); private-by-default behavior is intentional. If a same-user avatar still fails after storage access is corrected, inspect the sanitized GET status/content type and the stored relative path—do not expose cookies, bearer tokens or user file contents.

**HTTP rate-limit warning (user-reported):** `HTTP_RATE_LIMIT_REDIS_URL is not configured` means the dedicated HTTP limiter store is absent; the interceptor intentionally fails open, so its configured quotas are not being enforced. This is independent of the Socket.IO Redis adapter and does not explain the upload `EPERM`. In the Coolify runtime environment, set `HTTP_RATE_LIMIT_REDIS_URL` to a dedicated least-privilege ACL user's URL as a secret (never paste/store the URL/password in chat or repo) and set `HTTP_RATE_LIMIT_PREFIX=beauty-salon-v2:http-rate-limit:production`. The ACL should be restricted to `EVAL`, `INCR`, `TTL`, `EXPIRE` and that prefix's keys, as detailed in `backend/.env.example`; the Compose backend already joins `redis_net` and passes the shared TLS/CA settings. Recreate/restart the backend after configuring the variable. No live Redis test was performed.

The sampled Socket.IO `connected`/`Client disconnected` lines contain no disconnect reason or backend error. A reconnect is visible, but those lines alone do not establish a backend failure; no gateway/CORS change is justified from them.

## CI dokaz

`bash scripts/check_backend_container.sh` parsira Compose konfiguraciju sa synthetic placeholderima, builda oba Docker targeta, provjerava non-root korisnike i da final `Config.Env` nema `DATABASE_URL`, `JWT_SECRET`, `SOCKET_IO_REDIS_URL` ili `APP_SETTINGS_ENCRYPTION_KEY`. Node-only image checks potvrđuju API `@prisma/client`, production dependency separation i migrator CLI/migration-directory prisustvo. CI run `40224124967` prošao je sva četiri joba, uključujući ova dva image checka. Probe containeri ne pokreću API, `prisma migrate deploy`, mrežnu vezu ili DB; odvojeni CI Prisma migration/E2E koraci koriste isključivo disposable PostgreSQL. Ovo nije deployment, production-image pull, shared-data test, host-volume test niti Coolify readiness proof.

## Release gates koji ostaju van ovog rada

Prije stvarnog deploymenta vlasnik/operater mora pratiti [`IMPLEMENTATION_PLAN.md` release/rollback gates](IMPLEMENTATION_PLAN.md#10-release-rollback-gates), pregledati tačan SQL i restore-tested backup, pokrenuti migration job samo nad namijenjenom bazom i provjeriti host-volume prava. Ovaj runbook ne izvodi niti potvrđuje te korake. Za svaku buduću source promjenu koja dodaje DB migraciju, vlasniku se nakon commit/push-a daje jasno ručno migration uputstvo; agent ne pristupa njegovoj bazi.
