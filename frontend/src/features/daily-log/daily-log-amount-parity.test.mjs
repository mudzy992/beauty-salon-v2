import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Amount parity — novčana matematika mora biti ISTA na frontendu i backendu.
 *
 * Zašto postoji: iznosi se računaju na oba kraja.
 *  - backend `daily-log/daily-log.amounts.ts` → `getServiceAmount(actualPrice, tipAmount)`
 *  - backend `daily-log/daily-log.pricing.ts` → `computeTipAndShortfall(paid, chargeBase)`
 *  - frontend `features/daily-log/amounts.ts` → `getTotalAmount` / `getServiceAmount` / `sumEntryTotals`
 *  - frontend `features/daily-log/form-helpers.ts` → `computeChargeAmount`
 *
 * Ako se formule razdvoje, KIF (knjiga prihoda) i dnevnik prikazuju različite
 * brojeve za isti unos, a to se ne vidi dok neko ne uporedi papir i ekran.
 *
 * Ovaj test **izvršava** obje implementacije (esbuild bundle, ne regex nad
 * izvorom) i provjerava da se slažu na domenu koji server stvarno može
 * proizvesti.
 *
 * Konvencija (backend/src/daily-log/daily-log.amounts.ts):
 *   actualPrice = ukupno naplaćeno za usluge (napojnica uključena)
 *   tipAmount   = dio napojnice
 *   serviceAmount (KIF `amount`) = actualPrice − tipAmount
 */
const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..', '..', '..')
const repoRoot = join(frontendRoot, '..')
const cacheDir = join(frontendRoot, 'node_modules', '.cache', 'amount-parity')

/**
 * `@nestjs/common` se importa samo zbog `BadRequestException` u pricing modulu.
 * Stub je dovoljan jer testirane funkcije ne bacaju izuzetke.
 */
const NEST_STUB = `
export class BadRequestException extends Error {
  constructor(message) { super(typeof message === 'string' ? message : 'BadRequest') }
}
`

const nestStubPlugin = {
  name: 'amount-parity-nest-stub',
  setup(build) {
    build.onResolve({ filter: /^@nestjs\/common$/ }, () => ({
      path: '@nestjs/common',
      namespace: 'nest-stub',
    }))
    build.onLoad({ filter: /.*/, namespace: 'nest-stub' }, () => ({
      contents: NEST_STUB,
      loader: 'js',
    }))
  },
}

// Ulaz importa STVARNE module s oba kraja — ništa se ne reimplementira.
const ENTRY = `
export * as feAmounts from './amounts'
export * as beAmounts from '../../../../backend/src/daily-log/daily-log.amounts'
export * as bePricing from '../../../../backend/src/daily-log/daily-log.pricing'
export * as feFormHelpers from './form-helpers'
`

