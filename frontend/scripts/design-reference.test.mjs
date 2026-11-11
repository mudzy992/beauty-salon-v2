import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const files = [2, 3].map((version) => ({
  version,
  html: readFileSync(fileURLToPath(new URL(`../../docs/design/referentni-prijedlog-v${version}.html`, import.meta.url)), 'utf8'),
}))

function verifyTheme(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously' })
  const document = dom.window.document
  const light = document.querySelector('#light')
  const dark = document.querySelector('#dark')
  assert.equal(light.getAttribute('aria-pressed'), 'true')
  dark.click()
  assert.ok(document.body.classList.contains('dark'))
  assert.equal(dark.getAttribute('aria-pressed'), 'true')
  assert.equal(light.getAttribute('aria-pressed'), 'false')
  light.click()
  assert.ok(!document.body.classList.contains('dark'))
  assert.equal(dark.getAttribute('aria-pressed'), 'false')
  assert.equal(light.getAttribute('aria-pressed'), 'true')
  dom.window.close()
}

for (const { version, html } of files) {
  test(`V${version}: independent document, sections and embedded imagery`, () => {
    const dom = new JSDOM(html)
    const doc = dom.window.document
    assert.equal(doc.documentElement.lang, 'bs')
    assert.ok(doc.title.includes(`V${version}`))
    for (const id of ['identitet', 'komponente', 'dashboard', 'stylist', 'klijent', 'public', 'pokrivenost']) {
      assert.ok(doc.getElementById(id), `missing ${id}`)
    }
    for (const link of doc.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href')
      assert.ok(href.startsWith('#'), `unexpected external link: ${href}`)
      assert.ok(doc.getElementById(href.slice(1)), `broken section link: ${href}`)
    }
    for (const el of doc.querySelectorAll('img')) {
      assert.match(el.getAttribute('src'), /^data:image\/jpeg;base64,/)
      assert.ok(el.getAttribute('alt'))
    }
    assert.ok(doc.querySelectorAll('img').length >= 2)
    assert.equal(doc.querySelectorAll('script[src], link[rel="stylesheet"]').length, 0)
    assert.ok(doc.querySelectorAll('.demo').length >= 15, 'expected role and public screen illustrations')
    assert.match(doc.body.textContent, /AI ilustracije/)
    dom.window.close()
  })

  test(`V${version}: theme changes both ways and updates pressed states`, () => verifyTheme(html))

  test(`V${version}: theme test detects missing visual and accessible state`, () => {
    const mutations = [
      ['document.body.classList.toggle("dark",isDark)', 'void 0'],
      ['dark.setAttribute("aria-pressed",String(isDark))', 'void 0'],
    ]
    for (const [before, after] of mutations) {
      assert.equal(html.split(before).length - 1, 1, 'mutation must match once')
      assert.throws(() => verifyTheme(html.replace(before, after)))
    }
  })
}
