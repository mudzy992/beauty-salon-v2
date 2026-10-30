import type { User } from '../types';

/** Vraća imena uloga korisnika (backend može vratiti roles kao string[] ili userRoles kao { role: { name } }[]). */
function extractRoleName(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;

  const candidate = value as {
    name?: unknown;
    role?: { name?: unknown } | string | null;
  };
  if (typeof candidate.name === 'string') return candidate.name;
  if (typeof candidate.role === 'string') return candidate.role;
  if (candidate.role && typeof candidate.role === 'object') {
    return typeof candidate.role.name === 'string' ? candidate.role.name : null;
  }
  return null;
}

export function getRoleNames(user: User | null): string[] {
  if (!user) return [];
  const u = user as User & { roles?: unknown; userRoles?: unknown };
  const roles = Array.isArray(u.roles) && u.roles.length > 0
    ? u.roles
    : Array.isArray(u.userRoles)
      ? u.userRoles
      : [];

  return roles
    .map(extractRoleName)
    .filter((roleName): roleName is string => roleName !== null);
}

export function hasRole(user: User | null, roleName: string): boolean {
  return getRoleNames(user).includes(roleName);
}

export function isStylist(user: User | null): boolean {
  return hasRole(user, 'STYLIST');
}

export function isClient(user: User | null): boolean {
  return hasRole(user, 'CLIENT');
}
