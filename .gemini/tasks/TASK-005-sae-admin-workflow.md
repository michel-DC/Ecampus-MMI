# TASK-005 — Workflow d'administration des SAE et des Professeurs

## Objectif

Sécuriser et centraliser le système de gestion des rôles. L'inscription publique est désormais restreinte aux **STUDENT** uniquement. La création de comptes **TEACHER** est une action réservée aux **ADMIN**, qui déclenchent automatiquement l'envoi d'un email de bienvenue via **Resend** contenant les identifiants et un mot de passe temporaire généré côté serveur. La gestion structurelle des SAE (création, publication, suppression) est également centralisée chez l'ADMIN — les professeurs conservent uniquement les droits de modification et de gestion des invitations/annonces sur les SAE qui leur sont attribuées.

---

## Stack concernée

- NestJS
- Better Auth
- Prisma ORM
- Resend (envoi d'emails transactionnels)
- TypeScript + class-validator

---

## Périmètre

- [ ] Verrouillage de l'inscription publique au rôle `STUDENT`
- [ ] Module `Mail` avec Resend
- [ ] Module `Users` — création de professeur par un ADMIN
- [ ] Endpoint de changement de mot de passe
- [ ] Refonte des permissions SAE
- [ ] Mise à jour des DTOs et de la logique métier

---

## Étape 1 — Verrouillage de l'inscription publique

### Contexte

Actuellement, le champ `role` peut être passé librement dans le body de l'inscription. Il faut neutraliser cela : toute inscription via l'API publique crée **toujours** un `STUDENT`, peu importe ce qui est envoyé dans le body.

### 1.1 Mise à jour de `src/lib/auth.ts`

Modifier la configuration Better Auth pour forcer le rôle `STUDENT` via le hook `before` et automatiser la création du `TeacherProfile` via le hook `after` :

```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              role: 'STUDENT',
            },
          };
        },
        after: async (user) => {
          if (user.role === 'TEACHER') {
            await prisma.teacherProfile.create({ data: { userId: user.id } });
          }
        },
      },
    },
  },
});
```

> Le hook `before` écrase systématiquement le rôle à `STUDENT`. Le hook `after` crée le `TeacherProfile` uniquement lorsqu'un ADMIN crée un compte TEACHER via l'API serveur (voir Étape 3).

### 1.2 Mise à jour du DTO d'inscription

Supprimer le champ `role` du `RegisterDto` — il ne doit plus être accepté ni documenté côté client.

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;
}
```

---

## Étape 2 — Module Mail (Resend)

### 2.1 Installation

```bash
npm install resend
```

### 2.2 Variable d'environnement

Ajouter dans `.env` :

```env
RESEND_API_KEY="re_votre_cle_api"
RESEND_FROM_EMAIL="no-reply@votre-domaine.com"
```

### 2.3 Génération du module

```bash
nest generate module mail --no-spec
nest generate service mail --no-spec
```

Structure générée :

```
src/mail/
├── mail.module.ts
└── mail.service.ts
```

### 2.4 Types

Créer `src/mail/types/mail.types.ts` :

```typescript
export interface TeacherCredentialsPayload {
  email: string;
  name: string;
  temporaryPassword: string;
}
```

### 2.5 Service Mail

### `src/mail/mail.service.ts`

```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { TeacherCredentialsPayload } from './types/mail.types';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (!apiKey) throw new Error('RESEND_API_KEY is not defined');
    if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is not defined');

    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendTeacherCredentials(
    payload: TeacherCredentialsPayload,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: payload.email,
      subject: 'Bienvenue sur la plateforme SAE — Vos identifiants',
      html: this.buildTeacherWelcomeTemplate(payload),
    });

    if (error) {
      throw new InternalServerErrorException('Failed to send welcome email');
    }
  }

  private buildTeacherWelcomeTemplate(
    payload: TeacherCredentialsPayload,
  ): string {
    return `
      <h1>Bienvenue, ${payload.name} !</h1>
      <p>Votre compte professeur a été créé sur la plateforme SAE.</p>
      <p><strong>Email :</strong> ${payload.email}</p>
      <p><strong>Mot de passe temporaire :</strong> ${payload.temporaryPassword}</p>
      <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
    `;
  }
}
```

### 2.6 Module Mail

### `src/mail/mail.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

---

## Étape 3 — Module Users (Admin uniquement)

