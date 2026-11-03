import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./DateTimeField.tsx', import.meta.url), 'utf8');
const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');
const common = resources.match(/common:\s*\{([\s\S]*?)\n\s*\},\n\s*auth:/)?.[1];

test('date/time picker exposes its role, label, selected value, and mode-specific hint', () => {
  assert.match(component, /accessibilityRole="button"/);
  assert.match(component, /accessibilityLabel=\{label\}/);
  assert.match(component, /accessibilityValue=\{\{ text: displayedValue \}\}/);
  assert.match(component, /accessibilityHint=\{accessibilityHint\}/);
  assert.match(component, /mode === 'date' \? 'common\.dateFieldHint' : 'common\.timeFieldHint'/);
  assert.match(component, /<Text style=\{\{ color: colors\.inputText \}\}>\{displayedValue\}<\/Text>/);
});

test('date/time picker uses the non-deprecated value and dismissal callbacks', () => {
  assert.match(component, /onValueChange=\{handleValueChange\}/);
  assert.match(component, /onDismiss=\{handleDismiss\}/);
  assert.doesNotMatch(component, /\bonChange=\{handleChange\}/);
});

test('date/time picker action hints are localized in the mobile Bosnian resources', () => {
  assert.ok(common, 'Missing common mobile resources');
  assert.ok(common.includes("dateFieldHint: 'Dodirnite da otvorite izbor datuma.'"));
  assert.ok(common.includes("timeFieldHint: 'Dodirnite da otvorite izbor vremena.'"));
});
