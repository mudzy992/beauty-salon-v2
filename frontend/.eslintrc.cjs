/**
 * ESLint konfiguracija (ESLint 8, eslintrc format).
 *
 * Uvedeno poslije React #310 regresije na `/admin/analytics`: `useMemo` je bio pozvan
 * ispod `if (loading) return …`, pa se broj hookova mijenjao između rendera. Ni `tsc`
 * ni testovi (koji čitaju izvor) to ne mogu uhvatiti — `react-hooks/rules-of-hooks` može.
 *
 * Nivoi:
 *  - `react-hooks/rules-of-hooks` → **error** (ruši aplikaciju)
 *  - `react-hooks/exhaustive-deps` → warn (korisno, ali mijenjanje bi diralo cache ponašanje)
 *  - `jsx-a11y` → **error** (od 2026-11-09)
 *
 * ── Zašto `jsx-a11y` tek sada ide na error ──────────────────────────────────────────
 * Precizno stanje prije ove izmjene: `plugin:jsx-a11y/recommended` postavlja **31 od 34**
 * pravila na `error`, a ovaj fajl je **13** od njih lokalno spustio na `warn`. Dakle 21
 * pravilo je već bilo blokirajuće i davalo 0 nalaza; snižena su bila samo ona koja su
 * tada davala nalaze.
 *
 * Trijaža svih tih nalaza (2026-11-09) pokazala je obrnut obrazac: **svih 9** `jsx-a11y`
 * upozorenja bilo je lažno pozitivno, a stvarni 2.1.1 (`<Card onClick>` u `Gallery.tsx`)
 * lint NIJE vidio. Tek kad su lažno pozitivni uklonjeni (opcijom pravila ili scoped
 * disable-om s dokazom), error postaje smislen — jer sprječava povratak istih obrazaca.
 *
 * 🔴 Ograničenje koje ostaje, i zato testovi i dalje postoje: `jsx-a11y` vidi samo JSX.
 * Custom komponenta koja renderuje interaktivni DOM (`<Card>` = običan `<div>`,
 * `components/ui/card.tsx:7`) prolazi neoznačeno. Zato `test:admin-gallery-keyboard` i
 * ostali source-contract testovi nisu zamjena za lint — niti je lint zamjena za njih.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['react-hooks', '@typescript-eslint', 'jsx-a11y'],
  extends: ['plugin:jsx-a11y/recommended'],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ---------------------------------------------------------------------------
    // Ova pravila su bila lokalno spuštena na `warn`; sada su eksplicitno `error`.
    // Vrijednost je i u `recommended` ista — navodimo ih da namjera bude vidljiva i da
    // `test:eslint-a11y-severity` može asertirati nivo po imenu pravila.
    // Stanje 2026-11-09 (`npm run lint`): 0 nalaza za svako od njih.
    // ---------------------------------------------------------------------------
    ...Object.fromEntries(
      [
        'alt-text',
        'anchor-has-content',
        'aria-props',
        'aria-role',
        'aria-unsupported-elements',
        'img-redundant-alt',
        'no-redundant-roles',
        'role-has-required-aria-props',
        'role-supports-aria-props',
        // Bilo `warn` zbog stvarnog gapa: `ReservationScheduler.tsx:1086` je imao
        // `<ul>/<li onClick>` bez `onKeyDown`, `role="listbox"`, `role="option"`,
        // `aria-selected` i `tabIndex` — dakle stvarni 2.1.1 + 4.1.2. Taj dropdown JE
        // popravljen combobox obrascem: `role="listbox"` (`:1131`), `role="option"` +
        // `aria-selected` (`:1140`–`:1141`), `onKeyDown` na inputu (`:1107`).
        // Pravilo sada daje 0 nalaza → `error`.
        'no-noninteractive-element-interactions',
      ].map((r) => [`jsx-a11y/${r}`, 'error']),
    ),

    // `depth: 4` (default je **2**). Oba nalaza su ista validna implicitna asocijacija:
    // `<label>` omata `<input type="checkbox">` i nosi vidljivi tekst u **dva** nivoa
    // `<span>` (`Gallery.tsx:438`, `PublicReserve.tsx:1032`). 1.3.1/4.1.2 su zadovoljeni;
    // pravilo pada samo jer default dubina ne doseže tekst.
    // Dokazano eksperimentom na istoj datoteci: default `depth` → 1 nalaz, `depth: 4` → 0.
    'jsx-a11y/label-has-associated-control': ['error', { depth: 4 }],

    // ---------------------------------------------------------------------------
    // Ova dva pravila nemaju opciju kojom bi se allowlist-ao `role="option"`:
    // schema plugina v6.10.2 za `click-events-have-key-events` je
    // `{"type":"object","properties":{}}` (nema NIJEDNE opcije), a
    // `no-static-element-interactions` ima samo `handlers`.
    // Zato 4 preostala nalaza idu preko scoped `eslint-disable-next-line` s dokazom na
    // samom mjestu, umjesto da cijelo pravilo ostane na `warn`:
    //   • 3× `<li role="option">` u ARIA combobox-u — tastatura je kompletno na inputu
    //     (`entry-form-fields.tsx`, `ReservationScheduler.tsx`)
    //   • 1× `<div onClick={e.stopPropagation()}>` — ne vrši akciju (`Services.tsx`)
    // ---------------------------------------------------------------------------
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
  },
  overrides: [
    {
      // Testovi čitaju izvor i namjerno koriste Node API-je
      files: ['**/*.test.mjs', '**/*.test.tsx', 'scripts/**'],
      env: { node: true },
      rules: { 'jsx-a11y/anchor-has-content': 'off' },
    },
    {
      // shadcn primitivi: `heading-has-content` je lažno pozitivan jer `<h5 {...props} />`
      // dobija sadržaj od pozivaoca (`AlertTitle`, `CardTitle`), ne iz svog tijela.
      files: ['src/components/ui/**'],
      rules: { 'jsx-a11y/heading-has-content': 'off' },
    },
  ],
}
