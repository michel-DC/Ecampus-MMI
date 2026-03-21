# Stack Technique — Ecampus

Ce document liste l'ensemble des technologies et dépendances utilisées pour le développement du projet Ecampus.

---

## 1. Cœur de la Stack

Ces technologies constituent la base architecturale du projet :

- **Framework Backend** : [NestJS (v11)](https://nestjs.com/) — Framework Node.js progressif pour construire des applications côté serveur efficaces et scalables.
- **Langage** : [TypeScript](https://www.typescriptlang.org/) — Sursensemble de JavaScript ajoutant un typage statique fort.
- **Base de Données** : [PostgreSQL](https://www.postgresql.org/) — Système de gestion de base de données relationnelle.
- **ORM** : [Prisma](https://www.prisma.io/) — ORM moderne pour Node.js et TypeScript, utilisé pour la modélisation des données et les migrations.
- **Authentification** : [Better Auth](https://www.better-auth.com/) — Solution d'authentification complète intégrée via `@thallesp/nestjs-better-auth`.

---

## 2. Dépendances Majeures

Services et bibliothèques clés pour les fonctionnalités métier :

- **Stockage de Fichiers** : [UploadThing](https://uploadthing.com/) — Gestion simplifiée de l'upload et de l'hébergement de fichiers (rendus étudiants, documents SAE).
- **Emails Transactionnels** : [Resend](https://resend.com/) — API d'envoi d'emails pour les notifications et les identifiants professeurs.
- **Manipulation Excel** : [XLSX (SheetJS)](https://sheetjs.com/) — Lecture et génération de fichiers Excel pour le système de notation.
- **Validation** : [class-validator](https://github.com/typestack/class-validator) & **class-transformer** — Validation des données d'entrée (DTOs) et transformation d'objets.

---

## 3. Utilitaires et Autres Dépendances

- **Configuration** : `@nestjs/config` — Gestion des variables d'environnement.
- **Réactivité** : `rxjs` — Programmation réactive pour la gestion des flux de données.
- **Métadonnées** : `reflect-metadata` — Requis par NestJS pour les décorateurs.

---

## 4. Environnement de Développement et Qualité

- **Gestionnaire de Paquets** : [pnpm](https://pnpm.io/) (conseillé) ou npm.
- **Linter** : [ESLint](https://eslint.org/) — Analyse statique du code pour garantir la qualité.
- **Formatage** : [Prettier](https://prettier.io/) — Formatage automatique du code.
- **Tests** : [Jest](https://jestjs.io/) — Framework de test pour les tests unitaires et de bout en bout (E2E).
- **Outils Prisma** : `prisma` (CLI) et `@prisma/client`.
- **Exécution TS** : `ts-node` & `tsconfig-paths`.
