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

### 16. Galerie des Archives (Hall of Fame)

- **Méthode** : GET
- **URL** : /api/saes/archives
- **Rôle** : PUBLIC
- **Description** : Accès direct aux travaux passés avec images pour affichage graphique.
- **Filtres (Query)** : year (ex: 2023).
- **Note** : Seuls les rendus marqués comme **publics** par les étudiants sont affichés ici.

### 17. Détail d'une SAE

- **Méthode** : GET
- **URL** : /api/saes/:id
- **Rôle** : PUBLIC (Si publiée), TEACHER/ADMIN (Toujours)
- **Note** :
  - Les étudiants ne peuvent accéder qu'aux SAE de leur propre promotion.
  - Retourne les indicateurs isSubmitted, isUrgent et les statistiques d'avancement pour les profs.

### 18. Créer une SAE

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

### 19. Modifier une SAE

- **Méthode** : PATCH
- **URL** : /api/saes/:id
- **Rôle** : TEACHER (Propriétaire uniquement), ADMIN
- **Note** : Un TEACHER ne peut modifier que les SAE dont il est propriétaire. Un ADMIN peut modifier toutes les SAE.

### 20. Publier une SAE

- **Méthode** : POST
- **URL** : /api/saes/:id/publish
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Note** : Un professeur peut publier uniquement les SAE dont il est propriétaire. Un ADMIN peut publier toutes les SAE.

### 21. Supprimer une SAE

- **Méthode** : DELETE
- **URL** : /api/saes/:id
- **Rôle** : **ADMIN uniquement**

### 22. Gestion des Invitations

- POST /api/saes/:id/invitations : Inviter un collègue (Rôle: TEACHER Propriétaire, ADMIN).
- GET /api/saes/:id/invitations : Liste des invités (Rôle: TEACHER Propriétaire, ADMIN).
- DELETE /api/saes/:id/invitations/:invitationId : Supprimer un invité (Rôle: TEACHER Propriétaire, ADMIN).
- **Note** : Un TEACHER ne peut gérer les invitations que pour les SAE dont il est propriétaire. Un ADMIN peut gérer les invitations de toutes les SAE.

---

## Module Annonces

### 23. Liste des Annonces

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements
- **Rôle** : PUBLIC (Si SAE publiée)

### 24. Détail d'une Annonce

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements/:id
- **Rôle** : PUBLIC (Si SAE publiée)

### 25. Gérer les Annonces

- POST /api/saes/:saeId/announcements : Créer (Rôle: TEACHER Propriétaire/Invité).
- PATCH /api/saes/:saeId/announcements/:id : Modifier (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/announcements/:id : Supprimer (Rôle: TEACHER Propriétaire/Invité).

---

## Module Documents et Rendus

### 26. Documents SAE (Enseignants)

- GET /api/saes/:saeId/documents : Consulter (Rôle: PUBLIC si SAE publiée).
- POST /api/saes/:saeId/documents : Ajouter (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/documents/:documentId : Supprimer (Rôle: TEACHER Propriétaire/Invité).

### 27. Rendus (Étudiants)

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

### 28. Consulter son propre rendu

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submission/me
- **Rôle** : STUDENT concerné

### 29. Liste des Rendus (Galerie)

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submissions
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Liste des travaux avec l'objet name (firstname, lastname), imageUrl, description et isPublic.
- **Note** :
  - Les ADMINs, propriétaires et invités de la SAE voient **tous** les rendus.
  - Les autres utilisateurs ne voient que les rendus marqués comme **publics**.
  - Un étudiant voit toujours son propre rendu.
