import { defineConfig, devices } from '@playwright/test'

import { ADMIN_STATE } from './e2e/auth-paths'

/**
 * Rendered a11y smoke (Q4 — odobreno 2026-11-08 za `@axe-core/playwright` + `@playwright/test`).
 *
 * 🔴 OVAJ TEST NIJE IZVRŠEN U OKRUŽENJU U KOJEM JE NAPISAN. `npm install` prolazi
 * (registry je dostupan), ali `npx playwright install chromium` PADA:
 *   Failed to download Chrome for Testing 158.0.8127.18 (playwright chromium v1254),
 *   caused by Error: Download failure, code=1
 * jer sandbox dozvoljava samo github.com / npm registry / pypi, a ne CDN s browserima.
 * Zato skripta `test:a11y-routes` NIJE dodata u CI kao blokirajući korak — ne bi bilo
 * pošteno tvrditi da nešto prolazi što nikad nije pokrenuto.
 *
 * Da se pokrene lokalno / u CI s pristupom CDN-u:
 *   cd frontend && npx playwright install --with-deps chromium && npm run test:a11y-routes
 *
 * Admin rute (`/admin/**`) traže prijavljenu sesiju i podignut backend. Riješeno
 * 2026-11-09: projekt `setup` (`e2e/auth.setup.ts`) se prijavi preko `POST /auth/login`
 * kroz vite proxy i snimi `storageState` u `e2e/.auth/admin.json`; projekt `admin`
 * (`e2e/a11y-admin.spec.ts`) ga koristi. Kredencijali SAMO iz okruženja
 * (`E2E_ADMIN_USER` / `E2E_ADMIN_PASS`) — nikad hardkodovani. Ako backend ne radi ili
 * kredencijali fale, admin testovi se glasno preskaču umjesto da daju lažno crveno.
 *
 * ⚠️ `vite preview` NASLJEĐUJE `server.proxy` iz `vite.config.ts` (izmjereno 2026-11-09:
 * bez podignutog backend-a vraća HTTP 500 uz „[vite] http proxy error: /api/..."), pa
 * preview server može poslužiti i API pozive — nije potreban zaseban dev server.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // 127.0.0.1, ne 'localhost': vidi webServer napomenu ispod (IPv4/IPv6 nesklad).
    baseURL: 'http://127.0.0.1:10000',
    trace: 'retain-on-failure',
  },
  projects: [
    // Javne rute: ne traže prijavu ni backend, pa se izvršavaju uvijek.
    // ⚠️ `testIgnore` je OBAVEZAN: bez njega ovaj projekt globova SVE spec fajlove, pa bi
    // se admin testovi izvršili dvaput — jednom ovdje BEZ `storageState` (gdje bi svaki pao
    // na redirekciji na /login) i jednom u projektu `admin`. Izmjereno 2026-11-09:
    // bez testIgnore `--project=chromium` nabroji 26 testova (11 javnih + 15 admin).
    {
      name: 'chromium',
      testIgnore: [/a11y-admin\.spec\.ts/, /auth\.setup\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    // `/admin/**` traži prijavljenu sesiju → prvo setup (login), pa admin testovi.
    // Bez backend-a ili kredencijala setup upiše `ok:false`, a spec se GLASNO preskoči.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'admin',
      dependencies: ['setup'],
      testMatch: /a11y-admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
    },
  ],
  webServer: {
    // ⚠️ MORA biti --host 127.0.0.1. Bez toga `vite preview` se veže samo na IPv6 `::1`,
    // a Playwright (i Node) `localhost` često razriješe na IPv4 127.0.0.1 → konekcija odbijena
    // → "Error: Timed out waiting 180000ms from config.webServer" iako server radi.
    // Izmjereno: bez --host  curl 127.0.0.1 = 000 / localhost = 200;
    //            s  --host  curl 127.0.0.1 = 200 / localhost = 200.
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:10000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
