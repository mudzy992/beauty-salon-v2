import { create } from 'zustand'
import api from '../api/client'

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
  userRoles?: { role: { name: string } }[]
  roles?: string[]
}

const TOKEN_KEY = 'token'

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
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isReady: boolean
  setToken: (token: string | null) => void
  setUser: (user: AuthUser | null) => void
  setReady: (ready: boolean) => void
  logout: () => void
  refreshProfile: () => Promise<AuthUser>
  login: (username: string, password: string) => Promise<AuthUser>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isReady: false,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ isReady: ready }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    delete api.defaults.headers.common.Authorization
    set({ token: null, user: null, isReady: true })
    window.location.assign('/')
  },
  refreshProfile: async () => {
    const profile = await api.get<ProfilePayload>('/api/users/profile')
    const mapped = mapProfileToUser(profile.data, get().token)
    set({ user: mapped })
    return mapped
  },
  login: async (username: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user?: ProfilePayload }>(
      '/auth/login',
      { login: username, password },
    )
    const newToken = data.access_token
    localStorage.setItem(TOKEN_KEY, newToken)
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`
    let userData: AuthUser
    if (data.user?.id) {
      userData = mapProfileToUser(data.user, newToken)
    } else {
      const profile = await api.get<ProfilePayload>('/api/users/profile')
      userData = mapProfileToUser(profile.data, newToken)
    }
    set({ token: newToken, user: userData, isReady: true })
    return userData
  },
}))

