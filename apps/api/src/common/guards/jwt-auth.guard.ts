import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return (await super.canActivate(context)) as boolean;
    }

    // Public route: allow anonymous access, but if a Bearer token is present,
    // attempt validation so the authenticated user is attached to the request
    // (request.user) for optional-auth endpoints (e.g. vaults, opportunities).
    const request = context.switchToHttp().getRequest();
    if (!request.headers?.authorization) {
      return true;
    }
    try {
      await super.canActivate(context);
    } catch {
      // Ignore invalid/expired tokens on public routes - the request proceeds
      // anonymously.
    }
    return true;
  }
}
