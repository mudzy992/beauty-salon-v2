# 23 — Standardizacija admin dashboarda (handoff)

> **ARHIVA:** Ovo je historijski plan, zapis ili dokaz. Ne opisuje aktuelnu temu ni trenutne verifikacijske rezultate. Podržani su samo Aurum light i Aurum dark.

> **Ovo je namjenski handoff za novu sesiju.** Glavni `HANDOFF.md` je i dalje na S5 STOP
> (vidi dole "Poveznica s glavnim HANDOFF.md"). Ovaj dokument je samodostatan: referencira
> izvorne dokumente, definiše tačnu fazu i daje korak-po-korak sljedeći korak.

## Status / Faza (2026-11-16)
- **Analytics popravke (kontrast / chart / grupisana navigacija): ZAVRŠENE**, commit-ovano na
  grani `arena/71be6ba3-beauty-salon-v2`, HEAD = `921db1b`, CI **zeleno 5/5**
  (zadnji zeleni run `43853267180`).
- **Pravi audit-cilj — standardizacija admin dashboarda preko djеljenih, token-driven
  komponenti s varijantama — NIJE implementiran.** Urađeno je *istraživanje* i *specifikacija*
  (Faza A), ali **kod još nije pisan**. Grana je trenutno u čistom CI-zelenom stanju
  (jedini untracked fajl je ovaj handoff).
- **Sljedeće:** implementirati Fazu A prema tabeli ispod, pokrenuti lokalne provjere + CI,
  potvrditi zeleno, zatim Faza B → C → D.

## Referentni dokumenti (izvori istine)
- `HANDOFF.md` (u plan dir-u) — glavni handoff refaktora; S0–S5 gotovi, STOP prije S6.
- `00_overview.md` — plan + odluke Q1–Q11 (obavezujuće: strogi paritet, dozvoljeno grupisanje
  navigacije, Aurum fiksira paletu, nema novih zavisnosti).
- `22_admin-analytics-pregled.md` — prihvatni kriterijumi i LIMITI za analytics (vizuelna
  provjera ostaje na vlasniku; automatski axe NE dokazuje standardizaciju).
- `20_admin-dashboard-pregled.md`, `17_admin-poprecni-pregled.md`, `18_admin-stranice-evidencija.md`,
  `19_checklist-template-pregled-stranice.md` — postojeći admin audit/pregledi (inventar stanja).
- `frontend/scripts/check_ui_contrast.py` — mjerac WCAG kontrasta (referentni alat).
- `frontend/src/app/text-contrast-allowlist-a11y.test.mjs` — allowlist dozvoljenih boja
  (paziti na `badge.tsx::slate-50` entry nakon tokenizacije).
- `frontend/tailwind.config.js` (colors) + `frontend/src/styles/globals.css` — token sistem
  (svi semantički tokeni definisani za **obje** skinu: `:root`/`.dark` = Classic,
  `[data-skin="aurum"]` = smeđe/brand).
- Djeljene komponente: `frontend/src/components/ui/*` (button, card, badge, input, label,
  alert, tabs, dialog) i `frontend/src/features/shell/admin/ui/*` (data-table, page-header,
  filter-bar, stat-card, stat-grid, status-badge, confirm-dialog, responsive-dialog).

## Tačno sljedeće (prvi konkretan korak)
1. Implementirati **Fazu A** iz tabele niže (tokenizovati 7 primitiva: Card, Input, Label,
   Alert, Tabs, Dialog + neutralne varijante Button/Badge). Zamjene uklanjaju `dark:` variantu
   jer tokene rješava skin.
2. Lokalno: `npm run test:render-smoke`, `npm run lint`, `npm run typecheck:e2e`,
   `npm run build`; zatim push → CI mora biti 5/5.
3. Faza B (tokenizirati "uvijek tamne" pillove preko novog `--surface-inverse` tokena; zatvoriti
   rupe u komponentama) → Faza C (migrirati admin stranice s raw Tailwind-a na djеljene
   komponente; cilj 903→~0 raw `slate-*` i 54→0 raw `<button>`) → Faza D (obrisati redundantne
   `[data-skin="aurum"]` patch CSS).
4. **Vizuelna provjera od vlasnika** — ne proglašavati gotovim bez nje.

> Česta greška iz prošlih sesija: tvrditi „standardizovano" kad su urađene samo analytics-scoped
> CSS zakrpe (`[data-analytics-hub] …`, `data-default-card-surface`, `data-default-admin-field`).
> Mjerilo uspjeha: da li svaka admin stranica koristi iste djеljene komponente s istim
> tokenima — ne pojedinačne zakrpe.

## Cilj (iz korisnika)
Pravi audit = sve admin komponente standardizovane preko **djeljenih, token-driven
komponenti s varijantama** (Button, Card, Badge, Input, Alert, Tabs, Dialog, …), korištene
svuda — a ne analytics-scoped CSS zakrpe. Vizuelni izgled mora biti identičan *po konstrukciji*.

