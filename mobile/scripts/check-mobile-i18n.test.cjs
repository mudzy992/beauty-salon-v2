'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GUARDED_FILES, collectResourceKeys, scanSource } = require('./check-mobile-i18n.cjs');

const mobileRoot = path.resolve(__dirname, '..');
const resourceKeys = collectResourceKeys(
  fs.readFileSync(path.join(mobileRoot, 'src/i18n/bs.ts'), 'utf8'),
);

test('all audited mobile UI files have no hard-coded visible copy', () => {
  for (const file of GUARDED_FILES) {
    const source = fs.readFileSync(path.join(mobileRoot, file), 'utf8');
    assert.deepEqual(scanSource(source, file, resourceKeys), [], `${file} contains unlocalized visible text or an invalid key`);
  }
});

test('guard rejects JSX text, visible-string props, and text inside JSX expressions', () => {
  const source = `
    export const Example = ({ editing, t }) => (
      <>
        <Text>Hard-coded title</Text>
        <Input label="Datum" />
        <Button title={editing ? 'Sačuvaj izmjene' : t('common.ok')} />
        <Text>{t('common.close')}</Text>
      </>
    );
  `;
  const violations = scanSource(source, 'fixture.tsx', resourceKeys);
  assert.deepEqual(
    violations.map(({ value }) => value),
    ['Hard-coded title', 'Datum', 'Sačuvaj izmjene'],
  );
});

test('guard ignores translation keys, identifiers, and non-copy configuration literals', () => {
  const source = `
    export const Example = ({ t }) => (
      <>
        <Text>{t('common.close')}</Text>
        <DateTimePicker mode="date" display="default" />
        <View style={{ boxShadow: '0 0 10px rgba(0,0,0,0.25)' }} />
        <Text>{status === 'COMPLETED' ? '✓' : value.toFixed(2)}</Text>
        {navigation.navigate('Contact')}
      </>
    );
    type RouteProps = ProfileScreenProps<'Profile'>;
  `;
  assert.deepEqual(scanSource(source, 'fixture.tsx', resourceKeys), []);
});

test('guard rejects a translation key that is absent from mobile resources', () => {
  const violations = scanSource("const label = t('common.missingResource');", 'fixture.tsx', resourceKeys);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, 'translation key is missing from mobile/src/i18n/bs.ts');
});
