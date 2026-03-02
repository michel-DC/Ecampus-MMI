# AGENTS.md — Règles de développement pour agents IA

Ce fichier définit les règles **strictes et non-négociables** que tout agent IA doit respecter lors du développement de ce projet. Ces règles s'appliquent à chaque ligne de code produite, sans exception.

---

## 1. Règles TypeScript

### 1.1 Typage strict — TOUJOURS typer, JAMAIS `any`

```typescript
// ❌ INTERDIT
const user: any = await this.userService.findById(id);
function getRole(user) {
  return user.role;
}

// ✅ CORRECT
const user: User = await this.userService.findById(id);
function getRole(user: User): UserRole {
  return user.role;
}
```

### 1.2 Types explicites sur toutes les fonctions

Chaque fonction doit avoir :

- Les types de tous ses paramètres
- Un type de retour explicite (y compris `Promise<T>`, `void`, `boolean`)

```typescript
// ❌ INTERDIT
async function createUser(data) {
  return this.prisma.user.create({ data });
}

// ✅ CORRECT
async function createUser(data: CreateUserDto): Promise<User> {
  return this.prisma.user.create({ data });
}
```

### 1.3 Interfaces et types

- Utiliser `interface` pour les shapes d'objets
- Utiliser `type` pour les unions, intersections, aliases
- Ne jamais utiliser des objets non typés (`{}`, `object`)

```typescript
// ❌ INTERDIT
const payload: object = { sub: user.id };

// ✅ CORRECT
interface JwtPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}
const payload: JwtPayload = {
  sub: user.id,
  role: user.role,
  iat: now,
  exp: expiry,
};
```

### 1.4 Enums Prisma

Toujours utiliser les enums Prisma générés, jamais de strings brutes.

```typescript
// ❌ INTERDIT
if (user.role === 'TEACHER') { ... }

// ✅ CORRECT
import { UserRole } from '@prisma/client';
if (user.role === UserRole.TEACHER) { ... }
```

### 1.5 `strictNullChecks`

Toujours gérer les cas `null` et `undefined` explicitement.

```typescript
// ❌ INTERDIT
const user = await this.prisma.user.findUnique({ where: { id } });
return user.email; // peut planter si user est null

// ✅ CORRECT
const user = await this.prisma.user.findUnique({ where: { id } });
if (!user) throw new NotFoundException('User not found');
return user.email;
```

---

## 2. Règles de style et formatage

### 2.1 JAMAIS de commentaires dans le code

Le code doit être auto-documenté par des noms explicites. Les commentaires sont **strictement interdits**.

```typescript
// ❌ INTERDIT
// Vérifier si l'utilisateur existe
const user = await this.prisma.user.findUnique({ where: { email } });
// Comparer le mot de passe
const isValid = await bcrypt.compare(password, user.passwordHash);

// ✅ CORRECT
const user = await this.prisma.user.findUnique({ where: { email } });
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
```

### 2.2 Nommage explicite

- Les variables, fonctions et classes doivent avoir des noms qui décrivent leur intention
- Pas d'abréviations non standard (`usr`, `pwd`, `tmp`, `val`)
- Les booléens commencent par `is`, `has`, `can`, `should`

```typescript
// ❌ INTERDIT
const u = await findUser(id);
const valid = checkPwd(pwd, hash);
let flag = false;

// ✅ CORRECT
const user = await findUserById(id);
const isPasswordValid = await comparePassword(plainPassword, passwordHash);
let isOnboardingComplete = false;
```

### 2.3 Pas de magic strings / magic numbers

```typescript
// ❌ INTERDIT
if (user.role === 'TEACHER') { ... }
const saltRounds = 10;

// ✅ CORRECT
const BCRYPT_SALT_ROUNDS = 12;
if (user.role === UserRole.TEACHER) { ... }
```

---

## 3. Architecture NestJS

### 3.1 Structure des modules

Chaque domaine métier a son propre module avec la structure suivante :

```
src/
└── [domain]/
    ├── [domain].module.ts
    ├── [domain].controller.ts
    ├── [domain].service.ts
    ├── dto/
    │   ├── create-[domain].dto.ts
    │   └── update-[domain].dto.ts
    └── types/
        └── [domain].types.ts
```

### 3.2 Séparation des responsabilités

- **Controller** : réception des requêtes HTTP, délégation au service, retour de la réponse
- **Service** : logique métier, appels Prisma, règles de validation
- **DTO** : validation des données entrantes

```typescript
// ✅ Controller : ne contient PAS de logique métier
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
async createSae(
  @Body() dto: CreateSaeDto,
  @Req() req: AuthenticatedRequest,
): Promise<SaeResponse> {
  return this.saeService.create(dto, req.user.sub);
}

// ✅ Service : contient la logique métier
async create(dto: CreateSaeDto, createdById: string): Promise<SaeResponse> {
  const semester = await this.prisma.semester.findUnique({ where: { id: dto.semesterId } });
  if (!semester) throw new NotFoundException('Semester not found');
  return this.prisma.sae.create({ data: { ...dto, createdById } });
}
```

### 3.3 Guards

- `AuthGuard` : vérifie la validité du JWT sur toutes les routes protégées
- `RolesGuard` : vérifie le rôle de l'utilisateur après `AuthGuard`
- `OnboardingGuard` : vérifie que le `StudentProfile` existe pour les étudiants

```typescript
// ✅ Utilisation correcte des guards
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
```

### 3.4 Injection de dépendances

Toujours utiliser l'injection via le constructeur, jamais d'instanciation manuelle.

```typescript
// ❌ INTERDIT
const prisma = new PrismaClient();

// ✅ CORRECT
constructor(private readonly prisma: PrismaService) {}
```

---

## 4. DTOs et validation

