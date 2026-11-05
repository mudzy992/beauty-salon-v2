import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPrintReportHtml,
  escapeCsvCell,
  escapeHtmlText,
} from './export-safety.mjs'

test('CSV fields quote delimiters, quote characters, CR, and LF', () => {
  assert.equal(escapeCsvCell('plain text'), 'plain text')
  assert.equal(escapeCsvCell('one;two'), '"one;two"')
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""')
  assert.equal(escapeCsvCell('first\rsecond'), '"first\rsecond"')
  assert.equal(escapeCsvCell('first\nsecond'), '"first\nsecond"')
  assert.equal(escapeCsvCell('first\r\nsecond'), '"first\r\nsecond"')
})

test('CSV text formula prefixes are neutralized, including after whitespace/control characters', () => {
  const cases = [
    ['=1+1', "'=1+1"],
    ['+SUM(A1:A2)', "'+SUM(A1:A2)"],
    ['-1+2', "'-1+2"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['  =1+1', "'  =1+1"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', `"'\r=1+1"`],
    ['\n=1+1', `"'\n=1+1"`],
    ['\uFEFF=1+1', "'\uFEFF=1+1"],
  ]
  for (const [value, expected] of cases) assert.equal(escapeCsvCell(value), expected)
  assert.equal(escapeCsvCell(-42), '-42', 'numeric values remain numeric cells')
  assert.equal(escapeCsvCell(12.5), '12.5')
})

test('HTML text escaping encodes markup and attribute-significant quotes', () => {
  assert.equal(
    escapeHtmlText(`<img src=x onerror="alert('x')"> &`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp;',
  )
})

test('print document escapes every dynamic text field and constrains document language', () => {
  const payload = '</td><script>alert("x")</script>&'
  const html = buildPrintReportHtml({
    title: payload,
    language: 'unsupported',
    subtitle: payload,
    headers: [payload],
    rows: [[payload]],
    summary: [{ label: payload, value: payload }],
  })
  const escapedPayload = '&lt;/td&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;'

  assert.equal(html.split(escapedPayload).length - 1, 7)
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('</td><script'), false)
  assert.match(html, /<html lang="bs">/)
  assert.match(buildPrintReportHtml({ title: 'Report', language: 'en', headers: [], rows: [] }), /<html lang="en">/)
})