### 3.1 Génération du module

```bash
nest generate resource users --no-spec
```

Choisir **REST API** et **non** pour le CRUD automatique.

Structure finale :

```
src/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   └── create-teacher.dto.ts
└── types/
    └── user.types.ts
```

### 3.2 Types

### `src/users/types/user.types.ts`

```typescript
import { UserRole } from '@prisma/client';

export interface CreatedTeacherResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  temporaryPassword: string;
  createdAt: Date;
}

export interface UserSearchResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
```

### 3.3 DTO

### `src/users/dto/create-teacher.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

### 3.4 Service

### `src/users/users.service.ts`

```typescript
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { auth } from '../lib/auth';
import { MailService } from '../mail/mail.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreatedTeacherResponse, UserSearchResponse } from './types/user.types';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createTeacher(dto: CreateTeacherDto): Promise<CreatedTeacherResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const temporaryPassword = this.generateTemporaryPassword();

    const response = await auth.api.createUser({
      body: {
        email: dto.email,
        name: dto.name,
        password: temporaryPassword,
        role: 'TEACHER',
      },
    });

    if (!response || !response.user) {
      throw new InternalServerErrorException(
        'Failed to create teacher account',
      );
    }

    await this.mailService.sendTeacherCredentials({
      email: dto.email,
      name: dto.name,
      temporaryPassword,
    });

    return {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      role: UserRole.TEACHER,
      temporaryPassword,
      createdAt: new Date(response.user.createdAt),
    };
  }

  async searchUsers(
    query?: string,
    role?: UserRole,
    limit: number = 20,
  ): Promise<UserSearchResponse[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: role,
        OR: query
          ? [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return users;
  }

  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 8 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }
}
```

### 3.5 Contrôleur

### `src/users/users.controller.ts`

```typescript
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreatedTeacherResponse, UserSearchResponse } from './types/user.types';

@Controller('api/users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('teachers')
  @Roles(UserRole.ADMIN)
  createTeacher(
    @Body() dto: CreateTeacherDto,
  ): Promise<CreatedTeacherResponse> {
    return this.usersService.createTeacher(dto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  searchUsers(
    @Query('q') query?: string,
    @Query('role') role?: UserRole,
    @Query('limit') limit?: string,
  ): Promise<UserSearchResponse[]> {
    return this.usersService.searchUsers(
      query,
      role,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
```

### 3.6 Module Users

### `src/users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## Étape 4 — Changement de mot de passe

### 4.1 DTO

### `src/auth/dto/change-password.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
```

### 4.2 Endpoint dans AuthController

Ajouter dans `src/auth/auth.controller.ts` :

```typescript
@Post('api/auth/change-password')
@UseGuards(AuthGuard)
async changePassword(
  @Body() dto: ChangePasswordDto,
  @Req() req: Request,
): Promise<{ message: string }> {
  await auth.api.changePassword({
    body: {
      currentPassword: dto.oldPassword,
      newPassword: dto.newPassword,
      revokeOtherSessions: true,
    },
    headers: req.headers as Headers,
  });

  return { message: 'Password changed successfully' };
}
```

---

## Étape 5 — Refonte des permissions SAE

### 5.1 Mise à jour du DTO de création

Ajouter `teacherId` dans `src/saes/dto/create-sae.dto.ts` :

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

  @IsUUID()
  teacherId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  imageBanner?: string;
}
```

### 5.2 Mise à jour de `assertIsOwner` dans `SaesService`

Remplacer la méthode `assertIsOwner` existante pour qu'elle accepte l'ADMIN en plus du créateur :

```typescript
private assertIsOwner(createdById: string, requestingUser: JwtPayload): void {
  const isAdmin = requestingUser.role === UserRole.ADMIN;
  const isOwner = createdById === requestingUser.sub;

  if (!isAdmin && !isOwner) {
    throw new ForbiddenException('Action reserved for ADMIN or the SAE owner');
  }
}
```

