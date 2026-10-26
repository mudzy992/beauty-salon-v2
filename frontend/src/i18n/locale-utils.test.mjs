import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'
import { formatLocalizedAmount, getIntlLocale } from './locale-utils.mjs'

test('maps the active web language to its expected Intl locale', () => {
  assert.equal(getIntlLocale('en'), 'en-GB')
  assert.equal(getIntlLocale('en-US'), 'en-GB')
  assert.equal(getIntlLocale('bs'), 'bs-BA')
  assert.equal(getIntlLocale(undefined), 'bs-BA')
})

test('formats date-only values and money using the active locale', () => {
  const date = '2026-10-26'
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }

  assert.equal(
    formatDateOnlyLocale(date, getIntlLocale('en'), options),
    'Monday, 26 October 2026',
  )
  assert.equal(
    formatDateOnlyLocale(date, getIntlLocale('bs'), options),
    'ponedjeljak, 26. oktobar 2026.',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  assert.equal(formatLocalizedAmount('not-a-number', 'en'), '—')
})
