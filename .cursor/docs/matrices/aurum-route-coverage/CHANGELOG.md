# CHANGELOG — aurum-route-coverage matrica

## 2026-11-11 · K0 · Matrica kreirana (PLAN)

**Šta:** popisano **58 deklaracija ruta** (javne 14, auth/izuzeci 8, admin 24, stylist 12) + 13 dijeljenih slojeva, svaki s vlasničkim segmentom S0–S11, ključnim testovima i statusom.

**Zašto:** Q3 traži refaktor svih web ruta bez izuzetka; matrica je jedini način da se dokaže da nijedna ruta nije preskočena i da se u S11 potvrdi 58/58.

**Izvor:** isključivo `frontend/src/app/router.tsx`, `app/routes/public.routes.tsx`, `app/routes/admin.routes.tsx` i `docs/audit/UX_UI_ROUTE_INVENTORY.md`. Nijedna ruta nije izmišljena; `TabRedirect`/`<Navigate>` su označeni ➖ jer nemaju vlastiti ekran.

**Status:** svi redovi ⬜ (ili ➖ za redirecte). Ažurira se po svakom segmentu; bez koda, bez commit/push.

## 2026-11-11 · S0 · Mapa ruta preslikana u punu specifikaciju

**Šta:** 58 redaka iz ove matrice preslikano je u §09 dokumenta `NEJRA – beauty salon · Referentni dokument.html` (ruta, ekran, skup, stanja, prijelom, segment). `test:design-spec` sada tvrdi da tablica ima točno 58 redaka i da ključne rute nisu izbrisane (mutacijska provjera na `/stylist/stats`).

**Zašto:** Q1/Q7 — dizajn dokument je jedini izvor istine i mora sadržavati provjerljivu mapu svih ruta; bez toga bi se u S2–S10 mogla preskočiti neka ruta.

**Status:** ✅ za „Dizajn dokumenti" i 🟡 za „CI" (dodan jedan korak); svih 58 ruta i dalje ⬜ jer refaktor koda još nije započet. Bez izmjena u `frontend/src`.
