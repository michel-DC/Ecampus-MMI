# TASK-001 — Mise en place de l'authentification avec Better Auth

## Objectif

Implémenter le système d'authentification complet du projet en utilisant **Better Auth** avec l'adaptateur Prisma, intégré dans **NestJS** via le package `@thallesp/nestjs-better-auth`. Cette tâche couvre l'inscription, la connexion, la déconnexion, la récupération de l'utilisateur connecté, et la protection des routes par rôle.

---

## Stack concernée

- NestJS
- TypeScript
- Better Auth (`better-auth` + `@thallesp/nestjs-better-auth`)
- Prisma ORM (PostgreSQL)
- Cookie HTTP-only (transport du token)

---

## Périmètre

- [ ] Installation et configuration de Better Auth avec Prisma
- [ ] Génération et migration du schéma Prisma lié à l'auth
- [ ] Configuration de `main.ts`
- [ ] Génération du module Auth via NestJS CLI
- [ ] Implémentation du service Auth
- [ ] Implémentation du contrôleur Auth
- [ ] Mise en place des Guards (`AuthGuard`, `RolesGuard`, `OnboardingGuard`)
- [ ] Décorateurs utilitaires (`@Roles`, `@CurrentUser`)
- [ ] DTOs avec validation
- [ ] Types et interfaces
- [ ] Variables d'environnement
- [ ] Enregistrement du module dans `AppModule`

---

## Étape 1 — Installation des dépendances

```bash
pnpm add better-auth @thallesp/nestjs-better-auth
pnpm add @nestjs/config class-validator class-transformer
```

---

## Étape 2 — Variables d'environnement

Créer ou compléter le fichier `.env` à la racine du projet :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

BETTER_AUTH_SECRET="un-secret-tres-long-et-aleatoire-minimum-32-caracteres"
BETTER_AUTH_URL="http://localhost:3000"
```

> `BETTER_AUTH_SECRET` doit être long, aléatoire, et stocké uniquement en variable d'environnement. Ne jamais le hardcoder.

---

## Étape 3 — Schéma Prisma

### 3.1 Mettre à jour `prisma/schema.prisma`

Better Auth nécessite ses propres tables (`user`, `session`, `account`, `verification`). Le schéma ci-dessous fusionne les tables Better Auth avec notre modèle métier. **Better Auth utilise ses propres conventions de nommage en `camelCase` minuscule pour les tables.**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}

model user {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String
  image         String?
  role          UserRole  @default(STUDENT)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions       session[]
  accounts       account[]
  studentProfile StudentProfile?
  teacherProfile TeacherProfile?
  createdSaes    Sae[]
  saeInvitations SaeInvitation[]

  @@map("user")
}

model session {
  id        String   @id @default(uuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String

  user user @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model account {
  id                    String    @id @default(uuid())
  accountId             String
  providerId            String
  userId                String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user user @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("account")
}

model verification {
  id         String    @id @default(uuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}

model StudentProfile {
  id          String @id @default(uuid())
  userId      String @unique
  promotionId String
  groupId     String

  user      user      @relation(fields: [userId], references: [id], onDelete: Cascade)
  promotion Promotion @relation(fields: [promotionId], references: [id])
  group     Group     @relation(fields: [groupId], references: [id])

  createdAt DateTime @default(now())
}

model TeacherProfile {
  id     String @id @default(uuid())
  userId String @unique

  user user @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}

model Promotion {
  id        String  @id @default(uuid())
  label     String
  yearLevel Int
  isActive  Boolean @default(true)

  semesters Semester[]
  groups    Group[]
  students  StudentProfile[]

  createdAt DateTime @default(now())
}

model Semester {
  id          String @id @default(uuid())
  number      Int
  promotionId String

  promotion Promotion @relation(fields: [promotionId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}

model Group {
  id          String @id @default(uuid())
  name        String
  promotionId String

  promotion Promotion       @relation(fields: [promotionId], references: [id], onDelete: Cascade)
  students  StudentProfile[]

  createdAt DateTime @default(now())
}

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

### 3.2 Migrer la base de données

```bash
npx prisma migrate dev --name init-auth
npx prisma generate
```

---

## Étape 4 — Configuration de Better Auth

Créer le fichier `src/lib/auth.ts` :

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
});
```

---

## Étape 5 — Configuration de `main.ts`

Better Auth nécessite de désactiver le body parser natif de NestJS pour prendre en charge le corps brut des requêtes.

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

---

## Étape 6 — Génération du module Auth

```bash
nest generate resource auth --no-spec
```

> Choisir **REST API** comme type de transport et **non** pour la génération des points d'entrée CRUD (on les écrit manuellement).

Cette commande génère :

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
└── auth.service.ts
```

Créer manuellement les sous-dossiers et fichiers suivants :

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── onboarding.dto.ts
├── guards/
│   ├── auth.guard.ts
│   ├── roles.guard.ts
│   └── onboarding.guard.ts
├── decorators/
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
└── types/
    └── auth.types.ts
```

---

## Étape 7 — Types et interfaces

