import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = resolve(fileURLToPath(new URL('../../../../', import.meta.url)))
const temp = mkdtempSync(join(tmpdir(), 'theme-runtime-'))
const outfile = join(temp, 'harness.cjs')
await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {act} from 'react'; import {ThemeProvider,useTheme} from './src/features/shell/theme/theme-context';
      function Probe() { const t=useTheme(); return <><output id="state">{t.choice}</output><button id="classic" onClick={()=>t.setGlobalTheme('classic','dark')}>classic</button><button id="aurum" onClick={()=>t.setGlobalTheme('aurum','dark')}>aurum</button><button id="light" onClick={()=>t.setChoice('aurum-light')}>light</button></> }
      export {act,createRoot,React,ThemeProvider,Probe};`,
    resolveDir: frontend, loader: 'tsx', sourcefile: 'theme-runtime.tsx',
  }, bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent',
})
const require = createRequire(import.meta.url)
const originalMessageChannel = globalThis.MessageChannel
const channels = []
globalThis.MessageChannel = class extends originalMessageChannel {
  constructor() { super(); channels.push(this) }
}
const { act, createRoot, React, ThemeProvider, Probe } = require(outfile)

test('provider applies global skin, preserves local mode and updates the document', async () => {
  const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color" content="#0f172a"></head><body><div id="root"></div></body></html>', { url: 'https://test.invalid/' })
  const old = { window: globalThis.window, document: globalThis.document, navigator: globalThis.navigator, flag: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window; globalThis.document = dom.window.document
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  const click = async (id) => act(async () => dom.window.document.getElementById(id).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })))
  try {
    await act(async () => root.render(React.createElement(ThemeProvider, null, React.createElement(Probe))))
    assert.equal(dom.window.document.documentElement.dataset.skin, 'aurum')
    assert.equal(dom.window.document.documentElement.dataset.mode, 'light')
    await click('classic')
    assert.equal(dom.window.document.getElementById('state').textContent, 'classic')
    assert.equal(dom.window.document.documentElement.dataset.skin, 'classic')
    await click('aurum')
    assert.equal(dom.window.document.getElementById('state').textContent, 'aurum-dark')
    assert.equal(dom.window.document.documentElement.classList.contains('dark'), true)
    await click('light')
    assert.equal(dom.window.localStorage.getItem('nejra.theme.mode'), 'light')
    await click('classic'); await click('aurum')
    assert.equal(dom.window.document.getElementById('state').textContent, 'aurum-light')
    assert.equal(dom.window.document.documentElement.classList.contains('dark'), false)
  } finally {
    await act(async () => root.unmount())
    dom.window.close(); globalThis.window = old.window; globalThis.document = old.document
    Object.defineProperty(globalThis, 'navigator', { value: old.navigator, configurable: true })
    globalThis.IS_REACT_ACT_ENVIRONMENT = old.flag
    for (const channel of channels) { channel.port1.close(); channel.port2.close() }
    globalThis.MessageChannel = originalMessageChannel
    rmSync(temp, { recursive: true, force: true })
  }
})
