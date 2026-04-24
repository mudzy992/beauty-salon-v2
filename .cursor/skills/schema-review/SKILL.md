# Skill: Schema Review

Koristi se za pregled i validaciju promjena na Prisma šemi.

## Kad koristiti
- Pri dodavanju ili mijenjanju modela u `backend/prisma/schema.prisma`.
- Pri migracijama ili seed promjenama.

## Šta raditi
1. Provjeri da sve tabele i polja koriste `@@map` / `@map` u snake_case za MySQL.
2. Provjeri relacije: obostrane `@relation`, ispravni `onDelete` (Cascade, SetNull, Restrict).
3. Provjeri da enum-like vrijednosti (npr. statusi) imaju konzistentna imena i da su dokumentirani u `.cursor/docs/` ili u rules.
4. Nakon promjene predloži `npx prisma migrate dev --name opis_promjene` i ažuriranje seed-a ako treba.

## Reference
- `.cursor/rules/database-schema.mdc`
- `backend/prisma/schema.prisma`