> Česta greška iz prošlih sesija: tvrditi „standardizovano" kad su urađene samo
> analytics-scoped CSS zakrpe (`[data-analytics-hub] …`, `data-default-card-surface`,
> `data-default-admin-field`). To NIJE standardizacija. Mjerilo: da li svaka admin stranica
> koristi iste djeljene komponente s istim tokenima — ne pojedinačne zakrpe.

## Odobreni redoslijed (korisnik: "tokenize_first")
- **Faza A** — učiniti djeljene primitive token-driven (Card/Button/Badge/Input/Alert/Tabs/Dialog)
  preko semantičkih CSS varijabli. *U toku.*
- **Faza B** — zatvoriti rupe u komponentama (chip/pill, EmptyState/ErrorState/Skeleton, …).
- **Faza C** — migrirati admin stranice na djeljene komponente (bez raw Tailwind-a),
  stranicu po stranicu, uz browser-render + axe regresiju.
- **Faza D** — obrisati redundantne `[data-skin="aurum"]` patch CSS koji su postojali samo
  da maskiraju nekonzistentnost po stranici.

## Istraživanje token sistema (gotovo — ključno za Fazu A)
Svi semantički tokeni su definisani u **obje** skinu:
- `:root` (Classic light) i `.dark` (Classic dark) — vidi `frontend/src/styles/globals.css:15-115`.
- `[data-skin="aurum"][data-mode="light"]` i `.dark[data-skin="aurum"]` — override-aju iste tokene
  na smeđe/brand vrijednosti (linije ~135-260).

**Bitno:** Classic vrijednosti tokena su *identične* hardcoded slate vrijednostima
(`--surface`=white, `--text`=near-black, `--line`=slate-200, `--surface-muted`=slate-100, …).
Zato je zamjena `bg-white dark:bg-slate-950` → `bg-surface text-content border-line` **no-op za
Classic**, a **fix za Aurum**. Tokenizacija je stoga niskog rizika.

**Tailwind `colors` mapa** (`frontend/tailwind.config.js:42-90`) izlaže:
`bg-surface`/`bg-surface-muted`/`bg-surface-sunken`, `text-content`/`text-content-muted`/
`text-content-strong`, `border-line`, `border-control-border`, `border-input-border`,
`bg-danger`/`text-danger-foreground`, `bg-ok-bg`/`text-ok-fg`, `bg-warn-*`, `bg-bad-*`,
`bg-info-*`, `bg-neutral-*`, `ring-focus-ring`, `bg-nav-active`, `text-on-primary`.
**NE** izlaže `background`/`foreground`/`primary`/`card`/`border`/`ring` (one su definisane
u CSS-u ali nisu mapirane u Tailwind boje).

**Zaključak o "uvijek tamnim" pillovima** (`bg-slate-900 text-slate-50`, Button/Badge `default`):
nema mode-invariant tokena za njih (surface je svijetao u light / tamna u dark, pa `bg-content`
bi se invertovao u dark modu). Ostavljeni su kao `slate-900` (intencionalni inverzni pill).
Ako se želi i to tokenizirati, treba dodati `--surface-inverse` token (Faza B).

## Tačna specifikacija tokenizacije — Faza A (šta je urađeno / šta uraditi)
Sve zamjene uklanjaju `dark:` varijante jer tokene rješava skin.

| Komponenta | Prije | Poslije |
|---|---|---|
| `components/ui/card.tsx` base | `rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50` | `rounded-lg border border-line bg-surface text-content shadow-sm` |
| `card.tsx` CardDescription | `text-sm text-slate-500 dark:text-slate-400` | `text-sm text-content-muted` |
| `card.tsx` data-regex | bg/border negative lookahead bez surface/line | dodati `surface\|surface-muted\|surface-sunken\|foreground\|background` (bg) i `line\|control-border\|input-border` (border) da default Card zadrži `data-default-card-surface`/`border` |
| `components/ui/input.tsx` | `… border border-input-border bg-white … text-slate-900 … ring-offset-white … placeholder:text-slate-500 dark:bg-slate-950 dark:text-slate-50 dark:ring-offset-slate-950 dark:placeholder:text-slate-400` | `… border border-input-border bg-surface … text-content … ring-offset-surface … placeholder:text-content-muted` (+ isti regex fix kao u card) |
| `components/ui/label.tsx` | `text-sm font-medium leading-none text-slate-700 … dark:text-slate-200` | `text-sm font-medium leading-none text-content-strong …` |
| `components/ui/alert.tsx` base svg | `… text-slate-950 dark:[&>svg]:text-slate-50` | `… text-content` |
| `alert.tsx` variant `default` | `bg-white text-slate-950 border-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800` | `bg-surface text-content border-line` |
| `components/ui/tabs.tsx` TabsList | `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300` | `bg-surface-muted text-content-muted` |
| `tabs.tsx` TabsTrigger | `… ring-offset-white … data-[state=active]:bg-white data-[state=active]:text-slate-900 … dark:ring-offset-slate-950 dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-slate-50` | `… ring-offset-surface … data-[state=active]:bg-surface data-[state=active]:text-content …` |
| `components/ui/dialog.tsx` DialogContent | `… border border-slate-200 bg-white … dark:border-slate-800 dark:bg-slate-950 …` | `… border border-line bg-surface …` |
| `dialog.tsx` close | `… ring-offset-white … dark:ring-offset-slate-950` | `… ring-offset-surface …` |
| `dialog.tsx` DialogDescription | `text-sm text-slate-500 dark:text-slate-400` | `text-sm text-content-muted` |
| `components/ui/badge.tsx` `secondary` | `bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50` | `bg-surface-muted text-content` |
| `badge.tsx` `outline` | `text-slate-900 dark:text-slate-50` | `text-content` |
| `components/ui/button.tsx` `secondary` | `border-slate-200/90 bg-slate-100 text-slate-900 … dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 …` | `border-line bg-surface-muted text-content … hover:bg-surface-sunken … ring-offset-surface` |
| `button.tsx` `outline` | `border-slate-200/90 bg-white text-slate-900 … dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 …` | `border-line bg-surface text-content … hover:bg-surface-muted … ring-offset-surface` |
| `button.tsx` `ghost` | `text-slate-600 … dark:text-slate-400 …` | `text-content-muted … hover:bg-surface-muted hover:text-content … ring-offset-surface` |
| `button.tsx` base (cva) | `… dark:focus-visible:ring-offset-slate-950` | ukloniti `dark:focus-visible:ring-offset-slate-950` |

