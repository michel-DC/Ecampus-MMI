import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserSearchResponse, CreatedTeacherResponse } from './types/user.types';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { MailService } from '../mail/mail.service';
import { UserRole } from '@prisma/client';
import { auth } from '../lib/auth';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll(filters: UserFiltersDto): Promise<UserSearchResponse[]> {
    const { q, role, limit = 20 } = filters;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: role,
        OR: q
          ? [
              { firstname: { contains: q, mode: 'insensitive' } },
              { lastname: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { lastname: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: { firstname: user.firstname, lastname: user.lastname },
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  async createTeacher(dto: CreateTeacherDto): Promise<CreatedTeacherResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const temporaryPassword = this.generateTemporaryPassword();

    const response = await auth.api.createUser({
      body: {
        email: dto.email,
        name: `${dto.firstname} ${dto.lastname}`,
        password: temporaryPassword,
        data: {
          role: 'TEACHER',
          firstname: dto.firstname,
          lastname: dto.lastname,
        },
      },
    });

    if (!response || !response.user) {
      throw new InternalServerErrorException(
        "Échec de la création du compte de l'enseignant",
      );
    }

    try {
      await this.mailService.sendTeacherCredentials({
        email: dto.email,
        firstname: dto.firstname,
        lastname: dto.lastname,
        temporaryPassword,
      });
    } catch (error) {
      await this.prisma.user.delete({
        where: { id: response.user.id },
      });
      throw error;
    }


    return {
      id: response.user.id,
      email: response.user.email,
      name: { firstname: dto.firstname, lastname: dto.lastname },
      role: UserRole.TEACHER,
      temporaryPassword,
      createdAt: new Date(response.user.createdAt),
    };
  }

  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 12 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }
}
