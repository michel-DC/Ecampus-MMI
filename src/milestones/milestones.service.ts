import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProgressDto } from './dto/create-progress.dto';
import { JwtPayload } from '../auth/types/auth.types';
import { UserRole } from '@prisma/client';
import { Prisma, SaeMilestone, MilestoneProgress } from '@prisma/client';
import {
  MilestoneResponse,
  MilestoneProgressResponse,
  SaeMilestoneListResponse,
  MySaeMilestonesProgressListResponse,
  SaeMilestoneStatsResponse,
  StudentMilestoneStat,
  MilestoneStat,
} from './types/milestone.types';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMilestone(
    saeId: string,
    dto: CreateMilestoneDto,
    requestingUser: JwtPayload,
  ): Promise<MilestoneResponse> {
    await this.verifySaeOwnershipOrAdmin(saeId, requestingUser);

    const milestone = await this.prisma.saeMilestone.create({
      data: {
        saeId,
        title: dto.title,
        description: dto.description,
        position: dto.position,
      },
    });

    return this.mapMilestoneToResponse(milestone);
  }

  async updateMilestone(
    milestoneId: string,
    dto: UpdateMilestoneDto,
    requestingUser: JwtPayload,
  ): Promise<MilestoneResponse> {
    const milestone = await this.getMilestoneWithSae(milestoneId);
    await this.verifySaeOwnershipOrAdmin(milestone.saeId, requestingUser);

    const updateData: Prisma.SaeMilestoneUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.position !== undefined) updateData.position = dto.position;

    const updatedMilestone = await this.prisma.saeMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return this.mapMilestoneToResponse(updatedMilestone);
  }

  async deleteMilestone(
    milestoneId: string,
    requestingUser: JwtPayload,
  ): Promise<void> {
    const milestone = await this.getMilestoneWithSae(milestoneId);
    await this.verifySaeOwnershipOrAdmin(milestone.saeId, requestingUser);

    await this.prisma.saeMilestone.delete({ where: { id: milestoneId } });
  }

  async getMilestonesForSae(
    saeId: string,
    requestingUser?: JwtPayload,
  ): Promise<MilestoneResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId },
      select: { isPublished: true, createdById: true },
    });

    if (!sae) {
      throw new NotFoundException('SAE non trouvée.');
    }

    const isOwner = requestingUser && sae.createdById === requestingUser.sub;
    const isAdmin = requestingUser && requestingUser.role === UserRole.ADMIN;
    const isTeacher =
      requestingUser && requestingUser.role === UserRole.TEACHER;

    if (!sae.isPublished && !(isOwner || isAdmin || isTeacher)) {
      throw new ForbiddenException(
        "Vous ne pouvez pas accéder aux paliers d'une SAE non publiée.",
      );
    }

    const milestones = await this.prisma.saeMilestone.findMany({
      where: { saeId },
      orderBy: { position: 'asc' },
    });

    return milestones.map((m: SaeMilestone) => this.mapMilestoneToResponse(m));
  }

  async getMilestoneById(
    milestoneId: string,
    requestingUser?: JwtPayload,
  ): Promise<MilestoneResponse> {
    const milestone = await this.getMilestoneWithSae(milestoneId);

    const isOwner =
      requestingUser && milestone.sae.createdById === requestingUser.sub;
    const isAdmin = requestingUser && requestingUser.role === UserRole.ADMIN;
    const isTeacher =
      requestingUser && requestingUser.role === UserRole.TEACHER;

    if (!milestone.sae.isPublished && !(isOwner || isAdmin || isTeacher)) {
      throw new ForbiddenException(
        "Vous ne pouvez pas accéder aux détails d'un palier d'une SAE non publiée.",
      );
    }
    return this.mapMilestoneToResponse(milestone);
  }

  async updateStudentProgress(
    milestoneId: string,
    studentId: string,
    dto: UpdateProgressDto,
    requestingUser: JwtPayload,
  ): Promise<MilestoneProgressResponse> {
    await this.verifyStudentOwnsProgress(
      milestoneId,
      studentId,
      requestingUser,
    );

    const reachedAtValue = dto.isReached ? new Date() : null;

    const progress = await this.prisma.milestoneProgress.upsert({
      where: { milestoneId_studentId: { milestoneId, studentId } },
      update: {
        isReached: dto.isReached,
        message: dto.message ?? '',
        reachedAt: reachedAtValue,
      },
      create: {
        milestoneId,
        studentId,
        isReached: dto.isReached,
        message: dto.message ?? '',
        reachedAt: reachedAtValue,
      },
    });

    return this.mapProgressToResponse(progress);
  }

  async getStudentProgressForMilestone(
    milestoneId: string,
    studentId: string,
    requestingUser: JwtPayload,
  ): Promise<MilestoneProgressResponse | null> {
    if (
      requestingUser.role === UserRole.STUDENT &&
      requestingUser.sub !== studentId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que votre propre progression.',
      );
    }
    await this.getMilestoneWithSae(milestoneId);

    const progress = await this.prisma.milestoneProgress.findUnique({
      where: { milestoneId_studentId: { milestoneId, studentId } },
    });

    return progress ? this.mapProgressToResponse(progress) : null;
  }

  async getStudentProgressForSae(
    saeId: string,
    requestingUser: JwtPayload,
  ): Promise<SaeMilestoneListResponse> {
    await this.verifySaeOwnershipOrAdmin(saeId, requestingUser);

    const milestones = await this.prisma.saeMilestone.findMany({
      where: { saeId },
      include: {
        progress: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return {
      milestones: milestones.map((m) => ({
        ...this.mapMilestoneToResponse(m),
        progresses: m.progress.map((p) => this.mapProgressToResponse(p)),
      })),
    };
  }

  async getMySaeProgress(
    saeId: string,
    requestingUser: JwtPayload,
  ): Promise<MySaeMilestonesProgressListResponse> {
    if (requestingUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent voir leur propre progression.',
      );
    }

    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId },
      select: { isPublished: true, createdById: true },
    });

    if (!sae) {
      throw new NotFoundException('SAE non trouvée.');
    }

    if (!sae.isPublished) {
      throw new ForbiddenException("Cette SAE n'est pas encore publiée.");
    }

    const milestones = await this.prisma.saeMilestone.findMany({
      where: { saeId },
      include: {
        progress: {
          where: { studentId: requestingUser.sub },
        },
      },
      orderBy: { position: 'asc' },
    });

    return {
      milestones: milestones.map((m) => ({
        milestone: this.mapMilestoneToResponse(m),
        progress:
          m.progress.length > 0
            ? this.mapProgressToResponse(m.progress[0])
            : null,
      })),
    };
  }

  async getSaeMilestoneStats(
    saeId: string,
    requestingUser: JwtPayload,
  ): Promise<SaeMilestoneStatsResponse> {
    await this.verifySaeOwnershipOrAdmin(saeId, requestingUser);

    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId },
      include: {
        semester: {
          select: { promotionId: true },
        },
        milestones: {
          select: { id: true, title: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!sae) {
      throw new NotFoundException('SAE non trouvée.');
    }

    const totalStudentsCount = await this.prisma.studentProfile.count({
      where: {
        promotionId: sae.semester.promotionId,
        isValidated: true,
      },
    });

    const milestonesCount = sae.milestones.length;

    const studentsInPromotion = await this.prisma.studentProfile.findMany({
      where: {
        promotionId: sae.semester.promotionId,
        isValidated: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    const progresses = await this.prisma.milestoneProgress.findMany({
      where: {
        milestone: { saeId },
        isReached: true,
      },
    });

    const studentsStats: StudentMilestoneStat[] = studentsInPromotion.map(
      (sp) => {
        const studentProgress = progresses.filter(
          (p) => p.studentId === sp.userId,
        );
        return {
          studentId: sp.userId,
          firstname: sp.user.firstname,
          lastname: sp.user.lastname,
          validatedCount: studentProgress.length,
        };
      },
    );

    const milestonesStats: MilestoneStat[] = sae.milestones.map((m) => {
      const validatedCount = progresses.filter(
        (p) => p.milestoneId === m.id,
      ).length;
      return {
        milestoneId: m.id,
        title: m.title,
        validatedCount,
        percentage:
          totalStudentsCount > 0
            ? parseFloat(
                ((validatedCount / totalStudentsCount) * 100).toFixed(2),
              )
            : 0,
      };
    });

    const totalValidatedByAll = studentsStats.reduce(
      (acc, curr) => acc + curr.validatedCount,
      0,
    );
    const averageValidated =
      totalStudentsCount > 0 ? totalValidatedByAll / totalStudentsCount : 0;
    const totalPotentialValidations = totalStudentsCount * milestonesCount;
    const completionRate =
      totalPotentialValidations > 0
        ? (totalValidatedByAll / totalPotentialValidations) * 100
        : 0;

    return {
      totalStudents: totalStudentsCount,
      milestonesCount,
      studentsStats,
      milestonesStats,
      globalProgress: {
        averageValidated: parseFloat(averageValidated.toFixed(2)),
        completionRate: parseFloat(completionRate.toFixed(2)),
      },
    };
  }

  private async getMilestoneWithSae(milestoneId: string) {
    const milestone = await this.prisma.saeMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        sae: {
          select: { isPublished: true, createdById: true },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException('Palier non trouvé.');
    }
    return milestone;
  }

  private async verifySaeOwnershipOrAdmin(
    saeId: string,
    requestingUser: JwtPayload,
  ) {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId },
      select: { createdById: true },
    });

    if (!sae) {
      throw new NotFoundException('SAE non trouvée.');
    }

    const isAdmin = requestingUser.role === UserRole.ADMIN;
    const isOwner = sae.createdById === requestingUser.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Action réservée au propriétaire de la SAE ou à un administrateur.',
      );
    }
    return sae;
  }

  private async verifyStudentOwnsProgress(
    milestoneId: string,
    studentId: string,
    requestingUser: JwtPayload,
  ) {
    if (requestingUser.sub !== studentId) {
      throw new ForbiddenException(
        'Vous ne pouvez mettre à jour que votre propre progression.',
      );
    }
    await this.getMilestoneWithSae(milestoneId);
  }

  private mapMilestoneToResponse(milestone: SaeMilestone): MilestoneResponse {
    return {
      id: milestone.id,
      saeId: milestone.saeId,
      title: milestone.title,
      description: milestone.description ?? undefined,
      position: milestone.position,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }

  private mapProgressToResponse(
    progress: MilestoneProgress,
  ): MilestoneProgressResponse {
    return {
      id: progress.id,
      milestoneId: progress.milestoneId,
      studentId: progress.studentId,
      message: progress.message,
      isReached: progress.isReached,
      reachedAt: progress.reachedAt ?? undefined,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };
  }
}
