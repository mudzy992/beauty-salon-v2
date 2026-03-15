import type { User, UserRole } from '../types';

/** Vraća imena uloga korisnika (backend može vratiti roles kao string[] ili userRoles kao { role: { name } }[]). */
export function getRoleNames(user: User | null): string[] {
  if (!user) return [];
  const u = user as User & { roles?: string[] | UserRole[] };
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    const first = u.roles[0];
    if (typeof first === 'string') return u.roles as string[];
    return (u.roles as UserRole[]).map((r) => r.role.name);
  }
  if (Array.isArray((u as any).userRoles)) {
    return (u as any).userRoles.map((ur: UserRole) => ur.role.name);
  }
  return [];
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
