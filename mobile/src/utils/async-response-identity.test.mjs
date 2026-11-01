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

test('reservation and daily-log actions stay bound to their route and active account', () => {
  const reservation = source('../screens/client/ReservationScreen.tsx');
  assert.match(reservation, /bookingRequestIdRef = useRef\(0\)/);
  assert.match(reservation, /bookingRequestId === bookingRequestIdRef\.current/);
  assert.match(reservation, /bookingRouteGeneration === routeGeneration\.current/);
  assert.match(reservation, /screenMounted\.current &&[\s\S]{0,160}useAuthStore\.getState\(\)\.user\?\.id === requestUserId/);
  assert.match(reservation, /if \(!isCurrentRequest\(\)\) return;/);
  assert.match(reservation, /user\?\.id\]\);\s*\n\s*const loadLoyaltyPreview/);

  const dailyLogForm = source('../screens/stylist/DailyLogNewEntryScreen.tsx');
  assert.match(dailyLogForm, /const beginAction = useCallback/);
  assert.match(dailyLogForm, /editEntryId === actionEntryId/);
  assert.match(dailyLogForm, /screenMounted\.current &&[\s\S]{0,160}useAuthStore\.getState\(\)\.user\?\.id === actionUserId/);
  assert.match(dailyLogForm, /if \(!mounted \|\| useAuthStore\.getState\(\)\.user\?\.id !== userId\) return;/);
  assert.match(dailyLogForm, /clientLoadGeneration\.current === generation &&[\s\S]{0,120}useAuthStore\.getState\(\)\.user\?\.id === requestUserId/);

  const dailyLogDetail = source('../screens/stylist/DailyLogDetailScreen.tsx');
  assert.match(dailyLogDetail, /requestIdentity\.current\.userId !== userId/);
  assert.match(dailyLogDetail, /entryIdentity\?\.entryId === entryId && entryIdentity\.userId === userId/);
  assert.match(dailyLogDetail, /if \(!entryMatchesCurrentIdentity \|\| \(loading && !entry\)\)/);
  assert.match(dailyLogDetail, /const beginAction = useCallback/);
  assert.match(dailyLogDetail, /currentScreenGeneration === screenGeneration\.current/);
  assert.match(dailyLogDetail, /await api\.post\(`\/api\/daily-log\/\$\{entryId\}\/complete`\);\s*if \(!isCurrentAction\(\)\) return;/);
  assert.match(dailyLogDetail, /if \(!isCurrentAction\(\)\) return;\s*navigation\.navigate\('ReschedulePreview'/);
  assert.match(dailyLogDetail, /await api\.post<unknown>\('\/api\/uploads',[\s\S]*?if \(!isCurrentAction\(\)\) return;/);
});

test('stylist reservation-detail reads and mutations stay bound to the active account, route, and mount', () => {
  const identity = source('../screens/stylist/reservation-detail/hooks/use-reservation-action-identity.ts');
  assert.match(identity, /useAuthStore\(\(state\) => state\.user\?\.id\)/);
  assert.match(identity, /current\.reservationId === reservationId/);
  assert.match(identity, /useAuthStore\.getState\(\)\.user\?\.id === userId/);
  assert.match(identity, /current\.mounted/);
  assert.match(identity, /identityRef\.current\.generation === generation/);
  assert.match(identity, /identityRef\.current\.generation \+= 1/);

  const detailScreen = source('../screens/stylist/StylistReservationDetailScreen.tsx');
  assert.match(detailScreen, /const identity = useReservationActionIdentity\(reservationId\)/);
  assert.match(detailScreen, /useStylistReservationDetail\(\{ reservationId, identity \}\)/);
  assert.match(detailScreen, /useReservationDetailActions\(\{[\s\S]*?identity,/);
  assert.match(detailScreen, /useStaffConfirmAttendance\(\{[\s\S]*?identity,/);

  const readHook = source('../screens/stylist/reservation-detail/hooks/use-stylist-reservation-detail.ts');
  assert.match(readHook, /const \{ isCurrent, userId \} = identity/);
  assert.match(readHook, /if \(!isCurrent\(\)\) return/);
  assert.match(readHook, /generation === requestGeneration\.current && isCurrent\(\)/);
  assert.match(readHook, /parsed\.id !== reservationId/);
  assert.match(readHook, /reservationMatchesCurrent \? reservation : null/);

  const actionHook = source('../screens/stylist/reservation-detail/hooks/use-reservation-detail-actions.ts');
  for (const path of [
    'stylist-start',
    'stylist-cancel',
    'stylist-no-show',
    'reorder/request',
  ]) {
    assert.match(actionHook, new RegExp(`await api\\.post\\([\\s\\S]{0,500}${path}[\\s\\S]{0,220}if \\(!isCurrentAction\\(\\)\\) return;`), path);
  }
  assert.match(actionHook, /await fetchReservation\(\);\s*if \(!isCurrentAction\(\)\) return;/);
  assert.match(actionHook, /if \(!isCurrentAction\(\)\) return;\s*Alert\.alert\(/);
  assert.match(actionHook, /if \(isCurrentAction\(\)\) set(?:Start|Cancel|NoShow|Reorder)Submitting\(false\)/);

  const completeHook = source('../screens/stylist/reservation-detail/hooks/use-reservation-complete-flow.ts');
  assert.match(completeHook, /const isCurrentRead = \(\) =>[\s\S]*?isCurrent\(\)/);
  assert.match(completeHook, /await api\.post<unknown>\([\s\S]*?if \(!isCurrentAction\(\)\) return;/);
  assert.match(completeHook, /await fetchClientDebts\(reservation\.clientId\);\s*if \(!isCurrentAction\(\)\) return;/);
  assert.match(completeHook, /if \(!isCurrentAction\(\)\) return;\s*Alert\.alert\(/);
  assert.match(completeHook, /if \(isCurrentAction\(\)\) setCompleteSubmitting\(false\)/);

  const staffConfirm = source('../screens/stylist/reservation-detail/hooks/use-staff-confirm-attendance.ts');
  assert.match(staffConfirm, /reservationId !== currentReservationId \|\| !isCurrent\(\)/);
  assert.match(staffConfirm, /await api\.post\([\s\S]*?if \(!isCurrentAction\(\)\) return;/);
  assert.match(staffConfirm, /if \(!isCurrentAction\(\)\) return;\s*Alert\.alert\(/);
  assert.match(staffConfirm, /if \(isCurrentAction\(\)\) setSubmitting\(false\)/);
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
