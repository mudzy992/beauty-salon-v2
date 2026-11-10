import { ForbiddenException } from '@nestjs/common'
import { apiError } from '../errors/api-error-codes';

export const isAdminOrOwner = (roles: string[]): boolean => {
  return roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER')
}

export const requireAdminOrOwner = (roles: string[]): void => {
  if (!isAdminOrOwner(roles)) {
    throw new ForbiddenException(apiError('USERS_PERMISSION_DENIED'))
  }
}
