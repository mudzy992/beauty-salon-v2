import type { UserRow } from './user-types'

export const getUserDisplayName = (u: Pick<UserRow, 'firstName' | 'lastName' | 'username'>) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '-'

export const initials = (firstName?: string | null, lastName?: string | null, username?: string | null) => {
  const f = (firstName ?? '').trim()
  const l = (lastName ?? '').trim()
  if (f || l) return `${(f[0] ?? '').toUpperCase()}${(l[0] ?? '').toUpperCase()}`.trim() || 'U'
  return (username ?? 'U')[0]?.toUpperCase() ?? 'U'
}
