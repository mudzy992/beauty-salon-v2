import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): CurrentUserPayload | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    const user = request.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
