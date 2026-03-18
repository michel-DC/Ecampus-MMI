# Documentation des Endpoints API — Ecampus

Ce document réunit l'ensemble des points d'entrée de l'API avec les permissions associées.

---

## Authentification et Onboarding

Les routes d'authentification de base sont gérées par Better Auth.

### 1. Inscription (Sign Up)

- **Méthode** : POST
- **URL** : /api/auth/sign-up
- **Rôle** : PUBLIC
- **Body** :

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstname": "Jean",
  "lastname": "Dupont"
}
```

- **Note** : Le rôle est automatiquement défini à STUDENT lors de l'inscription publique.

### 2. Connexion (Sign In)

- **Méthode** : POST
- **URL** : /api/auth/sign-in/email
- **Rôle** : PUBLIC
- **Body** :

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Déconnexion (Sign Out)

- **Méthode** : POST
- **URL** : /api/auth/sign-out
- **Rôle** : CONNECTÉ (Tous rôles)
- **Description** : Termine la session actuelle.

### 4. Utilisateur Actuel (Me)

- **Méthode** : GET
- **URL** : /api/auth/me
- **Rôle** : CONNECTÉ (Tous rôles)
- **Sécurité** : AuthGuard
- **Description** : Retourne les informations de l'utilisateur connecté.

### 5. Onboarding Étudiant

- **Méthode** : POST
- **URL** : /api/auth/onboarding
- **Rôle** : STUDENT uniquement
- **Sécurité** : AuthGuard, RolesGuard
- **Body** :

```json
{
  "promotionId": "UUID_DE_LA_PROMOTION",
  "groupId": "UUID_DU_DU_GROUPE",
  "imageUrl": "URL_DE_L_IMAGE_DE_PROFIL"
}
```

### 6. Recherche d'Utilisateurs

- **Méthode** : GET
- **URL** : /api/resources/users
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Filtres (Query)** :
  - q : Recherche par prénom, nom ou email (insensible à la casse).
  - role : Filtrer par STUDENT, TEACHER ou ADMIN.
  - limit : Nombre de résultats (défaut: 20).
- **Description** : Permet de trouver un utilisateur pour l'inviter dans une SAE ou consulter son profil.

### 7. Créer un Compte Professeur

- **Méthode** : POST
- **URL** : /api/auth/sign-up/teacher
- **Rôle** : ADMIN uniquement
- **Sécurité** : AuthGuard, RolesGuard
- **Body** :

```json
{
  "email": "prof@example.com",
  "firstname": "Jean",
  "lastname": "Dupont"
}
```

- **Description** : Crée un compte professeur avec un mot de passe temporaire généré automatiquement. Un email est envoyé au professeur avec ses identifiants.

### 8. Changer son Mot de Passe

- **Méthode** : POST
- **URL** : /api/auth/change-password
- **Rôle** : Authentifié (Tous rôles)
- **Sécurité** : AuthGuard
- **Body** :

```json
{
  "oldPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

---

## Ressources Pédagogiques

### 9. Liste des Promotions

- **Méthode** : GET
- **URL** : /api/resources/promotions
- **Rôle** : PUBLIC
- **Description** : Liste toutes les promotions (MMI1, MMI2, etc.) ainsi que les archives historiques.

### 10. Liste des Groupes

- **Méthode** : GET
- **URL** : /api/resources/groups
- **Rôle** : PUBLIC
- **Description** : Liste tous les groupes de TD/TP (GROUPEA1, etc.).

### 11. Liste des Semestres

- **Méthode** : GET
- **URL** : /api/resources/semesters
- **Rôle** : PUBLIC
- **Description** : Liste les semestres avec leur promotion associée.

### 12. Liste des Thématiques

- **Méthode** : GET
- **URL** : /api/resources/thematics
- **Rôle** : PUBLIC
- **Description** : Liste les thématiques disponibles (Développement Web, UX/UI, etc.).

### 13. Liste des Bannières

- **Méthode** : GET
- **URL** : /api/resources/banners
- **Rôle** : PUBLIC
- **Description** : Récupère la liste des URLs de bannières prédéfinies pour les SAE.

### 14. Upload de Fichier (SAE)

- **Méthode** : POST
- **URL** : /api/resources/upload
- **Rôle** : STUDENT (Rendu), TEACHER (Consignes/Ressources), ADMIN
- **Sécurité** : AuthGuard, RolesGuard, OnboardingGuard
- **Body (formData)** :
  - file : Le fichier binaire.
  - saeId : UUID de la SAE concernée.
  - type : (Profs uniquement) SUJET, RESOURCE ou AUTRE.
  - description : (Étudiants uniquement) Description du travail rendu.
- **Description** : Gère l'upload vers le stockage distant et l'enregistrement en base de données pour une SAE spécifique.

### 15. Upload d'Image de Profil

- **Méthode** : POST
- **URL** : /api/resources/upload-image
- **Rôle** : CONNECTÉ (Tous rôles)
- **Sécurité** : AuthGuard
- **Body (formData)** :
  - file : Le fichier image (PNG, JPG, JPEG, WEBP).
- **Description** : Upload une image de profil et retourne l'URL à utiliser ensuite dans l'onboarding ou la mise à jour de profil.

---

## Module SAE (Situations d'Apprentissage et d'Évaluation)

### 16. Liste des SAE Actuelles

- **Méthode** : GET
- **URL** : /api/saes
- **Rôle** : PUBLIC (Promotions actuelles)
- **Filtres (Query)** :
  - semesterId : Filtrer par semestre.
  - promotionId : Filtrer par année/promotion.
  - groupId : (Enseignants) Filtrer les statistiques par groupe.
  - status : draft, upcoming, ongoing, finished.
  - isUrgent : true pour voir les échéances proches (< 3 jours).
- **Note** :
  - Les étudiants ne voient que les SAE publiées de **leur propre promotion**.
  - Les indicateurs isSubmitted et isUrgent sont personnalisés si l'utilisateur est connecté.

### 17. Galerie des Archives (Hall of Fame)

- **Méthode** : GET
- **URL** : /api/saes/archives
- **Rôle** : PUBLIC
- **Description** : Accès direct aux travaux passés avec images pour affichage graphique.
- **Filtres (Query)** : year (ex: 2023).
- **Note** : Seuls les rendus marqués comme **publics** par les étudiants sont affichés ici.

### 18. Détail d'une SAE

- **Méthode** : GET
- **URL** : /api/saes/:id
- **Rôle** : PUBLIC (Si publiée), TEACHER/ADMIN (Toujours)
- **Note** :
  - Les étudiants ne peuvent accéder qu'aux SAE de leur propre promotion.
  - Retourne les indicateurs isSubmitted, isUrgent et les statistiques d'avancement pour les profs.

### 19. Créer une SAE

- **Méthode** : POST
- **URL** : /api/saes
- **Rôle** : **ADMIN uniquement**
- **Body** :

```json
{
  "title": "Titre",
  "description": "Description",
  "instructions": "Optionnel",
  "semesterId": "UUID",
  "teacherId": "String",
  "thematicId": "UUID",
  "bannerId": "UUID",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z"
}
```

- **Note** : L'ADMIN assigne la SAE à un professeur spécifique via le champ `teacherId`. Le professeur devient automatiquement propriétaire de la SAE et peut la modifier.

### 20. Modifier une SAE

- **Méthode** : PATCH
- **URL** : /api/saes/:id
- **Rôle** : TEACHER (Propriétaire uniquement), ADMIN
- **Note** : Un TEACHER ne peut modifier que les SAE dont il est propriétaire. Un ADMIN peut modifier toutes les SAE.

### 21. Publier une SAE

- **Méthode** : POST
- **URL** : /api/saes/:id/publish
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Note** : Un professeur peut publier uniquement les SAE dont il est propriétaire. Un ADMIN peut publier toutes les SAE.

### 22. Supprimer une SAE

- **Méthode** : DELETE
- **URL** : /api/saes/:id
- **Rôle** : **ADMIN uniquement**

### 23. Gestion des Invitations

- POST /api/saes/:id/invitations : Inviter un collègue (Rôle: TEACHER Propriétaire, ADMIN).
- GET /api/saes/:id/invitations : Liste des invités (Rôle: TEACHER Propriétaire, ADMIN).
- DELETE /api/saes/:id/invitations/:invitationId : Supprimer un invité (Rôle: TEACHER Propriétaire, ADMIN).
- **Note** : Un TEACHER ne peut gérer les invitations que pour les SAE dont il est propriétaire. Un ADMIN peut gérer les invitations de toutes les SAE.

---

## Module Annonces

### 24. Liste des Annonces

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements
- **Rôle** : PUBLIC (Si SAE publiée)

### 25. Détail d'une Annonce

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements/:id
- **Rôle** : PUBLIC (Si SAE publiée)

### 26. Gérer les Annonces

- POST /api/saes/:saeId/announcements : Créer (Rôle: TEACHER Propriétaire/Invité).
- PATCH /api/saes/:saeId/announcements/:id : Modifier (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/announcements/:id : Supprimer (Rôle: TEACHER Propriétaire/Invité).

---

## Module Documents et Rendus

### 27. Documents SAE (Enseignants)

- GET /api/saes/:saeId/documents : Consulter (Rôle: PUBLIC si SAE publiée).
- POST /api/saes/:saeId/documents : Ajouter (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/documents/:documentId : Supprimer (Rôle: TEACHER Propriétaire/Invité).

### 28. Rendus (Étudiants)

- **Méthode** : POST
- **URL** : /api/saes/:saeId/submission
- **Rôle** : STUDENT de la promotion concernée
- **Body** :

```json
{
  "url": "URL_DU_FICHIER",
  "fileName": "Nom du fichier",
  "mimeType": "application/pdf",
  "description": "Description du travail",
  "imageUrl": "URL_OPTIONNELLE_DE_L_IMAGE",
  "isPublic": true
}
```

- **Note** : Le champ `isPublic` (défaut: `false`) détermine si le rendu sera visible par les autres étudiants et le public.

### 29. Consulter son propre rendu

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submission/me
- **Rôle** : STUDENT concerné

### 30. Liste des Rendus (Galerie)

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submissions
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Liste des travaux avec l'objet name (firstname, lastname), imageUrl, description et isPublic.
- **Note** :
  - Les ADMINs, propriétaires et invités de la SAE voient **tous** les rendus.
  - Les autres utilisateurs ne voient que les rendus marqués comme **publics**.
  - Un étudiant voit toujours son propre rendu.

---

## Module Notation (Grades)

### 31. Liste des Catégories de Notes

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grade-categories`
- **Rôle** : PUBLIC (Si SAE publiée) / TEACHER / ADMIN
- **Description** : Liste les catégories de notes (ex: Qualité du code, Design) définies pour une SAE.

### 32. Consulter Toutes les Notes d'une SAE (Tableau de bord)

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grades`
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Retourne la liste des étudiants ayant rendu un travail pour cette SAE avec leurs notes par catégorie et leur moyenne.
- **Note** : Les rendus marqués comme **privés** (`isPublic: false`) sont automatiquement masqués pour le public et les autres étudiants. Seuls les enseignants de la SAE et les administrateurs voient l'intégralité des notes.

### 33. Gérer les Catégories de Notes

- **Méthode** : POST
- **URL** : `/api/saes/:saeId/grade-categories`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Body** :
```json
{
  "name": "Nom de la catégorie"
}
```
- **Note** : Création possible uniquement une fois la SAE terminée (`now > dueDate`).

### 34. Exporter le Tableau de Notation (Excel)

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grades/export`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Description** : Télécharge un fichier `.xlsx` pré-rempli contenant la liste des étudiants ayant rendu un travail et les colonnes de catégories pour la saisie des notes.
- **Note** : Export possible uniquement après la `dueDate`.

### 35. Importer les Notes (Excel)

- **Méthode** : POST
- **URL** : `/api/saes/:saeId/grades/import`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Body (formData)** :
  - file : Le fichier Excel rempli.
- **Description** : Met à jour massivement les notes des étudiants à partir du fichier Excel. Les identifiants masqués dans le fichier garantissent l'intégrité des données.
- **Note** : Import possible uniquement après la `dueDate`.

### 36. Saisir/Modifier les Notes d'un Rendu (Manuel)

- **Méthode** : POST
- **URL** : `/api/submissions/:submissionId/grades`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Body** :
```json
{
  "grades": [
    { "categoryId": "UUID_CATEGORIE_1", "value": 15.5 },
    { "categoryId": "UUID_CATEGORIE_2", "value": 18 }
  ]
}
```
- **Note** : Saisie possible uniquement après la `dueDate`. Les notes doivent être entre 0 et 20.

### 37. Consulter les Notes d'un Rendu

- **Méthode** : GET
- **URL** : `/api/submissions/:submissionId/grades`
- **Rôle** : PUBLIC (Conditionnel)
- **Description** : Retourne le détail des notes par catégorie pour un rendu spécifique, ainsi que la moyenne calculée.
- **Note** : Si le rendu est privé (`isPublic: false`), l'accès est restreint à l'auteur du rendu, aux enseignants de la SAE et aux administrateurs. Une erreur `403 Forbidden` est retournée sinon.

### 38. Synthèse de mes Notes (Étudiant)

- **Méthode** : GET
- **URL** : `/api/grades/me`
- **Rôle** : STUDENT uniquement
- **Description** : Retourne la liste de tous les rendus de l'étudiant avec leurs notes respectives pour toutes les SAE, ainsi que sa moyenne générale globale.

---

## Module Utilisateurs

### 39. Liste des Étudiants en Attente de Validation

- **Méthode** : GET
- **URL** : /api/users/pending-validation
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Retourne la liste des étudiants dont le profil est en attente de validation après leur onboarding.

### 40. Valider un Profil Étudiant

- **Méthode** : POST
- **URL** : /api/users/:studentId/validate
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Valide le profil d'un étudiant en attente. Le `studentId` est l'identifiant de l'utilisateur (UUID ou string).

### 41. Dévalider un Profil Étudiant

- **Méthode** : POST
- **URL** : /api/users/:studentId/unvalidate
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Dévalide le profil d'un étudiant précédemment validé. Le `studentId` est l'identifiant de l'utilisateur (UUID ou string).
