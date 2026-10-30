import type { User } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRoleEntry(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!isRecord(value)) return false;
  if (typeof value.name === 'string' && value.name.trim()) return true;
  if (typeof value.role === 'string' && value.role.trim()) return true;
  return isRecord(value.role) && typeof value.role.name === 'string' && value.role.name.trim().length > 0;
}

function isUser(value: unknown): value is User {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.trim().length > 0 &&
    typeof value.username === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    (typeof value.email === 'string' || value.email === null) &&
    typeof value.isEmailVerified === 'boolean' &&
    Array.isArray(value.roles) &&
    value.roles.length > 0 &&
    value.roles.every(isRoleEntry)
  );
}

export function extractUserFromPayload(payload: unknown): User | null {
  if (isUser(payload)) return payload;
  if (!isRecord(payload)) return null;

  const nested = payload.user ?? (isRecord(payload.data) ? payload.data.user : undefined);
  return isUser(nested) ? nested : null;
}
