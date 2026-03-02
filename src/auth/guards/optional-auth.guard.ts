import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { auth } from '../../lib/auth';
import { JwtPayload } from '../types/auth.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();

    const session = await auth.api.getSession({
      headers: request.headers as Headers,
    });

    if (session && session.user) {
      const userPayload: JwtPayload = {
        sub: session.user.id,
        email: session.user.email,
        role: (session.user as unknown as { role: UserRole }).role,
      };
      request.user = userPayload;
    }

    return true;
  }
}
