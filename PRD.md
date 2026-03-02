# PRD — Plateforme de gestion des SAE (Backend)

## 1. Vue d'ensemble du projet

Ce projet est le **backend** d'une plateforme pédagogique de gestion des **SAE (Situations d'Apprentissage et d'Évaluation)**. Il s'agit d'un système multi-rôles permettant à des étudiants, enseignants et visiteurs publics d'interagir avec des projets académiques structurés (SAE), des rendus, des annonces et des documents.

---

## 2. Stack technique

| Outil                | Usage                                       |
| -------------------- | ------------------------------------------- |
| **NestJS**           | Framework backend principal                 |
| **TypeScript**       | Langage de développement                    |
| **Prisma ORM**       | Accès et modélisation de la base de données |
| **PostgreSQL**       | Base de données relationnelle               |
| **Better Auth**      | Gestion de l'authentification (JWT)         |
| **bcrypt**           | Hachage des mots de passe                   |
| **JWT stateless**    | Stratégie d'authentification                |
| **Cookie HTTP-only** | Transport du token JWT                      |
| **Resend**           | Envoi d'emails transactionnels              |
| **Cloudflare R2**    | Stockage des fichiers (documents, images)   |

---

## 3. Rôles utilisateurs

Le système distingue trois rôles principaux :

- **STUDENT** : étudiant rattaché à une promotion et un groupe
- **TEACHER** : enseignant pouvant créer/gérer des SAE
- **ADMIN** : administrateur avec accès étendu

Chaque rôle conditionne les ressources accessibles et les actions autorisées. La vérification des rôles est **exclusivement côté backend**.

---

## 4. Authentification

### Architecture

- Stateless via JWT transporté dans un cookie HTTP-only
- Better Auth gère la validation des credentials, génération et vérification du JWT
- bcrypt avec 10–12 salt rounds pour le hachage des mots de passe

### Endpoints Auth

| Méthode | Route                  | Description                                   |
| ------- | ---------------------- | --------------------------------------------- |
| POST    | `/api/auth/register`   | Création de compte                            |
| POST    | `/api/auth/login`      | Connexion + émission du JWT                   |
| POST    | `/api/auth/logout`     | Suppression du cookie                         |
| GET     | `/api/auth/me`         | Récupération de l'utilisateur authentifié     |
| POST    | `/api/auth/onboarding` | Complétion du profil après première connexion |

### Workflow Register

1. Validation des données entrantes
2. Vérification unicité de l'email
3. Hash du mot de passe (bcrypt)
4. Création de l'utilisateur en base
5. Génération du JWT
6. Envoi dans un cookie sécurisé

### Workflow Login

1. Recherche de l'utilisateur par email
2. Vérification existence + `isActive = true`
3. Comparaison bcrypt
4. Mise à jour de `lastLoginAt`
5. Génération JWT
6. Envoi cookie HTTP-only

### Workflow Logout

- Suppression du cookie côté serveur uniquement
- Aucune action en base de données

### Structure JWT (payload)

```json
{
  "sub": "userId",
  "role": "STUDENT | TEACHER | ADMIN",
  "iat": 1234567890,
  "exp": 1234567890
}
```

> Ne jamais inclure : mot de passe, email, données sensibles, permissions détaillées.

### Sécurité Cookie

```
httpOnly: true
secure: true (production)
sameSite: strict
maxAge: cohérent avec exp du JWT (1 à 7 jours)
```

### Protection

- Rate limiting sur la route `/login`
- Messages d'erreur génériques (ne pas exposer si l'email existe)
- Vérification des rôles uniquement côté backend

---

## 5. Onboarding

### Principe

L'onboarding est une étape post-inscription permettant de compléter le profil selon le rôle.

### Professeur (TEACHER)

- Aucun onboarding requis
- Le `TeacherProfile` est créé automatiquement à l'inscription
- Accès immédiat à la plateforme

### Étudiant (STUDENT)

Après inscription et première authentification :

1. Le backend détecte l'absence de `StudentProfile`
2. L'accès aux routes métier est restreint via un Guard dédié
3. L'étudiant doit renseigner :
   - Sa **promotion** (1ère, 2ème ou 3ème année)
   - Son **groupe** (Groupe A ou Groupe B)
4. Le backend vérifie que la promotion existe et que le groupe appartient à cette promotion
5. Création du `StudentProfile`
6. L'onboarding est marqué comme complété

### Règles métier onboarding

- Un étudiant appartient à **une seule promotion active**
- Un étudiant appartient à **un seul groupe**
- Un groupe est toujours rattaché à une promotion
- Un professeur n'a pas de rattachement promotionnel

---

## 6. Modélisation de la base de données

### Schéma Prisma complet

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

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  role              UserRole  @default(STUDENT)
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  passwordUpdatedAt DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  studentProfile StudentProfile?
  teacherProfile TeacherProfile?
  createdSaes    Sae[]
  saeInvitations SaeInvitation[]

  @@index([email])
}

