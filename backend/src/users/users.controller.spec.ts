import 'reflect-metadata';
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UsersController } from './users.controller';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

type RouteHandler = (...args: never[]) => unknown;

const getRouteHandler = (methodName: string): RouteHandler => {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    UsersController.prototype,
    methodName,
  )?.value;
  if (typeof handler !== 'function') {
    throw new Error(`Missing route handler: ${methodName}`);
  }
  return handler as RouteHandler;
};

describe('UsersController client-list access metadata', () => {
  it('keeps the client picker available only to staff roles', () => {
    const handler = getRouteHandler('findClients');

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('clients');
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'SYSTEM_ADMIN',
      'OWNER',
      'STYLIST',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
  });

  it('restricts the expanded client list to admin and owner', () => {
    const handler = getRouteHandler('findClientsForAdmin');

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('clients/admin');
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'SYSTEM_ADMIN',
      'OWNER',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
  });
});