**OSTAVLJENO kako jest (intencionalno, ne dira se u Fazi A):**
- `Button` `default` (`bg-slate-900 text-white`) i `Badge` `default` (`bg-slate-900 text-slate-50 …`) — uvijek tamni inverzni pill, nema tokena (vidi iznad).
- `Button` `onDark`/`onDarkOutline`/`destructive`/`danger`, `Badge` `brand`/`success`/`warning`/`danger` — status/brand varijante (koristi ih i javni sajt; komentar u `badge.tsx` kaže "ne diraju se").
- `Alert` `destructive`/`warning`/`success` — status boje.
- `DataTable` (`features/shell/admin/ui/data-table.tsx`) — zasebna komponenta, Faza C.

**Tailwind dodatak (opciono, za pripremu Faze B):** u `colors` dodati
`background: 'hsl(var(--background))'`, `foreground: 'hsl(var(--foreground))'` da budu
dostupni `bg-foreground`/`text-background` za inverzne pillove.

## Testovi koje paziti (regresija)
- `frontend/src/features/shell/admin/ui/render-smoke.test.mjs` — default Card mora zadržati
  `data-default-card-surface=""` (zato regex fix iznad). Probaj i `doesNotMatch` za boje.
- `frontend/src/features/shell/admin/s6-presentation.test.mjs` — hrefovi nav-a; ne pogođen.
- `frontend/src/app/text-contrast-allowlist-a11y.test.mjs:68` — `badge.tsx::slate-50` allowlist
  entry postaje mrtav nakon tokenizacije `default` badge-a (ostavljen); provjeriti da test ne
  zahtijeva da svaki allowance bude prisutan, inače očistiti.
- Javni testovi (`public-home-accessibility`, `public-contact-accessibility`, `profile`,
  `public-a11y-axe-findings`, `public-service-detail-recovery`) — tvrde `text-slate-950`/
  `bg-white` na **javnim** komponentama (odvojene od djeljenih primitiva); ne diraju se, ne smiju pasti.
- CI browser axe + render za ~32 rute — mora ostati zeleno (Classic tokeni == slate vrijednosti,
  Aurum sada pravilno themed; stare `[data-skin="aurum"]` patch CSS postaju redundantne ali bezopasne).

## Sljedeći koraci (redoslijed)
1. Faza A: primijeniti gornju tabelu, pokrenuti lokalno (`npm run test:render-smoke`,
   `npm run lint`, `npm run typecheck:e2e`, `npm run build`) i CI; potvrditi zeleno.
2. Faza B: dodati `--surface-inverse` (ili `primary`) token + mapirati u Tailwind; tokenizirati
   `default` Button/Badge pillove; zatvoriti rupe u komponentama (chip/pill, EmptyState, …).
3. Faza C: stranicu po stranicu (Dashboard → Analytics → Users → Stylists → Reservations →
   DailyLog → Finance → Loyalty → Salon → Services → Blog → Gallery → Reviews → Settings)
   zamijeniti raw Tailwind (`bg-slate-200 bg-white text-slate-900` chipovi, table rowovi, heading)
   djeljenim komponentama (Badge/StatusBadge, DataTable, PageHeader, FilterBar, StatCard/StatGrid).
   Cilj: 903 → ~0 raw `slate-*` pojava u admin TSX, 54 → 0 raw `<button>`.
4. Faza D: ukloniti redundantne `[data-skin="aurum"]` patch CSS.
5. Vizuelna potvrda od korisnika (korisnik eksplicitno: ne proglašavati gotovim bez njegove provjere).

## NAPOMENA
- Ne dirati untracked WIP `frontend/src/features/dashboard/aurum-stat-grid.tsx`.
- Ne raditi migracije baze; ovo je čisti frontend refaktor.
- Automatski axe NE dokazuje vizuelnu standardizaciju — korisnikova vizuelna provjera je obavezna.