### 4.1 Toujours utiliser class-validator

Chaque DTO doit utiliser les décorateurs de `class-validator` et `class-transformer`.

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

### 4.2 Séparer DTO de création et de mise à jour

```typescript
export class CreateSaeDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsUUID()
  semesterId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  dueDate: string;
}

export class UpdateSaeDto extends PartialType(CreateSaeDto) {}
```

### 4.3 Types de retour des API (Response types)

Ne jamais retourner directement les entités Prisma brutes. Définir des types de réponse explicites qui excluent les champs sensibles.

```typescript
export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface SaeResponse {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'finished';
  startDate: Date;
  dueDate: Date;
  isPublished: boolean;
  createdAt: Date;
}
```

---

## 5. Prisma — Règles d'utilisation

### 5.1 Toujours sélectionner les champs nécessaires

Ne jamais récupérer tous les champs par défaut si ce n'est pas nécessaire.

```typescript
// ❌ INTERDIT — récupère passwordHash et toutes les données inutiles
const user = await this.prisma.user.findUnique({ where: { id } });

// ✅ CORRECT
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    role: true,
    isActive: true,
  },
});
```

### 5.2 Soft delete — toujours filtrer `deletedAt`

```typescript
// ❌ INTERDIT — peut retourner des SAE supprimées
const saes = await this.prisma.sae.findMany();

// ✅ CORRECT
const saes = await this.prisma.sae.findMany({
  where: { deletedAt: null },
});
```

### 5.3 Transactions pour les opérations multiples

```typescript
// ✅ CORRECT — utiliser $transaction pour les opérations atomiques
const [studentProfile] = await this.prisma.$transaction([
  this.prisma.studentProfile.create({
    data: { userId, promotionId, groupId },
  }),
]);
```

---

## 6. Gestion des erreurs

### 6.1 Utiliser les exceptions NestJS

```typescript
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

// ✅ CORRECT
if (!user) throw new NotFoundException('User not found');
if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
if (existingUser) throw new ConflictException('Email already in use');
```

### 6.2 Messages d'erreur génériques sur les routes auth

Ne jamais révéler si un email existe ou non en réponse aux erreurs de login.

```typescript
// ❌ INTERDIT
if (!user) throw new NotFoundException('No user found with this email');
if (!isPasswordValid) throw new UnauthorizedException('Wrong password');

// ✅ CORRECT
if (!user || !isPasswordValid) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### 6.3 Pas de try/catch vides

```typescript
// ❌ INTERDIT
try {
  await this.prisma.user.create({ data });
} catch (e) {}

// ✅ CORRECT
try {
  await this.prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002')
    throw new ConflictException('Email already in use');
  throw error;
}
```

---

## 7. Sécurité

### 7.1 Jamais de données sensibles dans le JWT

```typescript
// ❌ INTERDIT
const payload = {
  sub: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
};

// ✅ CORRECT
const payload: JwtPayload = {
  sub: user.id,
  role: user.role,
  iat: now,
  exp: expiry,
};
```

### 7.2 Variables d'environnement

Toutes les valeurs sensibles (secrets JWT, credentials DB, clés API) doivent être dans des variables d'environnement. Jamais de valeurs hardcodées.

```typescript
// ❌ INTERDIT
const secret = 'my-super-secret-key';

// ✅ CORRECT
const secret = this.configService.get<string>('JWT_SECRET');
if (!secret) throw new Error('JWT_SECRET is not defined');
```

### 7.3 Vérification des rôles côté backend uniquement

La vérification des rôles ne doit jamais dépendre de données envoyées par le client. Elle repose toujours sur le JWT décodé.

```typescript
// ❌ INTERDIT — confiance au corps de la requête
const role = req.body.role;

// ✅ CORRECT — confiance au JWT uniquement
const role = req.user.role;
```

---

## 8. Calcul du statut des SAE

Le statut d'une SAE est toujours calculé dynamiquement, jamais stocké en base.

```typescript
type SaeStatus = 'draft' | 'upcoming' | 'ongoing' | 'finished';

function computeSaeStatus(sae: {
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

---

## 9. Conventions de nommage des fichiers

| Type            | Convention               | Exemple             |
| --------------- | ------------------------ | ------------------- |
| Module          | `[domain].module.ts`     | `auth.module.ts`    |
| Controller      | `[domain].controller.ts` | `sae.controller.ts` |
| Service         | `[domain].service.ts`    | `sae.service.ts`    |
| DTO création    | `create-[domain].dto.ts` | `create-sae.dto.ts` |
| DTO mise à jour | `update-[domain].dto.ts` | `update-sae.dto.ts` |
| Guard           | `[name].guard.ts`        | `roles.guard.ts`    |
| Strategy        | `[name].strategy.ts`     | `jwt.strategy.ts`   |
| Types           | `[domain].types.ts`      | `sae.types.ts`      |

---

## 10. Checklist avant chaque PR / génération de code

- [ ] Aucun `any` dans le code TypeScript
- [ ] Tous les paramètres de fonction sont typés
- [ ] Tous les retours de fonction sont typés
- [ ] Aucun commentaire dans le code
- [ ] Les noms sont explicites et auto-documentés
- [ ] Les DTOs utilisent `class-validator`
- [ ] Les réponses API n'exposent pas `passwordHash` ni données sensibles
- [ ] Les requêtes Prisma filtrent `deletedAt: null` quand applicable
- [ ] Les erreurs auth retournent des messages génériques
- [ ] Aucune valeur sensible hardcodée
- [ ] Les rôles sont vérifiés via le JWT, jamais via le body
- [ ] Le statut SAE est calculé dynamiquement, jamais stocké
- [ ] Les enums Prisma sont utilisés (jamais de strings brutes)
