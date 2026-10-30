import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const store = readFileSync(new URL('../../store/notificationStore.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./NotificationsScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('notification fetch marks malformed and failed responses while preserving loaded data', () => {
  assert.match(store, /fetchError:\s*boolean/);
  assert.match(store, /if \(!notifications\)\s*\{\s*set\(\{ isLoading: false, fetchError: true \}\)/);
  assert.match(store, /catch\s*\{\s*if \(isCurrentRequest\(\)\) set\(\{ isLoading: false, fetchError: true \}\)/);
  assert.match(store, /set\(\{ notifications, unreadCount, isLoading: false, fetchError: false \}\)/);
  assert.doesNotMatch(store, /set\(\{ notifications: \[\], unreadCount: 0/);
});

test('notification screen distinguishes empty, error and stale states with a retry action', () => {
  assert.match(screen, /fetchError && notifications\.length > 0/);
  assert.match(screen, /notifications\.staleMessage/);
  assert.match(screen, /actionLabel=\{fetchError \? t\('common\.retry'\)/);
  assert.match(screen, /onAction=\{fetchError \? \(\) => void fetch\(\)/);
  assert.match(translations, /loadErrorTitle:/);
  assert.match(translations, /loadErrorMessage:/);
  assert.match(translations, /staleMessage:/);
});
