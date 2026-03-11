# TASK-006 — Séparation du Nom et Prénom Utilisateur

## Objectif

Améliorer la précision des données utilisateurs en remplaçant le champ générique `name` par deux champs distincts : `firstname` (prénom) et `lastname` (nom de famille). Cette migration doit être effectuée **sans perte de données** : les valeurs existantes du champ `name` sont transférées vers `firstname`. Toutes les réponses API retournant un utilisateur sont mises à jour pour refléter ce nouveau format.

---

## Stack concernée

- NestJS
- Better Auth
- Prisma ORM (migration SQL personnalisée)
- TypeScript + class-validator

---

## Périmètre

- [ ] Migration Prisma sans perte de données
- [ ] Mise à jour de la configuration Better Auth
- [ ] Mise à jour des DTOs (`RegisterDto`, `CreateTeacherDto`)
- [ ] Mise à jour des types et interfaces TypeScript
- [ ] Mise à jour de toutes les réponses API retournant un utilisateur
- [ ] Adaptation de la recherche utilisateur sur les deux champs

---

## Étape 1 — Migration Prisma

### 1.1 Mise à jour de `prisma/schema.prisma`

Remplacer le champ `name` par `firstname` et `lastname` dans le modèle `user` :

```prisma
model user {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  firstname     String
  lastname      String?
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
  announcements  Announcement[]
  submissions    StudentSubmission[]

  @@map("user")
}
```

> `lastname` est nullable (`String?`) pour assurer la compatibilité avec les données existantes après migration. `firstname` est obligatoire (`String`) car les données de l'ancien champ `name` y seront transférées.

### 1.2 Génération de la migration en mode manuel

```bash
npx prisma migrate dev --name separate-firstname-lastname --create-only
```

### 1.3 Édition du fichier SQL généré

Ouvrir le fichier SQL généré dans `prisma/migrations/` et le remplacer par le contenu suivant :

```sql
-- 1. Ajouter les nouvelles colonnes (nullable pour permettre la migration)
ALTER TABLE "user" ADD COLUMN "firstname" TEXT;
ALTER TABLE "user" ADD COLUMN "lastname" TEXT;

-- 2. Transférer les données existantes : name devient firstname
UPDATE "user" SET "firstname" = "name";

-- 3. Rendre firstname NOT NULL maintenant que toutes les lignes ont une valeur
ALTER TABLE "user" ALTER COLUMN "firstname" SET NOT NULL;

-- 4. Supprimer l'ancienne colonne name
ALTER TABLE "user" DROP COLUMN "name";
```

### 1.4 Appliquer la migration et régénérer le client

```bash
npx prisma migrate dev
npx prisma generate
```

---

## Étape 2 — Configuration Better Auth

### 2.1 Mise à jour de `src/lib/auth.ts`

Déclarer les deux nouveaux champs dans `additionalFields` et adapter le hook `before` pour les mapper correctement :

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
      firstname: {
        type: 'string',
        required: true,
      },
      lastname: {
        type: 'string',
        required: false,
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

---

## Étape 3 — Mise à jour des DTOs

### 3.1 `src/auth/dto/register.dto.ts`

Remplacer le champ `name` par `firstname` et `lastname`. Supprimer le champ `role` s'il est encore présent.

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;
}
```

### 3.2 `src/users/dto/create-teacher.dto.ts`

Remplacer le champ `name` par `firstname` et `lastname` :

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;
}
```

---

## Étape 4 — Mise à jour des types et interfaces

### 4.1 `src/auth/types/auth.types.ts`

Remplacer le champ `name: string` par l'objet structuré :

```typescript
import { UserRole } from '@prisma/client';

export interface UserName {
  firstname: string;
  lastname: string | null;
}

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
  name: UserName;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
```

### 4.2 `src/users/types/user.types.ts`

Mettre à jour `CreatedTeacherResponse` et `UserSearchResponse` :

```typescript
import { UserRole } from '@prisma/client';
import { UserName } from '../../auth/types/auth.types';

export interface CreatedTeacherResponse {
  id: string;
  email: string;
  name: UserName;
  role: UserRole;
  temporaryPassword: string;
  createdAt: Date;
}

export interface UserSearchResponse {
  id: string;
  email: string;
  name: UserName;
  role: UserRole;
}
```

### 4.3 `src/saes/types/sae.types.ts`

Mettre à jour `SaeAuthor` pour refléter le nouveau format :

```typescript
import { UserName } from '../../auth/types/auth.types';

export interface SaeAuthor {
  id: string;
  email: string;
  name: UserName;
}
```

---

## Étape 5 — Mise à jour des services

### 5.1 `src/auth/auth.service.ts`

Mettre à jour `findUserById` pour sélectionner `firstname` et `lastname` et construire l'objet `name` :

```typescript
async findUserById(userId: string): Promise<UserResponse> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundException('User not found');

  return {
    id: user.id,
    email: user.email,
    name: { firstname: user.firstname, lastname: user.lastname },
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
```

