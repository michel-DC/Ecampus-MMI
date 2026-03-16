# TASK-007 — Système de Notation des SAE (avec Workflow Excel)

## Objectif

Implémenter le système de notation des rendus étudiants. Ce module permet aux enseignants (propriétaires ou invités) de :
1. Créer des catégories de notes sur la plateforme.
2. Exporter un tableau Excel pré-rempli avec la liste des étudiants et les catégories.
3. Importer le fichier Excel rempli pour mettre à jour massivement les notes.
4. Saisir manuellement des notes si besoin.

**Contraintes métier :**
- Notation sur 20 uniquement.
- Gestion des catégories et saisie des notes déverrouillées UNIQUEMENT après la `dueDate`.
- Les notes d'un rendu sont consultables publiquement.

---

## Prérequis

- **TASK-001** à **TASK-004** complétées.
- Module `SaesModule` et `DocumentsModule` opérationnels.
- `PrismaModule` global.

---

## Périmètre

- [ ] Installation de `xlsx` (SheetJS).
- [ ] Schéma Prisma : modèles `GradeCategory` et `Grade`.
- [ ] Types et interfaces TypeScript.
- [ ] DTOs avec validation.
- [ ] Service Grades : logique d'export Excel, parsing/import et gestion manuelle.
- [ ] Contrôleur Grades : endpoints de gestion et de téléchargement de fichiers.
- [ ] Module + enregistrement dans AppModule.

---

## Étape 1 — Installation et Schéma Prisma

```bash
pnpm add xlsx
```

Ajouter les modèles dans `prisma/schema.prisma` :

```prisma
model GradeCategory {
  id    String @id @default(uuid())
  saeId String
  name  String

  sae    Sae     @relation(fields: [saeId], references: [id], onDelete: Cascade)
  grades Grade[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([saeId])
}

model Grade {
  id           String @id @default(uuid())
  categoryId   String
  submissionId String
  value        Float

  category   GradeCategory     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  submission StudentSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([categoryId, submissionId])
  @@index([submissionId])
}
```

Mettre à jour le modèle `Sae` :

```prisma
model Sae {
  id          String   @id @default(uuid())
  title       String
  bannerId    String
  description String   @db.Text
  instructions String? @db.Text
  semesterId  String
  thematicId  String
  createdById String
  startDate   DateTime
  dueDate     DateTime
  isPublished Boolean  @default(false)

  semester      Semester        @relation(fields: [semesterId], references: [id])
  thematic      Thematic        @relation(fields: [thematicId], references: [id])
  banner        Banner          @relation(fields: [bannerId], references: [id])
  createdBy     user            @relation(fields: [createdById], references: [id])
  invitations   SaeInvitation[]
  announcements Announcement[]
  documents     SaeDocument[]
  submissions   StudentSubmission[]
  gradeCategories GradeCategory[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([semesterId])
  @@index([thematicId])
  @@index([bannerId])
  @@index([isPublished])
  @@index([dueDate])
}
```

Mettre à jour le modèle `StudentSubmission` :

```prisma
model StudentSubmission {
  id          String   @id @default(uuid())
  saeId       String
  studentId   String
  url         String
  name        String
  mimeType    String
  description String   @db.Text
  imageUrl    String?
  isPublic    Boolean  @default(false)
  submittedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sae     Sae     @relation(fields: [saeId], references: [id], onDelete: Cascade)
  student user    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  grades  Grade[]

  @@unique([saeId, studentId])
  @@index([saeId])
}
```

```bash
npx prisma migrate dev --name add-sae-grading
npx prisma generate
```

---

## Étape 2 — Types et interfaces

### `src/grades/types/grade.types.ts`

```typescript
export interface GradeCategoryResponse {
  id: string;
  saeId: string;
  name: string;
}

export interface GradeResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  value: number;
}

export interface SubmissionGradesResponse {
  submissionId: string;
  saeTitle?: string;
  studentName: { firstname: string; lastname: string | null };
  grades: GradeResponse[];
  average: number;
}

export interface MyGradesResponse {
  data: SubmissionGradesResponse[];
  globalAverage: number;
}
```

