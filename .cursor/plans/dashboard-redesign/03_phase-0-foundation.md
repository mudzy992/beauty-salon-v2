# Faza 0 — Temelj: tokeni, a11y infrastruktura, shell, primitivi, page templates

**Najveći uticaj, najveći rizik (dijeljene komponente). Poslije ove faze — KAPIJA: STOP i pregled.**

---

## 1. Inventar funkcionalnosti (paritetni ugovor)

### 1.1 Admin shell — `features/shell/admin/admin-layout.tsx` (7112 B)

| # | Funkcija | Detalj | Mijenja se? |
|---|---|---|---|
| F1 | Sticky header sa brand-om | `AdminBrand` (uploaded logo ili `AppLogo`), link na `/admin` | ❌ samo tokeni |
| F2 | Brand iz postavki | `app_logo`, `app_title`, `app_logo_svg_color`, `app_logo_text_color`, `app_logo_accent`, `app_logo_animated` preko `useSettings()` | ❌ **netaknuto** |
| F3 | Trenutna sekcija u headeru | `currentLabel` iz `flatAdminNavItems()`, fallback za `client-analytics`/`stylist-analytics`, inače `location.pathname` | ❌ logika ista |
| F4 | Drawer navigacija (mobile) | `Drawer` + `DrawerContent id="admin-mobile-navigation"` + `DialogTitle` `sr-only` + avatar + email + `AdminNav compact` + „Pogledaj sajt“ + „Odjava“ | ❌ struktura ista, dodaje se `aria-current` |
| F5 | Desktop sidebar | `hidden lg:block`, `grid-cols-[220px_1fr]`, `max-w-[1600px]` | ⚠️ breakpoint ostaje; tokeni |
| F6 | Korisnički meni | `AdminUserMenu`: `LanguageSwitcher` + avatar (mobile = otvara drawer, desktop = `DropdownMenu` sa „Pogledaj sajt“ + „Odjava“) | ❌ |
| F7 | Brojač blog komentara | `GET /api/blog/comments/pending-count`, `setInterval(60_000)`, `Math.max(0, Number(...))`, prikazan kao `Badge` uz Blog | ❌ logika; 2.2.2 procjena |
| F8 | Odjava | `useAuth().logout()` | ❌ |

### 1.2 Stylist shell — `layouts/StylistLayout.tsx` (162 ln)

F1 naslov/link `/stylist/inbox` · F2 dva `<nav>` sa istim `navItems` (inbox, workbook=`nav.dailyLog`, schedule, debts, stats) ·
F3 `LanguageSwitcher` · F4 korisnički meni (Profil `/profil`, „Switch to client“ ako `roles` sadrži `CLIENT`, Odjava) ·
F5 `useStylistPortalSocketRefresh()` · F6 avatar (inicijali do 2 slova, `getUploadUrl`).

### 1.3 Guard-ovi

`ProtectedRoute` (isReady gate, redirect `/login` sa `location` u state, `mustChangePassword` → `/force-change-password`,
client onboarding preko `getClientMandatoryOnboardingPath()`), `StylistRoute`, `PublicOnlyRoute` (`getPostAuthRedirectPath`).
**Ne diraju se.** Test: `test:route-guards-i18n`.

## 2. Inventar podataka

