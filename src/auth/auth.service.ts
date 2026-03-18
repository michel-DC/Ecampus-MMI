import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { UserResponse } from './types/auth.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          select: {
            isValidated: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const response: UserResponse = {
      email: user.email,
      name: { firstname: user.firstname, lastname: user.lastname },
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    if (user.role === UserRole.STUDENT && user.studentProfile) {
      response.isProfileValidated = user.studentProfile.isValidated;
    }

    return response;
  }

  async completeOnboarding(userId: string, dto: OnboardingDto): Promise<void> {
    const existingProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('Onboarding déjà effectué');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { id: dto.promotionId },
    });

    if (!promotion || !promotion.isActive) {
      throw new NotFoundException('Promotion non trouvée ou inactive');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Groupe non trouvé');
    }

    const operations: any[] = [
      this.prisma.studentProfile.create({
        data: {
          userId,
          promotionId: dto.promotionId,
          groupId: dto.groupId,
        },
      }),
    ];

    if (dto.imageUrl) {
      operations.push(
        this.prisma.user.update({
          where: { id: userId },
          data: {
            image: dto.imageUrl,
          },
        }),
      );
    }

    await this.prisma.$transaction(operations);
  }

  async createTeacherProfileIfMissing(userId: string): Promise<void> {
    const existing = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      await this.prisma.teacherProfile.create({
        data: { userId },
      });
    }
  }
}