---

## Étape 3 — DTOs

### `src/grades/dto/create-category.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator';

export class CreateGradeCategoryDto {
  @IsString()
  @MinLength(2)
  name: string;
}
```

### `src/grades/dto/set-grade.dto.ts`

```typescript
import { IsNumber, Max, Min, IsUUID } from 'class-validator';

export class SetGradeDto {
  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Min(0)
  @Max(20)
  value: number;
}
```

---

## Étape 4 — Service

### `src/grades/grades.service.ts`

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
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
    const operations = [];

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

    await this.prisma.$transaction(operations);
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
```

---

## Étape 5 — Contrôleur

### `src/grades/grades.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/auth.types';
import { GradesService } from './grades.service';
import { CreateGradeCategoryDto } from './dto/create-category.dto';
import { SetGradeDto } from './dto/set-grade.dto';

@Controller('api')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('saes/:saeId/grade-categories')
  findCategories(@Param('saeId') saeId: string) {
    return this.gradesService.findCategories(saeId);
  }

  @Post('saes/:saeId/grade-categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createCategory(
    @Param('saeId') saeId: string,
    @Body() dto: CreateGradeCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.createCategory(saeId, dto, user.sub);
  }

  @Get('saes/:saeId/grades/export')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async exportGrades(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.gradesService.exportGradesToExcel(saeId, user.sub);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="notes-sae-${saeId}.xlsx"`,
    });
    res.end(buffer);
  }

  @Post('saes/:saeId/grades/import')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importGrades(
    @Param('saeId') saeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Fichier Excel requis');
    await this.gradesService.importGradesFromExcel(saeId, file.buffer, user.sub);
    return { message: 'Notes importées avec succès' };
  }

  @Post('submissions/:submissionId/grades')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  setGrades(
    @Param('submissionId') submissionId: string,
    @Body() body: { grades: SetGradeDto[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.setSubmissionGrades(submissionId, body.grades, user.sub);
  }

  @Get('submissions/:submissionId/grades')
  findSubmissionGrades(@Param('submissionId') submissionId: string) {
    return this.gradesService.findSubmissionGrades(submissionId);
  }

  @Get('grades/me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyGrades(@CurrentUser() user: JwtPayload) {
    return this.gradesService.findMyGrades(user.sub);
  }
}
```

---

## Étape 6 — Module et Enregistrement

### `src/grades/grades.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';

@Module({
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
```

---

## Récapitulatif des endpoints

| Méthode | Route                           | Rôle          | Description                                |
| ------- | ------------------------------- | ------------- | ------------------------------------------ |
| GET     | `/api/saes/:id/grade-categories`| Tous          | Lister les catégories                      |
| POST    | `/api/saes/:id/grade-categories`| Prof (Owner+) | Créer une catégorie (si SAE finie)         |
| GET     | `/api/saes/:id/grades/export`   | Prof (Owner+) | Télécharger le fichier Excel de notation   |
| POST    | `/api/saes/:id/grades/import`   | Prof (Owner+) | Uploader le fichier Excel rempli           |
| POST    | `/api/submissions/:id/grades`   | Prof (Owner+) | Saisir manuellement des notes (si SAE finie)|
| GET     | `/api/submissions/:id/grades`   | Public        | Voir les notes d'un rendu                  |
| GET     | `/api/grades/me`                | Étudiant      | Voir sa synthèse de notes                  |

---

## Checklist de validation

- [ ] L'export Excel contient bien une ligne masquée avec les IDs de catégories.
- [ ] La colonne des IDs de rendu est bien masquée dans Excel.
- [ ] L'import rejette un fichier avec des notes textuelles ou hors plage 0-20.
- [ ] L'import met à jour les notes existantes sans créer de doublons (upsert).
- [ ] L'export/Import est strictement interdit AVANT la `dueDate`.
- [ ] Les IDs masqués garantissent qu'on ne se trompe pas d'étudiant.
- [ ] Aucun `any` dans le code TypeScript (sauf lecture Excel brute).
- [ ] Aucun commentaire dans le code.
