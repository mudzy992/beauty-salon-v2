import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { QueryClient } from '@tanstack/react-query'

const src = join(dirname(fileURLToPath(import.meta.url)), '..')
const forbiddenHooks = new Set(['useQuery', 'useSuspenseQuery', 'useInfiniteQuery', 'useSuspenseInfiniteQuery', 'useQueries', 'useSuspenseQueries'])
const forbiddenDirectReads = new Set(['fetchQuery', 'prefetchQuery', 'ensureQueryData', 'fetchInfiniteQuery', 'prefetchInfiniteQuery', 'ensureInfiniteQueryData', 'getQueryData'])
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [join(dir, entry.name)] : [])
}

test('application query reads use the session-aware hook, not an unscoped cache read', () => {
  const errors = []
  for (const path of files(src)) {
    const name = relative(src, path)
    if (name === 'query/use-session-query.ts') continue
    const text = readFileSync(path, 'utf8')
    const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const visit = node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@tanstack/react-query' && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const specifier of node.importClause.namedBindings.elements) {
          const imported = (specifier.propertyName ?? specifier.name).text
          if (forbiddenHooks.has(imported)) errors.push(`${name}: ${imported}`)
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && forbiddenDirectReads.has(node.expression.name.text)) errors.push(`${name}: ${node.expression.name.text}`)
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  assert.deepEqual(errors, [])
})

test('existing prefix invalidation still marks every session-scoped query stale', async () => {
  const client = new QueryClient()
  const one = ['stylistReservations', 'inbox', { sessionVersion: 1 }]
  const two = ['stylistReservations', 'inbox', { sessionVersion: 2 }]
  const other = ['dailyLog', 'list', { sessionVersion: 2 }]
  for (const key of [one, two, other]) client.setQueryData(key, ['synthetic'])
  await client.invalidateQueries({ queryKey: ['stylistReservations'], refetchType: 'none' })
  assert.equal(client.getQueryState(one)?.isInvalidated, true)
  assert.equal(client.getQueryState(two)?.isInvalidated, true)
  assert.equal(client.getQueryState(other)?.isInvalidated, false)
  client.clear()
})
