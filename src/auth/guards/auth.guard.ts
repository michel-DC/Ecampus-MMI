import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '../../lib/auth';
import { JwtPayload } from '../types/auth.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const session = await auth.api.getSession({
      headers: request.headers as Headers,
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Authentification requise');
    }

    // Le champ role est maintenant disponible grâce à additionalFields dans Better Auth
    const userPayload: JwtPayload = {
      sub: session.user.id,
      email: session.user.email,
      role: (session.user as unknown as { role: UserRole }).role,
    };

    (request as Request & { user: JwtPayload }).user = userPayload;

    return true;
  }
}
