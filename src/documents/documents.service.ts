import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { computeSaeStatus } from '../saes/types/sae.types';
import { CreateSaeDocumentDto } from './dto/create-sae-document.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import {
  SaeDocumentResponse,
  StudentSubmissionResponse,
} from './types/document.types';

const SAE_DOCUMENT_LIMIT = 3;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findSaeDocuments(
    saeId: string,
    requestingUserRole?: UserRole,
  ): Promise<SaeDocumentResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: { isPublished: true },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");
    }

    const documents = await this.prisma.saeDocument.findMany({
      where: { saeId },
      orderBy: { createdAt: 'asc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      saeId: doc.saeId,
      url: doc.url,
      name: doc.name,
      mimeType: doc.mimeType,
      type: doc.type,
      createdAt: doc.createdAt,
    }));
  }

  async addSaeDocument(
    saeId: string,
    dto: CreateSaeDocumentDto,
    requestingUserId: string,
  ): Promise<SaeDocumentResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        createdById: true,
        invitations: { select: { userId: true } },
        _count: { select: { documents: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    this.assertCanWriteOnSae(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    if (sae._count.documents >= SAE_DOCUMENT_LIMIT) {
      throw new BadRequestException(
        `Une SAE ne peut pas avoir plus de ${SAE_DOCUMENT_LIMIT} documents`,
      );
    }

    const document = await this.prisma.saeDocument.create({
      data: {
        saeId,
        url: dto.url,
        name: dto.name,
        mimeType: dto.mimeType,
        type: dto.type,
      },
    });

    return {
      id: document.id,
      saeId: document.saeId,
      url: document.url,
      name: document.name,
      mimeType: document.mimeType,
      type: document.type,
      createdAt: document.createdAt,
    };
  }

  async removeSaeDocument(id: string, requestingUserId: string): Promise<void> {
    const document = await this.prisma.saeDocument.findUnique({
      where: { id },
      include: {
        sae: {
          select: {
            deletedAt: true,
            createdById: true,
            invitations: { select: { userId: true } },
          },
        },
      },
    });

    if (!document || document.sae.deletedAt) {
      throw new NotFoundException('Document non trouvé');
    }

    this.assertCanWriteOnSae(
      document.sae.createdById,
      document.sae.invitations,
      requestingUserId,
    );

    await this.prisma.saeDocument.delete({ where: { id } });
  }

  async submitDocument(
    saeId: string,
    dto: CreateSubmissionDto,
    studentId: string,
  ): Promise<StudentSubmissionResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      include: {
        semester: { select: { promotionId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    if (!sae.isPublished)
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");

    const status = computeSaeStatus(sae);
    if (status !== 'ongoing') {
      throw new BadRequestException(
        'Les rendus ne sont autorisés que lorsque la SAE est en cours',
      );
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { promotionId: true },
    });

    if (!studentProfile) {
      throw new ForbiddenException('Profil étudiant non trouvé');
    }

    if (sae.semester.promotionId !== studentProfile.promotionId) {
      throw new ForbiddenException(
        "Cette SAE n'appartient pas à votre promotion",
      );
    }

    const submission = await this.prisma.studentSubmission.upsert({
      where: { saeId_studentId: { saeId, studentId } },
      create: {
        saeId,
        studentId,
        url: dto.url,
        name: dto.fileName,
        mimeType: dto.mimeType,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic ?? false,
      },
      update: {
        url: dto.url,
        name: dto.fileName,
        mimeType: dto.mimeType,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic,
        submittedAt: new Date(),
      },
      include: {
        student: { select: { firstname: true, lastname: true } },
      },
    });

    return {
      id: submission.id,
      saeId: submission.saeId,
      name: {
        firstname: submission.student.firstname,
        lastname: submission.student.lastname,
      },
      url: submission.url,
      fileName: submission.name,
      mimeType: submission.mimeType,
      description: submission.description,
      imageUrl: submission.imageUrl,
      isPublic: submission.isPublic,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    };
  }

  async findMySubmission(
    saeId: string,
    studentId: string,
  ): Promise<StudentSubmissionResponse> {
    const submission = await this.prisma.studentSubmission.findUnique({
      where: { saeId_studentId: { saeId, studentId } },
      include: {
        student: { select: { firstname: true, lastname: true } },
      },
    });

    if (!submission)
      throw new NotFoundException('Aucun rendu trouvé pour cette SAE');

    return {
      id: submission.id,
      saeId: submission.saeId,
      name: {
        firstname: submission.student.firstname,
        lastname: submission.student.lastname,
      },
      url: submission.url,
      fileName: submission.name,
      mimeType: submission.mimeType,
      description: submission.description,
      imageUrl: submission.imageUrl,
      isPublic: submission.isPublic,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    };
  }

  async findAllSubmissions(
    saeId: string,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<StudentSubmissionResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        isPublished: true,
        createdById: true,
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');

    const isAdmin = requestingUserRole === UserRole.ADMIN;
    const isOwner = sae.createdById === requestingUserId;
    const isInvited = sae.invitations.some(
      (inv) => inv.userId === requestingUserId,
    );

    const canSeePrivateSubmissions = isAdmin || isOwner || isInvited;

    if (!sae.isPublished && !canSeePrivateSubmissions) {
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");
    }

    const submissions = await this.prisma.studentSubmission.findMany({
      where: {
        saeId,
        OR: canSeePrivateSubmissions
          ? undefined
          : [{ isPublic: true }, { studentId: requestingUserId || 'NONE' }],
      },
      include: {
        student: { select: { firstname: true, lastname: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((s) => ({
      id: s.id,
      saeId: s.saeId,
      name: {
        firstname: s.student.firstname,
        lastname: s.student.lastname,
      },
      url: s.url,
      fileName: s.name,
      mimeType: s.mimeType,
      description: s.description,
      imageUrl: s.imageUrl,
      isPublic: s.isPublic,
      submittedAt: s.submittedAt,
      updatedAt: s.updatedAt,
    }));
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
      throw new ForbiddenException(
        "Vous n'avez pas les droits d'écriture sur cette SAE",
      );
    }
  }
}
