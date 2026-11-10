import {
  aggregateCoverage,
  defaultCoverageDir,
  encodeWorkflowMessage,
  formatCoverageSummary,
  formatIncompleteDetails,
} from './axe-coverage.mjs'

/**
 * `globalTeardown` — sabere zapise pokrivenosti svih ruta i iznese ih u CI anotaciju.
 *
 * Zašto anotacija, a ne samo log: logovi i artefakti žive na blob storageu koji izvan
 * GitHub-ovog sučelja nije dostižan, pa bi bez `::notice` ovaj izvještaj bio nevidljiv.
 * GitHub prepoznaje workflow komande iz stdout-a bilo kojeg koraka, pa nije potreban
 * zaseban CI korak.
 *
 * Ovo NE mijenja ishod suite-a: namjerno nema `throw`. Ako axe padne, to već ruši posao
 * preko asertacija u specovima; ovdje se samo objašnjava šta je dokazano, a šta nije.
 */
export default function coverageTeardown(): void {
  const summary = formatCoverageSummary(aggregateCoverage(defaultCoverageDir()))
  // Sirovi novi red bi prekinuo workflow komandu i anotacija bi nosila samo prvi red
  // (izmjereno na runu `42876931983`), pa se poruka mora kodirati. Naslov je namjerno bez
  // `:` i `,` — to su separatori svojstava u workflow komandi.
  process.stdout.write(
    `::notice title=axe pokrivenost pravila po WCAG kriteriju::${encodeWorkflowMessage(summary)}\n`,
  )

  // Nepotpuni čvorovi idu u ZASEBNU anotaciju: zajednička bi bila odsječena na ~2000 znakova.
  const details = formatIncompleteDetails(aggregateCoverage(defaultCoverageDir()))
  if (details) {
    process.stdout.write(
      `::warning title=axe nepotpuni cvorovi po pravilu::${encodeWorkflowMessage(details)}\n`,
    )
  }
}
