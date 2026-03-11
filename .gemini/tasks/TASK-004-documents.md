# TASK-004 — Module Documents (Ressources SAE + Rendus étudiants)

## Objectif

Implémenter le module de gestion des documents. Il couvre deux responsabilités distinctes :

- **Documents SAE** : fichiers ajoutés par les enseignants sur une SAE (sujet, exemple, ressource) — maximum 3 par SAE
- **Rendus étudiants** : fichier soumis par un étudiant sur une SAE de sa promotion — un seul rendu par étudiant par SAE, écrasable

Le stockage des fichiers est délégué à **UploadThing**. Le backend ne stocke que les métadonnées retournées par UploadThing (URL, nom, type MIME).

---

## Prérequis

- **TASK-001** complétée (Auth + Guards)
- **TASK-002** complétée (module SAE avec `computeSaeStatus` disponible)
- `PrismaModule` global
- Clé API UploadThing disponible en variable d'environnement

---

## Périmètre

- [ ] Installation d'UploadThing
- [ ] Variables d'environnement
- [ ] Schéma Prisma (SaeDocument + StudentSubmission)
- [ ] Types et interfaces
- [ ] DTOs avec validation
- [ ] Service Documents
- [ ] Contrôleur Documents
- [ ] Module + enregistrement dans AppModule

---

## Étape 1 — Installation d'UploadThing

```bash
npm install uploadthing
```

---

## Étape 2 — Variables d'environnement

Ajouter dans `.env` :

```env
UPLOADTHING_TOKEN="votre_token_uploadthing"
```

---

## Étape 3 — Génération via NestJS CLI

```bash
nest generate resource documents --no-spec
```

Choisir **REST API** et **non** pour le CRUD automatique.

Cette commande génère :

```
src/documents/
├── documents.module.ts
├── documents.controller.ts
└── documents.service.ts
```

Créer manuellement les sous-dossiers :

```
src/documents/
├── documents.module.ts
├── documents.controller.ts
├── documents.service.ts
├── dto/
│   ├── create-sae-document.dto.ts
│   └── create-submission.dto.ts
└── types/
    └── document.types.ts
```

---

## Étape 4 — Schéma Prisma

Ajouter les deux modèles dans `prisma/schema.prisma` et la relation inverse dans `Sae` :

```prisma
enum DocumentType {
  INSTRUCTION
  RESOURCE
  EXAMPLE
}

model SaeDocument {
  id       String       @id @default(uuid())
  saeId    String
  url      String
  name     String
  mimeType String
  type     DocumentType

  sae Sae @relation(fields: [saeId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([saeId])
}

model StudentSubmission {
  id          String   @id @default(uuid())
  saeId       String
  studentId   String
  url         String
  name        String
  mimeType    String
  submittedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sae     Sae  @relation(fields: [saeId], references: [id], onDelete: Cascade)
  student user @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([saeId, studentId])
  @@index([saeId])
}
```

Ajouter les relations inverses dans le modèle `Sae` :

```prisma
model Sae {
  // ... champs existants
  documents   SaeDocument[]
  submissions StudentSubmission[]
}
```

Ajouter la relation inverse dans le modèle `user` :

```prisma
model user {
  // ... champs existants
  submissions StudentSubmission[]
}
```

```bash
npx prisma migrate dev --name add-documents
npx prisma generate
```

---

## Étape 5 — Types et interfaces

### `src/documents/types/document.types.ts`

```typescript
import { DocumentType } from '@prisma/client';

export interface SaeDocumentResponse {
  id: string;
  saeId: string;
  url: string;
  name: string;
  mimeType: string;
  type: DocumentType;
  createdAt: Date;
}

export interface StudentSubmissionResponse {
  id: string;
  saeId: string;
  studentId: string;
  url: string;
  name: string;
  mimeType: string;
  submittedAt: Date;
  updatedAt: Date;
}
```

---

## Étape 6 — DTOs

### `src/documents/dto/create-sae-document.dto.ts`

