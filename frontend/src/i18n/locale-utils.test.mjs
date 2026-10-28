import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'
import {
  formatLocalizedAmount,
  formatLocalizedDateTime,
  formatLocalizedNumber,
  formatMonthName,
  formatWeekday,
  getIntlLocale,
} from './locale-utils.mjs'

test('maps the active web language to its expected Intl locale', () => {
  assert.equal(getIntlLocale('en'), 'en-GB')
  assert.equal(getIntlLocale('en-US'), 'en-GB')
  assert.equal(getIntlLocale('bs'), 'bs-BA')
  assert.equal(getIntlLocale(undefined), 'bs-BA')
})

test('formats month names using the active locale', () => {
  assert.equal(formatMonthName(1, 'bs'), 'Januar')
  assert.equal(formatMonthName(3, 'bs'), 'Mart')
  assert.equal(formatMonthName(1, 'en'), 'January')
  assert.equal(formatMonthName(3, 'en'), 'March')
  assert.equal(formatMonthName(0, 'en'), '')
  assert.equal(formatMonthName(13, 'bs'), '')
})

test('formats weekday labels using the active locale without timezone drift', () => {
  assert.equal(formatWeekday(0, 'en'), 'Sunday')
  assert.equal(formatWeekday(1, 'en'), 'Monday')
  assert.equal(formatWeekday(1, 'bs'), 'ponedjeljak')
  assert.equal(formatWeekday(7, 'en'), '')
})

test('formats date-only values and money using the active locale', () => {
  const date = '2026-10-26'
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }

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
  assert.equal(
    formatLocalizedNumber(1234.5, 'en', { minimumFractionDigits: 2 }),
    '1,234.50',
  )
  assert.equal(
    formatLocalizedNumber(1234.5, 'bs', { minimumFractionDigits: 2 }),
    '1.234,50',
  )
  assert.equal(formatLocalizedAmount('not-a-number', 'en'), '—')

  const timestamp = new Date(2026, 9, 26, 12, 30)
  const englishDateTime = formatLocalizedDateTime(timestamp, 'en')
  const bosnianDateTime = formatLocalizedDateTime(timestamp, 'bs')
  assert.notEqual(englishDateTime, '—')
  assert.notEqual(bosnianDateTime, '—')
  assert.notEqual(englishDateTime, bosnianDateTime)
  assert.equal(formatLocalizedDateTime('not-a-date', 'en'), '—')
})
