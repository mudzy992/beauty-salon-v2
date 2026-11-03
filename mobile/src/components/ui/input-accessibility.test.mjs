import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./Input.tsx', import.meta.url), 'utf8');

test('shared input associates its visible label and validation message with the text field', () => {
  assert.match(component, /accessibilityLabel=\{props\.accessibilityLabel \?\? label\}/);
  assert.match(component, /accessibilityHint=\{props\.accessibilityHint \?\? error\}/);
  assert.match(component, /<TextInput\s+\{\.\.\.props\}[\s\S]*?accessibilityLabel=/);
});

test('validation messages use alert semantics and a polite live region', () => {
  assert.match(component, /accessibilityRole="alert"/);
  assert.match(component, /accessibilityLiveRegion="polite"/);
});
