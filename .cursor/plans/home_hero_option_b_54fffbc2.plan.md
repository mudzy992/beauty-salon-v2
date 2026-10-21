---
name: Home hero option B
overview: Pojednostaviti home hero na fotku, dobrodošlicu, slogan i CTA. Logo i statistički chipovi izlaze iz hero-a; tab bar ostaje bez loga.
todos:
  - id: hero-jsx
    content: "Hero: welcome + slogan + CTA; ukloniti logo i chipove"
    status: completed
  - id: dead-code
    content: Ukloniti home-stats fetch, logo/stats helperi i stilovi
    status: completed
  - id: release-notes
    content: Jedan bullet u mobile/RELEASE_NOTES.draft.md
    status: completed
isProject: false
---

# Home hero — opcija B

## Cilj
Hero u [`mobile/src/screens/client/HomeScreen.tsx`](../../mobile/src/screens/client/HomeScreen.tsx) ostaje: **fotka + dobrodošlica + slogan + CTA**. Logo se samo uklanja iz hero-a (ne ide u tab bar). Chipovi servisa/klijenata se uklanjaju.

## Layout (hero overlay)

```
[hero slika + dim + bottom blend]
  Dobrodošli, {ime}!     ← samo ako je user ulogovan
  slogan (public_hero_subtitle)
  [Rezervišite termin]
```

- Bez loga, bez `heroTitle` (ime salona je redundantno uz slogan).
- Bez chipova.
- CTA ostaje na dnu overlay-a, postojeći `Button` + navigacija na rezervaciju.

## Izmjene u HomeScreen

**JSX (~402–489):** jedan tok umjesto `hasLogo` / `else`. Redoslijed: welcome (ako `user`) → `heroSubtitle` → CTA.

**Ukloniti iz ovog ekrana (dead code):**
- Logo: `appLogo`, `hasLogo`, `appLogoTextColor`, `heroLogoBlock` / `heroLogoLarge`, `tintColor`.
- Stats UI + fetch: `homeStats` state, `GET /api/services/home-stats`, `formatExactStatCount`, `extractHomeStatsPayload`, `parseStatCount` (ako ostane samo za stats), `heroStatsRow` / chip stilovi.
- Backend endpoint `home-stats` **ne dirati** (nema drugog klijenta u mobu; ostaje za kasnije).

**Stilovi:** zadržati `heroSubtitle` / `welcome` / `heroCta`. Može se malo smanjiti vizuelni šum (welcome iznad slogana, slogan kao glavni tekst ~15–18px). `HERO_HEIGHT` ostaje ~300 osim ako overlay postane prazan — tada blago smanjiti (npr. 260) da fotka ne bude prazan zid.

## Ostalo
- Tab bar ([`BottomNavMenu.tsx`](../../mobile/src/navigation/BottomNavMenu.tsx)) bez izmjena.
- Draft napomena u [`mobile/RELEASE_NOTES.draft.md`](../../mobile/RELEASE_NOTES.draft.md): jedan BS bullet da je početni ekran čišći (bez loga i brojeva u hero-u). Verziju u `app.config.js` **ne bumpati** (nema APK build zahtjeva).

## Van opsega
- Backend, public settings ključevi za logo/title, web home.
