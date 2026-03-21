import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../auth/types/auth.types';

@Injectable()
export class ProfileValidatedGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user || user.role !== UserRole.STUDENT) {
      return true;
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
      select: { isValidated: true },
    });

    if (!studentProfile || !studentProfile.isValidated) {
      throw new ForbiddenException(
        "Votre profil étudiant n'a pas encore été validé par un administrateur.",
      );
    }

    return true;
  }
}
