import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
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
      select: { dueDate: true, createdById: true, invitations: { select: { userId: true } } },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(sae.createdById, sae.invitations, requestingUserId);

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

  async exportGradesToExcel(saeId: string, requestingUserId: string): Promise<Buffer> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      include: {
        gradeCategories: { orderBy: { createdAt: 'asc' } },
        submissions: {
          include: {
            student: { select: { firstname: true, lastname: true, email: true } },
            grades: true,
          },
        },
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(sae.createdById, sae.invitations, requestingUserId);

    if (new Date() <= sae.dueDate) {
      throw new BadRequestException("L'export n'est possible qu'une fois la SAE terminée");
    }

    const categories = sae.gradeCategories;
    const submissions = sae.submissions;

    const row1 = ['', '', '', ...categories.map((c) => c.id)];
    const row2 = ['ID Rendu', 'Étudiant', 'Email', ...categories.map((c) => c.name)];
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
      select: { dueDate: true, createdById: true, invitations: { select: { userId: true } } },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    this.assertCanManageGrades(sae.createdById, sae.invitations, requestingUserId);

    if (new Date() <= sae.dueDate) {
      throw new BadRequestException("L'import n'est possible qu'une fois la SAE terminée");
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const categoryIds = jsonData[0].slice(3);
    const gradeDataRows = jsonData.slice(2);
    const operations: Prisma.PrismaPromise<any>[] = [];

    for (const row of gradeDataRows) {
      const submissionId = row[0];
      if (!submissionId) continue;

      categoryIds.forEach((categoryId, index) => {
        const rawValue = row[index + 3];
        if (rawValue === undefined || rawValue === '') return;

        const value = parseFloat(rawValue);
        if (isNaN(value) || value < 0 || value > 20) {
          throw new BadRequestException(`Note invalide : ${rawValue}. Doit être entre 0 et 20.`);
        }

        operations.push(
          this.prisma.grade.upsert({
            where: { categoryId_submissionId: { categoryId, submissionId } },
            create: { categoryId, submissionId, value },
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
        sae: { select: { dueDate: true, createdById: true, invitations: { select: { userId: true } } } },
      },
    });

    if (!submission) throw new NotFoundException('Rendu non trouvé');
    this.assertCanManageGrades(submission.sae.createdById, submission.sae.invitations, requestingUserId);

    if (new Date() <= submission.sae.dueDate) {
      throw new BadRequestException("La notation n'est possible qu'une fois la SAE terminée");
    }

    await this.prisma.$transaction(
      grades.map((g) =>
        this.prisma.grade.upsert({
          where: { categoryId_submissionId: { categoryId: g.categoryId, submissionId } },
          create: { categoryId: g.categoryId, submissionId, value: g.value },
          update: { value: g.value },
        }),
      ),
    );

    return this.findSubmissionGrades(submissionId);
  }

  async findSubmissionGrades(submissionId: string): Promise<SubmissionGradesResponse> {
    const submission = await this.prisma.studentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { firstname: true, lastname: true } },
        grades: { include: { category: { select: { name: true } } } },
      },
    });

    if (!submission) throw new NotFoundException('Rendu non trouvé');

    const mappedGrades = submission.grades.map((g) => ({
      id: g.id,
      categoryId: g.categoryId,
      categoryName: g.category.name,
      value: g.value,
    }));

    const average = mappedGrades.length > 0
      ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) / mappedGrades.length
      : 0;

    return {
      submissionId: submission.id,
      studentName: { firstname: submission.student.firstname, lastname: submission.student.lastname },
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

      const average = mappedGrades.length > 0
        ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) / mappedGrades.length
        : 0;

      return {
        submissionId: s.id,
        saeTitle: s.sae.title,
        studentName: { firstname: s.student.firstname, lastname: s.student.lastname },
        grades: mappedGrades,
        average: parseFloat(average.toFixed(2)),
      };
    });

    const globalAverage = data.length > 0
      ? data.reduce((acc, curr) => acc + curr.average, 0) / data.length
      : 0;

    return { data, globalAverage: parseFloat(globalAverage.toFixed(2)) };
  }

  async findAllSaeGrades(saeId: string): Promise<SubmissionGradesResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: { isPublished: true },
    });

    if (!sae) throw new NotFoundException('SAE non trouvée');
    if (!sae.isPublished) throw new ForbiddenException("Cette SAE n'est pas encore publiée");

    const submissions = await this.prisma.studentSubmission.findMany({
      where: { saeId },
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

      const average = mappedGrades.length > 0
        ? mappedGrades.reduce((acc, curr) => acc + curr.value, 0) / mappedGrades.length
        : 0;

      return {
        submissionId: s.id,
        studentName: { firstname: s.student.firstname, lastname: s.student.lastname },
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
    const isInvited = invitations.some((inv) => inv.userId === requestingUserId);

    if (!isOwner && !isInvited) {
      throw new ForbiddenException("Droit de gestion des notes refusé");
    }
  }
}
