import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
        "Échec de la création du compte de l'enseignant via l'API externe.",
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
      throw new InternalServerErrorException(
        "Échec de l'envoi des identifiants par email. Le compte enseignant n'a pas été créé.",
      );
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

  async getPendingStudents(): Promise<UserSearchResponse[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        studentProfile: {
          isValidated: false,
        },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          select: {
            isValidated: true,
            promotion: { select: { label: true, academicYear: true } },
            group: { select: { name: true } },
          },
        },
      },
      orderBy: { lastname: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: { firstname: user.firstname, lastname: user.lastname },
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      promotion: user.studentProfile?.promotion?.label,
      academicYear: user.studentProfile?.promotion?.academicYear,
      groupName: user.studentProfile?.group?.name,
      isProfileValidated: user.studentProfile?.isValidated,
    }));
  }

  async validateStudentProfile(studentId: string): Promise<void> {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true },
    });

    if (!studentProfile) {
      throw new NotFoundException(
        'Profil étudiant non trouvé pour cet utilisateur.',
      );
    }

    if (studentProfile.user.role !== UserRole.STUDENT) {
      throw new ConflictException("Cet utilisateur n'est pas un étudiant.");
    }

    if (studentProfile.isValidated) {
      throw new ConflictException('Le profil étudiant est déjà validé.');
    }

    await this.prisma.studentProfile.update({
      where: { userId: studentId },
      data: { isValidated: true },
    });
  }

  async unvalidateStudentProfile(studentId: string): Promise<void> {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true },
    });

    if (!studentProfile) {
      throw new NotFoundException(
        'Profil étudiant non trouvé pour cet utilisateur.',
      );
    }

    if (studentProfile.user.role !== UserRole.STUDENT) {
      throw new ConflictException("Cet utilisateur n'est pas un étudiant.");
    }

    if (!studentProfile.isValidated) {
      throw new ConflictException("Le profil étudiant n'est pas validé.");
    }

    await this.prisma.studentProfile.update({
      where: { userId: studentId },
      data: { isValidated: false },
    });
  }

  async updateStudentProfile(
    studentId: string,
    dto: {
      firstname?: string;
      lastname?: string;
      promotionId?: string;
      groupId?: string;
    },
  ): Promise<void> {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true },
    });

    if (!studentProfile) {
      throw new NotFoundException(
        'Profil étudiant non trouvé pour cet utilisateur.',
      );
    }

    if (studentProfile.user.role !== UserRole.STUDENT) {
      throw new ConflictException("Cet utilisateur n'est pas un étudiant.");
    }

    const updateData: any = {};

    // Valider et ajouter les données de l'utilisateur
    if (dto.firstname || dto.lastname) {
      const updates: any = {};
      if (dto.firstname) {
        updates.firstname = dto.firstname;
      }
      if (dto.lastname) {
        updates.lastname = dto.lastname;
      }
      updateData.user = { update: updates };
    }

    // Valider et ajouter les données du profil étudiant
    if (dto.promotionId) {
      const promotion = await this.prisma.promotion.findUnique({
        where: { id: dto.promotionId },
      });
      if (!promotion) {
        throw new NotFoundException('Promotion non trouvée.');
      }
      updateData.promotionId = dto.promotionId;
    }

    if (dto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException('Groupe non trouvé.');
      }
      updateData.groupId = dto.groupId;
    }

    // Si aucune mise à jour, ne faire rien
    if (Object.keys(updateData).length === 0) {
      return;
    }

    // Effectuer la mise à jour du StudentProfile
    await this.prisma.studentProfile.update({
      where: { userId: studentId },
      data: updateData,
    });
  }
}
