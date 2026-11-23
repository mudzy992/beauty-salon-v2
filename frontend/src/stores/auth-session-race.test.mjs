import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { AxiosError } from 'axios'

// Runs the real Vite-transformed store and Axios interceptors without a browser.
// Adapter responses are synthetic and deliberately released out of order.
const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
}
const redirects = []
const listeners = new Map()
globalThis.window = {
  location: { assign: path => redirects.push(path) },
  addEventListener: (type, listener) => listeners.set(type, listener),
}
let server, store, api, loginProfileApi, cacheDir
const user = (sub) => ({ sub, username: sub, email: null, phone: null, gender: null, genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'], avatar: null, isAvatarPublic: false })
const profile = (id) => ({ id, username: id, email: null, phone: null, gender: null, roles: ['CLIENT'], isEmailVerified: true, genderOnboardingCompleted: true })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })

before(async () => {
  cacheDir = mkdtempSync(join(tmpdir(), 'auth-session-vite-'))
  server = await createServer({ configFile: false, cacheDir, root: fileURLToPath(new URL('../../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  store = (await server.ssrLoadModule('/src/stores/auth.store.ts')).useAuthStore
  const client = await server.ssrLoadModule('/src/api/client.ts')
  api = client.api
  loginProfileApi = client.loginProfileApi
})
after(async () => { await server?.close(); if (cacheDir) rmSync(cacheDir, { recursive: true, force: true }) })

function session(token, identity) {
  store.getState().replaceToken(token)
  store.getState().setUser(user(identity))
  redirects.length = 0
}

test('a delayed profile response from the previous session cannot overwrite the new identity', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => { started.resolve(config); await gate.promise; return response(config, profile('client-A')) }
  const refresh = store.getState().refreshProfile().catch(error => error)
  const config = await started.promise
  assert.equal(config.headers.get('Authorization'), 'Bearer token-A')
  session('token-B', 'client-B')
  gate.resolve()
  await refresh
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user?.sub, 'client-B')
})

test('a delayed 401 from the previous session cannot log out the new identity', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => {
    started.resolve(config)
    await gate.promise
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 })
  }
  const request = api.get('/api/media/consents/me').catch(error => error)
  await started.promise
  session('token-B', 'client-B')
  gate.resolve()
  await request
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user?.sub, 'client-B')
  assert.deepEqual(redirects, [])
})

test('a request started by one session is not dispatched with a later session token', async () => {
  session('token-A', 'client-A')
  let authorization
  api.defaults.adapter = async config => { authorization = config.headers.get('Authorization'); return response(config, {}) }
  const request = api.post('/api/media/consents/synthetic/grant', { policyVersion: 'fixture' })
  session('token-B', 'client-B')
  await request
  assert.equal(authorization, 'Bearer token-A')
})

test('a 401 for the current session still logs out', async () => {
  session('token-B', 'client-B')
  api.defaults.adapter = async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 }) }
  await assert.rejects(api.get('/api/media/consents/me'))
  assert.equal(store.getState().token, null)
  assert.equal(store.getState().user, null)
  assert.ok(redirects.length > 0)
})

test('a delayed login response cannot replace a newer session', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => { started.resolve(); await gate.promise; return response(config, { access_token: 'token-old-login', user: profile('client-old-login') }) }
  const login = store.getState().login('old', 'password').catch(error => error)
  await started.promise
  session('token-B', 'client-B')
  gate.resolve()
  await login
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user?.sub, 'client-B')
  assert.equal(localStorage.getItem('token'), 'token-B')
})

test('a stale 401 cannot log out a renewed session even if it uses the same token string', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => {
    started.resolve()
    await gate.promise
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 })
  }
  const request = api.get('/api/media/consents/me').catch(error => error)
  await started.promise
  session('token-A', 'client-A')
  gate.resolve()
  await request
  assert.equal(store.getState().token, 'token-A')
  assert.equal(store.getState().user?.sub, 'client-A')
  assert.deepEqual(redirects, [])
})

test('the login fallback fetches with the newly issued token without publishing it early', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => response(config, { access_token: 'token-B' })
  loginProfileApi.defaults.adapter = async config => { started.resolve(config); await gate.promise; return response(config, profile('client-B')) }
  const login = store.getState().login('client-B', 'password')
  const config = await started.promise
  assert.equal(config.headers.get('Authorization'), 'Bearer token-B')
  assert.equal(store.getState().token, 'token-A')
  assert.equal(localStorage.getItem('token'), 'token-A')
  gate.resolve()
  assert.equal((await login).sub, 'client-B')
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user?.sub, 'client-B')
})

test('a delayed login fallback cannot replace a session established while it was loading', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => response(config, { access_token: 'token-B' })
  loginProfileApi.defaults.adapter = async config => { started.resolve(); await gate.promise; return response(config, profile('client-B')) }
  const login = store.getState().login('client-B', 'password')
  await started.promise
  session('token-C', 'client-C')
  gate.resolve()
  await assert.rejects(login, /Session changed/)
  assert.equal(store.getState().token, 'token-C')
  assert.equal(store.getState().user?.sub, 'client-C')
  assert.equal(localStorage.getItem('token'), 'token-C')
})

