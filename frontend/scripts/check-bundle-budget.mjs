import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const outputDirectory = path.resolve('dist')
const manifestPath = path.join(outputDirectory, '.vite/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entryKey = 'index.html'
const entry = manifest[entryKey]

assert.ok(entry?.isEntry, 'Expected index.html to be the production entry in the Vite manifest')

const collectStaticGraph = (key, seen = new Set()) => {
  if (seen.has(key)) return seen
  const chunk = manifest[key]
  assert.ok(chunk, `Missing Vite manifest entry: ${key}`)
  seen.add(key)
  for (const importedKey of chunk.imports ?? []) {
    if (importedKey !== entryKey) collectStaticGraph(importedKey, seen)
  }
  return seen
}

const gzipAssetBytes = (files) => {
  const uniqueFiles = new Set(files)
  return [...uniqueFiles].reduce((total, file) => {
    const contents = readFileSync(path.join(outputDirectory, file))
    return total + gzipSync(contents).byteLength
  }, 0)
}

/**
 * Da li je chunk dosezan iz entry-ja lancom dinamičkih importa.
 *
 * M1/M2 hub-ovi (`AnalyticsHub`, `SettingsHub`) su i sami `lazy`, pa teške rute
 * vise jedan nivo dublje — `entry.dynamicImports` navodi samo DIREKTNE importe,
 * pa bi stroga provjera bila lažno crvena iako code-splitting i dalje radi.
 */
const isDynamicallyReachable = (target, start = entryKey, seen = new Set()) => {
  if (seen.has(start)) return false
  seen.add(start)
  for (const key of manifest[start]?.dynamicImports ?? []) {
    if (key === target) return true
    if (isDynamicallyReachable(target, key, seen)) return true
  }
  return false
}

const filesForChunks = (chunkKeys) => {
  const files = new Set()
  for (const key of chunkKeys) {
    const chunk = manifest[key]
    if (chunk.file) files.add(chunk.file)
    for (const cssFile of chunk.css ?? []) files.add(cssFile)
  }
  return files
}

const initialChunks = new Set([entryKey, ...collectStaticGraph(entryKey)])
const initialFiles = filesForChunks(initialChunks)
const initialGzipBytes = gzipAssetBytes(initialFiles)
const initialBudgetBytes = 300 * 1024

assert.ok(
  initialGzipBytes <= initialBudgetBytes,
  `Initial JS/CSS transfer is ${(initialGzipBytes / 1024).toFixed(1)} KiB gzip; budget is 300 KiB`,
)

const entrySource = readFileSync(path.join(outputDirectory, entry.file), 'utf8')
for (const marker of ['recharts', 'rbc-calendar', 'rbc-time-content', 'react-big-calendar']) {
  assert.ok(!entrySource.includes(marker), `Initial entry unexpectedly contains ${marker}`)
}

const requiredRoutes = [
  {
    key: 'src/pages/public/PublicHome.tsx',
    name: 'public home',
  },
  {
    key: 'src/pages/Dashboard.tsx',
    name: 'admin dashboard',
  },
  {
    key: 'src/features/stylist-portal/pages/stylist-inbox-page.tsx',
    name: 'stylist inbox',
  },
  {
    key: 'src/pages/Analytics.tsx',
    name: 'analytics',
    budgetKiB: 140,
    markers: ['recharts', 'LineChart'],
  },
  {
    key: 'src/pages/ReservationsCalendar.tsx',
    name: 'reservations calendar',
    budgetKiB: 125,
    markers: ['rbc-calendar', 'rbc-time-content'],
  },
]

const getRouteGzipBytes = (key) => {
  const chunkKeys = collectStaticGraph(key)
  const files = filesForChunks(chunkKeys)
  return { chunkKeys, files, gzipBytes: gzipAssetBytes(files) }
}

for (const route of requiredRoutes) {
  const routeChunk = manifest[route.key]
  assert.ok(routeChunk?.isDynamicEntry, `${route.name} must be emitted as a dynamic route chunk`)
  assert.ok(
    entry.dynamicImports?.includes(route.key) || isDynamicallyReachable(route.key),
    `${route.name} must be dynamically imported from the application entry`,
  )
  // Stvarni guard: teška ruta ne smije završiti u inicijalnom statičkom bundleu.
  assert.ok(
    !initialChunks.has(route.key),
    `${route.name} must not be part of the initial static bundle`,
  )

  const { files, gzipBytes } = getRouteGzipBytes(route.key)
  if (route.budgetKiB) {
    assert.ok(
      gzipBytes <= route.budgetKiB * 1024,
      `${route.name} adds ${(gzipBytes / 1024).toFixed(1)} KiB gzip; budget is ${route.budgetKiB} KiB`,
    )
  }

  if (route.markers) {
    const routeContent = [...files]
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(path.join(outputDirectory, file), 'utf8'))
      .join('\n')
    for (const marker of route.markers) {
      assert.ok(routeContent.includes(marker), `${route.name} chunk graph should contain ${marker}`)
      assert.ok(!entrySource.includes(marker), `${marker} must stay out of the initial entry`)
    }
  }

  console.log(
    `${route.name}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip incremental${route.budgetKiB ? ` (budget ${route.budgetKiB} KiB)` : ''}`,
  )
}

console.log(
  `Initial JS/CSS: ${(initialGzipBytes / 1024).toFixed(1)} KiB gzip (budget 300 KiB) across ${initialFiles.size} assets`,
)
