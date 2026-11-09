import { defineConfig, devices } from '@playwright/test'

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
 * Admin rute (`/admin/**`) traže prijavljenu sesiju i podignut backend; vidi
 * `e2e/a11y-routes.spec.ts` za mjesto gdje se ubacuje `storageState`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:10000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:10000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
