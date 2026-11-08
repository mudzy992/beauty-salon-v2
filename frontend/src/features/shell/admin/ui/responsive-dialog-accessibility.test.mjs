import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./responsive-dialog.tsx', import.meta.url), 'utf8')

test('responsive dialog imports the shared Radix title and description primitives', () => {
  // Broj `../` je artefakt lokacije fajla, ne garancija. Komponenta je u fazi 0
  // premještena u features/shell/admin/ui, pa se traži bilo koja relativna
  // putanja do components/ui/dialog — garancija (Radix title/description
  // primitivi, ne goli h2/p) ostaje ista.
  assert.match(
    source,
    /import \{[\s\S]*?DialogDescription,[\s\S]*?DialogTitle[\s\S]*?\} from '(?:\.\.\/)+components\/ui\/dialog'/,
  )
})

test('mobile drawer provides the dialog title and optional description semantics', () => {
  const mobileBranch = source.slice(source.indexOf('if (isMobile)'), source.indexOf('return (\n    <Dialog'))

  assert.match(mobileBranch, /<DrawerContent[\s\S]*?<DialogTitle[^>]*>\s*\{title\}\s*<\/DialogTitle>/)
  assert.match(
    mobileBranch,
    /\{description \? \([\s\S]*?<DialogDescription[^>]*>\s*\{description\}\s*<\/DialogDescription>/,
  )
  assert.doesNotMatch(mobileBranch, /<h2\b|<p\b/)
})

test('desktop dialog retains the same named title and optional description', () => {
  const desktopBranch = source.slice(source.indexOf('return (\n    <Dialog'))

  assert.match(desktopBranch, /<DialogHeader>[\s\S]*?<DialogTitle>\{title\}<\/DialogTitle>/)
  assert.match(desktopBranch, /<DialogDescription>\{description\}<\/DialogDescription>/)
})
