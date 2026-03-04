import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateSaeDto } from './dto/create-sae.dto';
import { UpdateSaeDto } from './dto/update-sae.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SaeFiltersDto } from './dto/sae-filters.dto';
import {
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
    if (isStudent && requestingUserId) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: requestingUserId },
        select: { promotionId: true },
      });
      studentPromotionId = profile?.promotionId;
    }

    const saes = await this.prisma.sae.findMany({
      where: {
        deletedAt: null,
        semesterId: filters.semesterId,
        isPublished: isTeacherOrAdmin ? filters.isPublished : true,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
        semester: { select: { promotionId: true } },
        submissions: isStudent
          ? { where: { studentId: requestingUserId }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: SaeResponse[] = saes.map((sae) => {
      const isHisPromotion = isStudent && sae.semester.promotionId === studentPromotionId;
      const status = computeSaeStatus(sae);
      
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);
      const isUrgent = status === 'ongoing' && sae.dueDate <= threeDaysFromNow;

      return {
        id: sae.id,
        title: sae.title,
        banner: sae.banner,
        description: sae.description,
        instructions: sae.instructions,
        semesterId: sae.semesterId,
        thematic: sae.thematic,
        startDate: sae.startDate,
        dueDate: sae.dueDate,
        isPublished: sae.isPublished,
        isSubmitted: isHisPromotion ? sae.submissions.length > 0 : undefined,
        isUrgent,
        status,
        createdBy: sae.createdBy,
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
    if (isStudent && requestingUserId) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: requestingUserId },
        select: { promotionId: true },
      });
      studentPromotionId = profile?.promotionId;
    }

    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
        semester: { select: { promotionId: true } },
        submissions: isStudent
          ? { where: { studentId: requestingUserId }, select: { id: true } }
          : false,
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");
    }

    const isHisPromotion = isStudent && sae.semester.promotionId === studentPromotionId;
    const status = computeSaeStatus(sae);
    
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent = status === 'ongoing' && sae.dueDate <= threeDaysFromNow;

    return {
      id: sae.id,
      title: sae.title,
      banner: sae.banner,
      description: sae.description,
      instructions: sae.instructions,
      semesterId: sae.semesterId,
      thematic: sae.thematic,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      isSubmitted: isHisPromotion ? sae.submissions.length > 0 : undefined,
      isUrgent,
      status,
      createdBy: sae.createdBy,
      createdAt: sae.createdAt,
      updatedAt: sae.updatedAt,
    };
  }

  async create(dto: CreateSaeDto, createdById: string): Promise<SaeResponse> {
    this.validateDates(dto.startDate, dto.dueDate);

    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });
    if (!semester) throw new NotFoundException('Semestre non trouvé');

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
        thematicId: dto.thematicId,
        bannerId: dto.bannerId,
        startDate: new Date(dto.startDate),
        dueDate: new Date(dto.dueDate),
        isPublished: dto.isPublished ?? false,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
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
      banner: sae.banner,
      description: sae.description,
      instructions: sae.instructions,
      semesterId: sae.semesterId,
      thematic: sae.thematic,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      isUrgent,
      status,
      createdBy: sae.createdBy,
      createdAt: sae.createdAt,
      updatedAt: sae.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateSaeDto,
    requestingUserId: string,
  ): Promise<SaeResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUserId);

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

    const updated = await this.prisma.sae.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        semesterId: dto.semesterId,
        thematicId: dto.thematicId,
        bannerId: dto.bannerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        isPublished: dto.isPublished,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
      },
    });

    const status = computeSaeStatus(updated);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent = status === 'ongoing' && updated.dueDate <= threeDaysFromNow;

    return {
      id: updated.id,
      title: updated.title,
      banner: updated.banner,
      description: updated.description,
      instructions: updated.instructions,
      semesterId: updated.semesterId,
      thematic: updated.thematic,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      isUrgent,
      status,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async publish(id: string, requestingUserId: string): Promise<SaeResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUserId);

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
        createdBy: { select: { id: true, name: true, email: true } },
        thematic: { select: { id: true, code: true, label: true } },
        banner: { select: { id: true, url: true } },
      },
    });

    const status = computeSaeStatus(updated);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const isUrgent = status === 'ongoing' && updated.dueDate <= threeDaysFromNow;

    return {
      id: updated.id,
      title: updated.title,
      banner: updated.banner,
      description: updated.description,
      instructions: updated.instructions,
      semesterId: updated.semesterId,
      thematic: updated.thematic,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      isUrgent,
      status,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUserId);

    await this.prisma.sae.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createInvitation(
    saeId: string,
    dto: CreateInvitationDto,
    requestingUserId: string,
  ): Promise<SaeInvitationResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, name: true, role: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Utilisateur non trouvé ou inactif');
    }

    if (targetUser.role !== UserRole.TEACHER) {
      throw new BadRequestException(
        'Seuls les enseignants peuvent être invités à une SAE',
      );
    }

    if (targetUser.id === requestingUserId) {
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
      name: targetUser.name,
      createdAt: invitation.createdAt,
    };
  }

  async findInvitations(
    saeId: string,
    requestingUserId: string,
  ): Promise<SaeInvitationResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertIsOwner(sae.createdById, requestingUserId);

    const invitations = await this.prisma.saeInvitation.findMany({
      where: { saeId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      saeId: inv.saeId,
      userId: inv.userId,
      name: inv.user.name,
      createdAt: inv.createdAt,
    }));
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

  private assertIsOwner(createdById: string, requestingUserId: string): void {
    if (createdById !== requestingUserId) {
      throw new ForbiddenException(
        "Vous n'êtes pas le propriétaire de cette SAE",
      );
    }
  }
}
