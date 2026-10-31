import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const localeSource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

for (const [key, expectedMeaning] of [
  ['loyaltyPreviewLoadError', 'bez popusta'],
  ['debtPreviewLoadError', 'bez naplate dugovanja'],
  ['previewStale', 'možda nisu ažurirani'],
]) {
  test(`Bosnian reservation copy provides ${key}`, () => {
    const match = localeSource.match(new RegExp(`${key}:\\s*'([^']+)'`));
    assert.ok(match, `${key} should be defined in the Bosnian resource`);
    assert.match(match[1], new RegExp(expectedMeaning, 'i'));
    assert.ok(match[1].trim().length > 10);
  });
}
