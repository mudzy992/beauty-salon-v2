import { BadRequestException } from '@nestjs/common'
import { splitPaidAmount } from './manual-entry-amounts'

describe('splitPaidAmount', () => {
  it('naplata jednaka cijeni nema ni napojnicu ni dug', () => {
    expect(splitPaidAmount(100, 100)).toEqual({
      paidAmount: 100,
      baseAmount: 100,
      tipAmount: 0,
      debtAmount: 0,
    })
  })

  it('višak preko cijene je napojnica', () => {
    const actual = splitPaidAmount(130, 100)
    expect(actual.baseAmount).toBe(100)
    expect(actual.tipAmount).toBe(30)
    expect(actual.debtAmount).toBe(0)
  })

  it('manjak ispod cijene je dug', () => {
    const actual = splitPaidAmount(60, 100)
    expect(actual.baseAmount).toBe(60)
    expect(actual.tipAmount).toBe(0)
    expect(actual.debtAmount).toBe(40)
  })

  it('nula naplate daje puni dug', () => {
    expect(splitPaidAmount(0, 100).debtAmount).toBe(100)
  })

  it('zaokružuje na dvije decimale', () => {
    const actual = splitPaidAmount(100.005, 33.333)
    expect(actual.baseAmount).toBe(33.33)
    expect(actual.tipAmount).toBe(66.67)
  })

  it('odbija negativnu naplatu', () => {
    expect(() => splitPaidAmount(-1, 100)).toThrow(BadRequestException)
  })

  it('odbija nenumeričku naplatu', () => {
    expect(() => splitPaidAmount(Number.NaN, 100)).toThrow(BadRequestException)
  })
})