| Vrijednost | Izvor | Formatiranje |
|---|---|---|
| `app_title` / logo | `SettingsContext.getSetting` | fallback `t('app.title')` |
| `user.username`, `user.email`, `user.avatar` | `useAuth()` | `getUploadUrl(avatar)` |
| `pendingBlogComments` | `GET /api/blog/comments/pending-count` → `data.pending` | `Math.max(0, Number(x) \|\| 0)`, badge samo ako `> 0` |
| `currentLabel` | `t(match.labelKey)` | i18n |
| Navigacijske labele | `admin-nav.ts` (`nav.*` ključevi) | i18n |
| Stylist „Switch to client“ | `normalizeRoles(user?.roles).includes('CLIENT')` | — |

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | Dodati semantičke tokene u `globals.css` (`:root` + `.dark`) — §2 iz `02_design-system.md`. **Postojeće vrijednosti se ne mijenjaju.** | 1.4.3, 1.4.11 |
| D2 | Dodati odgovarajuće Tailwind aliase (`surface`, `surface-muted`, `line`, `control-border`, `text-muted`, `ok/warn/bad/info/neutral`, `focus-ring`) | — |
| D3 | Proširiti `scripts/check_ui_contrast.py` (~24 nova para, HEX + `var()` podrška) i držati `--strict` zelenim | 1.4.3, 1.4.11 |
| D4 | Globalni `prefers-reduced-motion` blok + `scroll-padding-top/bottom` + `forced-colors` osnovni blok | 2.3.3, 2.4.11, 1.4.1 |
| D5 | **`SkipLink`** u oba shell-a | 2.4.1 |
| D6 | `<nav aria-label>` + `aria-current="page"` u oba shell-a; jedan izvor stylist navigacije | 1.3.1, 2.4.8, 3.2.3 |
| D7 | `PageHeader` sa `h1 tabIndex={-1}` + focus-on-navigate hook | 2.4.2, 2.4.3, 2.4.6 |
| D8 | Mapa naslova po ruti (2.4.2) — admin/stylist rute dobijaju stvaran `<title>` umjesto `seo.defaultTitle` | 2.4.2 |
| D9 | „Pomoć“ link u headeru oba shell-a, na istom relativnom mjestu | 3.2.6 |
| D10 | `PageHeader`, `FilterBar`, `DataTable` + `TablePagination`, `StatCard`, `FormSection`, `EmptyState`/`ErrorState`/`TableSkeleton` (promovisano iz finance), `ConfirmDialog` + `ResponsiveDialog` (promovisano iz finance) u `features/shell/admin/ui/*` | — |
| D11 | `Button`: **nova** admin varijanta (`danger`, `quiet`) — postojeće varijante netaknute; disabled bez `opacity-50` | 1.4.3, 1.4.11 |
| D12 | `Input`/`Textarea`: **nova** admin varijanta sa `--control-border` | 1.4.11 |
| D13 | `DropdownMenu`: dodati fokus prsten (aditivno) | 2.4.7 |
| D14 | `Badge`: status varijante sa **ikonom** (`StatusBadge` mapa) | 1.4.1 |
| D15 | `OtpInput`: `autocomplete="one-time-code"` | 3.3.8 |
| D16 | Stylist shell: isti `SkipLink`/`PageHeader`/focus-on-navigate; jedan `navItems` izvor | 2.4.1, 1.3.1 |

**Šta se NE mijenja:** nijedan API poziv, nijedan `queryKey`, nijedan socket event, nijedna ruta, nijedna guard logika,
brand postavke, `LanguageSwitcher` ponašanje, `logout()` tok, Drawer (zadržava se umjesto disclosure-a).

## 4. Razbijanje fajlova

```
frontend/src/
  styles/globals.css                     ← + tokeni, reduced-motion, scroll-padding, forced-colors
  features/shell/admin/
    admin-layout.tsx                     ← tanka kompozicija (cilj < 120 ln)
    admin-chrome.tsx                     ← ostaje
    admin-nav-menu.tsx                   ← + aria-current, tokeni, min 12px
    admin-nav.ts                         ← ostaje (IA izmjena tek uz Q3)
    admin-page-titles.ts                 ← NOVO: ruta → i18n ključ naslova
    ui/skip-link.tsx                     ← NOVO
    ui/page-header.tsx                   ← NOVO
    ui/filter-bar.tsx                    ← NOVO
    ui/data-table.tsx                    ← NOVO (caption, scope, aria-sort, card ispod 640px)
    ui/table-pagination.tsx              ← NOVO
    ui/stat-card.tsx                     ← NOVO
    ui/form-section.tsx                  ← NOVO
    ui/data-state.tsx                    ← PREMJEŠTENO iz features/finance/components
    ui/confirm-dialog.tsx                ← PREMJEŠTENO iz features/finance/components
    ui/responsive-dialog.tsx             ← PREMJEŠTENO iz features/finance/components
    ui/status-badge.tsx                  ← NOVO (mapa status → {labelKey, icon, tone})
  hooks/use-focus-on-navigate.ts         ← NOVO
```

`features/finance/components/*` ostaju kao **re-export** (da se ne slome finance importi i testovi) ili se importi
ažuriraju u istom commitu — odluka u implementaciji, uz `CHANGELOG`.

## 5. WCAG stavke specifične za fazu

2.4.1 · 2.4.2 · 2.4.3 · 2.4.6 · 2.4.7 · 2.4.11 · 2.4.13 · 3.1.1 (verifikacija) · 3.2.3 · 3.2.6 · 1.3.1 ·
1.4.1 · 1.4.3 · 1.4.11 · 1.4.12 · 2.2.2 (procjena) · 2.3.3 · 4.1.2 (nav/drawer) · 4.1.3 (postoji, provjera)

