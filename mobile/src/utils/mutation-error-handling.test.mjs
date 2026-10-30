import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('client and stylist mutation handlers route failures through the bounded API error parser', () => {
  for (const path of [
    '../screens/client/MyReservationsScreen.tsx',
    '../screens/client/ReviewsScreen.tsx',
    '../screens/stylist/use-stylist-direct-booking-form.ts',
    '../screens/stylist/StylistInboxScreen.tsx',
    '../screens/stylist/DailyLogDetailScreen.tsx',
  ]) {
    const screen = source(path);
    assert.match(screen, /getApiErrorMessage\(/, path);
    assert.doesNotMatch(screen, /error\.response\?\.data\?\.message/, path);
  }
});

test('daily-log photo linking preserves the uploaded id and retries without uploading again', () => {
  const screen = source('../screens/stylist/DailyLogDetailScreen.tsx');
  assert.match(screen, /\[pendingImageLink, setPendingImageLink\] = useState/);
  assert.match(screen, /setPendingImageLink\(\{ uploadId, isBefore \}\)/);
  assert.match(screen, /linkUploadedImage\(pendingImageLink\.uploadId, pendingImageLink\.isBefore, true\)/);
  assert.match(screen, /latestEntry\.images\?\.some\(\(image\) => image\.uploadId === uploadId\)/);
  assert.match(screen, /title=\{t\('common\.retry'\)\}/);
  assert.match(screen, /if \(!uploadId\) throw new Error/);
});
