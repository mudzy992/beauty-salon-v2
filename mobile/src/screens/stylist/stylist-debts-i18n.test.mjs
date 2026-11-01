import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../../../app/stylist/(tabs)/daily-log/debts.tsx', import.meta.url), 'utf8');
const translations = resource.match(/dailyLogDebts:\s*\{([\s\S]*?)\n\s*\},\n\s*dailyLogDetail:/)?.[1];

test('stylist debt list copy resources cover loading, recovery, references, and repayment', () => {
  assert.ok(translations, 'Missing stylist debt-list translation resources');
  for (const [key, copy] of [
    ['title', 'Dužnici'],
    ['total', 'Ukupno: {{amount}}'],
    ['searchLabel', 'Pretraga'],
    ['searchPlaceholder', 'Klijent, usluga ili šifra…'],
    ['loadErrorTitle', 'Dugovanja nisu dostupna'],
    ['loadErrorMessage', 'Provjerite internet vezu i pokušajte ponovo.'],
    ['staleMessage', 'Prikazujemo ranije učitana dugovanja; osvježavanje nije uspjelo.'],
    ['retry', 'Pokušaj ponovo'],
    ['empty', 'Nema otvorenih dugovanja.'],
    ['reservationReference', 'Rezervacija: {{code}}'],
    ['dailyLogReference', 'Dnevnik: {{date}}'],
    ['manualEntryReference', 'Ručni unos: {{date}}'],
    ['repayButton', 'Naplati dug'],
    ['repaySuccessTitle', 'Naplaćeno'],
    ['repaySuccessMessage', 'Dug je zatvoren i evidentiran u dnevnoj knjizi.'],
    ['repayErrorFallback', 'Naplata duga nije uspjela.'],
    ['currencyAmount', '{{amount}} KM'],
  ]) {
    assert.ok(translations.includes(`${key}: '${copy}'`), `Missing stylist debt resource: ${key}`);
    assert.ok(screen.includes(`t('stylist.dailyLogDebts.${key}'`), `Stylist debt screen does not use ${key}`);
    assert.ok(!screen.includes(`'${copy}'`), `Stylist debt copy remains hard-coded: ${copy}`);
  }
});
