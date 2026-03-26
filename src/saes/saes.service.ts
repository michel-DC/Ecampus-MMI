import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TdGroup, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/auth.types';
import { deriveTdGroupFromGroupName } from '../lib/td-group';
import { CreateSaeDto } from './dto/create-sae.dto';
import { UpdateSaeDto } from './dto/update-sae.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SaeFiltersDto } from './dto/sae-filters.dto';
import {
  SaeArchiveResponse,
  SaeInvitationResponse,
  SaeListResponse,
  SaeResponse,
  computeSaeStatus,
} from './types/sae.types';

@Injectable()
export class SaesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: SaeFiltersDto,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<SaeListResponse> {
    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;
    const isStudent = requestingUserRole === UserRole.STUDENT;

    let studentPromotionId: string | undefined;
    let studentTdGroup: TdGroup | undefined;
    if (isStudent && requestingUserId) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: requestingUserId },
        select: {
          promotionId: true,
          group: { select: { name: true } },
        },
      });

      if (!profile) {
        throw new ForbiddenException(
          'Vous devez compléter votre onboarding pour accéder aux SAE',
        );
      }

      studentPromotionId = profile.promotionId;
      const resolvedTdGroup = deriveTdGroupFromGroupName(profile.group?.name);
      if (!resolvedTdGroup) {
        throw new ForbiddenException(
          'Impossible de déterminer votre groupe TD à partir de votre groupe',
        );
      }
      studentTdGroup = resolvedTdGroup;
    }

    if (isStudent && (!studentPromotionId || !studentTdGroup)) {
      throw new ForbiddenException(
        'Impossible de déterminer votre promotion ou votre groupe TD',
      );
    }

    const saes = await this.prisma.sae.findMany({
      where: {
        deletedAt: null,
        semesterId: filters.semesterId,
        AND: isStudent
          ? [{ OR: [{ tdGroup: studentTdGroup! }, { tdGroup: null }] }]
          : undefined,
        isPublished: isTeacherOrAdmin ? filters.isPublished : true,
        semester: {
          promotionId: isStudent ? studentPromotionId : filters.promotionId,
          promotion: {
            academicYear: isStudent || filters.promotionId ? undefined : null,
            students: filters.groupId
              ? { some: { groupId: filters.groupId } }
              : undefined,
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
        semester: { select: { id: true, promotionId: true } },
        submissions: isStudent
          ? { where: { studentId: requestingUserId }, select: { id: true } }
          : isTeacherOrAdmin
            ? {
                where: filters.groupId
                  ? {
                      student: {
                        studentProfile: {
                          groupId: filters.groupId,
                          promotion: {
                            semesters: {
                              some: {
                                saes: { some: { id: { not: undefined } } },
                              },
                            },
                          },
                        },
                      },
                    }
                  : undefined,
                select: { id: true },
              }
            : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = isTeacherOrAdmin
      ? await Promise.all(
          saes.map(async (sae) => {
            const count = await this.prisma.studentProfile.count({
              where: {
                promotionId: sae.semester.promotionId,
                groupId: filters.groupId,
              },
            });

            let submissionCount = sae.submissions.length;
            if (filters.groupId) {
              submissionCount = await this.prisma.studentSubmission.count({
                where: {
                  saeId: sae.id,
                  student: { studentProfile: { groupId: filters.groupId } },
                },
              });
            }

            return { saeId: sae.id, studentCount: count, submissionCount };
          }),
        )
      : [];

    const mapped: SaeResponse[] = saes.map((sae) => {
      const isHisPromotion =
        isStudent && sae.semester.promotionId === studentPromotionId;
      const status = computeSaeStatus(sae);

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);
      const isUrgent = status === 'ongoing' && sae.dueDate <= threeDaysFromNow;

      const saeStats = stats.find((s) => s.saeId === sae.id);

      return {
        id: sae.id,
        title: sae.title,
        banner: sae.banner.url,
        description: sae.description,
        instructions: sae.instructions,
        semesterId: sae.semesterId,
        tdGroup: sae.tdGroup,
        thematic: sae.thematic.label,
        startDate: sae.startDate,
        dueDate: sae.dueDate,
        isPublished: sae.isPublished,
        isSubmitted: isHisPromotion ? sae.submissions.length > 0 : undefined,
        isUrgent,
        submissionCount: isTeacherOrAdmin
          ? saeStats?.submissionCount
          : undefined,
        studentCount: isTeacherOrAdmin ? saeStats?.studentCount : undefined,
        status,
        createdBy: {
          id: sae.createdBy.id,
          email: sae.createdBy.email,
          name: {
            firstname: sae.createdBy.firstname,
            lastname: sae.createdBy.lastname,
          },
        },
        createdAt: sae.createdAt,
        updatedAt: sae.updatedAt,
      };
    });

    let filtered = mapped;

    if (filters.status) {
      filtered = filtered.filter((sae) => sae.status === filters.status);
    }

    if (filters.isUrgent) {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      filtered = filtered.filter(
        (sae) => sae.dueDate >= now && sae.dueDate <= threeDaysFromNow,
      );
    }

    return { data: filtered, total: filtered.length };
  }

  async findArchives(year?: number): Promise<SaeArchiveResponse[]> {
    const saes = await this.prisma.sae.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        semester: {
          promotion: {
            academicYear: year ? year : { not: null },
          },
        },
      },
      include: {
        thematic: { select: { label: true } },
        semester: {
          include: { promotion: { select: { academicYear: true } } },
        },
        submissions: {
          where: { imageUrl: { not: null }, isPublic: true },
          take: 1,
          include: {
            student: { select: { firstname: true, lastname: true } },
          },
        },
      },
      orderBy: { semester: { promotion: { academicYear: 'desc' } } },
    });

    return saes.map((sae) => ({
      id: sae.id,
      title: sae.title,
      year: sae.semester.promotion.academicYear as number,
      thematic: sae.thematic.label,
      description: sae.description,
      imageUrl: sae.submissions[0]?.imageUrl,
      url: sae.submissions[0]?.url,
      name: sae.submissions[0]
        ? {
            firstname: sae.submissions[0].student.firstname,
            lastname: sae.submissions[0].student.lastname,
          }
        : undefined,
    }));
  }

  async findOne(
    id: string,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<SaeResponse> {
    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;
    const isStudent = requestingUserRole === UserRole.STUDENT;

    let studentPromotionId: string | undefined;
    let studentTdGroup: TdGroup | undefined;
    if (isStudent && requestingUserId) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: requestingUserId },
        select: {
          promotionId: true,
          group: { select: { name: true } },
        },
      });

      if (!profile) {
        throw new ForbiddenException(
          'Vous devez compléter votre onboarding pour accéder aux SAE',
        );
      }

      studentPromotionId = profile.promotionId;
      const resolvedTdGroup = deriveTdGroupFromGroupName(profile.group?.name);
      if (!resolvedTdGroup) {
        throw new ForbiddenException(
          'Impossible de déterminer votre groupe TD à partir de votre groupe',
        );
      }
      studentTdGroup = resolvedTdGroup;
    }

    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
        semester: { select: { promotionId: true } },
        submissions: isStudent
          ? { where: { studentId: requestingUserId }, select: { id: true } }
          : isTeacherOrAdmin
            ? { select: { id: true } }
            : false,
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");
    }

    if (isStudent && sae.semester.promotionId !== studentPromotionId) {
      throw new ForbiddenException(
        "Cette SAE n'appartient pas à votre promotion",
      );
    }

    if (isStudent && sae.tdGroup && sae.tdGroup !== studentTdGroup) {
      throw new ForbiddenException(
        "Cette SAE n'est pas destinée à votre groupe TD",
      );
    }

    const isHisPromotion =
      isStudent && sae.semester.promotionId === studentPromotionId;
    const status = computeSaeStatus(sae);

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent = status === 'ongoing' && sae.dueDate <= threeDaysFromNow;

    const studentCount = isTeacherOrAdmin
      ? await this.prisma.studentProfile.count({
          where: { promotionId: sae.semester.promotionId },
        })
      : undefined;

    return {
      id: sae.id,
      title: sae.title,
      banner: sae.banner.url,
      description: sae.description,
      instructions: sae.instructions,
      semesterId: sae.semesterId,
      tdGroup: sae.tdGroup,
      thematic: sae.thematic.label,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      isSubmitted: isHisPromotion ? sae.submissions.length > 0 : undefined,
      isUrgent,
      submissionCount: isTeacherOrAdmin ? sae.submissions.length : undefined,
      studentCount,
      status,
      createdBy: {
        id: sae.createdBy.id,
        email: sae.createdBy.email,
        name: {
          firstname: sae.createdBy.firstname,
          lastname: sae.createdBy.lastname,
        },
      },
      createdAt: sae.createdAt,
      updatedAt: sae.updatedAt,
    };
  }

  async create(
    dto: CreateSaeDto,
    requestingUser: JwtPayload,
  ): Promise<SaeResponse> {
    this.validateDates(dto.startDate, dto.dueDate);

    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
      select: { id: true, number: true },
    });
    if (!semester) throw new NotFoundException('Semestre non trouvé');

    if (this.isTdScopedSemester(semester.number) && !dto.tdGroup) {
      throw new BadRequestException(
        'Le champ tdGroup est obligatoire pour les semestres 4, 5 et 6',
      );
    }

    if (!this.isTdScopedSemester(semester.number) && dto.tdGroup) {
      throw new BadRequestException(
        'Le champ tdGroup est autorisé uniquement pour les semestres 4, 5 et 6',
      );
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      select: { id: true, role: true, isActive: true },
    });

    if (!teacher || !teacher.isActive) {
      throw new NotFoundException('Enseignant non trouvé ou inactif');
    }

    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException(
        "L'utilisateur assigné doit avoir le rôle TEACHER",
      );
    }

    const thematic = await this.prisma.thematic.findUnique({
      where: { id: dto.thematicId },
    });
    if (!thematic) throw new NotFoundException('Thématique non trouvée');

    const banner = await this.prisma.banner.findUnique({
      where: { id: dto.bannerId },
    });
    if (!banner) throw new NotFoundException('Bannière non trouvée');

    const sae = await this.prisma.sae.create({
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        semesterId: dto.semesterId,
        tdGroup: this.isTdScopedSemester(semester.number)
          ? (dto.tdGroup as TdGroup)
          : null,
        thematicId: dto.thematicId,
        bannerId: dto.bannerId,
        startDate: new Date(dto.startDate),
        dueDate: new Date(dto.dueDate),
        isPublished: dto.isPublished ?? false,
        createdById: dto.teacherId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
      },
    });

    const status = computeSaeStatus(sae);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent = status === 'ongoing' && sae.dueDate <= threeDaysFromNow;

    return {
      id: sae.id,
      title: sae.title,
      banner: sae.banner.url,
      description: sae.description,
      instructions: sae.instructions,
      semesterId: sae.semesterId,
      tdGroup: sae.tdGroup,
      thematic: sae.thematic.label,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      isUrgent,
      status,
      createdBy: {
        id: sae.createdBy.id,
        email: sae.createdBy.email,
        name: {
          firstname: sae.createdBy.firstname,
          lastname: sae.createdBy.lastname,
        },
      },
      createdAt: sae.createdAt,
      updatedAt: sae.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateSaeDto,
    requestingUser: JwtPayload,
  ): Promise<SaeResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    if (dto.startDate || dto.dueDate) {
      const startDate = dto.startDate ?? sae.startDate.toISOString();
      const dueDate = dto.dueDate ?? sae.dueDate.toISOString();
      this.validateDates(startDate, dueDate);
    }

    if (dto.thematicId) {
      const thematic = await this.prisma.thematic.findUnique({
        where: { id: dto.thematicId },
      });
      if (!thematic) throw new NotFoundException('Thématique non trouvée');
    }

    if (dto.bannerId) {
      const banner = await this.prisma.banner.findUnique({
        where: { id: dto.bannerId },
      });
      if (!banner) throw new NotFoundException('Bannière non trouvée');
    }

    let targetSemesterNumber: number | undefined;
    if (dto.semesterId) {
      const semester = await this.prisma.semester.findUnique({
        where: { id: dto.semesterId },
        select: { number: true },
      });
      if (!semester) throw new NotFoundException('Semestre non trouvé');
      targetSemesterNumber = semester.number;
    } else {
      const currentSemester = await this.prisma.semester.findUnique({
        where: { id: sae.semesterId },
        select: { number: true },
      });
      if (!currentSemester) throw new NotFoundException('Semestre non trouvé');
      targetSemesterNumber = currentSemester.number;
    }

    const targetIsTdScoped = this.isTdScopedSemester(targetSemesterNumber);
    const effectiveTdGroup = dto.tdGroup ?? sae.tdGroup ?? undefined;

    if (targetIsTdScoped && !effectiveTdGroup) {
      throw new BadRequestException(
        'Le champ tdGroup est obligatoire pour les semestres 4, 5 et 6',
      );
    }

    if (!targetIsTdScoped && dto.tdGroup) {
      throw new BadRequestException(
        'Le champ tdGroup est autorisé uniquement pour les semestres 4, 5 et 6',
      );
    }

    const updated = await this.prisma.sae.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        semesterId: dto.semesterId,
        tdGroup: targetIsTdScoped ? (effectiveTdGroup as TdGroup) : null,
        thematicId: dto.thematicId,
        bannerId: dto.bannerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        isPublished: dto.isPublished,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
      },
    });

    const status = computeSaeStatus(updated);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent =
      status === 'ongoing' && updated.dueDate <= threeDaysFromNow;

    return {
      id: updated.id,
      title: updated.title,
      banner: updated.banner.url,
      description: updated.description,
      instructions: updated.instructions,
      semesterId: updated.semesterId,
      tdGroup: updated.tdGroup,
      thematic: updated.thematic.label,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      isUrgent,
      status,
      createdBy: {
        id: updated.createdBy.id,
        email: updated.createdBy.email,
        name: {
          firstname: updated.createdBy.firstname,
          lastname: updated.createdBy.lastname,
        },
      },
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async publish(id: string, requestingUser: JwtPayload): Promise<SaeResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    if (sae.isPublished) throw new ConflictException('La SAE est déjà publiée');
    if (!sae.startDate || !sae.dueDate) {
      throw new BadRequestException(
        "La SAE doit avoir une date de début et une date de fin avant d'être publiée",
      );
    }

    const updated = await this.prisma.sae.update({
      where: { id },
      data: { isPublished: true },
      include: {
        createdBy: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
      },
    });

    const status = computeSaeStatus(updated);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent =
      status === 'ongoing' && updated.dueDate <= threeDaysFromNow;

    return {
      id: updated.id,
      title: updated.title,
      banner: updated.banner.url,
      description: updated.description,
      instructions: updated.instructions,
      semesterId: updated.semesterId,
      tdGroup: updated.tdGroup,
      thematic: updated.thematic.label,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      isUrgent,
      status,
      createdBy: {
        id: updated.createdBy.id,
        email: updated.createdBy.email,
        name: {
          firstname: updated.createdBy.firstname,
          lastname: updated.createdBy.lastname,
        },
      },
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, requestingUser: JwtPayload): Promise<void> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    await this.prisma.sae.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createInvitation(
    saeId: string,
    dto: CreateInvitationDto,
    requestingUser: JwtPayload,
  ): Promise<SaeInvitationResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Utilisateur non trouvé ou inactif');
    }

    if (targetUser.role !== UserRole.TEACHER) {
      throw new BadRequestException(
        'Seuls les enseignants peuvent être invités à une SAE',
      );
    }

    if (targetUser.id === requestingUser.sub) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous inviter vous-même',
      );
    }

    const existingInvitation = await this.prisma.saeInvitation.findUnique({
      where: { saeId_userId: { saeId, userId: dto.userId } },
    });

    if (existingInvitation) {
      throw new ConflictException('Cet enseignant est déjà invité à cette SAE');
    }

    const invitation = await this.prisma.saeInvitation.create({
      data: { saeId, userId: dto.userId },
    });

    return {
      id: invitation.id,
      saeId: invitation.saeId,
      userId: invitation.userId,
      name: {
        firstname: targetUser.firstname,
        lastname: targetUser.lastname,
      },
      createdAt: invitation.createdAt,
    };
  }

  async findInvitations(
    saeId: string,
    requestingUser: JwtPayload,
  ): Promise<SaeInvitationResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    const invitations = await this.prisma.saeInvitation.findMany({
      where: { saeId },
      include: { user: { select: { firstname: true, lastname: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      saeId: inv.saeId,
      userId: inv.userId,
      name: {
        firstname: inv.user.firstname,
        lastname: inv.user.lastname,
      },
      createdAt: inv.createdAt,
    }));
  }

  async removeInvitation(
    saeId: string,
    invitationId: string,
    requestingUser: JwtPayload,
  ): Promise<void> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: { createdById: true },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUser);

    const invitation = await this.prisma.saeInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.saeId !== saeId) {
      throw new NotFoundException('Invitation non trouvée pour cette SAE');
    }

    await this.prisma.saeInvitation.delete({
      where: { id: invitationId },
    });
  }

  private validateDates(startDate: string, dueDate: string): void {
    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      throw new BadRequestException('Format de date invalide');
    }

    if (due <= start) {
      throw new BadRequestException(
        'La date de fin doit être après la date de début',
      );
    }
  }

  private assertIsOwner(createdById: string, requestingUser: JwtPayload): void {
    const isAdmin = requestingUser.role === UserRole.ADMIN;
    const isOwner = createdById === requestingUser.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Action réservée aux administrateurs ou au propriétaire de la SAE',
      );
    }
  }

  private isTdScopedSemester(semesterNumber: number): boolean {
    return semesterNumber >= 4 && semesterNumber <= 6;
  }
}
