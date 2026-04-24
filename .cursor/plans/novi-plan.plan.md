---
name: ""
overview: ""
todos: []
isProject: false
---

## **Findings**

- **(Critical)** `.cursor/rules/*.mdc` **“model routing” je vendor/model-specifičan i vezuje repo za konkretne modele**
  - U `full-stack-workflow.mdc` postoji sekcija “Model Routing Strategy” sa eksplicitnim modelima (Gemini/Claude…). To krši zahtjev “vendor-neutral” i brzo zastarijeva.
- **(Critical)** `backend-architecture.mdc` **kontradiktuje stvarnom backend kodu**
  - Pravilo kaže “Prisma isključivo u repositories” + “biznis logika u services”, ali u kodu više servisa direktno koristi `PrismaService` (npr. `reservations.service.ts`, `finance/*.service.ts`, `blog.service.ts` itd.). Ovo je realno stanje i pravilo trenutno “laže” agenta.
- **(Critical) Pogrešan scope/globs u najmanje 2 pravila (YAML front-matter)**
  - `testing-strategy.mdc` ima `globs: backend/src/**/*.spec.ts, backend/test/**/*` kao jedan string umjesto liste — pravilo se zato često neće primijeniti kako treba.
  - `finance-system.mdc` isto: `globs: backend/src/finance/**/*, backend/src/daily-log/**/*` kao jedan string.
- **(Staleness) Frontend tech stack u pravilima/planovima nije usklađen s kodom**
  - `full-stack-workflow.mdc` i plan `beauty_salon_nejra_v2_*.plan.md` tvrde Chakra UI; ali `frontend/package.json` nema Chakra, i kod ima Radix/shadcn-style UI (`src/components/ui/*`, `@radix-ui/*`, Tailwind).
  - Ovo je direktan “zastarjelo” + “konflikt” slučaj.
- **(Docs conflict)** `.cursor/docs/03_gap_analysis.md` **i** `SOURCE_OF_TRUTH.md` **su u konfliktu**
  - `SOURCE_OF_TRUTH.md` kaže Post-Faza 10 i detaljno stanje.
  - `03_gap_analysis.md` kaže “Trenutno (Faza 1)” i navodi skeleton-only frontend/mobile — očigledno zastarjelo.
  - `SOURCE_OF_TRUTH.md` već propisuje da se gap-ovi bilježe u `03_gap_analysis.md`, ali taj fajl nije održavan.
- **(Plan-first gap) Ne postoji pravilo koje standardizuje “Plan mode prvo” i strukturu planova**
  - Postoje planovi u `.cursor/plans/*.plan.md`, ali nema enforcementa ni standarda za multi-phase planove i handoff dokument.
- **(Scope gaps) Pravila skoro uopšte ne pokrivaju** `frontend/`** **i** `mobile/`** **detaljno**
  - Trenutno su svi `.mdc` fokusirani na backend; a repo ima značajan frontend/mobile scope (i18n, socket, routing, state, theming, upload url helpers itd.).

---

## **Proposed changes (po fajlu)**

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursorrules`

- **Promjena**
  - Ostaviti kao kratku skretnicu, ali dodati 1 stavku koja eksplicitno upućuje na novo plan-first pravilo (bez širenja konteksta).
- **Zašto**
  - Da agent odmah vidi da “veće stvari idu prvo u Plan mode” bez punjenja startnog contexta.

---

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\rules\full-stack-workflow.mdc`

- **Promjena 1 (obavezno)**
  - Ukloniti cijelu sekciju **“## Model Routing Strategy”** i zamijeniti vendor-neutral smjernicom:
    - **Task type → mode** (Plan vs Agent) i “kako raditi” (npr. UI iteracije, refaktori, debug).
- **Zašto**
  - Traženo: bez model lock-ina; održivije i preciznije.
- **Promjena 2 (obavezno)**
  - Ažurirati “Frontend” stack sa **Chakra UI → Tailwind + Radix/shadcn-style** (u skladu s `frontend/package.json` i `src/components/ui/`*).
- **Zašto**
  - Pravilo je trenutno zastarjelo i kontradiktuje kodu.
- **Promjena 3 (preporučeno, minimalno)**
  - U “Baza” dijelu uskladiti komande sa stvarnim skriptama:
    - Umjesto “`npx prisma migrate` / `npm run seed`” referencirati `backend/package.json` skripte: `npm run db:migrate`, `npm run db:seed`, `npm run db:init`.
- **Zašto**
  - Da agent slijedi tačan workflow koji repo već koristi.

