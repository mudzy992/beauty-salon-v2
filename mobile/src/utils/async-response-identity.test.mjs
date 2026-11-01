import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('notification responses and mutations remain bound to the current account and request generation', () => {
  const store = source('../store/notificationStore.ts');
  const root = source('../../app/_layout.tsx');
  assert.match(store, /ownerId: string \| null/);
  assert.match(store, /setActiveUser: \(userId: string \| null\) => void/);
  assert.match(store, /requestGeneration === requestId/);
  assert.match(store, /useAuthStore\.getState\(\)\.user\?\.id === userId/);
  assert.match(store, /if \(get\(\)\.ownerId === userId\) return/);
  assert.match(store, /set\(\{\s*ownerId: userId,\s*notifications: \[\],\s*unreadCount: 0/s);
  assert.match(root, /setNotificationUser\(userId\)/);
});

test('debounced stylist client searches discard older responses and validate their payload', () => {
  const form = source('../screens/stylist/use-stylist-direct-booking-form.ts');
  assert.match(form, /clientSearchGeneration = useRef\(0\)/);
  assert.match(form, /clientSearchGeneration\.current !== generation/);
  assert.match(form, /normalizeClientSearchResults\(data\)/);
  assert.match(form, /clearTimeout\(handle\)/);
});

test('onboarding mutations do not continue after the active user changes or the route unmounts', () => {
  for (const path of [
    '../../app/onboarding/email.tsx',
    '../../app/onboarding/phone.tsx',
    '../../app/onboarding/gender.tsx',
  ]) {
    const screen = source(path);
    assert.match(screen, /useAuthStore\.getState\(\)\.user\?\.id === requestUserId/, path);
    assert.match(screen, /mounted\.current = false;\s*requestGeneration\.current \+= 1/, path);
    assert.match(screen, /if \(!isCurrentRequest\(\)\) return;/, path);
    assert.match(screen, /getApiErrorMessage\(error, t\('common\.error'\)\)/, path);
  }
});

test('gallery requests are invalidated on route changes and unmount', () => {
  for (const path of [
    '../screens/client/ServiceWorkGalleryScreen.tsx',
    '../screens/client/SatisfiedClientsScreen.tsx',
  ]) {
    const screen = source(path);
    assert.match(screen, /requestGeneration = useRef\(0\)/, path);
    assert.match(screen, /generation !== requestGeneration\.current/, path);
    assert.match(screen, /requestGeneration\.current === generation\) requestGeneration\.current \+= 1/, path);
    assert.match(screen, /normalizeBeforeAfterPage\(data\)/, path);
  }
});
