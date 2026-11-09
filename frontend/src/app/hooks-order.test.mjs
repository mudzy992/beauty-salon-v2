/**
 * Pravila hookova — nijedan hook ne smije biti pozvan NAKON early return-a (React #310)
 *
 * Stvarna regresija: `pages/Analytics.tsx` je u `87eeabc` (faza 6) dobio
 * `const chartSummary = useMemo(...)` **ispod** `if (loading) return …` i `if (!data) return …`.
 * Prvi render (loading=true) je imao jedan hook manje, pa je React bacao
 * **#310 „Rendered more hooks than during the previous render"** i analitika se rušila pri
 * svakom učitavanju. Ispravljeno u ovom commitu (hookovi premješteni iznad return-a).
 *
 * Zašto ovaj test postoji: svi a11y testovi u ovom repou čitaju **izvor**, pa ovakvu grešku
 * ne mogu vidjeti — a nema browsera ni Playwright-a da je uhvate u renderu. Ovo je jedini
 * čuvar koji je hvata, i pokriva **cijeli `src/`**, ne samo analitiku.
 *
 * Bez browsera: statička analiza izvora.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const HOOK =
  /^ {2}(?:const\s+[\w\[\]{}, ]+=\s*)?(?:React\.)?(useState|useMemo|useEffect|useCallback|useRef|useReducer|useLayoutEffect|useImperativeHandle|useTransition|useDeferredValue|useTranslation|useQuery|useMutation|useQueryClient|useNavigate|useSearchParams|useParams|useLocation|useIntl|useTheme|useId)\s*[<(]/
const IF_AT_BODY = /^ {2}(?:if\s*\(.*\)|}\s*else\s*if\s*\(.*\))\s*\{\s*$/
const RETURN_IN_BLOCK = /^ {4}return\b/
const COMPONENT = /^export default function \w+\(|^export function \w+\(|^function \w+\(|^const \w+ = memo\(/

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith('.tsx') && !full.includes('.test.')
        ? [full]
        : []
  })
const SRC = walk(root)
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/')

/** Vraća [{file, component, returnLine, hookLine, hook}] za hookove nakon early return-a. */
const audit = () => {
  const bad = []
  let components = 0
  for (const f of SRC) {
    const lines = readFileSync(f, 'utf8').split('\n')
    for (let start = 0; start < lines.length; start += 1) {
      if (!COMPONENT.test(lines[start])) continue
      components += 1
      const name = (lines[start].match(/function (\w+)|const (\w+)/) ?? [])[1] ?? '?'
      let returnLine = null
      for (let i = start + 1; i < lines.length; i += 1) {
        const ln = lines[i]
        if (/^\}/.test(ln)) break // kraj komponente (zatvarajuca zagrada na koloni 0)
        if (returnLine === null && IF_AT_BODY.test(ln)) {
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j += 1) {
            if (RETURN_IN_BLOCK.test(lines[j])) {
              returnLine = j + 1
              break
            }
          }
        }
        if (returnLine !== null && i + 1 > returnLine && HOOK.test(ln)) {
          bad.push({
            file: rel(f),
            component: name,
            returnLine,
            hookLine: i + 1,
            hook: ln.trim().slice(0, 64),
          })
          break
        }
      }
    }
  }
  return { bad, components }
}

test('nijedan hook nije pozvan nakon early return-a (React #310)', () => {
  const { bad, components } = audit()
  // Da detektor ne „prodje" tako sto nista ne skenira
  assert.ok(components >= 50, `ocekivano >=50 komponenata, skenirano ${components}`)

  const list = bad.map(
    (b) => `${b.file} (${b.component}) — early return@${b.returnLine}, hook@${b.hookLine}: ${b.hook}`,
  )
  assert.deepEqual(
    list,
    [],
    `Hookovi nakon early return-a mijenjaju broj hookova izmedu rendera (React #310):\n  ${list.join('\n  ')}`,
  )
})

test('Analytics.tsx: chartData i chartSummary su iznad loading/data grana', () => {
  const lines = readFileSync(join(root, 'pages/Analytics.tsx'), 'utf8').split('\n')
  const at = (needle) => lines.findIndex((l) => l.includes(needle)) + 1

  const chartData = at('const chartData = useMemo(')
  const chartSummary = at('const chartSummary = useMemo(')
  const loading = at('if (loading) {')
  const noData = at('if (!data) {')

  for (const [n, v] of [['chartData', chartData], ['chartSummary', chartSummary], ['loading', loading], ['noData', noData]]) {
    assert.ok(v > 0, `${n} nije naden`)
  }
  assert.ok(chartData < loading, `chartData (${chartData}) mora biti iznad if (loading) (${loading})`)
  assert.ok(chartSummary < loading, `chartSummary (${chartSummary}) mora biti iznad if (loading) (${loading})`)
  // chartData vise ne smije pretpostavljati da data postoji (jer se racuna i dok je null)
  assert.match(readFileSync(join(root, 'pages/Analytics.tsx'), 'utf8'), /data\?\.monthlyFinance \?\? \[\]/)
})
