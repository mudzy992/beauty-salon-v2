import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./EmptyState.tsx', import.meta.url), 'utf8');

test('empty-state icon is decorative and its title is exposed as a heading', () => {
  assert.match(component, /<Ionicons\b[^>]*\baccessible=\{false\}/);
  assert.match(component, /<Text\s+accessibilityRole="header"[^>]*>\s*\{title\}/);
});

test('optional empty-state action remains a separate shared button', () => {
  assert.match(component, /\{actionLabel && onAction && \([\s\S]*?<Button\s+title=\{actionLabel\}\s+onPress=\{onAction\}/);
  assert.doesNotMatch(component, /<View\s+accessible=\{true\}/);
});
