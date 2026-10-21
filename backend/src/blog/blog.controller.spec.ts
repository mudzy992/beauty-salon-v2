import 'reflect-metadata';
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./utils/sanitize-blog-content', () => ({
  sanitizeBlogContent: (content: string) => content,
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { BlogController } from './blog.controller';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

type RouteHandler = (...args: never[]) => unknown;

const getRouteHandler = (methodName: string): RouteHandler => {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    BlogController.prototype,
    methodName,
  )?.value;
  if (typeof handler !== 'function') {
    throw new Error(`Missing route handler: ${methodName}`);
  }
  return handler as RouteHandler;
};

describe('BlogController route access metadata', () => {
  const reflector = new Reflector();

  const expectAdminOnly = (methodName: string) => {
    const handler = getRouteHandler(methodName);
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        handler,
        BlogController,
      ]),
    ).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'SYSTEM_ADMIN',
      'OWNER',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
  };

  it('keeps public post listing and slug detail explicitly public', () => {
    for (const methodName of ['findAll', 'findBySlug']) {
      expect(
        reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          getRouteHandler(methodName),
          BlogController,
        ]),
      ).toBe(true);
    }
  });

  it('restricts all-post and draft-by-id reads to admin/owner', () => {
    expectAdminOnly('findAllForAdmin');
    expectAdminOnly('findOne');
  });

  it('keeps public comments separate from admin moderation reads', () => {
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        getRouteHandler('getComments'),
        BlogController,
      ]),
    ).toBe(true);
    expectAdminOnly('getCommentsForAdmin');
  });
});
