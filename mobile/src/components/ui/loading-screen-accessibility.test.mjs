import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./LoadingScreen.tsx', import.meta.url), 'utf8');

test('shared loading screen exposes a localized busy progress indicator', () => {
  assert.match(component, /useTranslation\(\)/);
  assert.match(component, /<ActivityIndicator[\s\S]*?accessible[\s\S]*?accessibilityRole="progressbar"/);
  assert.match(component, /accessibilityLabel=\{t\('common\.loading'\)\}/);
  assert.match(component, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(component, /accessibilityLiveRegion="polite"/);
});

test('optional visible loading detail remains available beside the progress indicator', () => {
  assert.match(component, /\{message && \([\s\S]*?<Text[\s\S]*?>\s*\{message\}\s*<\/Text>/);
});