model StudentProfile {
  id          String @id @default(uuid())
  userId      String @unique
  promotionId String
  groupId     String

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  promotion Promotion @relation(fields: [promotionId], references: [id])
  group     Group     @relation(fields: [groupId], references: [id])

  createdAt DateTime @default(now())
}

model TeacherProfile {
  id     String @id @default(uuid())
  userId String @unique

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  saes      Sae[]

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

  semester    Semester       @relation(fields: [semesterId], references: [id])
  createdBy   User           @relation(fields: [createdById], references: [id])
  invitations SaeInvitation[]
  documents   SaeDocument[]
  announcements Announcement[]

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
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([saeId, userId])
}

model SaeDocument {
  id       String @id @default(uuid())
  saeId    String
  url      String
  mimeType String
  size     Int
  type     DocumentType

  sae Sae @relation(fields: [saeId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}

enum DocumentType {
  INSTRUCTION
  RESOURCE
  SUBMISSION
}

model Announcement {
  id      String @id @default(uuid())
  saeId   String
  title   String
  content String @db.Text

  sae Sae @relation(fields: [saeId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 7. Gestion des SAE

### Cycle de vie d'une SAE

L'état d'une SAE est **calculé dynamiquement** — aucun champ `status` n'est stocké en base :

| État          | Condition                   |
| ------------- | --------------------------- |
| **Brouillon** | `isPublished = false`       |
| **À venir**   | Publiée + `now < startDate` |
| **En cours**  | `startDate ≤ now ≤ dueDate` |
| **Terminée**  | `now > dueDate`             |

### Création d'une SAE

1. Vérification du rôle (TEACHER ou ADMIN)
2. Validation des champs obligatoires
3. Vérification que le semestre existe
4. Création avec `isPublished = false` (brouillon)

### Publication

Une SAE est publiée en passant `isPublished = true`. Elle doit obligatoirement avoir :

- un `startDate`
- un `dueDate`
- un `semesterId` valide

### Règles métier SAE

- `dueDate` doit être postérieure à `startDate`
- Impossible de modifier les dates si des rendus existent
- La suppression est **logique** (soft delete via `deletedAt`)
- La modification met à jour automatiquement `updatedAt`

### Invitations enseignants sur une SAE

- Seul un TEACHER ou ADMIN peut inviter un autre TEACHER
- Le professeur invité doit exister et avoir le rôle `TEACHER`
- Un enseignant ne peut être invité qu'une seule fois par SAE (`@@unique([saeId, userId])`)
- Le `createdById` reste inchangé

---

## 8. Gestion des fichiers

- Les fichiers sont uploadés sur **Cloudflare R2**
- Stockés dans un bucket structuré par SAE
- **Jamais stockés en base** : seule l'URL de référence est conservée
- Métadonnées stockées en base : URL, type MIME, taille, type de document

Types de documents :

- `INSTRUCTION` : consignes de la SAE
- `RESOURCE` : ressources pédagogiques
- `SUBMISSION` : rendus étudiants

---

## 9. Emails (Resend)

Le service d'email est déclenché par des événements backend :

- Nouvelle annonce sur une SAE
- Confirmation de dépôt de livrable
- Rappels d'échéance

---

## 10. Architecture des modules NestJS

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── jwt.guard.ts
│   └── roles.guard.ts
├── users/
├── saes/
├── documents/
├── announcements/
├── promotions/
├── groups/
├── emails/
└── prisma/
```

---

## 11. API — Grands blocs

### Authentification

`/api/auth/*` — voir section 4

### SAE

- `GET /api/saes` — liste des SAE (avec filtres)
- `GET /api/saes/:id` — détail d'une SAE
- `POST /api/saes` — création (TEACHER/ADMIN)
- `PATCH /api/saes/:id` — modification (TEACHER/ADMIN)
- `DELETE /api/saes/:id` — suppression logique (TEACHER/ADMIN)
- `POST /api/saes/:id/publish` — publication
- `POST /api/saes/:id/invitations` — invitation enseignant

### Documents

- `POST /api/saes/:id/documents` — upload de document
- `GET /api/saes/:id/documents` — liste des documents
- `DELETE /api/documents/:id` — suppression

### Annonces

- `POST /api/saes/:id/announcements` — création d'annonce
- `GET /api/saes/:id/announcements` — liste des annonces

### Promotions & Groupes

- `GET /api/promotions` — liste des promotions
- `GET /api/promotions/:id/groups` — groupes d'une promotion

---

## 12. Règles de sécurité générales

- Toutes les routes sensibles sont protégées par `AuthGuard`
- Les permissions sont vérifiées **uniquement côté backend**
- Les données retournées sont adaptées selon le rôle de l'utilisateur
- Validation stricte des entrées sur toutes les routes (DTOs)
- Gestion propre et centralisée des erreurs
- Aucune donnée sensible dans les réponses API ni dans le JWT
