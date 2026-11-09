#!/usr/bin/env node
/**
 * Pokreće rendered a11y smoke (`e2e/a11y-routes.spec.ts`) samo ako je browser stvarno
 * instaliran; inače glasno PRESKAČE.
 *
 * Zašto ovo postoji: `@axe-core/playwright` i `@playwright/test` su instalirani (Q4), ali
 * browser binarni fajl se preuzima s Playwright CDN-a koji u sandboxu nije dostupan:
 *   Failed to download Chrome for Testing 158.0.8127.18 (playwright chromium v1254)
 * Bez ovog omotača skripta bi u svakom okruženju bez browsera padala i rušila `test:*` petlju,
 * a u CI bi davala lažno crveno. Bez browsera se ne tvrdi prolaz — ispisuje se SKIPPED.
 *
 * Na mašini s browserom ponaša se kao običan `playwright test` (izlaz i exit code prolaze dalje).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// ⚠️ `executablePath()` vraća OČEKIVANU putanju i kad browser nije instaliran — ne baca.
// Zato se mora provjeriti da fajl stvarno postoji na disku, inače omotač pokrene testove
// koji padnu s "Executable doesn't exist" (desilo se pri prvoj verziji ovog omotača).
let exe = null
try {
  const candidate = chromium.executablePath()
  if (candidate && existsSync(candidate)) exe = candidate
} catch {
  exe = null
}

if (!exe) {
  console.log('')
  console.log('⚠️  SKIPPED — test:a11y-routes (rendered a11y) NIJE pokrenut.')
  console.log('   Chromium binarni fajl nije instaliran, pa rendered/axe provjere nisu izvedene.')
  console.log('   Omogućite ih sa:')
  console.log('     cd frontend && npx playwright install --with-deps chromium')
  console.log('   Zatim ponovo: npm run test:a11y-routes')
  console.log('')
  console.log('   Posljedica: sve WCAG stavke koje ovise o renderu ostaju 🟡, ne ✅.')
  console.log('   Vidi .cursor/docs/matrices/dashboard-a11y/MATRIX.md (R1).')
  console.log('')
  process.exit(0)
}

// `vite preview` servira IZGRAĐEN output: bez `dist/` server ne odgovara na URL, pa
// Playwright čeka punih 180s i javi zbunjujući "Timed out waiting ... config.webServer".
// Zato provjera odmah, s tačnom komandom.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.html')
if (!existsSync(dist)) {
  console.error('')
  console.error('✖ dist/ ne postoji — `vite preview` nema šta servirati.')
  console.error('  Pokrenite prvo build, pa onda test:')
  console.error('    cd frontend && npm run build && npm run test:a11y-routes')
  console.error('')
  process.exit(1)
}

const r = spawnSync('npx', ['playwright', 'test'], { stdio: 'inherit' })
process.exit(r.status ?? 1)
