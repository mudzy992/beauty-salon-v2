# Faza 9 — Sadržaj: Blog, Galerija, Recenzije

**16 produkcijskih fajlova / 2024 linije / 14 testova.** Predlog M3: **zajednički obrazac stranice, bez spajanja ruta.**

---

## 1. Inventar funkcionalnosti

| Ekran | Fajl | Linija | Akcije |
|---|---|---:|---|
| Blog | `pages/Blog.tsx` + `features/blog/blog-posts-table.tsx`, `blog-post-form-dialog.tsx`, `blog-comments-dialog.tsx` | ~400 | CRUD postova, SEO polja, upload, moderacija komentara (approve/delete) |
| Galerija | `pages/Gallery.tsx` | 600 | kategorije CRUD, slike CRUD, upload, prije/poslije parovi |
| Recenzije | `pages/Reviews.tsx` | 286 | lista, approve, delete |

**API:** `/api/blog`, `/api/blog/admin`, `/api/blog/${id}`, `/api/blog/${postId}/comments/admin`,
`/api/blog/comments/${id}`, `/api/blog/comments/${id}/approve`,
`/api/gallery/categories`, `/api/gallery/categories/${id}`, `/api/gallery/categories/${id}/images/upload`,
`/api/gallery/images`, `/api/gallery/images/${id}`, `/api/gallery/eligible-consented-images`,
`/api/reviews/admin`, `/api/reviews/${id}`, `/api/reviews/${id}/approve`, `/api/uploads/public`.

**Brojač u navigaciji:** `pendingBlogComments` (iz admin shell-a) — **netaknut**.

## 2. Inventar podataka

Blog: naslov, slug, excerpt, HTML sadržaj, SEO, status, datum objave, komentari (status, autor, tekst).
Galerija: kategorija, slika (putanja, alt, consent), prije/poslije parovi.
Recenzije: autor, ocjena, tekst, status, datum.
Datumi: locale formatiranje. Vrijednosti koje dolaze iz baze (naslovi, HTML, imena) ostaju **dinamički podaci**, ne i18n resursi.

## 3. Dizajn izmjene

| # | Izmjena | WCAG |
|---|---|---|
| D1 | Zajednički **obrazac stranice** (`PageHeader` + `FilterBar` + `DataTable`) za sva tri ekrana | 3.2.3, 3.2.4 |
| D2 | `window.confirm`: `Blog.tsx:97,135`, `Gallery.tsx:161,197`, `Reviews.tsx:77` → `ConfirmDialog` | 3.3.4 |
| D3 | Blog editor: `fieldset`/`legend` (Sadržaj / SEO / Mediji), `aria-describedby`, sažetak grešaka | 3.3.1–3.3.3 |
| D4 | Upload zona → native input + `role="progressbar"`; bez obaveznog drag&drop-a | 2.5.7 |
| D5 | `alt` tekst obavezan i provjeren (1.1.1) — `media-image` se ne dira, ali forma mora tražiti `alt` | 1.1.1 |
| D6 | Moderacija komentara: `ConfirmDialog` + `role="status"` najava | 3.3.4, 4.1.3 |
| D7 | Recenzije: status badge (tekst + ikona) | 1.4.1 |
| D8 | Tokeni; card prikaz tabela ispod 640px | 1.4.3, 1.4.10 |
| D9 | **1.2.x:** ako blog/galerija sadrže audio/video → provjera u fazi 13; trenutno nema video playera u admin UI (nije verifikovano u renderu) | 1.2.x |

## 4. Razbijanje fajlova

```
features/blog/     blog-page.tsx · blog-posts-table.tsx · blog-post-form-dialog.tsx · blog-post-seo-fields.tsx · blog-comments-dialog.tsx · use-blog-admin.ts
features/gallery/  gallery-page.tsx · gallery-categories-panel.tsx · gallery-images-table.tsx · gallery-image-dialog.tsx · gallery-upload.tsx · use-gallery-admin.ts
features/reviews/  reviews-page.tsx · reviews-table.tsx · use-reviews-admin.ts
```

## 5. WCAG stavke

1.1.1 · 1.2.x · 1.3.1 · 1.4.1 · 1.4.3 · 1.4.10 · 2.1.2 · **2.5.7 (upload)** · 3.3.1–3.3.4 · 4.1.2 · 4.1.3

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| Blog HTML sanitizacija je **backend** posao | ne dirati; `export`/`sanitize` logika netaknuta |
| `BeforeAfterSlider` / `media-image` dijeljeni s javnim | ne dirati; grep dokaz |
| 14 testova asertuje markup | ažurirati uz obrazloženje |
| Galerija 600 linija | rezati po panelima |

## 7. Testovi

**Postojeći:** `test:admin-blog-i18n`, `test:admin-gallery-i18n`, `test:admin-reviews-i18n`,
`test:public-blog-*` (javni — **ne diraju se**).
**Novi:** `test:admin-content-a11y` (bez `window.confirm`, upload bez obaveznog drag&drop-a, `alt` obavezan),
`test:admin-blog-parity`, `test:admin-gallery-parity`.

## 8. Definition of Done

Standardni DoD + nijedan `window.confirm`; blog/galerija/recenzije rade identično; javni blog/galerija bez diff-a.

## 9. Obim

~18 fajlova (10 novih), 3 commita (Blog → Galerija → Recenzije).