```typescript
import { IsEnum, IsString, IsUrl } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateSaeDocumentDto {
  @IsUrl()
  url: string;

  @IsString()
  name: string;

  @IsString()
  mimeType: string;

  @IsEnum(DocumentType)
  type: DocumentType;
}
```

### `src/documents/dto/create-submission.dto.ts`

```typescript
import { IsString, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @IsUrl()
  url: string;

  @IsString()
  name: string;

  @IsString()
  mimeType: string;
}
```

---

## Étape 7 — Service

### `src/documents/documents.service.ts`

```typescript
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
    requestingUserRole: UserRole,
  ): Promise<SaeDocumentResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: { isPublished: true },
    });

    if (!sae) throw new NotFoundException('SAE not found');

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException('This SAE is not published yet');
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

    if (!sae) throw new NotFoundException('SAE not found');

    this.assertCanWriteOnSae(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    if (sae._count.documents >= SAE_DOCUMENT_LIMIT) {
      throw new BadRequestException(
        `A SAE cannot have more than ${SAE_DOCUMENT_LIMIT} documents`,
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
      throw new NotFoundException('Document not found');
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

    if (!sae) throw new NotFoundException('SAE not found');
    if (!sae.isPublished)
      throw new ForbiddenException('This SAE is not published yet');

    const status = computeSaeStatus(sae);
    if (status !== 'ongoing') {
      throw new BadRequestException(
        'Submissions are only allowed while the SAE is ongoing',
      );
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { promotionId: true },
    });

    if (!studentProfile) {
      throw new ForbiddenException('Student profile not found');
    }

    if (sae.semester.promotionId !== studentProfile.promotionId) {
      throw new ForbiddenException(
        'This SAE does not belong to your promotion',
      );
    }

    const submission = await this.prisma.studentSubmission.upsert({
      where: { saeId_studentId: { saeId, studentId } },
      create: {
        saeId,
        studentId,
        url: dto.url,
        name: dto.name,
        mimeType: dto.mimeType,
      },
      update: {
        url: dto.url,
        name: dto.name,
        mimeType: dto.mimeType,
        submittedAt: new Date(),
      },
    });

    return {
      id: submission.id,
      saeId: submission.saeId,
      studentId: submission.studentId,
      url: submission.url,
      name: submission.name,
      mimeType: submission.mimeType,
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
    });

    if (!submission)
      throw new NotFoundException('No submission found for this SAE');

    return {
      id: submission.id,
      saeId: submission.saeId,
      studentId: submission.studentId,
      url: submission.url,
      name: submission.name,
      mimeType: submission.mimeType,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    };
  }

  async findAllSubmissions(
    saeId: string,
    requestingUserId: string,
  ): Promise<StudentSubmissionResponse[]> {
    const sae = await this.prisma.sae.findUnique({
      where: { id: saeId, deletedAt: null },
      select: {
        createdById: true,
        invitations: { select: { userId: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE not found');

    this.assertCanWriteOnSae(
      sae.createdById,
      sae.invitations,
      requestingUserId,
    );

    const submissions = await this.prisma.studentSubmission.findMany({
      where: { saeId },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((s) => ({
      id: s.id,
      saeId: s.saeId,
      studentId: s.studentId,
      url: s.url,
      name: s.name,
      mimeType: s.mimeType,
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
      throw new ForbiddenException('You do not have write access to this SAE');
    }
  }
}
```

---

## Étape 8 — Contrôleur

### `src/documents/documents.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/auth.types';
import { DocumentsService } from './documents.service';
import { CreateSaeDocumentDto } from './dto/create-sae-document.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import {
  SaeDocumentResponse,
  StudentSubmissionResponse,
} from './types/document.types';