> Mettre à jour tous les appels à `assertIsOwner` dans le service pour passer `requestingUser` (l'objet `JwtPayload` complet) plutôt que `requestingUser.sub`.

### 5.3 Mise à jour du contrôleur SAE

Modifier les décorateurs `@Roles` dans `src/saes/saes.controller.ts` selon la nouvelle matrice de permissions :

```typescript
@Post()
@Roles(UserRole.ADMIN)
create(...) {}

@Post(':id/publish')
@Roles(UserRole.ADMIN)
publish(...) {}

@Delete(':id')
@Roles(UserRole.ADMIN)
remove(...) {}

@Patch(':id')
@Roles(UserRole.TEACHER, UserRole.ADMIN)
update(...) {}

@Post(':id/invitations')
@Roles(UserRole.TEACHER, UserRole.ADMIN)
createInvitation(...) {}

@Get(':id/invitations')
@Roles(UserRole.TEACHER, UserRole.ADMIN)
findInvitations(...) {}
```

### 5.4 Mise à jour de `SaesService.create`

Utiliser `teacherId` comme `createdById` lors de la création :

```typescript
async create(dto: CreateSaeDto, requestingUser: JwtPayload): Promise<SaeResponse> {
  this.validateDates(dto.startDate, dto.dueDate);

  const semester = await this.prisma.semester.findUnique({ where: { id: dto.semesterId } });
  if (!semester) throw new NotFoundException('Semester not found');

  const teacher = await this.prisma.user.findUnique({
    where: { id: dto.teacherId },
    select: { id: true, role: true, isActive: true },
  });

  if (!teacher || !teacher.isActive) {
    throw new NotFoundException('Teacher not found or inactive');
  }

  if (teacher.role !== UserRole.TEACHER) {
    throw new BadRequestException('The assigned user must have the TEACHER role');
  }

  const sae = await this.prisma.sae.create({
    data: {
      title: dto.title,
      description: dto.description,
      semesterId: dto.semesterId,
      startDate: new Date(dto.startDate),
      dueDate: new Date(dto.dueDate),
      imageBanner: dto.imageBanner ?? null,
      isPublished: false,
      createdById: dto.teacherId,
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
```

---

## Étape 6 — Enregistrement dans AppModule

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SaesModule } from './saes/saes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DocumentsModule } from './documents/documents.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    SaesModule,
    AnnouncementsModule,
    DocumentsModule,
    UsersModule,
  ],
})
export class AppModule {}
```

---

## Récapitulatif des endpoints

| Méthode | Route                       | Rôle requis            | Description                              |
| ------- | --------------------------- | ---------------------- | ---------------------------------------- |
| POST    | `/api/users/teachers`       | ADMIN                  | Créer un compte professeur + envoi email |
| GET     | `/api/users`                | TEACHER, ADMIN         | Rechercher des utilisateurs              |
| POST    | `/api/auth/change-password` | Authentifié            | Changer son mot de passe                 |
| POST    | `/api/saes`                 | **ADMIN**              | Créer une SAE (attribuée à un prof)      |
| POST    | `/api/saes/:id/publish`     | **ADMIN**              | Publier une SAE                          |
| DELETE  | `/api/saes/:id`             | **ADMIN**              | Supprimer une SAE                        |
| PATCH   | `/api/saes/:id`             | ADMIN, TEACHER (owner) | Modifier une SAE                         |
| POST    | `/api/saes/:id/invitations` | ADMIN, TEACHER (owner) | Inviter un enseignant                    |

---

## Checklist de validation

- [ ] Inscription publique : le rôle `STUDENT` est toujours attribué, le champ `role` dans le body est ignoré
- [ ] `POST /api/users/teachers` par un ADMIN crée un compte `TEACHER` en base
- [ ] `POST /api/users/teachers` déclenche l'envoi d'un email via Resend avec les identifiants
- [ ] `POST /api/users/teachers` avec un email déjà existant retourne `409`
- [ ] Le professeur peut se connecter avec le mot de passe temporaire
- [ ] `POST /api/auth/change-password` avec un mauvais `oldPassword` retourne une erreur
- [ ] `POST /api/auth/change-password` avec un `newPassword` valide met à jour le mot de passe
- [ ] `POST /api/saes` par un TEACHER retourne `403`
- [ ] `POST /api/saes` avec un `teacherId` non-TEACHER retourne `400`
- [ ] `POST /api/saes/:id/publish` par un TEACHER retourne `403`
- [ ] `DELETE /api/saes/:id` par un TEACHER retourne `403`
- [ ] `PATCH /api/saes/:id` par le TEACHER propriétaire retourne `200`
- [ ] `PATCH /api/saes/:id` par un TEACHER non propriétaire retourne `403`
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
