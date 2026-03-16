# TASK-003 — Module Annonces (Announcements)

## Objectif

Implémenter le module de gestion des annonces. Une annonce est toujours rattachée à une SAE existante. Seuls les enseignants et admins peuvent créer ou supprimer des annonces. Les étudiants peuvent les consulter, uniquement sur les SAE publiées.

---

## Prérequis

- **TASK-001** complétée (Auth + Guards)
- **TASK-002** complétée (module SAE opérationnel)
- `PrismaModule` global

---

## Périmètre

- [ ] Génération du module via NestJS CLI
- [ ] Schéma Prisma Announcement (vérification / migration)
- [ ] Types et interfaces
- [ ] DTOs avec validation
- [ ] Service Announcements
- [ ] Contrôleur Announcements
- [ ] Module + enregistrement dans AppModule

---

## Étape 1 — Génération via NestJS CLI

```bash
nest generate resource announcements --no-spec
```

Choisir **REST API** et **non** pour le CRUD automatique.

Cette commande génère :

```
src/announcements/
├── announcements.module.ts
├── announcements.controller.ts
└── announcements.service.ts
```

Créer manuellement les sous-dossiers :

```
src/announcements/
├── announcements.module.ts
├── announcements.controller.ts
├── announcements.service.ts
├── dto/
│   ├── create-announcement.dto.ts
│   └── update-announcement.dto.ts
└── types/
    └── announcement.types.ts
```

---

## Étape 2 — Vérification du schéma Prisma

Vérifier que le modèle suivant est présent dans `prisma/schema.prisma`. L'ajouter si absent, puis migrer.

```prisma
model Announcement {
  id      String @id @default(uuid())
  saeId   String
  title   String
  content String @db.Text

  sae Sae @relation(fields: [saeId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([saeId])
}
```

Ne pas oublier d'ajouter la relation inverse dans le modèle `Sae` :

```prisma
model Sae {
  // ... champs existants
  announcements Announcement[]
}
```

```bash
npx prisma migrate dev --name add-announcements
npx prisma generate
```

---

## Étape 3 — Types et interfaces

### `src/announcements/types/announcement.types.ts`

```typescript
export interface AnnouncementResponse {
  id: string;
  saeId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementListResponse {
  data: AnnouncementResponse[];
  total: number;
}
```

---

## Étape 4 — DTOs

### `src/announcements/dto/create-announcement.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;
}
```

### `src/announcements/dto/update-announcement.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnouncementDto } from './create-announcement.dto';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
```

---

## Étape 5 — Service

### `src/announcements/announcements.service.ts`

```typescript
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
    requestingUserRole: UserRole,
  ): Promise<AnnouncementListResponse> {
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
    requestingUserRole: UserRole,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        sae: { select: { isPublished: true, deletedAt: true } },
      },
    });

    if (!announcement || announcement.sae.deletedAt) {
      throw new NotFoundException('Announcement not found');
    }

    const isTeacherOrAdmin =
      requestingUserRole === UserRole.TEACHER ||
      requestingUserRole === UserRole.ADMIN;

    if (!announcement.sae.isPublished && !isTeacherOrAdmin) {
      throw new ForbiddenException('This SAE is not published yet');
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

    if (!sae) throw new NotFoundException('SAE not found');

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
      throw new NotFoundException('Announcement not found');
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
      throw new NotFoundException('Announcement not found');
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
      throw new ForbiddenException('You do not have write access to this SAE');
    }
  }
}
```

> Contrairement aux SAE, les annonces peuvent être créées/modifiées par le créateur de la SAE **ET** par les enseignants invités. C'est la logique `assertCanWriteOnSae` qui gère cela.

---

## Étape 6 — Contrôleur

### `src/announcements/announcements.controller.ts`

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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/auth.types';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  AnnouncementListResponse,
  AnnouncementResponse,
} from './types/announcement.types';

@Controller('api/saes/:saeId/announcements')
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  findAll(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AnnouncementListResponse> {
    return this.announcementsService.findAllBySae(saeId, user.role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AnnouncementResponse> {
    return this.announcementsService.findOne(id, user.role);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Param('saeId') saeId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AnnouncementResponse> {
    return this.announcementsService.create(saeId, dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AnnouncementResponse> {
    return this.announcementsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.announcementsService.remove(id, user.sub);
  }
}
```

---

## Étape 7 — Module

### `src/announcements/announcements.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
```

---

## Étape 8 — Enregistrement dans AppModule

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SaesModule } from './saes/saes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SaesModule,
    AnnouncementsModule,
  ],
})
export class AppModule {}
```

---

## Récapitulatif des endpoints

| Méthode | Route                                | Rôle requis         | Description                  |
| ------- | ------------------------------------ | ------------------- | ---------------------------- |
| GET     | `/api/saes/:saeId/announcements`     | Tous (authentifiés) | Liste des annonces d'une SAE |
| GET     | `/api/saes/:saeId/announcements/:id` | Tous (authentifiés) | Détail d'une annonce         |
| POST    | `/api/saes/:saeId/announcements`     | TEACHER, ADMIN      | Créer une annonce            |
| PATCH   | `/api/saes/:saeId/announcements/:id` | TEACHER, ADMIN      | Modifier une annonce         |
| DELETE  | `/api/saes/:saeId/announcements/:id` | TEACHER, ADMIN      | Supprimer une annonce (204)  |

---

## Logique métier à retenir

**Accès en lecture** : les étudiants ne peuvent consulter les annonces que sur les SAE publiées. Sur une SAE non publiée, seuls les enseignants et admins y ont accès.

**Accès en écriture** : contrairement aux SAE (où seul le créateur peut agir), les annonces peuvent être créées, modifiées et supprimées par le créateur de la SAE **et** par tous les enseignants invités sur cette SAE.

**Suppression** : les annonces sont supprimées en dur (`delete`), pas de soft delete. Elles n'ont pas de valeur historique propre.

---

## Checklist de validation

- [ ] `nest generate resource announcements` exécuté sans erreurs
- [ ] Migration Prisma appliquée
- [ ] `POST /api/saes/:saeId/announcements` par un STUDENT retourne `403`
- [ ] `POST /api/saes/:saeId/announcements` par le créateur de la SAE retourne `201`
- [ ] `POST /api/saes/:saeId/announcements` par un TEACHER invité retourne `201`
- [ ] `POST /api/saes/:saeId/announcements` par un TEACHER non invité retourne `403`
- [ ] `GET /api/saes/:saeId/announcements` sur une SAE non publiée par un STUDENT retourne `403`
- [ ] `GET /api/saes/:saeId/announcements` sur une SAE non publiée par un TEACHER retourne `200`
- [ ] `PATCH /api/saes/:saeId/announcements/:id` par un TEACHER non invité retourne `403`
- [ ] `DELETE /api/saes/:saeId/announcements/:id` supprime réellement la ligne en base
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
