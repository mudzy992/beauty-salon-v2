import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./use-expense-uploads.ts', import.meta.url), 'utf8')
const dialog = readFileSync(new URL('./expense-dialog.tsx', import.meta.url), 'utf8')

test('expense uploads keep the busy state until every overlapping upload finishes', () => {
  assert.match(hook, /const activeUploadsRef = useRef\(0\)/)
  assert.match(hook, /activeUploadsRef\.current \+= 1[\s\S]*?setIsUploading\(true\)/)
  assert.match(hook, /activeUploadsRef\.current = Math\.max\(0, activeUploadsRef\.current - 1\)[\s\S]*?setIsUploading\(activeUploadsRef\.current > 0\)/)
  assert.match(dialog, /uploads\.isUploading \|\|[\s\S]*?categoriesUnavailable/)
})

test('bulk attachment uploads retain successful files when another selected file fails', () => {
  assert.match(hook, /Promise\.allSettled\(Array\.from\(files\)\.map\(\(file\) => uploadOne\(file\)\)\)/)
  assert.match(hook, /result\.status === 'fulfilled' \? \[result\.value\] : \[\]/)
  assert.match(hook, /if \(uploaded\.length\) setPendingUploads\(\(prev\) => \[\.\.\.prev, \.\.\.uploaded\]\)/)
  assert.match(hook, /results\.find\(\(result\) => result\.status === 'rejected'\)/)
})

test('resetting the expense dialog invalidates stale upload completions and announces progress', () => {
  assert.match(hook, /const pendingGenerationRef = useRef\(0\)/)
  assert.match(hook, /pendingGenerationRef\.current \+= 1[\s\S]*?setPendingUploads\(\[\]\)/)
  assert.match(hook, /if \(generation !== pendingGenerationRef\.current\) return/)
  assert.match(dialog, /role="status" aria-live="polite"[\s\S]*?uploadingAttachments/)
  assert.match(dialog, /if \(!next\) uploads\.resetPending\(\)/)
})
