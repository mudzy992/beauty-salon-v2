# Faza 8 — Salon / Usluge / Frizeri (+ ServiceWorkGallery)

**4 ekrana, 2839 linija, 0 testova** — najslabija sigurnosna mreža u obimu. Prvi korak je dodavanje testova, pa tek onda refaktor.

---

## 1. Inventar funkcionalnosti

| Ekran | Fajl | Linija | Glavne akcije |
|---|---|---:|---|
| Salon | `pages/Salon.tsx` | 603 | podaci salona, radno vrijeme (`/api/salon/${id}/working-hours`, `…/ensure`), praznici (CRUD + `…/send-notification`) |
| Usluge | `pages/Services.tsx` | **1528** | usluge CRUD, kategorije, potkategorije, `deletion-impact` provjera, prije/poslije galerija |
| Frizeri | `pages/Stylists.tsx` | 482 | frizeri CRUD, radno vrijeme, povezane usluge |
| Galerija radova | `pages/ServiceWorkGallery.tsx` | — | `/api/daily-log/before-after` |

**API:** `/api/salon`, `/api/salon/list`, `/api/salon/${id}`, `/api/salon/${id}/working-hours`,
`/api/salon/${id}/working-hours/ensure`, `/api/salon/${id}/holidays/`, `/api/salon/holidays/${id}`,
`/api/salon/holidays/${id}/send-notification`, `/api/salon/${id}` (PUT),
`/api/services`, `/api/services/${id}`, `/api/services/admin/services/${id}`,
`/api/services/admin/services/${id}/deletion-impact`, `/api/services/categories`, `/api/services/categories/${id}`,
`/api/services/subcategories`, `/api/services/subcategories/${id}`,
`/api/stylists/admin`, `/api/stylists/${id}`, `/api/stylists/${id}/working-hours`, `/api/stylists/${id}/services`,
`/api/uploads/public`, `/api/daily-log/before-after`.

## 2. Inventar podataka

Salon: naziv, adresa, kontakt, radno vrijeme po danima, praznici (datum, naziv, obavijest).
Usluge: naziv, opis, trajanje, cijena, kategorija/potkategorija, vidljivost, galerija.
Frizeri: ime, korisnik, usluge, radno vrijeme.
**Cijene i trajanja utiču na rezervacije i dnevnu knjigu** → paritet je kritičan.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | `Salon.tsx` ima **2 `<h1>`** → jedan `PageHeader` (Q6) | 1.3.1 |
| D2 | `window.confirm`: `Services.tsx:356,367`, `Salon.tsx:264` → `ConfirmDialog` | 3.3.4 |
| D3 | `PageHeader` + `FilterBar` + `DataTable` + `FormSection` na sva tri ekrana | 1.3.1 |
| D4 | Radno vrijeme: `fieldset`/`legend` po danu; switch + vidljiva labela | 1.3.1, 3.3.2 |
| D5 | Brisanje usluge: `deletion-impact` prikaz u `ConfirmDialog` (posljedice prije potvrde) | 3.3.4 |
| D6 | Upload zona → native input + `role="progressbar"`; **bez obaveznog drag&drop-a** | 2.5.7 |
| D7 | `BeforeAfterSlider` / `media-image` — **ne dirati** (dijeljeno s javnim); samo provjeriti 2.5.7 alternativu | 2.5.7 |
| D8 | `autoComplete="off"` na `Services.tsx:1473` — provjeriti da ne blokira password manager (3.3.8 nije primjenjivo jer nije auth polje) | ➖ |
| D9 | Tokeni umjesto `slate-*`; card prikaz tabela ispod 640px | 1.4.3, 1.4.10 |

## 4. Razbijanje fajlova

```
features/salon/    salon-page.tsx · salon-form.tsx · working-hours-editor.tsx · holidays-table.tsx · holiday-notification-dialog.tsx · use-salon-data.ts
features/services/ services-page.tsx · services-table.tsx · service-form-dialog.tsx · categories-panel.tsx · subcategories-panel.tsx · deletion-impact-dialog.tsx · use-services-data.ts
features/stylists/ stylists-page.tsx · stylists-table.tsx · stylist-form-dialog.tsx · stylist-services-panel.tsx · stylist-working-hours.tsx · use-stylists-data.ts
```

## 5. WCAG stavke

1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.2 · **2.5.7 (upload)** · 2.5.8 · 3.3.1–3.3.4 · 4.1.2 (switch, combobox) · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **0 testova** za 2839 linija | **prvo** dodati `test:salon-i18n`, `test:services-i18n`, `test:stylists-i18n` + `test:services-parity`, pa onda refaktor |
| Cijene/trajanja → rezervacije | API sloj netaknut; paritet test |
| `BeforeAfterSlider` dijeljen s javnim | ne dirati; grep dokaz |
| `Services.tsx` 1528 linija | rezati po panelima, jedan commit po panelu |

## 7. Testovi

**Postojeći:** nijedan.
**Novi (prije refaktora):** `test:salon-i18n`, `test:services-i18n`, `test:services-parity`, `test:stylists-i18n`,
`test:salon-services-a11y` (bez `window.confirm`, jedan `h1`, fieldset/legend).

## 8. Definition of Done

Standardni DoD + `Salon.tsx` ima tačno jedan `h1`; nijedan `window.confirm`; sve cijene/trajanja identični;
svaki novi fajl < 150 linija; `BeforeAfterSlider`/`media-image` bez diff-a.

## 9. Obim

~24 fajlova (20 novih), 4 commita (testovi → Salon → Services → Stylists+WorkGallery).
