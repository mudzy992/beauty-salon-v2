# Skill: Plan Handoff (global)

Koristi se kada je zadatak skoro gotov ili postoji rizik da se izgubi kontekst.

## Kada koristiti

- Kontekst je “80–90%” (mnogo odluka, više faza, više foldera).
- Implementacija je djelimično završena, ali treba nastavak.
- Postoji više otvorenih pitanja ili neizvjesnosti.

## Šta uraditi

1. Kreiraj/azuriraj `HANDOFF.md` (ako plan ima folder strukturu, u `.cursor/plans/<plan-slug>/HANDOFF.md`; inače u najbliži relevantni plan folder ili `.cursor/docs/`).
2. U `HANDOFF.md` obavezno navedi:
   - Šta je urađeno (konkretno, fajlovi/moduli)
   - Donesene odluke + razlozi
   - Otvorena pitanja / rizici
   - Next steps (konkretni koraci)
   - Test status (šta je pokrenuto, rezultati, šta fali)
3. Ako su dokovi u konfliktu sa kodom, evidentiraj gap u `.cursor/docs/03_gap_analysis.md`.

