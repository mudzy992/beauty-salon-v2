import { defineConfig, devices } from '@playwright/test'

// Vite dev is intentional: the synthetic identity-switch fixture imports the
// same store module as the app. No production test hook is shipped.
export default defineConfig({
  testDir: './e2e-auth-session',
  outputDir: './test-results-auth-session',
  timeout: 30_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:10002',
    trace: 'retain-on-failure',
    launchOptions: process.env.E2E_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.E2E_CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] }
      : undefined,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 10002 --strictPort',
    url: 'http://127.0.0.1:10002',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
