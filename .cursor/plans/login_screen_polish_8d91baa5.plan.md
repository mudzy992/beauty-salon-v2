---
name: Login Screen Polish
overview: Premium poliranje LoginScreen-a — zadržava postojeću arhitekturu (pozadinska slika iz `public_login_image` postavke, LinearGradient overlay, forma na dnu), ali podiže vizuelni kvalitet na "wow" nivo bez animacija.
todos:
  - id: check-blur
    content: Provjeriti je li expo-blur instaliran i provjeriti app.config.js za Android blur flag
    status: completed
  - id: polish-login
    content: "Reimplementirati LoginScreen.tsx: višefazni gradient, glassmorphism card (BlurView), novi header, ukloniti formLabel, Button lg, footer polish"
    status: completed
isProject: false
---

# Login Screen Polish

## Analiza trenutnog stanja

**Pozadinska slika** — vuče se iz backend `/api/settings`, ključ `public_login_image`. Logika je ispravna (`resolveLoginImageUrl` + `getSettingValue`). Nema promjena tu.

**Što nedostaje / treba popraviti:**

- Gradient overlay je generički (`rgba(0,0,0,0.4)` → `0.85`) — za premium efekt treba višefazni gradient koji čuva sliku u gornjem dijelu i tamni samo dno
- Dekoracija `titleDecoration` (sparkles + linija) je premala i neupadljiva
- `formCard` je bijeli/sivi box koji "plutu u zraku" — za premium feel treba `glassmorphism` (translucent + blur + tanka zlatna bordura)
- `formLabel` je suvišan uppercase label "Prijava" — zamijeni s elegantnim dividerom ili ukloni
- `Input` labele su sive — u glassmorphism kontekstu trebaju biti bijele/zlatne
- `Button` (primary = solid gold) je ok, ali `size="lg"` + blago zaobljeni rubovi + letter-spacing daju premijum feel
- Footer "Nemate račun? Registrujte se" treba biti centriran s boljim kontrastom

## Vizija

```
┌─────────────────────────────┐
│  [pozadinska slika]          │
│                              │
│  ✦ ──────── ✦               │  ← golden ornament, veći
│  SALON NEJRA                 │  ← bijeli heading, serif, 32px
│  Dobrodošli nazad            │  ← champagne, 15px
│                              │
│  ╔════════════════════════╗  │
│  ║ 🔲 glassmorphism card  ║  │  ← blur + rgba(0,0,0,0.4) + zlatna bordura
│  ║ [✉] Email / korisnik   ║  │
│  ║ [🔒] Lozinka          ║  │
│  ║ [  PRIJAVI SE  ]       ║  │  ← full gold button, lg
│  ╚════════════════════════╝  │
│                              │
│  Nemate račun? Registrujte  │
└─────────────────────────────┘
```

## Izmjene — samo `LoginScreen.tsx`

### 1. Gradient — višefazni

```
['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']
locations: [0, 0.25, 0.55, 1]
```
Gornja trećina slike ostaje vidljiva, dno je tamno za čitljivost forme.

### 2. Header — veći, bez sparkles decoration

- Ukloniti `titleDecoration` (sparkles + linija) — zamijeni s tankim zlatnim horizontalnim dividerom + monogram/inicijali ili jednostavnim ornamentom
- `title` → `fontSize: 34`, `color: white` (ne gold — na tamnoj pozadini bijela ima više impakta), `fontFamily: heading`, `letterSpacing: 1`
- `subtitle` → `opacity: 0.75`, `fontSize: 14`

### 3. Glassmorphism `formCard`

Koristiti `expo-blur` (`BlurView`) kao wrapper iza forme:
- `BlurView intensity={18} tint="dark"` (nativni blur pozadine)
- Preko toga `View` s `backgroundColor: rgba(10,10,10,0.45)`
- Border: `1px rgba(212,168,67,0.35)` (zlatna, niska opacitet)
- `borderRadius: 24`

### 4. Input stilizacija u kontekstu glassmorphism

Input-i koriste `colors.inputBg` (sivi). Na tamnoj glassmorphism kartici trebaju:
- `inputBg: rgba(255,255,255,0.07)` — lokalni override kroz `style` prop
- Label boja: `white` s `opacity: 0.6`
- Border focused: zlatna

Ovo se rješava prosljeđivanjem `inputStyle` override-a inline (bez mijenjanja globalnog `Input.tsx`).

### 5. Button

- `size="lg"` + `style={{ borderRadius: 14 }}`
- Razmak `marginTop: spacing.md`

### 6. Ukloniti `formLabel` "Prijava"

Nepotrebno ponavlja intent. Zamjena: tanka zlatna linija `height:1, opacity:0.2` iznad inputa.

### 7. Footer

- Centriran tekst, `color: rgba(255,255,255,0.6)` + link `color: gold`

## Fajlovi koji se mijenjaju

- [`mobile/src/screens/auth/LoginScreen.tsx`](mobile/src/screens/auth/LoginScreen.tsx) — jedini fajl, sve izmjene unutar njega

## Napomena o `expo-blur`

Provjeri je li `expo-blur` već u `package.json`. Ako nije, dodaje se kao nova zavisnost. Na Android-u `BlurView` radi samo sa `experimental_enableBlurView` flagom u `app.config.js` (ili fallback na polutransparentni overlay).
