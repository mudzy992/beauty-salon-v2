import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../../pages/EmailSettings.tsx', import.meta.url), 'utf8')
const editor = readFileSync(new URL('./email-visual-editor.tsx', import.meta.url), 'utf8')

test('existing email templates and campaigns share the visual block editor', () => {
  assert.equal([...page.matchAll(/<EmailVisualEditor\b/g)].length, 2)
  assert.match(page, /blocks=\{existingTemplate\.blocks \?\? \[\]\}/)
  assert.match(page, /blocks=\{selectedCampaign\.blocks \?\? \[\]\}/)
  assert.match(page, /value="html"/)
})

test('visual editor supports safe content modules, reorder controls, and a live preview', () => {
  for (const type of ['title', 'text', 'highlight', 'button', 'divider', 'spacer']) {
    assert.ok(editor.includes(`'${type}'`), `Missing visual block type ${type}`)
  }
  assert.match(editor, /onDragStart=\{\(event\) => event\.dataTransfer\.setData\('text\/plain', block\.id\)\}/)
  assert.match(editor, /moveBlock\(index, index - 1\)/)
  assert.match(editor, /moveBlock\(index, index \+ 1\)/)
  assert.match(editor, /aria-label=\{t\('emailSettings\.campaigns\.moveUp'\)\}/)
  assert.match(editor, /aria-label=\{t\('emailSettings\.campaigns\.moveDown'\)\}/)
  assert.match(editor, /previewSampleNote/)
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/)
})

test('campaign visual HTML escapes user text before persisting the generated markup', () => {
  assert.match(page, /const escapeEmailText = \(value: string\) =>[\s\S]*?value\.replace\(\/\[&<>"'\]\/g/)
  assert.match(page, /const content = escapeEmailText\(block\.content\)/)
  assert.match(page, /blocks,\s*html: renderCampaignHtml\(blocks\)/)
})
