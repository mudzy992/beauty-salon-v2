import 'reflect-metadata';
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ReviewsController } from './reviews.controller';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

type RouteHandler = (...args: never[]) => unknown;

const getRouteHandler = (methodName: string): RouteHandler => {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    ReviewsController.prototype,
    methodName,
  )?.value;
  if (typeof handler !== 'function') {
    throw new Error(`Missing route handler: ${methodName}`);
  }
  return handler as RouteHandler;
};

describe('ReviewsController route access metadata', () => {
  it('keeps the approved review list public but requires authentication for detail', () => {
    const reflector = new Reflector();
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        getRouteHandler('findAll'),
        ReviewsController,
      ]),
    ).toBe(true);
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        getRouteHandler('findOne'),
        ReviewsController,
      ]),
    ).toBeUndefined();
  });

  it('restricts moderation list to admin/owner roles', () => {
    const handler = getRouteHandler('findAllForAdmin');

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'SYSTEM_ADMIN',
      'OWNER',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
  });
});
