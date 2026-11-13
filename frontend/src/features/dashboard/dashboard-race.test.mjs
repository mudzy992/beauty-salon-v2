import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const React = require('react')
const { createRoot } = require('react-dom/client')
const { act } = React

const response = (url, userCount) => {
  if (url.includes('dashboard-count')) return { total: userCount }
  if (url.includes('dashboard-summary')) return { reservationsThisMonth: 0, pendingReservations: 0, completedReservations: 0, recentReservations: [] }
  if (url.includes('income-books')) return { totalRevenue: 0, totalTips: 0 }
  if (url.includes('expense-books')) return { expenses: [] }
  return []
}

test('dashboard ignores an older response and settles only the latest request', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.__dashboardRequests = []
  const output = join(here, '../../../node_modules/.cache/dashboard-test/hook.cjs')
  mkdirSync(dirname(output), { recursive: true })
  const result = await build({
    entryPoints: [join(here, 'use-dashboard-data.ts')], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    plugins: [{ name: 'dashboard-test-stubs', setup(builder) {
      builder.onResolve({ filter: /^(\.\.\/\.\.\/api\/client|\.\.\/\.\.\/context\/SocketContext)$/ }, args => ({ path: args.path, namespace: 'stub' }))
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path.endsWith('client')
        ? 'export default { get: (url) => new Promise(resolve => globalThis.__dashboardRequests.push({ url, resolve })) }'
        : 'export const useSocketEvent = () => {}', loader: 'js' }))
    } }],
  })
  writeFileSync(output, result.outputFiles[0].contents)
  const { useDashboardData } = require(output)
  let current
  function Harness() { current = useDashboardData(); return null }
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => { root.render(React.createElement(Harness)) })
    assert.equal(globalThis.__dashboardRequests.length, 8)
    await act(async () => { current.reload() })
    assert.equal(globalThis.__dashboardRequests.length, 16)
    const requests = globalThis.__dashboardRequests
    await act(async () => { requests.slice(8).forEach(r => r.resolve({ data: response(r.url, 22) })); await Promise.resolve() })
    assert.equal(current.stats.usersCount, 22)
    assert.equal(current.loading, false)
    await act(async () => { requests.slice(0, 8).forEach(r => r.resolve({ data: response(r.url, 11) })); await Promise.resolve() })
    assert.equal(current.stats.usersCount, 22)
    await act(async () => { current.reload() })
    await act(async () => { root.unmount() })
    await act(async () => { requests.slice(16).forEach(r => r.resolve({ data: response(r.url, 33) })); await Promise.resolve() })
  } finally {
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.__dashboardRequests
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
})
