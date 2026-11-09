/**
 * ESLint konfiguracija (ESLint 8, eslintrc format).
 *
 * Uvedeno poslije React #310 regresije na `/admin/analytics`: `useMemo` je bio pozvan
 * ispod `if (loading) return …`, pa se broj hookova mijenjao između rendera. Ni `tsc`
 * ni testovi (koji čitaju izvor) to ne mogu uhvatiti — `react-hooks/rules-of-hooks` može.
 *
 * Nivoi:
 *  - `react-hooks/rules-of-hooks` → **error** (ruši aplikaciju; jedini blokirajući)
 *  - `react-hooks/exhaustive-deps` → warn (korisno, ali mijenjanje bi diralo cache ponašanje)
 *  - `jsx-a11y` → warn (uvezan sada, ali se ne blokira; puna primjena je faza 13)
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
    // jsx-a11y: warn umjesto error dok se ne odradi faza 13 (rendered provjere)
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
      ].map((r) => [`jsx-a11y/${r}`, 'warn']),
    ),
    //
    // Tri pravila spuštena na warn jer su na trenutnom kodu **lažno pozitivna**
    // (provjereno iz izvora, 2026-11-09):
    //  - `label-has-associated-control` (2 mjesta): `Gallery.tsx:426` i
    //    `PublicReserve.tsx:1032` — `<label>` **omata** `<input type="checkbox">` i sadrži
    //    vidljivi tekst u `<span>`, što je validna implicitna asocijacija (1.3.1/4.1.2
    //    zadovoljeni). ESLint ne prepoznaje tekst ugniježden u `<span>`.
    //  - `click-events-have-key-events` / `no-static-element-interactions` (2 mjesta):
    //    `Gallery.tsx:322` i `Services.tsx:515` — `onClick={(e) => e.stopPropagation()}` na
    //    omotaču ne vrši akciju, samo sprječava da klik na dugme aktivira cijeli red.
    //    Interaktivni elementi (dugmad) su fokusabilni, pa 2.1.1 nije prekršen.
    // Ako se ovi obrasci promijene, pravila treba vratiti na error.
    'jsx-a11y/label-has-associated-control': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    //
    // 🔴 `no-noninteractive-element-interactions` je warn zbog **jednog stvarnog gapa**,
    // ne zbog lažno pozitivnih: `ReservationScheduler.tsx:1086` ima `<ul>/<li>` dropdown
    // s `onClick`, a u cijelom fajlu nema `onKeyDown`, `role="listbox"`, `role="option"`,
    // `aria-selected` ni `tabIndex` — dakle **2.1.1 + 4.1.2** (opcije se ne mogu odabrati
    // tastaturom i nisu dostupne čitaču ekrana). Ispravka je combobox obrazac iz faze 3
    // (`features/daily-log`), prevelik za ovaj commit → **faza 13**.
    // Vratiti na `error` kad se taj dropdown popravi.
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
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
