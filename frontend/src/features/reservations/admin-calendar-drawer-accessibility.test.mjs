import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./components/ReservationScheduler.tsx', import.meta.url), 'utf8')

test('admin reservation details drawer has a dynamic accessible dialog title', () => {
  assert.match(source, /import \{ DialogDescription, DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
  assert.match(source, /<DrawerContent[\s\S]*?<DialogTitle className="mb-1 text-lg font-semibold[\s\S]*?activeReservation\?\.service\?\.name \?\? t\('reservations\.calendar\.details\.appointment'\)/)
})

test('admin reservation creation drawer uses the visible title and description as dialog semantics', () => {
  assert.match(source, /drawerMode === 'create'\s*\? t\('reservations\.calendar\.create\.title'\)/)
  assert.match(source, /drawerMode === 'create' \? \([\s\S]*?<DialogDescription[\s\S]*?t\('reservations\.calendar\.create\.subtitle'\)/)
  assert.doesNotMatch(source, /<DrawerContent[\s\S]{0,1200}<p className="text-sm font-semibold[\s\S]*?reservations\.calendar\.create\.title/)
})
