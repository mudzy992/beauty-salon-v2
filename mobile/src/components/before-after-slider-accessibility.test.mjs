import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('./BeforeAfterSlider.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8');

test('before-after slider exposes an adjustable accessible value and localized instructions', () => {
  assert.match(component, /accessible\s+accessibilityRole="adjustable"/);
  assert.match(component, /accessibilityValue=\{\{[\s\S]*?min: 0,[\s\S]*?max: 100,[\s\S]*?now: accessibilityPercent/);
  assert.match(component, /accessibilityLabel=\{t\('home\.beforeAfterSliderLabel'\)\}/);
  assert.match(component, /accessibilityHint=\{t\('home\.beforeAfterSliderHint'\)\}/);
  assert.match(component, /accessibilityPercent = Math\.round\(position \* 100\)/);
});

test('comparison images are decorative children of the single adjustable control', () => {
  const mediaImages = [...component.matchAll(/<MediaImage\b[\s\S]*?\/>/g)];
  assert.equal(mediaImages.length, 2);
  assert.ok(mediaImages.every(([image]) => /accessible=\{false\}/.test(image)));
});

test('slider exposes accessible increment/decrement actions and clamps the comparison position', () => {
  assert.match(component, /name: 'increment', label: t\('home\.beforeAfterSliderIncrease'\)/);
  assert.match(component, /name: 'decrement', label: t\('home\.beforeAfterSliderDecrease'\)/);
  assert.match(component, /if \(nativeEvent\.actionName === 'increment'\) adjustPosition\(0\.05\)/);
  assert.match(component, /if \(nativeEvent\.actionName === 'decrement'\) adjustPosition\(-0\.05\)/);
  assert.match(component, /Math\.max\(0, Math\.min\(1, current \+ delta\)\)/);
  for (const key of [
    'beforeAfterSliderLabel', 'beforeAfterSliderHint', 'beforeAfterSliderPosition',
    'beforeAfterSliderIncrease', 'beforeAfterSliderDecrease',
  ]) {
    assert.match(translations, new RegExp(`home:[\\s\\S]*?${key}:`));
  }
});

test('slider drag maps component-local coordinates and tracks its latest responsive width', () => {
  assert.match(component, /const widthRef = useRef\(width\);\s*widthRef\.current = width;/);
  assert.match(component, /onPanResponderGrant: \(event\) => \{\s*const x = Math\.max\(0, Math\.min\(1, event\.nativeEvent\.locationX \/ widthRef\.current\)\)/);
  assert.match(component, /onPanResponderMove: \(event\) => \{\s*const x = Math\.max\(0, Math\.min\(1, event\.nativeEvent\.locationX \/ widthRef\.current\)\)/);
  assert.doesNotMatch(component, /g\.x0|g\.dx/);
});
