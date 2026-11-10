import {
  aggregateCoverage,
  chunkWorkflowMessage,
  defaultCoverageDir,
  encodeWorkflowMessage,
  formatCoverageSummary,
  formatIncompleteDetails,
  formatViolationDetails,
} from './axe-coverage.mjs'

/**
 * Ispiši jednu (ili više, ako je preduga) CI anotaciju.
 *
 * Sirovi novi red bi prekinuo workflow komandu i anotacija bi nosila samo prvi red
 * (izmjereno na runu `42876931983`), pa se poruka mora kodirati. Naslov je namjerno bez
 * `:` i `,` — to su separatori svojstava u workflow komandi.
 */
function emit(level: 'notice' | 'warning', title: string, text: string): void {
  if (!text) return
  // Dijeli se na više anotacija: jedna bi bila odsječena na ~2000 znakova, a sažetak s 40
  // praćenih pravila ima ~4600 — pa bi se tiho izgubila polovina izvještaja.
  const parts = chunkWorkflowMessage(text)
  parts.forEach((part, index) => {
    const suffix = parts.length > 1 ? ` ${index + 1}/${parts.length}` : ''
    process.stdout.write(
      `::${level} title=${title}${suffix}::${encodeWorkflowMessage(part)}\n`,
    )
  })
}

/**
 * `globalTeardown` — sabere zapise pokrivenosti svih ruta i iznese ih u CI anotaciju.
 *
 * Zašto anotacija, a ne samo log: logovi i artefakti žive na blob storageu koji izvan
 * GitHub-ovog sučelja nije dostižan, pa bi bez `::notice` ovaj izvještaj bio nevidljiv.
 * GitHub prepoznaje workflow komande iz stdout-a bilo kojeg koraka, pa nije potreban
 * zaseban CI korak.
 *
 * Ovo NE mijenja ishod suite-a: namjerno nema `throw`. Ako axe padne, to već ruši posao
 * preko asertcija u specovima; ovdje se samo objašnjava šta je dokazano, a šta nije.
 */
export default function coverageTeardown(): void {
  // Jedan prolaz kroz direktorij: tri formatiranja su prije svako zasebno čitala i
  // parsirala svih 32 zapisa.
  const agg = aggregateCoverage(defaultCoverageDir())

  emit('notice', 'axe pokrivenost pravila po WCAG kriteriju', formatCoverageSummary(agg))

  // Nepotpuni čvorovi idu u ZASEBNU anotaciju: zajednička bi bila odsječena na ~2000 znakova.
  emit('warning', 'axe nepotpuni cvorovi po pravilu', formatIncompleteDetails(agg))

  // I čvorovi koji su PALI: bez rute i selektora `violations 1` nije upotrebljiv nalaz.
  emit('warning', 'axe cvorovi koji su pali po pravilu', formatViolationDetails(agg))
}