---

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\rules\backend-architecture.mdc`

- **Promjena (obavezno)**
  - Relaksirati/precizirati repository pravilo da odražava realnost:
    - Umjesto “Prisma isključivo u repositories”, preformulisati u:
      - **Prefer** repository layer za kompleksne domene/aggregate upite i za module gdje već postoji repository (`users`, `settings`, `uploads`, `notifications`, i posebno `reservations`, `finance`).
      - Dopušteno: servis može koristiti `PrismaService` direktno kada je upit trivijalan i lokalizovan, ali treba izbjegavati copy-paste query logike i držati transakcije/kompleksne upite centralizovano.
- **Zašto**
  - Trenutno pravilo je u otvorenom konfliktu s postojećim kodom (više servisa direktno injektuje `PrismaService`), pa agent dobija pogrešne instrukcije.
- **Promjena (preporučeno)**
  - Ukloniti/omekšati “File Length Limit 150 lines” ili ga pretvoriti u “prefer small files; refactor kad postane teško za održavanje”.
- **Zašto**
  - 150-linijski hard limit je često neprimjenjiv u Nest modulima i vodi u umjetnu fragmentaciju.
- **Promjena (preporučeno)**
  - Putanja za helpers u kodu više liči na `src/common/utils/`* nego `src/common/helpers` (npr. `backend/src/common/utils/*` postoji).
  - Minimalno: dopuniti da je dozvoljeno i `src/common/utils`.
- **Zašto**
  - Da pravilo prati postojeću strukturu.

---

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\rules\testing-strategy.mdc`

- **Promjena (obavezno)**
  - Popraviti YAML front-matter `globs` u validnu listu:
    - `globs: ["backend/src/**/*.spec.ts", "backend/test/**/*"]`
- **Zašto**
  - Trenutno je scope/glob pogrešan → pravilo se ne primjenjuje konzistentno.

---

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\rules\finance-system.mdc`

- **Promjena (obavezno)**
  - Popraviti YAML front-matter `globs` u validnu listu:
    - `globs: ["backend/src/finance/**/*", "backend/src/daily-log/**/*"]`
- **Zašto**
  - Isti problem kao gore: pogrešan scope.

---

### `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\docs\03_gap_analysis.md`

- **Promjena (obavezno)**
  - Ažurirati sadržaj da odražava Post-Faza 10 stanje iz `SOURCE_OF_TRUTH.md`.
  - Minimalni pristup: zamijeniti “Trenutno (Faza 1)” sekciju sa:
    - “Aktuelni gap-ovi (Post-Faza 10)” i 5–10 stvarnih stavki (ili eksplicitno “nema otvorenih gap-ova osim …”).
- **Zašto**
  - Trenutno direktno kontradiktuje `SOURCE_OF_TRUTH.md` i vodi agenta u pogrešne zaključke.

---

## **New rules/skills (if needed)**

### **Novi rule (nužno zbog “plan-first” standardizacije):** `c:\Users\m.ceric\Documents\GitHub\beauty-salon-v2\.cursor\rules\plan-first.mdc`

- **Svrha**
  - Standardizuje: “svaka veća funkcionalnost ide prvo u Plan mode”, strukturu multi-phase planova i handoff disciplinu.
- **Globs**
  - `globs: ["backend/**", "frontend/**", "mobile/**", ".cursor/**", "SOURCE_OF_TRUTH.md"]`
  - `alwaysApply: false` (da ne puni startni context)
- **Outline (kratko)**
  - Kada je “veća funkcionalnost” (npr. >~1 fajl, promjena API+UI, migracije, refaktor modula).
  - Obaveza: prvo Plan mode → odobren plan → tek onda implementacija.
  - Ako plan ima **>3 faze**:
    - novi plan mora biti folder: `.cursor/plans/<plan-slug>/`
    - obavezni fajlovi: `00_overview.md`, `01_phase-*.md`, `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`
  - Handoff rule:
    - kad context dođe 80–90% → generiši `HANDOFF.md` (urađeno, odluke, otvorena pitanja, next steps, test status).

*(Napomena: po tvojoj odluci “strict-new-only” ovo važi samo za nove planove; postojeći* `.plan.md` *se ne diraju.)*

---

## **Top 5 backlog (redoslijed po uticaju)**

1. **Uskladiti** `full-stack-workflow.mdc` **sa stvarnim stackom (frontend Chakra → Radix/shadcn-style) + ukloniti model routing**
2. **Popraviti YAML** `globs` **bugove u** `testing-strategy.mdc` **i** `finance-system.mdc` **(scope je trenutno nepouzdan)**
3. **Revidirati** `backend-architecture.mdc` **da bude kompatibilan s realnim NestJS kodom (Prisma usage + repository pragmatika)**
4. **Ažurirati** `03_gap_analysis.md` **da više ne kontradiktuje** `SOURCE_OF_TRUTH.md`
5. **Uvesti** `plan-first.mdc` **da standardizuje planove i handoff (smanjuje “agent drift” i izgubljeni kontekst)**

---

## **Questions for owner**

- **Frontend UI standard**: potvrđeno od tebe — **Tailwind + Radix/shadcn-style** je autoritativno; pravila/planovi treba da se usklade s tim.
- **Planovi**: potvrđeno — **striktno za nove planove**, bez diranja postojećih `.plan.md`.

Ako želiš, u sljedećem koraku mogu predložiti *tačne* minimalne patch-eve (konkretne zamjene teksta) za svaki od gore navedenih fajlova, bez širenja `.cursorrules`.
