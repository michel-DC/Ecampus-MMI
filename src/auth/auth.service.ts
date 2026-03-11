import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { UserResponse } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      id: user.id,
      email: user.email,
      name: { firstname: user.firstname, lastname: user.lastname },
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
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

    await this.prisma.studentProfile.create({
      data: {
        userId,
        promotionId: dto.promotionId,
        groupId: dto.groupId,
      },
    });
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
