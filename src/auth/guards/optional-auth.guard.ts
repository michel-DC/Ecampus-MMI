import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { auth } from '../../lib/auth';
import { JwtPayload } from '../types/auth.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (session && session.user) {
      const userPayload: JwtPayload = {
        sub: session.user.id,
        email: session.user.email,
        role: (session.user as unknown as { role: UserRole }).role,
      };
      (request as Request & { user: JwtPayload }).user = userPayload;
    }

    return true;
  }
}