test('a failed login fallback cannot log out or overwrite the current session', async () => {
  session('token-A', 'client-A')
  api.defaults.adapter = async config => response(config, { access_token: 'token-B' })
  loginProfileApi.defaults.adapter = async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 }) }
  await assert.rejects(store.getState().login('client-B', 'password'))
  assert.equal(store.getState().token, 'token-A')
  assert.equal(localStorage.getItem('token'), 'token-A')
  assert.equal(store.getState().user?.sub, 'client-A')
  assert.deepEqual(redirects, [])
})

test('refresh refuses a profile for a different identity under the same session', async () => {
  session('token-A', 'client-A')
  api.defaults.adapter = async config => response(config, profile('client-B'))
  await assert.rejects(store.getState().refreshProfile(), /identity/)
  assert.equal(store.getState().user?.sub, 'client-A')
})

test('a pending storage event cannot cause an old action to dispatch with the new token', async () => {
  session('token-A', 'client-A')
  let dispatched = false
  api.defaults.adapter = async config => { dispatched = true; return response(config, {}) }
  localStorage.setItem('token', 'token-B') // another tab has written, event not yet delivered
  await assert.rejects(api.post('/api/private-write', {}), error => error.code === 'ERR_CANCELED')
  assert.equal(dispatched, false)
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user, null)
  assert.equal(store.getState().isReady, false)
})

test('an old 401 arriving before the storage event does not remove the newer token', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => {
    started.resolve(); await gate.promise
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 })
  }
  const request = api.get('/api/private-read').catch(error => error)
  await started.promise
  localStorage.setItem('token', 'token-B')
  gate.resolve()
  await request
  assert.equal(localStorage.getItem('token'), 'token-B')
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user, null)
  assert.deepEqual(redirects, [])
})

test('login fallback cannot overwrite a cross-tab token before its storage event arrives', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => response(config, { access_token: 'token-B' })
  loginProfileApi.defaults.adapter = async config => { started.resolve(); await gate.promise; return response(config, profile('client-B')) }
  const login = store.getState().login('client-B', 'password')
  await started.promise
  localStorage.setItem('token', 'token-C')
  gate.resolve()
  await assert.rejects(login, /Session changed/)
  assert.equal(store.getState().token, 'token-C')
  assert.equal(localStorage.getItem('token'), 'token-C')
  assert.equal(store.getState().user, null)
})

test('storage events reconcile the current value, invalidate A to B to A and ignore other storage', () => {
  session('token-A', 'client-A')
  const before = store.getState().sessionVersion
  const notify = listeners.get('storage')
  assert.equal(typeof notify, 'function')
  notify({ storageArea: {}, key: 'token', newValue: 'token-B' })
  notify({ storageArea: localStorage, key: 'theme', newValue: 'light' })
  assert.equal(store.getState().sessionVersion, before)
  // The real storage has already moved back to A; an older B event is queued.
  notify({ storageArea: localStorage, key: 'token', oldValue: 'token-A', newValue: 'token-B' })
  assert.equal(store.getState().token, 'token-A')
  assert.equal(store.getState().user, null)
  assert.equal(store.getState().isReady, false)
  assert.equal(store.getState().sessionVersion, before + 1)
  localStorage.removeItem('token')
  notify({ storageArea: localStorage, key: null, oldValue: null, newValue: null })
  assert.equal(store.getState().token, null)
  assert.equal(store.getState().isReady, true)
})

test('logout requested before a cross-tab storage event does not erase a newer session', () => {
  session('token-A', 'client-A')
  localStorage.setItem('token', 'token-B')
  assert.equal(store.getState().logout(), false)
  assert.equal(localStorage.getItem('token'), 'token-B')
  assert.equal(store.getState().token, 'token-B')
  assert.equal(store.getState().user, null)
  assert.equal(store.getState().isReady, false)
  assert.deepEqual(redirects, [])
})

test('a token change between 401 inspection and logout prevents both deletion and redirect', async () => {
  session('token-A', 'client-A')
  const started = deferred(), gate = deferred()
  api.defaults.adapter = async config => {
    started.resolve(); await gate.promise
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { ...response(config, {}), status: 401 })
  }
  const request = api.get('/api/private-read').catch(error => error)
  await started.promise
  const original = localStorage.getItem
  let reads = 0
  localStorage.getItem = key => {
    if (key === 'token' && ++reads === 2) values.set('token', 'token-B')
    return original(key)
  }
  try {
    gate.resolve()
    await request
  } finally { localStorage.getItem = original }
  assert.equal(reads, 2)
  assert.equal(localStorage.getItem('token'), 'token-B')
  assert.equal(store.getState().token, 'token-B')
  assert.deepEqual(redirects, [])
})
