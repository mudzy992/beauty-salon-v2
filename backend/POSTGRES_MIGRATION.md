# MySQL → PostgreSQL migracija

Repo je pripremljen za PostgreSQL. **Podaci nisu migrirani ovim repozitorijem.**

## Šta je promijenjeno

- Prisma datasource je prebačen sa MySQL na PostgreSQL.
- `@db.LongText` je zamijenjen PostgreSQL-kompatibilnim `@db.Text`.
- Prisma runtime koristi `@prisma/adapter-pg`.
- MySQL adapter i `mariadb` dependency ostaju u projektu kao backup/migration tooling.
- Stare MySQL Prisma migracije su sačuvane u `prisma/migrations_mysql_backup/` i više se ne izvršavaju automatski.
- PostgreSQL `prisma/migrations/` je namjerno pripremljen bez migracije: prvu PostgreSQL migraciju treba generisati nad čistom PostgreSQL bazom.
- Docker više ne sadrži hardkodovane MySQL kredencijale.

## Prije prve PostgreSQL migracije

1. Napraviti PostgreSQL bazu, npr. `beauty_salon_v2`.
2. U `backend/.env` postaviti: `DATABASE_PROVIDER=postgres` i ispravan `DATABASE_URL`.
3. Sačuvati MySQL backup i provjeriti da je izvorna baza dostupna prije bilo kakve migracije podataka.
4. U `backend/` instalirati dependencies. Pošto su dodani PostgreSQL driver i adapter, prvi `npm install` treba osvježiti `package-lock.json`.

```bash
npm install
```

Nakon toga commitovati ažurirani `package-lock.json`. Tek nakon tog commita koristiti `npm ci` u CI/produkciji.

5. Provjeriti Prisma šemu:

```bash
npx prisma validate
npx prisma format
npx prisma generate
```

## Kreiranje prve PostgreSQL migracije

Na **praznoj PostgreSQL bazi** pokrenuti:

```bash
npx prisma migrate dev --name postgresql_baseline
```

Ova komanda treba da kreira novu migraciju u `prisma/migrations/` i primijeni je na bazu. Nakon toga obavezno pregledati generisani `migration.sql` prije commita.

Provjera statusa:

```bash
npx prisma migrate status
```

Seed osnovnih roleova:

```bash
npx prisma db seed
```

## Bitno: migracija podataka nije dio ovog koraka

Nakon što schema migracija prođe, tek onda raditi MySQL → PostgreSQL data migration. Preporuka je:

1. MySQL ostaje read-only/source-of-truth tokom migracije.
2. Migrirati tabele uz očuvanje postojećih UUID vrijednosti.
3. Posebno validirati `Date`, `DateTime`, `Decimal`, `Boolean`, `Json`, enum vrijednosti i foreign keys.
4. Nakon migracije uporediti broj redova po tabelama i ključne finansijske agregate.
5. Tek nakon uspješne validacije pustiti aplikaciju na PostgreSQL.

## Produkcijski deployment

Na produkciji se **ne koristi** `prisma migrate dev`. Nakon što je `postgresql_baseline` generisan i committovan, koristiti:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

Docker entrypoint već izvršava `prisma migrate deploy` prije pokretanja aplikacije.

## MySQL backup

Stara Prisma istorija je sačuvana u:

```text
prisma/migrations_mysql_backup/
```

Stara konekcija može se držati u `.env` kao komentarisani `MYSQL_DATABASE_URL`. Nemoj koristiti MySQL `migration.sql` fajlove kroz PostgreSQL Prisma migrator.

## Sigurnost

Ako su raniji MySQL credentials, JWT secret ili drugi production secrets ikada commitovani u Git, treba ih rotirati. `.env` mora ostati van Git repozitorija.
