import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  AnnouncementListResponse,
  AnnouncementResponse,
} from './types/announcement.types';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySae(
    saeId: string,
    requestingUserRole?: UserRole,
  ): Promise<AnnouncementListResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: { isPublished: true },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException('Cette SAE n\'est pas encore publiée');
    }

    const announcements = await this.prisma.announcement.findMany({
      where: { saeId },
      orderBy: { createdAt: 'desc' },
    });

    const data: AnnouncementResponse[] = announcements.map((a) => ({
      id: a.id,
      saeId: a.saeId,
      title: a.title,
      content: a.content,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return { data, total: data.length };
  }

  async findOne(
    id: string,
    requestingUserRole?: UserRole,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        sae: { select: { isPublished: true, deletedAt: true } },
      },
    });

    if (!announcement || announcement.sae.deletedAt) {
      throw new NotFoundException('Annonce non trouvée');
    }

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    if (!announcement.sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException('Cette SAE n\'est pas encore publiée');
    }

    return {
      id: announcement.id,
      saeId: announcement.saeId,
      title: announcement.title,
      content: announcement.content,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }

  async create(
    saeId: string,
    dto: CreateAnnouncementDto,
    requestingUserId: string,
  ): Promise<AnnouncementResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        id: true,
        createdById: true,
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    this.assertCanWriteOnSae(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    const announcement = await this.prisma.announcement.create({
      data: {
        saeId,
        title: dto.title,
        content: dto.content,
        createdById: requestingUserId,
      },
    });

    return {
      id: announcement.id,
      saeId: announcement.saeId,
      title: announcement.title,
      content: announcement.content,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
    requestingUserId: string,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        sae: {
          select: {
            createdById: true,
            deletedAt: true,
            invitations: { select: { userId: true } },
          },
        },
      },
    });

    if (!announcement || announcement.sae.deletedAt) {
      throw new NotFoundException('Annonce non trouvée');
    }

    this.assertCanWriteOnSae(
      announcement.sae.createdById,
      announcement.sae.invitations,
      requestingUserId,
    );

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
      },
    });

    return {
      id: updated.id,
      saeId: updated.saeId,
      title: updated.title,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        sae: {
          select: {
            createdById: true,
            deletedAt: true,
            invitations: { select: { userId: true } },
          },
        },
      },
    });

    if (!announcement || announcement.sae.deletedAt) {
      throw new NotFoundException('Annonce non trouvée');
    }

    this.assertCanWriteOnSae(
      announcement.sae.createdById,
      announcement.sae.invitations,
      requestingUserId,
    );

    await this.prisma.announcement.delete({ where: { id } });
  }

  private assertCanWriteOnSae(
    createdById: string,
    invitations: { userId: string }[],
    requestingUserId: string,
  ): void {
    const isOwner = createdById === requestingUserId;
    const isInvited = invitations.some(
      (inv) => inv.userId === requestingUserId,
    );

    if (!isOwner && !isInvited) {
      throw new ForbiddenException('Vous n\'avez pas les droits d\'écriture sur cette SAE');
    }
  }
}
