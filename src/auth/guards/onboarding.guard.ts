import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../types/auth.types';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (user.role !== UserRole.STUDENT) {
      return true;
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!studentProfile) {
      throw new ForbiddenException(
        "Onboarding requis avant d'accéder à cette ressource'",
      );
    }

    return true;
  }
}
