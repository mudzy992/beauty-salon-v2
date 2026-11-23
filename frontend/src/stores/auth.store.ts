import { create } from 'zustand'
import api, { loginProfileApi } from '../api/client'

export interface AuthUser {
  sub: string
  username: string
  email: string | null
  phone: string | null
  gender: 'MALE' | 'FEMALE' | null
  genderOnboardingCompleted?: boolean
  isEmailVerified: boolean
  mustChangePassword: boolean
  roles: string[]
  avatar: string | null
  isAvatarPublic: boolean
}

type ProfilePayload = {
  id: string
  username: string
  email: string | null
  phone?: string | null
  gender?: 'MALE' | 'FEMALE' | null
  genderOnboardingCompleted?: boolean
  isEmailVerified?: boolean
  mustChangePassword?: boolean
  avatar?: string | null
  isAvatarPublic?: boolean
  userRoles?: { role: { name: string } }[]
  roles?: string[]
}

const TOKEN_KEY = 'token'
const SESSION_REVISION_KEY = 'auth-session-revision'

// Not a credential: this marker lets other tabs observe a new session even
// when the server issues the exact same token string again.
const writeSessionToken = (token: string | null): string => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  const revision = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
  localStorage.setItem(SESSION_REVISION_KEY, revision)
  return revision
}

const parseRolesFromJwt = (token: string | null): string[] => {
  if (!token) return []
  try {
    const parts = token.split('.')
    if (parts.length < 2) return []
    const payload = JSON.parse(atob(parts[1])) as { roles?: unknown }
    const r = payload.roles
    if (!Array.isArray(r)) return []
    return r.map((x) => String(x).trim().toUpperCase()).filter(Boolean)
  } catch {
    return []
  }
}

const asBool = (v: unknown, fallback = false): boolean => {
  if (v === true || v === 1) return true
  if (v === false || v === 0 || v == null) return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === '1' || s === 'true' || s === 'yes') return true
    if (s === '0' || s === 'false' || s === '') return false
  }
  return fallback
}

const mapProfileToUser = (
  profile: ProfilePayload,
  jwtFallbackToken: string | null = null,
): AuthUser => {
  const raw =
    profile.roles ??
    profile.userRoles?.map((r) => r.role?.name).filter((n): n is string => Boolean(n)) ??
    []
  let roles = raw.map((r) => String(r).trim().toUpperCase()).filter(Boolean)
  if (roles.length === 0 && jwtFallbackToken) {
    roles = parseRolesFromJwt(jwtFallbackToken)
  }
  return {
    sub: profile.id,
    username: profile.username,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    gender: profile.gender ?? null,
    genderOnboardingCompleted: asBool(profile.genderOnboardingCompleted),
    isEmailVerified: asBool(profile.isEmailVerified),
    mustChangePassword: asBool(profile.mustChangePassword),
    roles,
    avatar: profile.avatar?.trim() ? profile.avatar.trim() : null,
    isAvatarPublic: profile.isAvatarPublic === true,
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isReady: boolean
  sessionVersion: number
  storageRevision: string | null
  setToken: (token: string | null) => void
  replaceToken: (token: string) => void
  setUser: (user: AuthUser | null) => void
  setReady: (ready: boolean) => void
  logout: () => boolean
  refreshProfile: () => Promise<AuthUser>
  login: (username: string, password: string) => Promise<AuthUser>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isReady: false,
  sessionVersion: 0,
  storageRevision: localStorage.getItem(SESSION_REVISION_KEY),
  setToken: (token) => set((state) => ({ token, sessionVersion: state.sessionVersion + 1 })),
  replaceToken: (token) => {
    const storageRevision = writeSessionToken(token)
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    set((state) => ({ token, storageRevision, sessionVersion: state.sessionVersion + 1 }))
  },
  setUser: (user) => set((state) => ({
    user,
    sessionVersion: state.sessionVersion + (state.user?.sub !== user?.sub ? 1 : 0),
  })),
  setReady: (ready) => set({ isReady: ready }),
  logout: () => {
    // A click or delayed response from the old tab must not erase a newer
    // session written by another tab before its storage event is delivered.
    if (synchronizeAuthFromStorage()) return false
    const storageRevision = writeSessionToken(null)
    delete api.defaults.headers.common.Authorization
    set((state) => ({ token: null, user: null, isReady: true, storageRevision, sessionVersion: state.sessionVersion + 1 }))
    window.location.assign('/')
    return true
  },
  refreshProfile: async () => {
    const { token, sessionVersion, user } = get()
    const profile = await api.get<ProfilePayload>('/api/users/profile')
    if (get().sessionVersion !== sessionVersion || get().token !== token) {
      throw new Error('Session changed during profile refresh')
    }
    if (user && profile.data.id !== user.sub) {
      throw new Error('Profile identity does not match session')
    }
    const mapped = mapProfileToUser(profile.data, token)
    set({ user: mapped })
    return mapped
  },
  login: async (username: string, password: string) => {
    const sessionVersion = get().sessionVersion
    const { data } = await api.post<{ access_token: string; user?: ProfilePayload }>(
      '/auth/login',
      { login: username, password },
    )
    if (get().sessionVersion !== sessionVersion) throw new Error('Session changed during login')
    const newToken = data.access_token
    let userData: AuthUser
    if (data.user?.id) {
      userData = mapProfileToUser(data.user, newToken)
    } else {
      const profile = await loginProfileApi.get<ProfilePayload>('/api/users/profile', {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      // The separate fallback client has no shared response interceptor.
      synchronizeAuthFromStorage()
      if (get().sessionVersion !== sessionVersion) throw new Error('Session changed during login')
      userData = mapProfileToUser(profile.data, newToken)
    }
    const storageRevision = writeSessionToken(newToken)
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`
    set((state) => ({ token: newToken, user: userData, isReady: true, storageRevision, sessionVersion: state.sessionVersion + 1 }))
    return userData
  },
}))

// Storage events are delivered asynchronously and may describe an older write.
// Always read the current value instead of applying event.newValue.
export function synchronizeAuthFromStorage(force = false): boolean {
  const token = localStorage.getItem(TOKEN_KEY)
  const storageRevision = localStorage.getItem(SESSION_REVISION_KEY)
  const current = useAuthStore.getState()
  if (!force && current.token === token && current.storageRevision === storageRevision) return false
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
  useAuthStore.setState((state) => ({
    token,
    user: null,
    isReady: !token,
    storageRevision,
    sessionVersion: state.sessionVersion + 1,
  }))
  return true
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage || (event.key !== TOKEN_KEY && event.key !== SESSION_REVISION_KEY && event.key !== null)) return
    // Token events can also come from older clients that do not write the
    // revision marker. A queued A→B→A must still invalidate the old session.
    synchronizeAuthFromStorage(event.key !== SESSION_REVISION_KEY)
  })
}

