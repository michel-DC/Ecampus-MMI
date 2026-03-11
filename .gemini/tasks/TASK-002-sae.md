content = """# TASK-002 — Module SAE (Situations d'Apprentissage et d'Évaluation)

## Objectif

Implémenter le module complet de gestion des SAE. Une SAE est l'entité centrale du projet : elle structure les échéances pédagogiques, les livrables, les rendus étudiants et les annonces associées. Ce module couvre la création, la lecture, la modification, la suppression logique, la publication et les invitations d'enseignants.

---

## Prérequis

- **TASK-001** complétée (Auth + Guards + PrismaService disponibles)
- `AuthGuard`, `RolesGuard`, `OnboardingGuard` opérationnels
- `@CurrentUser`, `@Roles` disponibles
- `PrismaModule` global

---

## Périmètre

- [ ] Génération du module SAE via NestJS CLI
- [ ] Schéma Prisma SAE (vérification / migration)
- [ ] Types et interfaces
- [ ] DTOs avec validation
- [ ] Service SAE (logique métier complète)
- [ ] Contrôleur SAE
- [ ] Module SAE + enregistrement dans AppModule

---

## Étape 1 — Génération du module via NestJS CLI

```bash
nest generate resource saes --no-spec
```

> Choisir **REST API** et **non** pour la génération CRUD automatique.

Cette commande génère :

```
src/saes/
├── saes.module.ts
├── saes.controller.ts
└── saes.service.ts
```

Créer manuellement les sous-dossiers suivants :

```
src/saes/
├── saes.module.ts
├── saes.controller.ts
├── saes.service.ts
├── dto/
│   ├── create-sae.dto.ts
│   ├── update-sae.dto.ts
│   ├── create-invitation.dto.ts
│   └── sae-filters.dto.ts
└── types/
    └── sae.types.ts
```

---

## Étape 2 — Vérification du schéma Prisma

Vérifier que les modèles suivants sont présents dans `prisma/schema.prisma`. Les ajouter si nécessaire puis migrer.

```prisma
model Sae {
  id          String   @id @default(uuid())
  title       String
  imageBanner String?
  description String   @db.Text
  semesterId  String
  createdById String
  startDate   DateTime
  dueDate     DateTime
  isPublished Boolean  @default(false)

  semester    Semester        @relation(fields: [semesterId], references: [id])
  createdBy   user            @relation(fields: [createdById], references: [id])
  invitations SaeInvitation[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([semesterId])
  @@index([isPublished])
  @@index([dueDate])
}

model SaeInvitation {
  id     String @id @default(uuid())
  saeId  String
  userId String

  sae  Sae  @relation(fields: [saeId], references: [id], onDelete: Cascade)
  user user @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([saeId, userId])
}
```

```bash
npx prisma migrate dev --name add-sae-module
npx prisma generate
```

---

## Étape 3 — Types et interfaces

### `src/saes/types/sae.types.ts`

```typescript
export type SaeStatus = 'draft' | 'upcoming' | 'ongoing' | 'finished';

export interface SaeAuthor {
  id: string;
  name: string;
  email: string;
}

export interface SaeResponse {
  id: string;
  title: string;
  imageBanner: string | null;
  description: string;
  semesterId: string;
  startDate: Date;
  dueDate: Date;
  isPublished: boolean;
  status: SaeStatus;
  createdBy: SaeAuthor;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaeListResponse {
  data: SaeResponse[];
  total: number;
}

export interface SaeInvitationResponse {
  id: string;
  saeId: string;
  userId: string;
  createdAt: Date;
}

export function computeSaeStatus(sae: {
  isPublished: boolean;
  startDate: Date;
  dueDate: Date;
}): SaeStatus {
  if (!sae.isPublished) return 'draft';
  const now = new Date();
  if (now < sae.startDate) return 'upcoming';
  if (now > sae.dueDate) return 'finished';
  return 'ongoing';
}
```

> `computeSaeStatus` est la **seule source de vérité** pour le statut. Ne jamais dupliquer cette logique ailleurs.

---

## Étape 4 — DTOs

### `src/saes/dto/create-sae.dto.ts`

```typescript
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateSaeDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsUUID()
  semesterId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  imageBanner?: string;
}
```

### `src/saes/dto/update-sae.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateSaeDto } from './create-sae.dto';

export class UpdateSaeDto extends PartialType(CreateSaeDto) {}
```

### `src/saes/dto/create-invitation.dto.ts`

```typescript
import { IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  userId: string;
}
```

### `src/saes/dto/sae-filters.dto.ts`

```typescript
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { SaeStatus } from '../types/sae.types';

export class SaeFiltersDto {
  @IsUUID()
  @IsOptional()
  semesterId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  isPublished?: boolean;

  @IsEnum(['draft', 'upcoming', 'ongoing', 'finished'])
  @IsOptional()
  status?: SaeStatus;
}
```

---

## Étape 5 — Service SAE

### `src/saes/saes.service.ts`

```typescript
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
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<SaeListResponse> {
    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    const saes = await this.prisma.sae.findMany({
      where: {
        deletedAt: null,
        semesterId: filters.semesterId,
        isPublished: isTeacherOrAdmin ? filters.isPublished : true,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: SaeResponse[] = saes.map((sae) => ({
      id: sae.id,
      title: sae.title,
      imageBanner: sae.imageBanner,
      description: sae.description,
      semesterId: sae.semesterId,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      status: computeSaeStatus(sae),
      createdBy: sae.createdBy,
      createdAt: sae.createdAt,
      updatedAt: sae.updatedAt,
    }));

    const filtered = filters.status
      ? mapped.filter((sae) => sae.status === filters.status)
      : mapped;

    return { data: filtered, total: filtered.length };
  }

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<SaeResponse> {
    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!sae) throw new NotFoundException('SAE not found');

    if (!sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException('This SAE is not published yet');
    }

    return {
      id: sae.id,
      title: sae.title,
      imageBanner: sae.imageBanner,
      description: sae.description,
      semesterId: sae.semesterId,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      status: computeSaeStatus(sae),
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
    if (!semester) throw new NotFoundException('Semester not found');

    const sae = await this.prisma.sae.create({
      data: {
        title: dto.title,
        description: dto.description,
        semesterId: dto.semesterId,
        startDate: new Date(dto.startDate),
        dueDate: new Date(dto.dueDate),
        imageBanner: dto.imageBanner ?? null,
        isPublished: false,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: sae.id,
      title: sae.title,
      imageBanner: sae.imageBanner,
      description: sae.description,
      semesterId: sae.semesterId,
      startDate: sae.startDate,
      dueDate: sae.dueDate,
      isPublished: sae.isPublished,
      status: computeSaeStatus(sae),
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

    if (!sae) throw new NotFoundException('SAE not found');
    this.assertIsOwner(sae.createdById, requestingUserId);

    if (dto.startDate || dto.dueDate) {
      const startDate = dto.startDate ?? sae.startDate.toISOString();
      const dueDate = dto.dueDate ?? sae.dueDate.toISOString();
      this.validateDates(startDate, dueDate);
    }

    const updated = await this.prisma.sae.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        semesterId: dto.semesterId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        imageBanner: dto.imageBanner,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      imageBanner: updated.imageBanner,
      description: updated.description,
      semesterId: updated.semesterId,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      status: computeSaeStatus(updated),
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async publish(id: string, requestingUserId: string): Promise<SaeResponse> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE not found');
    this.assertIsOwner(sae.createdById, requestingUserId);

    if (sae.isPublished)
      throw new ConflictException('SAE is already published');
    if (!sae.startDate || !sae.dueDate) {
      throw new BadRequestException(
        'SAE must have startDate and dueDate before publishing',
      );
    }

    const updated = await this.prisma.sae.update({
      where: { id },
      data: { isPublished: true },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      imageBanner: updated.imageBanner,
      description: updated.description,
      semesterId: updated.semesterId,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      isPublished: updated.isPublished,
      status: computeSaeStatus(updated),
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    const sae = await this.prisma.sae.findUnique({
      where: { id, deletedAt: null },
    });

    if (!sae) throw new NotFoundException('SAE not found');
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

    if (!sae) throw new NotFoundException('SAE not found');
    this.assertIsOwner(sae.createdById, requestingUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('User not found or inactive');
    }

    if (targetUser.role !== UserRole.TEACHER) {
      throw new BadRequestException('Only teachers can be invited to a SAE');
    }

    if (targetUser.id === requestingUserId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const existingInvitation = await this.prisma.saeInvitation.findUnique({
      where: { saeId_userId: { saeId, userId: dto.userId } },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'This teacher is already invited to this SAE',
      );
    }

    const invitation = await this.prisma.saeInvitation.create({
      data: { saeId, userId: dto.userId },
    });

    return {
      id: invitation.id,
      saeId: invitation.saeId,
      userId: invitation.userId,
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

    if (!sae) throw new NotFoundException('SAE not found');
    this.assertIsOwner(sae.createdById, requestingUserId);

    const invitations = await this.prisma.saeInvitation.findMany({
      where: { saeId },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      saeId: inv.saeId,
      userId: inv.userId,
      createdAt: inv.createdAt,
    }));
  }

  private validateDates(startDate: string, dueDate: string): void {
    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (due <= start) {
      throw new BadRequestException('dueDate must be after startDate');
    }
  }

  private assertIsOwner(createdById: string, requestingUserId: string): void {
    if (createdById !== requestingUserId) {
      throw new ForbiddenException('You are not the owner of this SAE');
    }
  }
}
```

---

## Étape 6 — Contrôleur SAE

### `src/saes/saes.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/auth.types';
import { SaesService } from './saes.service';
import { CreateSaeDto } from './dto/create-sae.dto';
import { UpdateSaeDto } from './dto/update-sae.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SaeFiltersDto } from './dto/sae-filters.dto';
import {
  SaeInvitationResponse,
  SaeListResponse,
  SaeResponse,
} from './types/sae.types';

@Controller('api/saes')
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class SaesController {
  constructor(private readonly saesService: SaesService) {}

  @Get()
  findAll(
    @Query() filters: SaeFiltersDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeListResponse> {
    return this.saesService.findAll(filters, user.sub, user.role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeResponse> {
    return this.saesService.findOne(id, user.sub, user.role);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Body() dto: CreateSaeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeResponse> {
    return this.saesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSaeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeResponse> {
    return this.saesService.update(id, dto, user.sub);
  }

  @Post(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeResponse> {
    return this.saesService.publish(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.saesService.remove(id, user.sub);
  }

  @Post(':id/invitations')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createInvitation(
    @Param('id') id: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeInvitationResponse> {
    return this.saesService.createInvitation(id, dto, user.sub);
  }

  @Get(':id/invitations')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findInvitations(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeInvitationResponse[]> {
    return this.saesService.findInvitations(id, user.sub);
  }
}
```

---

## Étape 7 — Module SAE

### `src/saes/saes.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SaesController } from './saes.controller';
import { SaesService } from './saes.service';

@Module({
  controllers: [SaesController],
  providers: [SaesService],
  exports: [SaesService],
})
export class SaesModule {}
```

---

## Étape 8 — Enregistrement dans AppModule

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SaesModule } from './saes/saes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SaesModule,
  ],
})
export class AppModule {}
```

---

## Récapitulatif des endpoints

| Méthode | Route                       | Rôle requis         | Description                |
| ------- | --------------------------- | ------------------- | -------------------------- |
| GET     | `/api/saes`                 | Tous (authentifiés) | Liste des SAE avec filtres |
| GET     | `/api/saes/:id`             | Tous (authentifiés) | Détail d'une SAE           |
| POST    | `/api/saes`                 | TEACHER, ADMIN      | Créer une SAE (brouillon)  |
| PATCH   | `/api/saes/:id`             | TEACHER, ADMIN      | Modifier une SAE           |
| POST    | `/api/saes/:id/publish`     | TEACHER, ADMIN      | Publier une SAE            |
| DELETE  | `/api/saes/:id`             | TEACHER, ADMIN      | Suppression logique        |
| POST    | `/api/saes/:id/invitations` | TEACHER, ADMIN      | Inviter un enseignant      |
| GET     | `/api/saes/:id/invitations` | TEACHER, ADMIN      | Lister les invitations     |

---

## Logique métier à retenir

**Calcul du statut** — toujours via `computeSaeStatus`, jamais en dur :

| Statut     | Condition                     |
| ---------- | ----------------------------- |
| `draft`    | `isPublished = false`         |
| `upcoming` | Publiée + `now < startDate`   |
| `ongoing`  | `startDate <= now <= dueDate` |
| `finished` | `now > dueDate`               |

**Visibilité** : les étudiants ne voient que les SAE publiées. Les enseignants et admins voient tout (hors supprimées).

**Propriété** : seul le `createdById` peut modifier, publier, supprimer ou inviter. Un enseignant invité a un accès lecture uniquement.

**Suppression** : toujours logique via `deletedAt`. Toutes les requêtes filtrent `deletedAt: null`.

---

## Checklist de validation

- [ ] `nest generate resource saes` exécuté sans erreurs
- [ ] Migration Prisma appliquée si nécessaire
- [ ] `POST /api/saes` crée une SAE en brouillon (`isPublished = false`)
- [ ] `POST /api/saes` par un STUDENT retourne `403`
- [ ] `POST /api/saes/:id/publish` sans `startDate`/`dueDate` retourne `400`
- [ ] `GET /api/saes` par un STUDENT ne retourne que les SAE publiées
- [ ] `GET /api/saes` par un TEACHER retourne toutes les SAE (brouillons inclus)
- [ ] `GET /api/saes/:id` sur une SAE non publiée par un STUDENT retourne `403`
- [ ] `PATCH /api/saes/:id` par un TEACHER non créateur retourne `403`
- [ ] `DELETE /api/saes/:id` renseigne `deletedAt`, ne supprime pas la ligne
- [ ] `POST /api/saes/:id/invitations` avec un userId non-TEACHER retourne `400`
- [ ] `POST /api/saes/:id/invitations` en double retourne `409`
- [ ] `computeSaeStatus` retourne les bons statuts selon les dates
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
- [ ] Données sensibles absentes des réponses API
