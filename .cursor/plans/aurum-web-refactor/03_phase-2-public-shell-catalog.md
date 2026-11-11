# S2 — Javni shell + Početna + Usluge + Detalj usluge

**Status:** 🟡 **S1 završen (5/5 CI `43100889990` na `ae87acf`); S2 čeka eksplicitno odobrenje nakon S1 STOP-a** · **Prvi segment koji konzumira nove tokene i primitive.**

---

## 1. Cilj

Refaktor javnog omotača i kataloškog dijela prema NEJRA §07 (javno iskustvo), §09 (mapa ekrana), §11 (šabloni) i §10 (3 stanja): filmski hero, jedan poziv na akciju po ekranu, serifni naslovi u Aurumu, katalog s filterima, galerijske kartice, prazna/učitavanje/greška stanja, reflow na 320 px, bez promjene podataka.

---

## 2. Ulaz

S1 završen (5/5, run `43100889990`, commit `ae87acf`); `ThemeSwitcher` već u `public-layout.tsx`; nove primitive u `features/shell/aurum/ui/`; NEJRA §09 ima retke za 4 ekrana ovog segmenta. Potvrđena pretpostavka R2.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/features/shell/public/public-layout.tsx` | **IZMJENA** — header/nav/footer po §07; zadržati `SkipLink`, `DialogTitle` u draweru, `aria-expanded`/`aria-controls`, `LanguageSwitcher`, `ThemeSwitcher` iz S1, feature flagove |
| `frontend/src/features/shell/public/public-ui.ts` | **IZMJENA** — `publicHeader` / `publicPage` / `publicSection` na semantičke tokene (bez tvrdih boja) |
| `frontend/src/features/shell/public/before-after-spotlight.tsx` | **IZMJENA** — Aurum varijanta; zadržati 2.5.7 tastaturnu alternativu za slider |
| `frontend/src/pages/public/PublicHome.tsx` | **IZMJENA** — hero, before/after, istaknuta recenzija, CTA; `MotionConfig` / `fadeUp` / `staggerContainer` ostaju pod `reducedMotion="user"` |
| `frontend/src/pages/public/PublicServices.tsx` | **IZMJENA** — editorski katalog, search/category filteri, kartice |
| `frontend/src/pages/public/PublicServiceDetail.tsx` | **IZMJENA** — identitet usluge, galerija, CTA, not-found stanje |
| `frontend/src/components/BeforeAfterSlider.tsx`, `components/media-image.tsx` | **IZMJENA samo ako je nužno** — aurum-scoped CSS varijanta, ne mijenjati klasično ponašanje; dokaz grep-om + `test:before-after-i18n` |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — novi stringovi (paritet) |
| `frontend/src/features/public-catalog/*` (data/*.mjs) | **BEZ IZMJENE** — parseri i ugovori podataka ostaju netaknuti |

---

## 4. Ugovor

- Iste rute: `/`, `/usluge`, `/usluge/:serviceId`; isti API pozivi (`/api/daily-log/before-after`, public services, featured review, satisfied clients), isti `limit`/`random` parametri, iste stale-response generacije (`useRef` brojači) i isti retry tokovi.
- Ista lokalizacija i formati; svaki novi vidljivi string u oba jezika; `aria-label`/`alt`/`placeholder` također kroz i18n.
- Hero u Aurumu ostaje „uvijek filmski tamno" po §07 — to je **namjerna iznimka** od svijetle teme i mora imati izračunat kontrast teksta `#F5EDE0` na tamnoj pozadini u NEJRA §10.
- `PublicFeatureGate` (`public_feature_blog/gallery/reviews`) se ne dira; `AppLogo`/`UploadedBrandLogo` i runtime logo boje ostaju (u klasičnom stanju).
- Nema novih ekrana, novih akcija, novih zavisnosti. `check-bundle-budget.mjs` ≤300 KiB.

---

## 5. Koraci

1. `public-ui.ts` + `public-layout.tsx`: zamijeniti sirove `slate-*`/tvrde boje semantičkim tokenima; zadržati sticky header, `scroll-padding-top` (2.4.11), drawer s naslovom, aktivnu stavku `aria-current` + oblik (ne samo boja), 44 px mete, logo reflow na 320 px (postojeći komentar u `globals.css` o 53 px skrola se ne smije ponovo pojaviti).
2. `PublicHome`: hero po §07 (`radial-gradient`, zlatni CTA, `prefers-reduced-motion` za `drift` animaciju), jedan primarni CTA, before/after spotlight s tastaturnom alternativom, stanja loading/empty/error za oba async bloka, bez layout shift-a (rezervirana visina), `<h1>` jedan po stranici, semantički `<section>` + headings bez preskakanja.
3. `PublicServices`: preći na nove `FilterBar`/`EmptyState`/`ErrorState` primitive; zadržati `aria-pressed` na filterima, lokalizovani broj rezultata, search, kategorije, responzivne kartice; sort/filter logika netaknuta.
4. `PublicServiceDetail`: novi `PageHeader` + `StatusBadge` gdje treba; zadržati payload validaciju, `aria-live` najave učitavanja, stale-request zaštitu, 404 `<h1>`, nenested anchor CTA-e.
5. Aurum varijante: `data-[skin=aurum]:font-serif` za naslove, zlatni akcent štedljivo (samo akcija/brend), radijus 12–16 px, tanke 1–1,5 px linije; sve kroz tokene.
6. Ažurirati pogođene source-contract testove **uz obrazloženje** u `CHANGELOG.md` (zadržati istu garanciju, npr. ako se promijeni klasa heroja, test i dalje traži jedan `<h1>` i kontrast).

---

## 6. Testovi

Zadržati zelenima (i po potrebi ažurirati uz obrazloženje): `test:public-home-accessibility`, `test:public-home-before-after-recovery`, `test:public-home-featured-review-recovery`, `test:before-after-i18n`, `test:public-services-redesign`, `test:public-services-recovery`, `test:public-catalog-i18n`, `test:public-service-detail-recovery`, `test:public-a11y-axe-findings`, `test:label-in-name`, `test:shell-a11y`, `test:navigation-drawer-accessibility`, `test:form-control-labels`, `test:theme-ssot-sync`.

Novi (ako mark-up to traži): `test:public-aurum-hero-contrast` — čita NEJRA §10 i `globals.css`, potvrđuje da hero parovi prolaze u oba Aurum stanja. Svaki novi `test:*` + CI korak.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (izmjeriti `public home` gzip delta u `check-bundle-budget.mjs`) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**. `a11y-e2e` axe na 32 rute (default classic) ostaje zelen = dokaz da klasični javni sajt nije regresirao.

---

## 8. DoD + dokazi

- ✅ 4 ekrana + shell refaktorisani u 3 stanja; nema tvrdih boja; BS/EN paritet.
- ✅ Svi navedeni testovi zeleni; nijedan nije oslabljen; nova skripta ima CI korak.
- ✅ API/parametri/stale-request/flagovi netaknuti (diff pregled u STOP-sažetku).
- ✅ Build ≤300 KiB; `a11y-e2e` zelen; commit sha + run id upisani.
- 🟡 Rendered izgled Auruma na 320 px / zoom 400% nije ručno provjeren u pregledniku — `e2e/dom-metrics` i `a11y-e2e` daju samo ono što mjere; označiti 🟡 do S11.
- **STOP** → „Odobravaš li S3 (javni sadržaj: blog, galerija, kontakt, zadovoljni klijenti)?"

---

## 9. Rizici / pitanja

- `components/ui/*` dijele javni sajt i admin: svaka izmjena mora imati grep-dokaz da klasični prikaz nije promijenjen; u suprotnom aurum-scoped varijanta.
- Ako hero kontrast u NEJRA §10 nije izračunat za `#F5EDE0` na gradientu → **STOP + pitanje**, ne procjenjivati „izgleda ok".
- Ako `PublicServices` filter logika traži promjenu `queryKey`/API poziva da bi se uklopila u novi `FilterBar` → **STOP** (Q10).
