# Architecture Globale du Projet — Ecampus

Ce document détaille l'organisation technique du projet Ecampus, de la racine jusqu'à la logique interne des modules.

---

## 1. Point d'Entrée de l'Application (`src/main.ts`)

Le fichier `main.ts` est le "cerveau" au démarrage. C'est ici que l'application NestJS est instanciée. Ses responsabilités critiques sont :
- **Bootstrap** : Lancement du serveur sur le port défini.
- **Sécurité Globale** : Configuration des headers de sécurité et du CORS.
- **Validation** : Activation du `ValidationPipe` global, qui intercepte chaque requête pour vérifier sa conformité avec les DTOs avant qu'elle n'atteigne les contrôleurs.
- **Middlewares** : Gestion du BodyParser (désactivé pour Better Auth) et autres middlewares globaux.

---

## 2. Couche de Données (`prisma/`)

Le dossier `prisma/` centralise tout ce qui concerne la structure de la base de données.
- **`schema.prisma`** : C'est la **source de vérité** unique du projet. Il définit les tables (User, Sae, Grade, etc.), leurs relations et génère automatiquement le client TypeScript pour un typage parfait.
- **Migrations** : Historique des changements de structure de la base. Chaque modification du schéma génère un fichier SQL horodaté, garantissant que tous les environnements (dev, prod) sont synchronisés.
- **Seeds** : Scripts permettant de peupler la base de données avec des données de test ou de configuration initiale (promotions, semestres).

---

## 3. Architecture du Code (`src/`)

Le dossier `src/` suit une architecture **modulaire** où chaque dossier représente un domaine métier complet.

### Structure d'un Module
Chaque fonctionnalité (ex: `grades`, `saes`) est encapsulée de la manière suivante :

```text
src/[domaine]/
├── [domaine].module.ts      # Déclare les composants et gère les dépendances (le "câblage").
├── [domaine].controller.ts  # Point d'entrée HTTP : routes, guards et validation d'entrée.
├── [domaine].service.ts     # Cœur métier : calculs, règles de gestion et appels Prisma.
├── dto/                     # Validation des données entrantes.
└── types/                   # Définitions des contrats de données internes et de sortie.
```

#### Rôle du Contrôleur vs Service
- **Le Contrôleur** reçoit l'ordre : il vérifie "qui" appelle (Guards) et "quoi" est envoyé (DTO).
- **Le Service** exécute l'ordre : il sait "comment" faire (logique métier) et communique avec la base de données.

---

## 4. Gestion des Données (DTO & Types)

### DTO (Data Transfer Object)
Situés dans `dto/`, ils servent à **valider les données extérieures** envoyées dans les requêtes POST/PATCH. Ils utilisent des décorateurs pour rejeter automatiquement les mauvaises données.

```typescript
// Extrait de DTO
export class CreateGradeCategoryDto {
  @IsString()
  @MinLength(2)
  name: string; // Garantit que le nom est fourni et assez long
}
```

### Types et Interfaces
Situés dans `types/`, ils définissent la **structure des objets** utilisés par les développeurs. Ils servent à typer les réponses de l'API ou les objets complexes circulant entre les services.

```typescript
// Extrait de Type
export interface MyGradesResponse {
  data: SubmissionGradesResponse[]; // Liste des rendus notés
  globalAverage: number;            // Moyenne générale calculée
}
```

---

## 5. Stratégie de Tests (`test/`)

Le dossier `test/` à la racine est dédié aux **tests de bout en bout (E2E)**.
- Contrairement aux tests unitaires (placés à côté des fichiers `.ts` dans `src/`), les tests E2E simulent de vraies requêtes HTTP sur l'API complète.
- Ils permettent de valider que les modules communiquent bien entre eux et que la base de données réagit correctement à un scénario utilisateur réel (ex: un étudiant qui se connecte et dépose un rendu).
