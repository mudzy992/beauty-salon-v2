import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8');

const sourceBetween = (start, end) => {
  const startAt = screen.indexOf(start);
  assert.notEqual(startAt, -1, `missing source marker: ${start}`);
  const endAt = screen.indexOf(end, startAt + start.length);
  assert.notEqual(endAt, -1, `missing source marker: ${end}`);
  return screen.slice(startAt, endAt);
};

test('client reservation actions are scoped to the current user, route, and mounted screen', () => {
  assert.match(screen, /actionIdentityRef = useRef\(\{\s*userId,\s*routeKey: route\.key/);
  assert.match(screen, /identity\.mounted &&[\s\S]*identity\.userId === userId/);
  assert.match(screen, /identity\.routeKey === route\.key/);
  assert.match(screen, /useAuthStore\.getState\(\)\.user\?\.id === userId/);
  assert.match(screen, /snapshot\.ownerId === userId/);
  assert.match(screen, /activeActionRef\.current === null/);
  assert.match(screen, /actionIdentityRef\.current\.mounted = false;[\s\S]*?actionIdentityRef\.current\.generation \+= 1;[\s\S]*?activeActionRef\.current = null/);
  assert.match(screen, /cancelModalOwner\.userId === userId/);
  assert.match(screen, /cancelModalOwner\.routeKey === route\.key/);
});

test('cancel, attendance, and reschedule mutations guard stale continuations', () => {
  const handlers = [
    sourceBetween('const submitCancel =', 'const handleConfirmAttendance ='),
    sourceBetween('const handleConfirmAttendance =', 'const handleAcceptReschedule ='),
    sourceBetween('const handleAcceptReschedule =', 'const handleDeclineReschedule ='),
    sourceBetween('const handleDeclineReschedule =', 'const sections: Section[]'),
  ];
  const endpoints = [
    '/cancel',
    '/confirm-attendance',
    '/reschedule/accept',
    '/reschedule/decline',
  ];

  handlers.forEach((handler, index) => {
    assert.match(handler, /beginAction\(.*?\.id\)/s, `handler ${index} should acquire an identity guard`);
    const apiCall = handler.indexOf('await api.post(');
    assert.notEqual(apiCall, -1, `handler ${index} should call its mutation endpoint`);
    assert.ok(handler.includes(endpoints[index]), `handler ${index} should keep its expected endpoint`);
    const continuationGuard = handler.indexOf('if (!action.isCurrent()) return;', apiCall);
    assert.ok(continuationGuard > apiCall, `handler ${index} should reject stale API continuations`);
    assert.match(handler, /if \(action\.isCurrent\(\)\)\s*\{?\s*Alert\.alert/s, `handler ${index} should suppress stale error alerts`);
    assert.match(handler, /action\.finish\(\)/, `handler ${index} should release its action token`);
  });

  const decline = handlers[3];
  assert.match(decline, /if \(!isCurrentActionIdentity\(generation\)\) return/);
  assert.match(decline, /await fetchReservations\(\);[\s\S]*?if \(action\.isCurrent\(\)\)/);
});

test('refresh state and reservation reads reject stale account continuations', () => {
  assert.match(screen, /if \(!isCurrentActionIdentity\(generation\)\) return;[\s\S]*?await refreshReservations\(\);[\s\S]*?if \(isCurrentActionIdentity\(generation\)\) setRefreshing\(false\)/);
  assert.match(screen, /if \(useAuthStore\.getState\(\)\.user\?\.id !== userId\) return/);
  assert.match(screen, /const isCurrentRequest = \(\) =>[\s\S]*generation === requestGeneration\.current &&[\s\S]*user\?\.id === userId/);
  assert.match(screen, /if \(!isCurrentRequest\(\)\) return/);
});