@Controller('api/saes/:saeId')
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents')
  findSaeDocuments(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeDocumentResponse[]> {
    return this.documentsService.findSaeDocuments(saeId, user.role);
  }

  @Post('documents')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  addSaeDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSaeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeDocumentResponse> {
    return this.documentsService.addSaeDocument(saeId, dto, user.sub);
  }

  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  removeSaeDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.documentsService.removeSaeDocument(documentId, user.sub);
  }

  @Post('submission')
  @Roles(UserRole.STUDENT)
  submitDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.submitDocument(saeId, dto, user.sub);
  }

  @Get('submission/me')
  @Roles(UserRole.STUDENT)
  findMySubmission(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.findMySubmission(saeId, user.sub);
  }

  @Get('submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findAllSubmissions(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse[]> {
    return this.documentsService.findAllSubmissions(saeId, user.sub);
  }
}
```

---

## Étape 9 — Module

### `src/documents/documents.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
```

---

## Étape 10 — Enregistrement dans AppModule

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SaesModule } from './saes/saes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DocumentsModule } from './documents/documents.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SaesModule,
    AnnouncementsModule,
    DocumentsModule,
  ],
})
export class AppModule {}
```

---

## Récapitulatif des endpoints

| Méthode | Route                                    | Rôle requis         | Description                          |
| ------- | ---------------------------------------- | ------------------- | ------------------------------------ |
| GET     | `/api/saes/:saeId/documents`             | Tous (authentifiés) | Liste des documents de la SAE        |
| POST    | `/api/saes/:saeId/documents`             | TEACHER, ADMIN      | Ajouter un document à la SAE (max 3) |
| DELETE  | `/api/saes/:saeId/documents/:documentId` | TEACHER, ADMIN      | Supprimer un document                |
| POST    | `/api/saes/:saeId/submission`            | STUDENT             | Soumettre ou écraser son rendu       |
| GET     | `/api/saes/:saeId/submission/me`         | STUDENT             | Récupérer son propre rendu           |
| GET     | `/api/saes/:saeId/submissions`           | TEACHER, ADMIN      | Voir tous les rendus d'une SAE       |

---

## Logique métier à retenir

**Documents SAE (prof)** :

- Maximum 3 documents par SAE, vérifié via `_count` avant insertion
- Accessible en lecture par tous (si SAE publiée), en écriture par le créateur et les enseignants invités
- Suppression en dur (pas de soft delete)

**Rendus étudiants** :

- Soumission uniquement si la SAE est `ongoing` (via `computeSaeStatus`)
- Vérification de la promotion : `sae.semester.promotionId === studentProfile.promotionId`
- Un seul rendu par étudiant par SAE, écrasable via `upsert` (la contrainte `@@unique([saeId, studentId])` garantit l'unicité)
- Un étudiant ne peut consulter que son propre rendu
- Un enseignant (créateur ou invité) peut consulter tous les rendus de sa SAE

**UploadThing** : l'upload est géré côté client. Le client envoie directement le fichier à UploadThing et reçoit une URL en retour, qu'il transmet ensuite au backend via les DTOs. Le backend ne manipule jamais de fichier binaire.

---

## Checklist de validation

- [ ] `nest generate resource documents` exécuté sans erreurs
- [ ] Migration Prisma appliquée
- [ ] `POST /api/saes/:saeId/documents` par un STUDENT retourne `403`
- [ ] `POST /api/saes/:saeId/documents` au-delà de 3 documents retourne `400`
- [ ] `POST /api/saes/:saeId/documents` par un TEACHER non invité retourne `403`
- [ ] `POST /api/saes/:saeId/submission` sur une SAE `upcoming` ou `finished` retourne `400`
- [ ] `POST /api/saes/:saeId/submission` par un étudiant d'une autre promotion retourne `403`
- [ ] `POST /api/saes/:saeId/submission` en double écrase le rendu existant (pas d'erreur)
- [ ] `GET /api/saes/:saeId/submission/me` sans rendu existant retourne `404`
- [ ] `GET /api/saes/:saeId/submissions` par un STUDENT retourne `403`
- [ ] `GET /api/saes/:saeId/submissions` par un TEACHER non invité retourne `403`
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
