import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { Prisma, UserRole } from '@prisma/client';
import {
  GradeCategoryResponse,
  MyGradesResponse,
  SubmissionGradesResponse,
} from './types/grade.types';
import { CreateGradeCategoryDto } from './dto/create-category.dto';
import { SetGradeDto } from './dto/set-grade.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(
    saeId: string,
    dto: CreateGradeCategoryDto,
    requestingUserId: string,
  ): Promise<GradeCategoryResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        dueDate: true,
        createdById: true,
        invitations: {
          select: { userId: true },
        },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    if (new Date() <= sae.dueDate) {
      throw new BadRequestException(
        "La gestion des catégories n'est possible qu'une fois la SAE terminée",
      );
    }

    const category = await this.prisma.gradeCategory.create({
      data: { saeId, name: dto.name },
    });

    return { id: category.id, saeId: category.saeId, name: category.name };
  }

  async findCategories(saeId: string): Promise<GradeCategoryResponse[]> {
    return this.prisma.gradeCategory.findMany({
      where: { saeId },
      select: { id: true, saeId: true, name: true },
    });
  }

  async exportGradesToExcel(
    saeId: string,
    requestingUserId: string,
  ): Promise<Buffer> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      include: {
        gradeCategories: { orderBy: { createdAt: 'asc' } },
        submissions: {
          include: {
            student: {
              select: { firstname: true, lastname: true, email: true },
            },
            grades: true,
          },
        },
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    if (new Date() <= sae.dueDate) {
      throw new BadRequestException(
        "L'export n'est possible qu'une fois la SAE terminée",
      );
    }

    const categories = sae.gradeCategories;
    const submissions = sae.submissions;

    const row1 = ['METADATA_IDS', '', '', ...categories.map((c) => c.id)];
    const row2 = [
      'ID Rendu',
      'Étudiant',
      'Email',
      ...categories.map((c) => c.name),
    ];
    const data = [row1, row2];

    submissions.forEach((sub) => {
      const studentName = `${sub.student.firstname} ${sub.student.lastname || ''}`;
      const row = [sub.id, studentName, sub.student.email];
      categories.forEach((cat) => {
        const grade = sub.grades.find((g) => g.categoryId === cat.id);
        row.push(grade ? grade.value.toString() : '');
      });
      data.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!rows'] = [{ hidden: true }];
    worksheet['!cols'] = [{ hidden: true }, { wch: 30 }, { wch: 30 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notation');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async importGradesFromExcel(
    saeId: string,
    fileBuffer: Buffer,
    requestingUserId: string,
  ): Promise<void> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        dueDate: true,
        createdById: true,
        invitations: { select: { userId: true } },
        gradeCategories: { select: { id: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    if (new Date() <= sae.dueDate) {
      throw new BadRequestException(
        "L'import n'est possible qu'une fois la SAE terminée",
      );
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as any[][];

    if (jsonData.length < 3 || jsonData[0][0] !== 'METADATA_IDS') {
      throw new BadRequestException(
        'Format de fichier invalide ou ligne de métadonnées manquante',
      );
    }

    const categoryIdsFromExcel = jsonData[0].slice(3) as string[];
    const validCategoryIds = sae.gradeCategories.map((c) => c.id);

    const gradeDataRows = jsonData.slice(2);
    const operations: Prisma.PrismaPromise<any>[] = [];

    const existingSubmissions = await this.prisma.studentSubmission.findMany({
      where: { saeId },
      select: { id: true },
    });
    const validSubmissionIds = new Set(existingSubmissions.map((s) => s.id));

    for (const row of gradeDataRows) {
      const submissionId = row[0] as string;
      if (!submissionId || !validSubmissionIds.has(submissionId)) continue;

      categoryIdsFromExcel.forEach((categoryId, index) => {
        if (!validCategoryIds.includes(categoryId)) return;

        const rawValue = row[index + 3];
        if (rawValue === undefined || rawValue === '') return;

        const value = parseFloat(rawValue as string);
        if (isNaN(value) || value < 0 || value > 20) {
          throw new BadRequestException(
            `Note invalide : ${rawValue}. Doit être entre 0 et 20.`,
          );
        }

        operations.push(
          this.prisma.grade.upsert({
            where: { categoryId_submissionId: { categoryId, submissionId } },
            create: {
              categoryId,
              submissionId,
              value,
            },
            update: { value },
          }),
        );
      });
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  async setSubmissionGrades(
    submissionId: string,
    grades: SetGradeDto[],
    requestingUserId: string,
  ): Promise<SubmissionGradesResponse> {
    const submission = await this.prisma.studentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        sae: {
          select: {
            id: true,
            dueDate: true,
            createdById: true,
            invitations: { select: { userId: true } },
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Rendu non trouvé');
    this.assertCanManageGrades(
      submission.sae.createdById,
      submission.sae.invitations,
      requestingUserId,
    );

    if (new Date() <= submission.sae.dueDate) {
      throw new BadRequestException(
        "La notation n'est possible qu'une fois la SAE terminée",
      );
    }

    const validCategories = await this.prisma.gradeCategory.findMany({
      where: { saeId: submission.saeId },
      select: { id: true },
    });
    const validIds = validCategories.map((c) => c.id);

    const operations = grades
      .filter((g) => validIds.includes(g.categoryId))
      .map((g) =>
        this.prisma.grade.upsert({
          where: {
            categoryId_submissionId: { categoryId: g.categoryId, submissionId },
          },
          create: { categoryId: g.categoryId, submissionId, value: g.value },
          update: { value: g.value },
        }),
      );

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    return this.findSubmissionGrades(
      submissionId,
      requestingUserId,
      UserRole.TEACHER,
    );
  }

  async findSubmissionGrades(
    submissionId: string,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<SubmissionGradesResponse> {
    const submission = await this.prisma.studentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, firstname: true, lastname: true } },
        grades: { include: { category: { select: { name: true } } } },
        sae: {
          select: {
            createdById: true,
            invitations: { select: { userId: true } },
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Rendu non trouvé');

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.ADMIN ||
      submission.sae.createdById === requestingUserId ||
      submission.sae.invitations.some((inv) => inv.userId === requestingUserId);

    const isOwner = submission.student.id === requestingUserId;

    if (!submission.isPublic && !isTeacherOrAdmin && !isOwner) {
      throw new ForbiddenException(
        "Ce rendu est privé. Seuls les enseignants ou l'auteur peuvent voir les notes.",
      );
    }

    const mappedGrades = submission.grades.map((g) => ({
      id: g.id,
      categoryId: g.categoryId,
      categoryName: g.category.name,
      value: g.value,
    }));

    const average =
      mappedGrades.length > 0
        ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) /
          mappedGrades.length
        : 0;

    return {
      submissionId: submission.id,
      studentName: {
        firstname: submission.student.firstname,
        lastname: submission.student.lastname,
      },
      grades: mappedGrades,
      average: parseFloat(average.toFixed(2)),
    };
  }

  async findMyGrades(studentId: string): Promise<MyGradesResponse> {
    const submissions = await this.prisma.studentSubmission.findMany({
      where: { studentId },
      include: {
        sae: { select: { title: true } },
        student: { select: { firstname: true, lastname: true } },
        grades: { include: { category: { select: { name: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const data = submissions.map((s) => {
      const mappedGrades = s.grades.map((g) => ({
        id: g.id,
        categoryId: g.categoryId,
        categoryName: g.category.name,
        value: g.value,
      }));

      const average =
        mappedGrades.length > 0
          ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) /
            mappedGrades.length
          : 0;

      return {
        submissionId: s.id,
        saeTitle: s.sae.title,
        studentName: {
          firstname: s.student.firstname,
          lastname: s.student.lastname,
        },
        grades: mappedGrades,
        average: parseFloat(average.toFixed(2)),
      };
    });

    const globalAverage =
      data.length > 0
        ? data.reduce((acc, curr) => acc + curr.average, 0) / data.length
        : 0;

    return { data, globalAverage: parseFloat(globalAverage.toFixed(2)) };
  }

  async findAllSaeGrades(
    saeId: string,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<SubmissionGradesResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        isPublished: true,
        createdById: true,
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    if (!sae.isPublished)
      throw new ForbiddenException("Cette SAE n'est pas encore publiée");

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.ADMIN ||
      sae.createdById === requestingUserId ||
      sae.invitations.some((inv) => inv.userId === requestingUserId);

    const submissions = await this.prisma.studentSubmission.findMany({
      where: {
        saeId,
        OR: isTeacherOrAdmin
          ? undefined
          : [{ isPublic: true }, { studentId: requestingUserId || 'NONE' }],
      },
      include: {
        student: { select: { firstname: true, lastname: true } },
        grades: { include: { category: { select: { name: true } } } },
      },
      orderBy: { student: { lastname: 'asc' } },
    });

    return submissions.map((s) => {
      const mappedGrades = s.grades.map((g) => ({
        id: g.id,
        categoryId: g.categoryId,
        categoryName: g.category.name,
        value: g.value,
      }));

      const average =
        mappedGrades.length > 0
          ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) /
            mappedGrades.length
          : 0;

      return {
        submissionId: s.id,
        studentName: {
          firstname: s.student.firstname,
          lastname: s.student.lastname,
        },
        grades: mappedGrades,
        average: parseFloat(average.toFixed(2)),
      };
    });
  }

  private assertCanManageGrades(
    createdById: string,
    invitations: { userId: string }[],
    requestingUserId: string,
  ): void {
    const isOwner = createdById === requestingUserId;
    const isInvited = invitations.some(
      (inv) => inv.userId === requestingUserId,
    );

    if (!isOwner && !isInvited) {
      throw new ForbiddenException('Droit de gestion des notes refusé');
    }
  }
}
