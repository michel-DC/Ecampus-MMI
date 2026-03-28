# Stratégie de Tests — Ecampus

Ce document explique l'infrastructure, l'organisation et la procédure pour exécuter les tests de l'API Ecampus.

---

## 1. Stack de Test

Le projet utilise une stack moderne et performante pour garantir la stabilité des 56 endpoints :

- **Moteur de test** : [Vitest](https://vitest.dev/) (Remplace Jest pour un support natif de l'ESM et une vitesse accrue).
- **Client HTTP** : [Supertest](https://github.com/ladjs/supertest) pour simuler les appels aux contrôleurs NestJS.
- **Base de données** : PostgreSQL (Base isolée pour les tests).
- **Compilation** : SWC via `unplugin-swc` pour une exécution ultra-rapide des fichiers TypeScript.

---

## 2. Infrastructure et Isolation

### Base de Données de Test
Chaque suite de tests s'exécute sur une base de données dédiée afin de ne pas corrompre les données de développement ou de production.
- **Variable d'environnement** : `DATABASE_URL_TEST`.
- **Nettoyage automatique** : Avant chaque test (`beforeEach`), toutes les tables sont vidées (`TRUNCATE CASCADE`) via l'utilitaire `TestSetup`.

### Authentification (Mocking)
Pour tester les routes protégées sans dépendre de la complexité de Better Auth en environnement de test, un **Middleware de Mock** est utilisé :
- Il intercepte les headers `Authorization: Bearer <token>` ou `x-test-session-token`.
- Il injecte directement l'utilisateur correspondant depuis la base de données dans la requête NestJS.
- Cela permet de simuler tous les rôles (`ADMIN`, `TEACHER`, `STUDENT`) de manière fiable.

---

## 3. Organisation des Tests

Les tests sont situés dans le dossier `test/` à la racine :

- **`utils/test-setup.ts`** : Cœur de l'infrastructure (Init NestJS, nettoyage DB, utilitaires de création d'utilisateurs).
- **`auth.e2e-spec.ts`** : Tests du profil, onboarding et gestion des rôles.
- **`sae.e2e-spec.ts`** : Cycle de vie des SAE (Création, publication, invitations, soft-delete).
- **`submissions.e2e-spec.ts`** : Rendus étudiants, gestion de la visibilité et dates limites.
- **`grades-milestones.e2e-spec.ts`** : Suivi des paliers et système de notation.
- **`users-announcements.e2e-spec.ts`** : Administration des utilisateurs et annonces.

---

## 4. Lancement des Tests

### Prérequis
Assurez-vous d'avoir une base de données locale vide et d'ajouter son URL dans votre fichier `.env` :
```env
DATABASE_URL_TEST="postgresql://USER:PASSWORD@localhost:5432/ecampus_test"
```

### Commandes

**Lancer tous les tests (Mode unique)**
```bash
$ pnpm vitest run
```

**Lancer les tests en mode "Watch" (Développement)**
```bash
$ pnpm vitest
```

**Exécuter une suite de tests spécifique**
```bash
$ pnpm vitest run test/sae.e2e-spec.ts
```

---

## 5. Règles d'Or pour les Tests
1. **Séquentialité** : Les tests s'exécutent un par un (`fileParallelism: false`) pour éviter les deadlocks sur PostgreSQL.
2. **Indépendance** : Un test ne doit jamais dépendre du résultat d'un autre.
3. **Données de référence** : Utilisez les fonctions `createBasics()` ou `createTestUser()` dans vos fichiers de test pour initialiser vos dépendances (Promos, Semestres).
