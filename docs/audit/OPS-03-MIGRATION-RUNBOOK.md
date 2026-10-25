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

## CI dokaz

`bash scripts/check_backend_container.sh` parsira Compose konfiguraciju sa synthetic placeholderima, builda oba lokalna Docker targeta, provjerava non-root korisnika, da final image env nema DB/JWT/Redis/app-encryption secrets, te provjerava Prisma Client i migrator CLI prisustvo. Probe containeri samo izvršavaju lokalni Node metadata/module check; ne pokreću API, migrator, mrežnu vezu ili DB. Ovo nije deployment, production-image pull, shared-data test, host volume test niti Coolify readiness proof.

## Release gates koji ostaju van ovog rada

Prije stvarnog deploymenta vlasnik/operater mora pratiti [`IMPLEMENTATION_PLAN.md` release/rollback gates](IMPLEMENTATION_PLAN.md#10-release-rollback-gates), pregledati tačan SQL i restore-tested backup, pokrenuti migration job samo nad namijenjenom bazom i provjeriti host-volume prava. Ovaj runbook ne izvodi niti potvrđuje te korake. Za svaku buduću source promjenu koja dodaje DB migraciju, vlasniku se nakon commit/push-a daje jasno ručno migration uputstvo; agent ne pristupa njegovoj bazi.
