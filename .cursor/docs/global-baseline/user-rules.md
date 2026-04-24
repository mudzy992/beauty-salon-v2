# Cursor User Rules (copy/paste)

Ovo su **globalna** pravila koja upisuješ u Cursor → Settings → Rules → **User Rules**.
Drži ih kratkim i vendor-neutral (bez model routing).

---

## GlobalFullStackBaseline

- **Repo structure**: ROOT/{backend,frontend,mobile} (svaki ima svoj `package.json`).
- **Backend**: NestJS + TypeScript (strict) + Prisma 7 + MySQL/MariaDB.
- **Frontend**: React (Vite) + TypeScript + Tailwind + Radix/shadcn-style komponente.
- **Mobile**: Expo (React Native) + TypeScript + i18n + light/dark/system theme.
- **i18n**: uvijek podržati BS kao default, infrastruktura za EN.
- **Config**: koristiti env var za tajne; ne hardkodirati kredencijale; DB konekcija ide kroz env/Prisma config.
- **Uploads**: backend upload servis; u DB čuvati samo putanje; image renditions (original/thumb/small/medium) gdje je relevantno.

---

## GlobalPlanFirst

- **Veće promjene idu prvo u Plan mode** (više fajlova, cross-layer, migracije, refaktori, složeni bugovi).
- Ako plan ima **>3 faze**: koristi folder standard u `.cursor/plans/<plan-slug>/` sa:
  - `00_overview.md`, `01_phase-*.md`, `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`
- **Handoff**: kad kontekst dođe na ~80–90% (ili postoji rizik gubitka konteksta), obavezno popuni `HANDOFF.md` (urađeno, odluke, otvorena pitanja, next steps, test status).

---

## GlobalQualityAndSafety

- **Vendor-neutral**: ne navoditi konkretne AI modele; mapirati “tip zadatka → način rada”.
- **DB/Prisma**: nema ad-hoc promjena bez ažuriranja Prisma šeme i migracija; koristiti postojeće `db:*` skripte gdje postoje.
- **Secrets**: nikad ne committati `.env`, ključeve, JSON credse; pathove i primjer varijanti držati u `.env.example`.
- **Minimal changes**: mijenjaj samo ono što je potrebno, drži scope mali, a nakon većih izmjena dodaj relevantne testove.

## GlobalCodeHygieneAndMatrices

- **Fajlovi**: ciljaj ~100–150 linija; kad preraste, ekstrahuj u helpers/utils ili manje module.
- **No dead code**: promjena logike/refaktor ⇒ obavezno brisanje neiskorištenog koda odmah.
- **Matrice**: za bitne funkcionalnosti koristi `.cursor/docs/matrices/<feature_slug>/MATRIX.md` + `CHANGELOG.md`. Promjena logike ⇒ update matrice + upis u changelog.

---

## GlobalTokenEfficiency

- **Min reads**: prije izmjene, pročitaj samo 1–3 relevantna fajla + uradi usko pretraživanje (tačan simbol/string). Ne skenirati repo “široko” bez potrebe.
- **Min context**: ne kopirati velike blokove koda u chat; referencirati fajlove i kratke izvatke samo kad je neophodno.
- **Small diffs**: preferiraj male, lokalne izmjene; izbjegni velike “rewrite” refaktore bez jasnog razloga i plana.
- **Stop early**: ako je zadatak nejasan, prvo postavi minimalna pitanja umjesto dugog istraživanja.