### `src/auth/types/auth.types.ts`

```typescript
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
```

---

## Étape 8 — DTOs

### `src/auth/dto/register.dto.ts`

```typescript
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

### `src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### `src/auth/dto/onboarding.dto.ts`

```typescript
import { IsUUID } from 'class-validator';

export class OnboardingDto {
  @IsUUID()
  promotionId: string;

  @IsUUID()
  groupId: string;
}
```

---

## Étape 9 — Décorateurs

### `src/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### `src/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
```

---

## Étape 10 — Guards

### `src/auth/guards/auth.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '../../lib/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const session = await auth.api.getSession({
      headers: request.headers as Headers,
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Authentication required');
    }

    (request as Request & { user: typeof session.user }).user = session.user;

    return true;
  }
}
```

### `src/auth/guards/roles.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### `src/auth/guards/onboarding.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../types/auth.types';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (user.role !== UserRole.STUDENT) {
      return true;
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!studentProfile) {
      throw new ForbiddenException(
        'Onboarding required before accessing this resource',
      );
    }

    return true;
  }
}
```

---

## Étape 11 — Service Auth

### `src/auth/auth.service.ts`

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { OnboardingDto } from './dto/onboarding.dto';
import { UserResponse } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async completeOnboarding(userId: string, dto: OnboardingDto): Promise<void> {
    const existingProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('Onboarding already completed');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { id: dto.promotionId },
    });

    if (!promotion || !promotion.isActive) {
      throw new NotFoundException('Promotion not found or inactive');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group || group.promotionId !== dto.promotionId) {
      throw new BadRequestException(
        'Group does not belong to the selected promotion',
      );
    }

    await this.prisma.studentProfile.create({
      data: {
        userId,
        promotionId: dto.promotionId,
        groupId: dto.groupId,
      },
    });
  }

  async createTeacherProfileIfMissing(userId: string): Promise<void> {
    const existing = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      await this.prisma.teacherProfile.create({
        data: { userId },
      });
    }
  }
}
```

---

## Étape 12 — Contrôleur Auth

### `src/auth/auth.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload, UserResponse } from './types/auth.types';
import { toNodeHandler } from 'better-auth/node';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('api/auth/*')
  @Get('api/auth/*')
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    return toNodeHandler(auth)(req, res);
  }

  @Get('api/auth/me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponse> {
    return this.authService.findUserById(user.sub);
  }

  @Post('api/auth/onboarding')
  @UseGuards(AuthGuard)
  async onboarding(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: OnboardingDto,
  ): Promise<{ message: string }> {
    await this.authService.completeOnboarding(currentUser.sub, dto);
    return { message: 'Onboarding completed successfully' };
  }
}
```

---

## Étape 13 — Module Auth

### `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '../lib/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BetterAuthModule.forRoot({ auth }), PrismaModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Étape 14 — Enregistrement dans AppModule

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
})
export class AppModule {}
```

---

## Étape 15 — PrismaService (si non existant)

Générer le module Prisma :

```bash
nest generate module prisma --no-spec
nest generate service prisma --no-spec
```

### `src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

### `src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## Récapitulatif des endpoints exposés

| Méthode | Route                     | Accès                 | Description                      |
| ------- | ------------------------- | --------------------- | -------------------------------- |
| POST    | `/api/auth/sign-up/email` | Public                | Inscription via Better Auth      |
| POST    | `/api/auth/sign-in/email` | Public                | Connexion via Better Auth        |
| POST    | `/api/auth/sign-out`      | Authentifié           | Déconnexion                      |
| GET     | `/api/auth/me`            | Authentifié           | Récupérer l'utilisateur connecté |
| POST    | `/api/auth/onboarding`    | Authentifié (STUDENT) | Compléter le profil étudiant     |

> Les routes `sign-up`, `sign-in`, et `sign-out` sont gérées nativement par Better Auth via le handler catch-all `api/auth/*`.

---

## Exemple d'utilisation des guards dans d'autres modules

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/auth.types';

@Controller('saes')
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class SaeController {
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return [];
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@CurrentUser() user: JwtPayload) {
    return {};
  }
}
```

---

## Checklist de validation

- [ ] `pnpm install` sans erreurs
- [ ] `npx prisma migrate dev` sans erreurs
- [ ] `npx prisma generate` sans erreurs
- [ ] `pnpm run start:dev` démarre sans erreurs
- [ ] `POST /api/auth/sign-up/email` crée un utilisateur en base
- [ ] `POST /api/auth/sign-in/email` retourne un cookie de session
- [ ] `GET /api/auth/me` retourne l'utilisateur sans le mot de passe
- [ ] `POST /api/auth/sign-out` supprime le cookie
- [ ] `POST /api/auth/onboarding` crée le `StudentProfile`
- [ ] Une route protégée sans cookie retourne `401`
- [ ] Une route avec `@Roles(TEACHER)` appelée par un STUDENT retourne `403`
- [ ] Un STUDENT sans onboarding sur une route métier retourne `403`
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
