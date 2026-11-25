import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// S9: dva `<EmailVisualEditor>` su sada u dva taba (`email-templates-panel.tsx`
// za postojeće template-e i `email-campaigns-panel.tsx` za kampanje), a
// generator/eskaper u `email-settings-constants.ts`. Test čita sva tri mjesta.
const page = [
  readFileSync(new URL('./email-templates-panel.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-campaign-editor.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-campaigns-panel.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-campaign-html.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('./use-email-campaigns.ts', import.meta.url), 'utf8'),
].join('\n')
// S9: vizuelni editor je razdvojen u tri modula (orkestrator / blokovi /
// preview). Test čita SVA tri zajedno — svaka tvrdnja i dalje pokriva isti
// kod, promijenjena je samo putanja izvora.
const editor = [
  readFileSync(new URL('./email-visual-editor.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-visual-editor-blocks.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-visual-editor-preview.tsx', import.meta.url), 'utf8'),
].join('\n')

test('existing email templates and campaigns share the visual block editor', () => {
  assert.equal([...page.matchAll(/<EmailVisualEditor\b/g)].length, 2)
  // S9: editor je u dva taba; stanja su sada na prop objektima
  // (`templates.existingTemplate` / `campaigns.selectedCampaign`).
  assert.match(page, /blocks=\{templates\.existingTemplate\.blocks \?\? \[\]\}/)
  assert.match(page, /blocks=\{selected\.blocks \?\? \[\]\}/)
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