const loadModules = async () => {
  const result = await build({
    stdin: {
      contents: ENTRY,
      resolveDir: here,
      loader: 'ts',
      sourcefile: 'amount-parity-entry.ts',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    target: 'node18',
    plugins: [nestStubPlugin],
    logLevel: 'silent',
  })

  mkdirSync(cacheDir, { recursive: true })
  const outFile = join(cacheDir, `bundle-${process.pid}.cjs`)
  writeFileSync(outFile, result.outputFiles[0].text, 'utf8')
  return createRequire(import.meta.url)(outFile)
}

const { feAmounts, beAmounts, bePricing, feFormHelpers } = await loadModules()

/** Rekonstrukcija serverovog zapisa iz onoga što forma pošalje. */
const serverPersistedEntry = ({ paidAmount, settledDebtsSum, unitsSum, debtAmounts = [] }) => {
  const paidForServices = paidAmount - settledDebtsSum
  const { tipAmount } = bePricing.computeTipAndShortfall(paidForServices, unitsSum)
  return {
    actualPrice: paidForServices,
    tipAmount,
    debtPaymentEntries: debtAmounts.map((amount) => ({ actualPrice: amount })),
  }
}

/**
 * Domet koji server stvarno može proizvesti:
 *  - totalPaid >= 0 (validirano, daily-log.service.ts:187)
 *  - totalPaid >= settledDebtsSum (validirano, daily-log.service.ts:212)
 *    ⇒ paidForServices >= 0
 *  - unitPrice >= 0 i konačan (validirano, daily-log.pricing.ts resolveServiceItems)
 *    ⇒ unitsSum >= 0 ⇒ tipAmount = max(0, paidForServices − unitsSum) <= paidForServices
 * Dakle tip nikad ne premašuje actualPrice, i nijedan iznos nije negativan.
 */
const REACHABLE = [
  { paidAmount: 100, settledDebtsSum: 0, unitsSum: 100 },
  { paidAmount: 120, settledDebtsSum: 0, unitsSum: 100 },
  { paidAmount: 100, settledDebtsSum: 0, unitsSum: 80 },
  { paidAmount: 250, settledDebtsSum: 50, unitsSum: 200 },
  { paidAmount: 250, settledDebtsSum: 50, unitsSum: 180 },
  { paidAmount: 50, settledDebtsSum: 50, unitsSum: 0 },
  { paidAmount: 0, settledDebtsSum: 0, unitsSum: 0 },
  { paidAmount: 99.99, settledDebtsSum: 0, unitsSum: 49.99 },
  { paidAmount: 300, settledDebtsSum: 120, unitsSum: 150 },
]

test('getServiceAmount se slaze na frontendu i backendu za svaki dosežan unos', () => {
  for (const r of REACHABLE) {
    const debtAmounts = r.settledDebtsSum > 0 ? [r.settledDebtsSum] : []
    const entry = serverPersistedEntry({ ...r, debtAmounts })

    const backend = beAmounts.getServiceAmount(entry.actualPrice, entry.tipAmount)
    const frontend = feAmounts.getServiceAmount(entry)

    assert.equal(
      frontend,
      backend,
      `razilaženje za ${JSON.stringify(r)}: frontend=${frontend} backend=${backend}`,
    )
  }
})

test('ukupni iznos nakon snimanja jednak je onome sto je operater upisao', () => {
  for (const r of REACHABLE) {
    const debtAmounts = r.settledDebtsSum > 0 ? [r.settledDebtsSum] : []
    const entry = serverPersistedEntry({ ...r, debtAmounts })

    const total = feAmounts.getTotalAmount(entry)

    assert.ok(
      Math.abs(total - r.paidAmount) < 1e-9,
      `paritet pukao za ${JSON.stringify(r)}: prikazano=${total} upisano=${r.paidAmount}`,
    )
  }
})

test('total === services + tips + debts (dekompozicija bez ostatka)', () => {
  for (const r of REACHABLE) {
    const debtAmounts = r.settledDebtsSum > 0 ? [r.settledDebtsSum] : []
    const entry = serverPersistedEntry({ ...r, debtAmounts })

    const { total, services, tips, debts } = feAmounts.sumEntryTotals([entry])
    const sum = services + tips + debts

    assert.ok(
      Math.abs(total - sum) < 1e-9,
      `dekompozicija ne izlazi na isto za ${JSON.stringify(r)}: ` +
        `total=${total} services+tips+debts=${sum}`,
    )
  }
})

test('napojnica nikad ne prelazi actualPrice na dosežnom domenu', () => {
  for (const r of REACHABLE) {
    const { tipAmount } = bePricing.computeTipAndShortfall(
      r.paidAmount - r.settledDebtsSum,
      r.unitsSum,
    )
    const actualPrice = r.paidAmount - r.settledDebtsSum

    assert.ok(
      tipAmount <= actualPrice + 1e-9,
      `tip ${tipAmount} > actualPrice ${actualPrice} za ${JSON.stringify(r)}`,
    )
    assert.ok(tipAmount >= 0, `negativan tip za ${JSON.stringify(r)}`)
  }
})

test('formula napojnice je ista u formi i na serveru', () => {
  // Forma: tipPreview = max(0, paidRaw − chargeAmount), gdje je
  // chargeAmount = servicesCharge + debtsSum (form-helpers.computeChargeAmount).
  // Server: computeTipAndShortfall(paidForServices, unitsSum) gdje je
  // paidForServices = totalPaid − settledDebtsSum.
  // Bez loyalty popusta servicesCharge == unitsSum, pa se moraju poklopiti.
  for (const r of REACHABLE) {
    const serviceIds = ['s1']
    const unitPrices = { s1: r.unitsSum }
    const openDebts =
      r.settledDebtsSum > 0 ? [{ id: 'd1', amount: r.settledDebtsSum }] : []

    const charge = feFormHelpers.computeChargeAmount({
      serviceIds,
      unitPrices,
      loyaltyInfo: null,
      desiredLoyaltyPercent: 0,
      settledDebtIds: openDebts.map((d) => d.id),
      openDebts,
    })

    const formTip = Math.max(0, r.paidAmount - charge.chargeAmount)
    const serverTip = bePricing.computeTipAndShortfall(
      r.paidAmount - charge.debtsSum,
      charge.servicesSum,
    ).tipAmount

    assert.ok(
      Math.abs(formTip - serverTip) < 1e-9,
      `forma i server se razilaze za ${JSON.stringify(r)}: ` +
        `forma=${formTip} server=${serverTip}`,
    )
  }
})

test('clamp: negativni i nevalidni iznosi ne ulaze u sabiranje', () => {
  const dirty = {
    actualPrice: -50,
    tipAmount: Number.NaN,
    debtPaymentEntries: [{ actualPrice: -10 }, { actualPrice: 'x' }, { actualPrice: 30 }],
  }

  assert.equal(feAmounts.getServicesCollected(dirty), 0)
  assert.equal(feAmounts.getTipAmount(dirty), 0)
  assert.equal(feAmounts.getSettledDebtsSum(dirty), 30)
  assert.equal(feAmounts.getServiceAmount(dirty), 0)
  assert.equal(feAmounts.getTotalAmount(dirty), 30)
})

test('backend vraca 0 za nekonacne vrijednosti, frontend ih clampuje na 0', () => {
  // Dokumentirano razilaženje IZVAN dosežnog domena: backend vraća 0 kad je
  // bilo koji operand nekonačan, frontend clampuje svaki operand zasebno.
  // Server nikad ne upisuje NaN (validacija u daily-log.service.ts:187), pa je
  // ovo samo zabilježeno — ne smije se oslanjati na jednakost ovdje.
  assert.equal(beAmounts.getServiceAmount(100, Number.NaN), 0)
  assert.equal(feAmounts.getServiceAmount({ actualPrice: 100, tipAmount: Number.NaN }), 100)
})

test('konvencija je dokumentirana na oba kraja i nije se promijenila', () => {
  const backend = readFileSync(
    join(repoRoot, 'backend', 'src', 'daily-log', 'daily-log.amounts.ts'),
    'utf8',
  )
  const frontend = readFileSync(join(here, 'amounts.ts'), 'utf8')

  assert.match(backend, /actualPrice = total collected \(tip included\)/)
  assert.match(backend, /service amount \(KIF `amount`\) = actualPrice - tipAmount/)
  assert.match(frontend, /tip included in actualPrice convention/)

  // Server razdvaja dugove od usluga PRIJE snimanja — bez toga bi se dugovi
  // brojali dvaput (actualPrice + settledDebtsSum).
  const service = readFileSync(
    join(repoRoot, 'backend', 'src', 'daily-log', 'daily-log.service.ts'),
    'utf8',
  )
  assert.match(service, /const paidForServices = totalPaid - settledDebtsSum;/)
  assert.match(service, /actualPrice: paidForServices,/)
})