### 5.2 `src/users/users.service.ts`

**Mise à jour de `createTeacher`** — passer `firstname` et `lastname` à `auth.api.createUser` et adapter la réponse :

```typescript
async createTeacher(dto: CreateTeacherDto): Promise<CreatedTeacherResponse> {
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (existingUser) throw new ConflictException('A user with this email already exists');

  const temporaryPassword = this.generateTemporaryPassword();

  const response = await auth.api.createUser({
    body: {
      email: dto.email,
      firstname: dto.firstname,
      lastname: dto.lastname,
      password: temporaryPassword,
      role: 'TEACHER',
    },
  });

  if (!response || !response.user) {
    throw new InternalServerErrorException('Failed to create teacher account');
  }

  await this.mailService.sendTeacherCredentials({
    email: dto.email,
    name: `${dto.firstname} ${dto.lastname}`,
    temporaryPassword,
  });

  return {
    id: response.user.id,
    email: response.user.email,
    name: { firstname: dto.firstname, lastname: dto.lastname },
    role: UserRole.TEACHER,
    temporaryPassword,
    createdAt: new Date(response.user.createdAt),
  };
}
```

**Mise à jour de `searchUsers`** — recherche sur `firstname` et `lastname` :

```typescript
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
            { firstname: { contains: query, mode: 'insensitive' } },
            { lastname: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ]
        : undefined,
    },
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
    },
    take: limit,
    orderBy: { lastname: 'asc' },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: { firstname: user.firstname, lastname: user.lastname },
    role: user.role,
  }));
}
```

### 5.3 `src/saes/saes.service.ts`

Mettre à jour tous les `select` sur `createdBy` et les mappings de réponse :

```typescript
include: {
  createdBy: {
    select: { id: true, email: true, firstname: true, lastname: true },
  },
},
```

Et dans les mappings de retour :

```typescript
createdBy: {
  id: sae.createdBy.id,
  email: sae.createdBy.email,
  name: {
    firstname: sae.createdBy.firstname,
    lastname: sae.createdBy.lastname,
  },
},
```

> Cette mise à jour est à appliquer dans **toutes** les méthodes du service qui retournent un `SaeResponse` : `findAll`, `findOne`, `create`, `update`, `publish`.

---

## Étape 6 — Mise à jour du seed

### `prisma/seed.ts`

Si le seed crée des utilisateurs, remplacer le champ `name` par `firstname` et `lastname` :

```typescript
await prisma.user.create({
  data: {
    email: 'admin@example.com',
    firstname: 'Admin',
    lastname: 'Platform',
    role: 'ADMIN',
    // ...
  },
});
```

---

## Récapitulatif des impacts

| Fichier                               | Changement                                            |
| ------------------------------------- | ----------------------------------------------------- |
| `prisma/schema.prisma`                | `name` → `firstname` + `lastname`                     |
| `prisma/migrations/*/migration.sql`   | Migration SQL manuelle sans perte                     |
| `src/lib/auth.ts`                     | `additionalFields` : ajout `firstname`, `lastname`    |
| `src/auth/dto/register.dto.ts`        | `name` → `firstname` + `lastname`, suppression `role` |
| `src/users/dto/create-teacher.dto.ts` | `name` → `firstname` + `lastname`                     |
| `src/auth/types/auth.types.ts`        | `UserResponse.name` → objet `UserName`                |
| `src/users/types/user.types.ts`       | Même mise à jour                                      |
| `src/saes/types/sae.types.ts`         | `SaeAuthor.name` → objet `UserName`                   |
| `src/auth/auth.service.ts`            | `select` et mapping mis à jour                        |
| `src/users/users.service.ts`          | `createTeacher` + `searchUsers` mis à jour            |
| `src/saes/saes.service.ts`            | Tous les `select` + mappings `createdBy` mis à jour   |
| `prisma/seed.ts`                      | `name` → `firstname` + `lastname`                     |

---

## Checklist de validation

- [ ] Migration appliquée sans erreur
- [ ] Les anciens comptes ont leur `name` transféré dans `firstname`, `lastname` est `null`
- [ ] Inscription avec `firstname` et `lastname` manquants retourne `400`
- [ ] Inscription publique : `role` dans le body est ignoré, compte créé en `STUDENT`
- [ ] `GET /api/auth/me` retourne `name: { firstname, lastname }`
- [ ] `POST /api/users/teachers` crée un prof avec `firstname` et `lastname`
- [ ] `GET /api/users?q=dupont` trouve des résultats sur le `lastname`
- [ ] `GET /api/users?q=jean` trouve des résultats sur le `firstname`
- [ ] `GET /api/saes` retourne `createdBy.name` avec le nouveau format
- [ ] `GET /api/saes/:id` retourne `createdBy.name` avec le nouveau format
- [ ] Aucun `any` dans le code TypeScript
- [ ] Aucun commentaire dans le code
