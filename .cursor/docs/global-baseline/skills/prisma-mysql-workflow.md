# Skill: Prisma + MySQL/MariaDB workflow (global)

Standard za rad sa Prisma šemom, migracijama i okruženjem (MySQL/MariaDB).

## Kada koristiti

- Mijenjaš `backend/prisma/schema.prisma`
- Dodaješ migracije/seed
- Debuguješ Prisma konekciju ili adapter

## Pravila

- **Ne radi ad-hoc promjene** u bazi mimo Prisma šeme/migracija.
- **Env vars**: konekcija ide kroz env/Prisma config, ne hardkodirati kredencijale.
- **DB_NAME prije migracija**: ako se radi o novom projektu ili novom okruženju, prvo potvrdi naziv baze (DB name) i target okruženje (local/dev/prod) prije migracija.
- **Skripte**: preferiraj project skripte (npr. `npm run db:migrate`, `db:seed`, `db:init`) kad postoje.
- **Dokumentacija**: ako promjena utiče na domenska pravila, ažuriraj relevantne `.cursor/docs/*` i gap analizu gdje treba.

## Checklist

- Šema formatirana i validirana
- Migracija imenovana smisleno
- Seed ažuriran ako treba
- Testovi ažurirani gdje promjena mijenja ponašanje

