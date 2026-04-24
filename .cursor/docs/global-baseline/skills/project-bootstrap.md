# Skill: Project Bootstrap (global)

Koristi se kada otvoriš novi repo ili vidiš da projektu fale Cursor scaffolding fajlovi.

## Cilj

- Postaviti minimalan `.cursor/` setup bez overwriting postojećeg.
- Ostaviti `.cursorrules` kao kratku skretnicu (ne puniti startni context).
- Uvesti plan-first disciplinu od starta.

## Kada koristiti

- Repo nema `.cursor/rules/` ili nema `.cursorrules`.
- Repo je nov i nema standardne strukture `backend/`, `frontend/`, `mobile/`.

## Šta uraditi (redoslijed)

1. Provjeri postojeću strukturu repoa (da li je ROOT/{backend,frontend,mobile}).
2. Ako postoji `.cursor/hooks/bootstrap.ps1`:
   - pokreni bootstrap skriptu (create-if-missing, bez overwrites).
3. Ako ne postoji:
   - kreiraj `.cursor/rules/00_project.mdc` (minimalni baseline) i `.cursorrules` skretnicu.
4. Za veći posao: prvo Plan mode, zatim implementacija.

## Output

- Kratak sažetak šta je kreirano i šta ostaje project-level pravilo.

