import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./Button.tsx', import.meta.url), 'utf8');

test('shared button exposes a button role and its visible title as the accessible name', () => {
  assert.match(component, /accessibilityRole="button"/);
  assert.match(component, /accessibilityLabel=\{accessibilityLabel \?\? title\}/);
  assert.match(component, /<Pressable\s+[\s\S]*?accessibilityRole="button"[\s\S]*?accessibilityLabel=\{accessibilityLabel \?\? title\}/);
});

test('shared button supports an optional contextual accessible name and hint', () => {
  assert.match(component, /accessibilityLabel\?: string/);
  assert.match(component, /accessibilityHint\?: string/);
  assert.match(component, /accessibilityHint=\{accessibilityHint\}/);
});

test('shared button exposes disabled and loading state to assistive technology', () => {
  assert.match(component, /disabled=\{inactive\}/);
  assert.match(component, /accessibilityState=\{\{ disabled: inactive, busy: loading \}\}/);
});
