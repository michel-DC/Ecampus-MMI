# Guide de Lancement et Développement — Ecampus

Ce document explique comment installer, lancer et contribuer au projet Ecampus.

---

## 1. Installation du Projet

### 1.1 Cloner le dépôt

Commencez par cloner le projet depuis GitHub :

```bash
$ git clone https://github.com/michel-DC/Ecampus-MMI.git
$ cd Ecampus-MMI
```

### 1.2 Configuration de l'environnement

Copiez le fichier d'exemple pour créer votre fichier local `.env` et remplissez les variables nécessaires (Database URL, Secrets Auth, etc.) :

```bash
$ cp .env.example .env
```

### 1.3 Installation des dépendances

Le projet utilise de préférence **pnpm**, mais l'utilisation de **npm** reste possible.

```bash
$ pnpm install  # (Conseillé)
# OU
$ npm install
```

### 1.4 Initialisation de la base de données

Générez le client Prisma et appliquez les migrations existantes :

```bash
$ pnpm prisma generate  # OU npx prisma generate
$ npx prisma migrate dev
```

---

## 2. Lancement de l'Application

### Mode Développement (avec auto-rechargement)

C'est la commande à utiliser lors du développement :

```bash
$ pnpm run start:dev
# OU
$ npm run start:dev
```

### Mode Production

```bash
$ pnpm run build
$ pnpm run start:prod
# OU
$ npm run build
$ npm run start:prod
```

---

## 3. Commandes Utiles (NestJS & Prisma)

### Générer une nouvelle ressource (Module, Controller, Service)

Utilisez cette commande pour créer un nouveau domaine métier proprement :

```bash
$ pnpm dlx @nestjs/cli generate resource [nom-du-domaine]
# OU
$ npx @nestjs/cli generate resource [nom-du-domaine]
```

_Note : Choisissez "REST API" et répondez "No" à la génération des points CRUD pour garder le contrôle sur votre code._

### Studio Prisma (Interface graphique pour voir la DB)

```bash
$ npx prisma studio
```

### Lancer les tests

```bash
$ pnpm run test      # Tests unitaires
$ pnpm run test:e2e  # Tests de bout en bout
# OU
$ npm run test
$ npm run test:e2e
```

---

## 4. Workflow de Développement (Git)

### 4.1 Stratégie de Branches

- **Branch `master`** : C'est la branche de production. Elle doit rester stable et fonctionnelle en permanence. **Il est strictement interdit de commit directement sur master.**
- **Branches de fonctionnalités (`feat/`)** : Pour toute nouvelle fonctionnalité, vous devez créer une branche dédiée.

### 4.2 Cycle de contribution type

1. **Création de branche** :
   ```bash
   $ git checkout master
   $ git pull origin master
   $ git checkout -b feat/ma-feature
   ```
2. **Développement** : Faites vos changements dans cette branche.
3. **Commit** : Utilisez des messages clairs (format Conventional Commits).
4. **Pull Request (PR)** : Poussez votre branche sur GitHub et ouvrez une PR vers `master`.
5. **Validation** : Toute PR doit être **validée par MOI (michel)** avant d'être fusionnée dans master.