Detalji i vlasnici: [`dashboard-a11y/MATRIX.md`](../../docs/matrices/dashboard-a11y/MATRIX.md).

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| `globals.css` i `index.css` su **globalni** → javni sajt | samo **dodavanje** tokena; nijedna postojeća vrijednost se ne mijenja; `--input`/`--border` ostaju |
| `Button`/`Input`/`Badge`/`DropdownMenu` koristi javni sajt | **nove varijante**, ne izmjena postojećih; `dropdown-menu` fokus prsten je aditivan |
| 31 test fajl asertuje tačne `className` stringove | `navigation-drawer-accessibility.test.mjs` traži doslovno `<DrawerContent id="admin-mobile-navigation" className="p-5">` → **zadržati tu liniju** ili ažurirati test uz obrazloženje |
| Bundle: novi šabloni u inicijalnom chunku | 269.0/300 KiB → ~31 KiB slobodno; šabloni su mali; `check-bundle-budget.mjs` poslije svake faze |
| `check_ui_contrast.py` trenutno parsira **samo HSL** | proširiti parser za HEX + `var()` (promjena samo u skripti) |
| Premještanje `finance/components/*` lomi finance importe | re-export ili atomski commit; 21 finance test mora ostati zelen |

## 7. Testovi

**Moraju ostati zeleni (postojeći):** `test:navigation-drawer-accessibility`, `test:route-guards-i18n`,
`test:admin-settings-accessibility`, `test:finance-data-state-accessibility`, `test:finance-confirm-dialog-accessibility`,
`test:finance-responsive-dialog-accessibility`, `test:brand-colors`, `test:uploaded-brand-logo-security`,
`test:socket-recovery`, `test:i18n-language`, `test:locale-formatting` + svih ostalih 142.

**Novi (registruju se u `package.json` i `.github/workflows/ci.yml`):**

| Skript | Šta štiti |
|---|---|
| `test:shell-skip-link` | `SkipLink` postoji u oba shell-a, prvi je element, `href="#main"`, `main` ima `id` i `tabIndex={-1}` |
| `test:shell-landmarks` | `nav aria-label`, `aria-current`, jedan `h1` po `PageHeader`, `header`/`main` landmark-i |
| `test:shell-page-titles` | svaka admin/stylist ruta ima ključ naslova; ključ postoji u `bs.json` **i** `en.json` |
| `test:data-table-a11y` | `caption`/`aria-label`, `th scope="col"`, `aria-sort`, jedinstvena imena akcija, `data-label` za card prikaz |
| `test:confirm-dialog-focus` | „Odustani“ prvi fokusiran, `aria-labelledby`/`describedby`, `aria-busy`, bez `window.confirm` u obuhvaćenim modulima |
| `test:semantic-tokens` | admin fajlovi ne koriste sirove `text-slate-*`/hex (allowlist za izuzetke) |
| `test:focus-visible-ring` | admin interaktivni elementi imaju `focus-visible` prsten ≥2px |

**Ako Q4 bude odobren:** `test:a11y-routes` (`@axe-core/playwright` smoke po admin/stylist rutama).

## 8. Definition of Done

Standardni DoD iz [`00_overview.md` §8](00_overview.md) + specifično:

- [ ] Svi postojeći tokeni nepromijenjeni (diff `globals.css` pokazuje **samo dodavanja**, osim obrazloženog `--control-border`)
- [ ] `check_ui_contrast.py --strict` zelen sa novim parovima
- [ ] Skip link, `aria-current`, `nav aria-label`, focus-on-navigate, mapa naslova, „Pomoć“ — u **oba** shell-a
- [ ] Nijedan `window.confirm` još nije zamijenjen u ovoj fazi (to rade moduli) — ali `ConfirmDialog` je dostupan
- [ ] Javni sajt: diff dokaz za svaku diranu dijeljenu komponentu
- [ ] Bundle: inicijalni chunk ≤ 300 KiB gzip i **bez pogoršanja** bez obrazloženja

## 9. Obim i redoslijed commit-ova

Procjena: **~22 fajla** (12 novih, 10 izmijenjenih), 4 commita.

1. `a11y/ui(tokens): add semantic color tokens + contrast pairs` — `globals.css`, `tailwind.config.js`, `check_ui_contrast.py`
2. `a11y/ui(shell): skip link, landmarks, aria-current, page titles, focus on navigate` — oba shell-a + `use-focus-on-navigate`
3. `a11y/ui(primitives): admin-scoped button/input/badge/dropdown variants + otp autocomplete`
4. `a11y/ui(templates): page header, filter bar, data table, stat card, form section, data states, confirm dialog`
