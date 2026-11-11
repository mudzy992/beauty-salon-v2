# S8 — Admin: Analitika, Korisnici, Salon, Usluge, Frizeri (+ Work Gallery)

**Status:** 🟡 čeka odobrenje S7 · **Uključuje obavezno razbijanje velikih fajlova po `code-hygiene-and-matrices.mdc`.**

---

## 1. Cilj

Refaktor preostalih „podatkovnih" admin ekrana prema NEJRA §05/§09/§11, uz grafičke alternative (tekst + tabela), pristupačne tabele, jedinstvena imena akcija i **razbijanje predugih fajlova** na module od ~100–150 linija (stranica postaje tanka kompozicija). Bez promjene analitičkih proračuna, uloga, paginacije i API ugovora.

---

## 2. Ulaz

S7 završen (5/5); `DataTable`/`StatCard`/`StatusBadge` u upotrebi; odluka o `window.confirm` poznata; NEJRA §09 ima retke za ovih 6+1 ekrana. U S8 se **prvo mjere** stvarne veličine fajlova (`wc -l`) i taj se spisak upisuje u `CHANGELOG.md` prije razbijanja (ne koriste se historijski brojevi iz starih planova).

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/pages/AnalyticsHub.tsx`, `Analytics.tsx`, `ClientAnalytics.tsx`, `StylistAnalytics.tsx`, `features/analytics/*`, `features/client-analytics/*`, `features/stylist-analytics/*` | **IZMJENA** — 3 taba, grafikoni, tabele |
| `frontend/src/pages/Users.tsx` | **IZMJENA + RAZBIJANJE** → `features/users/…`, tanka `pages/Users.tsx` |
| `frontend/src/pages/Services.tsx` | **IZMJENA + RAZBIJANJE** → `features/services/…` |
| `frontend/src/pages/Salon.tsx`, `Stylists.tsx`, `features/salon/*` | **IZMJENA (+ razbijanje ako mjera pokaže >150 ln)** |
| `frontend/src/pages/ServiceWorkGallery.tsx` | **IZMJENA** — galerija radova uz uslugu |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |
| `frontend/src/app/routes/admin.routes.tsx` | **BEZ IZMJENE** (rute/`TabRedirect` ostaju) |

---

## 4. Ugovor

- `AnalyticsHub` s 3 taba i `?tab=` ostaje; `/admin/client-analytics`, `/admin/stylist-analytics` i dalje `TabRedirect`; `test:analytics-hub-redirect` zelen.
- **Grafikoni (recharts):** uz svaki grafikon tekstualni sažetak + tabela podataka kao alternativa; legenda s dovoljnim kontrastom (`test:text-contrast-allowlist`), tooltip dostupan tastaturom; nikad boja kao jedini nosilac trenda.
- `Salon.tsx`: **točno jedan `<h1>`** (stari plan je evidentirao 2× `<h1>` kao defekt; u S8 se mjeri i ispravlja ako i dalje postoji — ispravka se bilježi u `CHANGELOG.md`).
- **Korisnici/uloge:** iste uloge, ista dodjela prava, isti `temporary-user-credentials` tok, ista deaktivacija, ista paginacija; bez novih polja.
- **Usluge/frizeri:** isti katalog, iste kategorije/podkategorije, iste asocijacije stilista, iste cijene/trajanja, isti `ServiceWorkGallery` upload/brisanje.
- `3.3.4`: potvrda prije brisanja/deaktivacije/promjene uloge; `ConfirmDialog` samo ako je odobreno u S6.
- `2.5.3 Label in Name` + jedinstvena imena akcija po redu; `aria-sort`, `caption`, `th scope`, kartice <640 px bez gubitka kolona.
- Bez novih zavisnosti; `queryKeys`, endpointi, socket event-i netaknuti.

---

## 5. Koraci

1. Izmjeriti `wc -l` za svih 6+1 fajlova; upisati u `CHANGELOG.md`; razbiti one >150 ln u `features/<modul>/{components,hooks,utils}` s tankom `pages/*.tsx` kompozicijom. **Odmah brisati** izdvojeni mrtvi kod, ne ostavljati duplikate.
2. `AnalyticsHub`: novi `PageHeader` + tabovi (`role="tablist"`, `aria-selected`, `aria-controls`, tastaturna navigacija); za svaki grafikon dodati `<table>` alternativu i tekstualni sažetak iz **istih** podataka (bez novih izračuna).
3. `Users`: novi `DataTable` s jedinstvenim imenima akcija, `StatusBadge` za uloge/status, `ConfirmDialog` za destruktivne radnje, `fieldset/legend` za formu; zadržati sve `aria-live` statuse i `labelWithVisibleText`.
4. `Services` / `Salon` / `Stylists`: isto + `ServiceWorkGallery` s nazivima slika, tastaturnom alternativom za reorder/upload zonu (2.5.7), disabled stanjem za nestalu sliku.
5. Aurum varijante kroz tokene; serifni naslovi; zlato samo za primarnu akciju.
6. Ako je odobreno: `window.confirm` u `Users`/`Services` → `ConfirmDialog` (ista poruka/uvjet/efekat + fokus-povratak).

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje): `test:analytics-hub-redirect`, `test:stylist-analytics-tables-a11y`, `test:users-a11y`, `test:temporary-user-credentials`, `test:salon-services-stylists-a11y`, `test:admin-content-a11y`, `test:text-contrast-allowlist`, `test:generic-aria-and-row-actions`, `test:form-control-labels`, `test:admin-render-smoke`, `test:axe-render-a11y`, `test:data-table-consistency`, `test:theme-ssot-sync`.

Novi (ako se pojavi potreba): `test:admin-heading-uniqueness` — jedan `<h1>` po admin stranici (mutacijska provjera). Svaka nova skripta + CI korak.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (pratiti `Analytics` chunk 396,02 KiB / 114,09 KiB gzip baseline, budžet 140 KiB; `Users` 38,19 KiB; `Services` 35,46 KiB) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `a11y-e2e` pokriva analitiku i korisnike.

---

## 8. DoD + dokazi

- ✅ 6+1 ekrana u 3 stanja; izmjerene veličine i razbijanje upisani u `CHANGELOG.md`; nema mrtvog koda.
- ✅ Grafikoni imaju tekst + tabelu; jedan `<h1>` po stranici; svi navedeni testovi zeleni.
- ✅ Uloge/katalog/cijene/analitički zbiri netaknuti; `?tab=` radi; build u budžetu; CI 5/5.
- 🟡 Tooltip grafikona u čitaču ekrana / 400% zoom → S11.
- **STOP** → „Odobravaš li S9 (Blog, Galerija, Recenzije, Postavke hub + tabovi)?"

---

## 9. Rizici / pitanja

- Razbijanje `Users.tsx`/`Services.tsx` mijenja putanje fajlova koje neki source-contract testovi čitaju **po imenu**. Prije razbijanja: `grep` svih testova na te putanje; ako test ovisi o putanji, ažurira se tako da **zadrži istu garanciju** (Q10), uz obrazloženje — nikad se ne briše.
- Ako `Analytics` chunk pređe 140 KiB gzip nakon dodavanja tabelarnih alternativa → **STOP** + prijedlog code-splittinga (ne povećavati budžet bez odobrenja).
- Ako NEJRA §05 predlaže drugačije grupisanje analitike od već postojećeg `AnalyticsHub` → pitanje, ne samostalna promjena ruta.
