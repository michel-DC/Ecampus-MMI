import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { UserResponse } from './types/auth.types';
import { UserRole } from '@prisma/client';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import { UTApi } from 'uploadthing/server';

@Injectable()
export class AuthService {
  private readonly utapi = new UTApi();

  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        image: true,
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
      imageUrl: user.image,
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

  async updateProfileImage(
    userId: string,
    dto: UpdateProfileImageDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const oldImageUrl = user.image;

    await this.prisma.user.update({
      where: { id: userId },
      data: { image: dto.imageUrl },
    });

    if (
      oldImageUrl &&
      oldImageUrl !== dto.imageUrl &&
      oldImageUrl.includes('utfs.io')
    ) {
      const key = oldImageUrl.split('/').pop();
      if (key) {
        try {
          await this.utapi.deleteFiles(key);
        } catch (error) {
          // On ignore si la suppression échoue
        }
      }
    }
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
