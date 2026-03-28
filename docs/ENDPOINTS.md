# Documentation des Endpoints API — Ecampus

**URL du backend :** `ecampus-mmi.onrender.com`

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

- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "role": "STUDENT",
    "isActive": true,
    "createdAt": "2024-03-20T10:00:00.000Z",
    "isProfileValidated": false
  }
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

- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "sess_123456789",
      "userId": "user_uuid_123",
      "expiresAt": "2024-04-20T10:00:00.000Z"
    },
    "user": {
      "id": "user_uuid_123",
      "email": "user@example.com",
      "name": { "firstname": "Jean", "lastname": "Dupont" },
      "role": "STUDENT"
    }
  }
}
```

### 3. Déconnexion (Sign Out)

- **Méthode** : POST
- **URL** : /api/auth/sign-out
- **Rôle** : CONNECTÉ (Tous rôles)
- **Description** : Termine la session actuelle.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Déconnexion réussie."
}
```

### 4. Utilisateur Actuel (Me)

- **Méthode** : GET
- **URL** : /api/auth/me
- **Rôle** : CONNECTÉ (Tous rôles)
- **Sécurité** : AuthGuard
- **Description** : Retourne les informations de l'utilisateur connecté.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "role": "STUDENT",
    "isActive": true,
    "createdAt": "2024-03-20T10:00:00.000Z",
    "isProfileValidated": true
  }
}
```

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

- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Onboarding terminé avec succès."
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
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "user_uuid_456",
      "email": "mario.rossi@example.com",
      "name": { "firstname": "Mario", "lastname": "Rossi" },
      "role": "TEACHER",
      "isActive": true,
      "createdAt": "2024-03-21T09:00:00.000Z"
    }
  ]
}
```

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
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "user_uuid_789",
    "email": "prof@example.com",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "role": "TEACHER",
    "temporaryPassword": "Abc123_temp_password",
    "createdAt": "2024-03-22T14:30:00.000Z"
  },
  "message": "Enseignant créé avec succès."
}
```

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

- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Mot de passe modifié avec succès."
}
```

### 9. Mise à jour de la Photo de Profil

- **Méthode** : POST
- **URL** : /api/auth/profile-image
- **Rôle** : CONNECTÉ (Tous rôles)
- **Sécurité** : AuthGuard
- **Body** :

```json
{
  "imageUrl": "URL_OBTENUE_VIA_UPLOAD"
}
```

- **Description** : Met à jour la photo de profil de l'utilisateur connecté en base de données et supprime l'ancienne image si elle était stockée sur le serveur distant (utfs.io).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Photo de profil mise à jour avec succès."
}
```

---

## Ressources Pédagogiques

### 10. Liste des Promotions

- **Méthode** : GET
- **URL** : /api/resources/promotions
- **Rôle** : PUBLIC
- **Description** : Liste toutes les promotions (MMI1, MMI2, etc.) ainsi que les archives historiques.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "promo_uuid_1",
      "label": "MMI 1",
      "yearLevel": 1,
      "academicYear": 2024,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 11. Liste des Groupes

- **Méthode** : GET
- **URL** : /api/resources/groups
- **Rôle** : PUBLIC
- **Description** : Liste tous les groupes de TD/TP (GROUPEA1, etc.).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "group_uuid_1",
      "name": "GROUPE A1",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 12. Liste des Semestres

- **Méthode** : GET
- **URL** : /api/resources/semesters
- **Rôle** : PUBLIC
- **Description** : Liste les semestres avec leur promotion associée.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "semester_uuid_1",
      "number": 1,
      "promotionId": "promo_uuid_1",
      "promotion": { "label": "MMI 1" },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 13. Liste des Thématiques

- **Méthode** : GET
- **URL** : /api/resources/thematics
- **Rôle** : PUBLIC
- **Description** : Liste les thématiques disponibles (Développement Web, UX/UI, etc.).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "thematic_uuid_1",
      "code": "WEB",
      "label": "Développement Web"
    },
    {
      "id": "thematic_uuid_2",
      "code": "UX",
      "label": "UX/UI Design"
    }
  ]
}
```

### 14. Liste des Bannières

- **Méthode** : GET
- **URL** : /api/resources/banners
- **Rôle** : PUBLIC
- **Description** : Récupère la liste des URLs de bannières prédéfinies pour les SAE.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "banner_uuid_1",
      "url": "https://utfs.io/f/banner1.png",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 15. Upload de Fichier (SAE)

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
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "doc_uuid_123",
    "saeId": "sae_uuid_456",
    "url": "https://utfs.io/f/file_123.pdf",
    "name": "cahier_des_charges.pdf",
    "mimeType": "application/pdf",
    "type": "RESOURCE",
    "createdAt": "2024-03-23T10:00:00.000Z"
  }
}
```

### 16. Upload d'Image de Profil

- **Méthode** : POST
- **URL** : /api/resources/upload-image
- **Rôle** : CONNECTÉ (Tous rôles)
- **Sécurité** : AuthGuard
- **Body (formData)** :
  - file : Le fichier image (PNG, JPG, JPEG, WEBP).
- **Description** : Upload une image de profil vers le stockage distant et retourne l'URL générée. Cette URL doit ensuite être utilisée avec l'endpoint de mise à jour du profil (Endpoint 9).
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "url": "https://utfs.io/f/avatar_123.webp"
  }
}
```

---

## Module SAE (Situations d'Apprentissage et d'Évaluation)

### 17. Liste des SAE Actuelles

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
  - Pour les semestres 4 à 6, les étudiants ne voient que les SAE de leur **groupe TD** (`A` ou `B`).
  - Les indicateurs isSubmitted et isUrgent sont personnalisés si l'utilisateur est connecté.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "sae_uuid_1",
      "title": "Projet Web Dynamique",
      "banner": "https://utfs.io/f/banner_web.png",
      "description": "Création d'un site web complet...",
      "semesterId": "semester_uuid_1",
      "tdGroup": null,
      "thematic": "Développement Web",
      "startDate": "2024-03-01T08:00:00.000Z",
      "dueDate": "2024-06-30T23:59:59.000Z",
      "isPublished": true,
      "isSubmitted": false,
      "isUrgent": false,
      "status": "ongoing",
      "createdBy": {
        "id": "teacher_uuid_1",
        "email": "prof@example.com",
        "name": { "firstname": "Jean", "lastname": "Dupont" }
      },
      "createdAt": "2024-02-15T10:00:00.000Z",
      "updatedAt": "2024-03-01T08:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 18. Galerie des Archives (Hall of Fame)

- **Méthode** : GET
- **URL** : /api/saes/archives
- **Rôle** : PUBLIC
- **Description** : Accès direct aux travaux passés avec images pour affichage graphique.
- **Filtres (Query)** : year (ex: 2023).
- **Note** : Seuls les rendus marqués comme **publics** par les étudiants sont affichés ici.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "sae_uuid_old",
      "title": "Identité Visuelle 2023",
      "year": 2023,
      "thematic": "UX/UI Design",
      "description": "Meilleur projet de l'année...",
      "imageUrl": "https://utfs.io/f/archive_image.png",
      "url": "https://mon-projet.vercel.app",
      "name": { "firstname": "Alice", "lastname": "Martin" }
    }
  ]
}
```

### 19. Détail d'une SAE

- **Méthode** : GET
- **URL** : /api/saes/:id
- **Rôle** : PUBLIC (Si publiée), TEACHER/ADMIN (Toujours)
- **Note** :
  - Les étudiants ne peuvent accéder qu'aux SAE de leur propre promotion.
  - Pour les semestres 4 à 6, un étudiant ne peut pas accéder aux SAE destinées à l'autre groupe TD.
  - Retourne les indicateurs isSubmitted, isUrgent et les statistiques d'avancement pour les profs.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "sae_uuid_1",
    "title": "Projet Web Dynamique",
    "banner": "https://utfs.io/f/banner_web.png",
    "description": "Description détaillée...",
    "instructions": "Instructions complètes pour le rendu...",
    "semesterId": "semester_uuid_1",
    "tdGroup": "A",
    "thematic": "Développement Web",
    "startDate": "2024-03-01T08:00:00.000Z",
    "dueDate": "2024-06-30T23:59:59.000Z",
    "isPublished": true,
    "isSubmitted": true,
    "isUrgent": false,
    "submissionCount": 45,
    "studentCount": 120,
    "status": "ongoing",
    "createdBy": {
      "id": "teacher_uuid_1",
      "email": "prof@example.com",
      "name": { "firstname": "Jean", "lastname": "Dupont" }
    },
    "createdAt": "2024-02-15T10:00:00.000Z",
    "updatedAt": "2024-03-01T08:00:00.000Z"
  }
}
```

### 20. Créer une SAE

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
  "tdGroup": "A",
  "teacherId": "String",
  "thematicId": "UUID",
  "bannerId": "UUID",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z"
}
```

- **Note** :
  - L'ADMIN assigne la SAE à un professeur spécifique via le champ `teacherId`. Le professeur devient automatiquement propriétaire de la SAE et peut la modifier.
  - Pour les semestres 4, 5 et 6, le champ `tdGroup` est **obligatoire** (`A` ou `B`).
  - Pour les autres semestres, le champ `tdGroup` doit être absent.
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "sae_uuid_new",
    "title": "Nouvelle SAE",
    "banner": "https://utfs.io/f/default_banner.png",
    "description": "Description...",
    "semesterId": "semester_uuid_1",
    "tdGroup": "A",
    "thematic": "Communication",
    "startDate": "2026-03-01T08:00:00.000Z",
    "dueDate": "2026-06-30T23:59:59.000Z",
    "isPublished": false,
    "status": "draft",
    "createdBy": {
      "id": "teacher_uuid_1",
      "email": "prof@example.com",
      "name": { "firstname": "Jean", "lastname": "Dupont" }
    },
    "createdAt": "2024-03-23T12:00:00.000Z",
    "updatedAt": "2024-03-23T12:00:00.000Z"
  }
}
```

### 21. Modifier une SAE

- **Méthode** : PATCH
- **URL** : /api/saes/:id
- **Rôle** : TEACHER (Propriétaire uniquement), ADMIN
- **Note** :
  - Un TEACHER ne peut modifier que les SAE dont il est propriétaire. Un ADMIN peut modifier toutes les SAE.
  - Si le semestre ciblé est 4, 5 ou 6, `tdGroup` doit être défini (`A` ou `B`).
  - Si le semestre ciblé n'est pas entre 4 et 6, `tdGroup` est remis à `null`.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "sae_uuid_1",
    "title": "Titre Modifié",
    "updatedAt": "2024-03-23T13:00:00.000Z"
    // ... reste de l'objet SaeResponse
  }
}
```

### 22. Publier une SAE

- **Méthode** : POST
- **URL** : /api/saes/:id/publish
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Note** : Un professeur peut publier uniquement les SAE dont il est propriétaire. Un ADMIN peut publier toutes les SAE.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "sae_uuid_1",
    "isPublished": true,
    "status": "ongoing"
  }
}
```

### 23. Supprimer une SAE

- **Méthode** : DELETE
- **URL** : /api/saes/:id
- **Rôle** : **ADMIN uniquement**
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "message": "SAE supprimée avec succès."
}
```

### 24. Gestion des Invitations

- POST /api/saes/:id/invitations : Inviter un collègue (Rôle: TEACHER Propriétaire, ADMIN).
- GET /api/saes/:id/invitations : Liste des invités (Rôle: TEACHER Propriétaire, ADMIN).
- DELETE /api/saes/:id/invitations/:invitationId : Supprimer un invité (Rôle: TEACHER Propriétaire, ADMIN).
- **Note** : Un TEACHER ne peut gérer les invitations que pour les SAE dont il est propriétaire. Un ADMIN peut gérer les invitations de toutes les SAE.
- **Réponse** (GET /api/saes/:id/invitations) :

```json
{
  "success": true,
  "data": [
    {
      "id": "invit_uuid_1",
      "saeId": "sae_uuid_1",
      "userId": "user_uuid_456",
      "name": { "firstname": "Mario", "lastname": "Rossi" },
      "createdAt": "2024-03-23T14:00:00.000Z"
    }
  ]
}
```

---

## Module Annonces

### 25. Liste des Annonces

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements
- **Rôle** : PUBLIC (Si SAE publiée)
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "ann_uuid_1",
      "saeId": "sae_uuid_1",
      "title": "Mise à jour des consignes",
      "content": "Attention, la date de rendu a été repoussée...",
      "createdAt": "2024-03-23T15:00:00.000Z",
      "updatedAt": "2024-03-23T15:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 26. Détail d'une Annonce

- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements/:id
- **Rôle** : PUBLIC (Si SAE publiée)
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "ann_uuid_1",
    "saeId": "sae_uuid_1",
    "title": "Mise à jour des consignes",
    "content": "Attention, la date de rendu a été repoussée...",
    "createdAt": "2024-03-23T15:00:00.000Z",
    "updatedAt": "2024-03-23T15:00:00.000Z"
  }
}
```

### 27. Gérer les Annonces

- POST /api/saes/:saeId/announcements : Créer (Rôle: TEACHER Propriétaire/Invité).
- PATCH /api/saes/:saeId/announcements/:id : Modifier (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/announcements/:id : Supprimer (Rôle: TEACHER Propriétaire/Invité).
- **Réponse** (POST /api/saes/:saeId/announcements) :

```json
{
  "success": true,
  "data": {
    "id": "ann_uuid_new",
    "title": "Nouvelle Annonce",
    "content": "Contenu de l'annonce...",
    "createdAt": "2024-03-23T16:00:00.000Z"
  }
}
```

---

## Module Documents et Rendus

### 28. Documents SAE (Enseignants)

- GET /api/saes/:saeId/documents : Consulter (Rôle: PUBLIC si SAE publiée).
- POST /api/saes/:saeId/documents : Ajouter (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/documents/:documentId : Supprimer (Rôle: TEACHER Propriétaire/Invité).
- **Réponse** (GET /api/saes/:saeId/documents) :

```json
{
  "success": true,
  "data": [
    {
      "id": "doc_uuid_1",
      "saeId": "sae_uuid_1",
      "url": "https://utfs.io/f/ressource_web.pdf",
      "name": "cahier_des_charges.pdf",
      "mimeType": "application/pdf",
      "type": "RESOURCE",
      "createdAt": "2024-03-23T10:00:00.000Z"
    }
  ]
}
```

### 29. Rendus (Étudiants)

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
- **Note complémentaire** : Un étudiant ne peut soumettre que pour une SAE qui correspond à son groupe TD (semestres 4 à 6).
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "sub_uuid_123",
    "saeId": "sae_uuid_1",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "url": "https://utfs.io/f/mon_rendu.pdf",
    "fileName": "projet_final.pdf",
    "mimeType": "application/pdf",
    "description": "Voici mon projet final pour la SAE.",
    "imageUrl": "https://utfs.io/f/preview.png",
    "isPublic": true,
    "isLate": false,
    "lateTime": null,
    "submittedAt": "2024-06-15T14:30:00.000Z",
    "updatedAt": "2024-06-15T14:30:00.000Z"
  }
}
```

### 30. Consulter son propre rendu

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submission/me
- **Rôle** : STUDENT concerné
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "sub_uuid_123",
    "saeId": "sae_uuid_1",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "url": "https://utfs.io/f/mon_rendu.pdf",
    "fileName": "projet_final.pdf",
    "mimeType": "application/pdf",
    "description": "Voici mon projet final pour la SAE.",
    "imageUrl": "https://utfs.io/f/preview.png",
    "isPublic": true,
    "isLate": false,
    "lateTime": null,
    "submittedAt": "2024-06-15T14:30:00.000Z",
    "updatedAt": "2024-06-15T14:30:00.000Z"
  }
}
```

### 31. Modifier la Visibilité de son Rendu

- **Méthode** : PATCH
- **URL** : /api/saes/:saeId/submission/visibility
- **Rôle** : STUDENT (propriétaire du rendu uniquement)
- **Sécurité** : AuthGuard, RolesGuard, OnboardingGuard
- **Body** :

```json
{
  "isPublic": true
}
```

- **Description** : Permet à un étudiant de rendre son devoir visible ou non, même après publication, uniquement pour son propre rendu.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "sub_uuid_123",
    "saeId": "sae_uuid_1",
    "name": { "firstname": "Jean", "lastname": "Dupont" },
    "url": "https://utfs.io/f/mon_rendu.pdf",
    "fileName": "projet_final.pdf",
    "mimeType": "application/pdf",
    "description": "Voici mon projet final pour la SAE.",
    "imageUrl": "https://utfs.io/f/preview.png",
    "isPublic": false,
    "isLate": false,
    "lateTime": null,
    "submittedAt": "2024-06-15T14:30:00.000Z",
    "updatedAt": "2024-06-15T15:45:00.000Z"
  }
}
```

### 32. Modifier la Visibilité de Tous les Rendus d'une SAE

- **Méthode** : PATCH
- **URL** : /api/saes/:saeId/submissions/visibility
- **Rôle** : TEACHER (propriétaire/invité), ADMIN
- **Sécurité** : AuthGuard, RolesGuard, OnboardingGuard
- **Body** :

```json
{
  "isPublic": false
}
```

- **Description** : Modifie la visibilité de tous les rendus d'une SAE en une seule action. Un professeur ne peut le faire que pour une SAE qu'il possède ou sur laquelle il est invité.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "updatedCount": 24
  }
}
```

### 33. Modifier la Visibilité de Tous les Rendus d'une Promotion

- **Méthode** : PATCH
- **URL** : /api/promotions/:promotionId/submissions/visibility
- **Rôle** : ADMIN uniquement
- **Sécurité** : AuthGuard, RolesGuard
- **Body** :

```json
{
  "isPublic": false
}
```

- **Description** : Modifie la visibilité de tous les rendus de toutes les SAE d'une promotion entière.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "updatedCount": 142
  }
}
```

### 34. Liste des Rendus (Galerie)

- **Méthode** : GET
- **URL** : /api/saes/:saeId/submissions
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Liste des travaux avec l'objet name (firstname, lastname), imageUrl, description et isPublic.
- **Note** :
  - Les ADMINs, propriétaires et invités de la SAE voient **tous** les rendus.
  - Les autres utilisateurs ne voient que les rendus marqués comme **publics**.
  - Un étudiant voit toujours son propre rendu.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "sub_uuid_123",
      "saeId": "sae_uuid_1",
      "name": { "firstname": "Jean", "lastname": "Dupont" },
      "url": "https://utfs.io/f/mon_rendu.pdf",
      "fileName": "projet_final.pdf",
      "mimeType": "application/pdf",
      "description": "Voici mon projet final pour la SAE.",
      "imageUrl": "https://utfs.io/f/preview.png",
      "isPublic": true,
      "submittedAt": "2024-06-15T14:30:00.000Z",
      "updatedAt": "2024-06-15T14:30:00.000Z"
    }
  ]
}
```

---

## Module Notation (Grades)

### 35. Liste des Catégories de Notes

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grade-categories`
- **Rôle** : PUBLIC (Si SAE publiée) / TEACHER / ADMIN
- **Description** : Liste les catégories de notes (ex: Qualité du code, Design) définies pour une SAE.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    { "id": "cat_uuid_1", "saeId": "sae_uuid_1", "name": "Qualité du Code" },
    { "id": "cat_uuid_2", "saeId": "sae_uuid_1", "name": "Design & UI" }
  ]
}
```

### 36. Consulter Toutes les Notes d'une SAE (Tableau de bord)

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grades`
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Retourne la liste des étudiants ayant rendu un travail pour cette SAE avec leurs notes par catégorie et leur moyenne.
- **Note** : Les rendus marqués comme **privés** (`isPublic: false`) sont automatiquement masqués pour le public et les autres étudiants. Seuls les enseignants de la SAE et les administrateurs voient l'intégralité des notes.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "submissionId": "sub_uuid_123",
      "studentName": { "firstname": "Jean", "lastname": "Dupont" },
      "grades": [
        {
          "id": "grade_uuid_1",
          "categoryId": "cat_uuid_1",
          "categoryName": "Qualité du Code",
          "value": 15.5
        },
        {
          "id": "grade_uuid_2",
          "categoryId": "cat_uuid_2",
          "categoryName": "Design & UI",
          "value": 18
        }
      ],
      "average": 16.75
    }
  ]
}
```

### 37. Gérer les Catégories de Notes

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
- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": { "id": "cat_uuid_3", "saeId": "sae_uuid_1", "name": "Rapport écrit" }
}
```

### 38. Exporter le Tableau de Notation (Excel)

- **Méthode** : GET
- **URL** : `/api/saes/:saeId/grades/export`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Description** : Télécharge un fichier `.xlsx` pré-rempli contenant la liste des étudiants ayant rendu un travail et les colonnes de catégories pour la saisie des notes.
- **Note** : Export possible uniquement après la `dueDate`.
- **Réponse** (200 OK) : (Fichier binaire .xlsx)

### 39. Importer les Notes (Excel)

- **Méthode** : POST
- **URL** : `/api/saes/:saeId/grades/import`
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Body (formData)** :
  - file : Le fichier Excel rempli.
- **Description** : Met à jour massivement les notes des étudiants à partir du fichier Excel. Les identifiants masqués dans le fichier garantissent l'intégrité des données.
- **Note** : Import possible uniquement après la `dueDate`.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Notes importées avec succès."
}
```

### 40. Saisir/Modifier les Notes d'un Rendu (Manuel)

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
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "submissionId": "sub_uuid_123",
    "studentName": { "firstname": "Jean", "lastname": "Dupont" },
    "grades": [
      {
        "id": "grade_uuid_1",
        "categoryId": "cat_uuid_1",
        "categoryName": "Qualité du Code",
        "value": 15.5
      },
      {
        "id": "grade_uuid_2",
        "categoryId": "cat_uuid_2",
        "categoryName": "Design & UI",
        "value": 18
      }
    ],
    "average": 16.75
  }
}
```

### 41. Consulter les Notes d'un Rendu

- **Méthode** : GET
- **URL** : `/api/submissions/:submissionId/grades`
- **Rôle** : PUBLIC (Conditionnel)
- **Description** : Retourne le détail des notes par catégorie pour un rendu spécifique, ainsi que la moyenne calculée.
- **Note** : Si le rendu est privé (`isPublic: false`), l'accès est restreint à l'auteur du rendu, aux enseignants de la SAE et aux administrateurs. Une erreur `403 Forbidden` est retournée sinon.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "submissionId": "sub_uuid_123",
    "studentName": { "firstname": "Jean", "lastname": "Dupont" },
    "grades": [
      {
        "id": "grade_uuid_1",
        "categoryId": "cat_uuid_1",
        "categoryName": "Qualité du Code",
        "value": 15.5
      },
      {
        "id": "grade_uuid_2",
        "categoryId": "cat_uuid_2",
        "categoryName": "Design & UI",
        "value": 18
      }
    ],
    "average": 16.75
  }
}
```

### 42. Synthèse de mes Notes (Étudiant)

- **Méthode** : GET
- **URL** : `/api/grades/me`
- **Rôle** : STUDENT uniquement
- **Description** : Retourne la liste de tous les rendus de l'étudiant with leurs notes respectives pour toutes les SAE, ainsi que sa moyenne générale globale.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "submissionId": "sub_uuid_123",
        "saeTitle": "Projet Web Dynamique",
        "studentName": { "firstname": "Jean", "lastname": "Dupont" },
        "grades": [
          {
            "id": "grade_uuid_1",
            "categoryId": "cat_uuid_1",
            "categoryName": "Qualité du Code",
            "value": 15.5
          }
        ],
        "average": 15.5
      }
    ],
    "globalAverage": 15.5
  }
}
```

---

## Module Utilisateurs

### 43. Liste des Étudiants en Attente de Validation

- **Méthode** : GET
- **URL** : /api/users/pending-validation
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Retourne la liste des étudiants dont le profil est en attente de validation après leur onboarding.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "user_uuid_123",
      "email": "jean.dupont@student.univ.fr",
      "firstname": "Jean",
      "lastname": "Dupont",
      "promotion": "MMI 1",
      "group": "GROUPE A1",
      "onboardedAt": "2024-03-20T10:00:00.000Z"
    }
  ]
}
```

### 44. Valider un Profil Étudiant

- **Méthode** : POST
- **URL** : /api/users/:studentId/validate
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Valide le profil d'un étudiant en attente. Le `studentId` est l'identifiant de l'utilisateur (UUID ou string).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Profil étudiant validé avec succès."
}
```

### 45. Dévalider un Profil Étudiant

- **Méthode** : POST
- **URL** : /api/users/:studentId/unvalidate
- **Rôle** : TEACHER, ADMIN
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Dévalide le profil d'un étudiant précédemment validé. Le `studentId` est l'identifiant de l'utilisateur (UUID ou string).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Validation du profil annulée avec succès."
}
```

### 46. Modifier le Profil Étudiant

- **Méthode** : POST
- **URL** : /api/users/:studentId/update
- **Rôle** : **ADMIN uniquement**
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Permet à un administrateur de modifier les informations du profil étudiant en cas d'erreur lors de l'onboarding (nom, prénom, promotion, groupe). Tous les champs sont optionnels.
- **Body** :

```json
{
  "firstname": "Jean",
  "lastname": "Dupont",
  "promotionId": "UUID_NEW_PROMO",
  "groupId": "UUID_NEW_GROUP"
}
```

- **Note** :
  - Tous les champs sont optionnels
  - La promotion et le groupe doivent exister en base de données
  - Le `studentId` doit correspondre à un utilisateur de rôle STUDENT avec un profil existant
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Profil étudiant mis à jour avec succès."
}
```

### 47. Supprimer un Utilisateur (Professeur ou Étudiant)

- **Méthode** : DELETE
- **URL** : /api/users/:userId
- **Rôle** : **ADMIN uniquement**
- **Sécurité** : AuthGuard, RolesGuard
- **Description** : Supprime un compte utilisateur (professeur ou étudiant) ainsi que les données associées (profil étudiant, rendus, etc.). L'utilisateur doit être de type STUDENT ou TEACHER.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": null,
  "message": "Utilisateur supprimé avec succès."
}
```

---

## Module Paliers (Milestones)

### 48. Liste des Paliers d'une SAE

- **Méthode** : GET
- **URL** : /api/saes/:saeId/milestones
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Récupère la liste ordonnée des paliers (milestones) pour une SAE donnée.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": [
    {
      "id": "mile_uuid_1",
      "saeId": "sae_uuid_1",
      "title": "Cahier des charges validé",
      "description": "Validation du document de cadrage",
      "position": 1,
      "createdAt": "2024-03-23T10:00:00.000Z",
      "updatedAt": "2024-03-23T10:00:00.000Z"
    }
  ]
}
```

### 49. Créer un Palier

- **Méthode** : POST
- **URL** : /api/saes/:saeId/milestones
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Body** :

```json
{
  "title": "Titre du palier",
  "description": "Description (optionnelle)",
  "position": 1
}
```

- **Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "mile_uuid_1",
    "saeId": "sae_uuid_1",
    "title": "Titre du palier",
    "description": "Description (optionnelle)",
    "position": 1,
    "createdAt": "2024-03-23T10:00:00.000Z",
    "updatedAt": "2024-03-23T10:00:00.000Z"
  }
}
```

### 50. Modifier un Palier

- **Méthode** : PATCH
- **URL** : /api/saes/:saeId/milestones/:milestoneId
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "mile_uuid_1",
    "title": "Titre modifié",
    "updatedAt": "2024-03-23T11:00:00.000Z"
  }
}
```

### 51. Supprimer un Palier

- **Méthode** : DELETE
- **URL** : /api/saes/:saeId/milestones/:milestoneId
- **Rôle** : TEACHER (Propriétaire), ADMIN
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "message": "Palier supprimé avec succès."
}
```

### 52. Mettre à jour sa progression (Étudiant)

- **Méthode** : POST
- **URL** : /api/saes/:saeId/milestones/:milestoneId/progress
- **Rôle** : STUDENT de la promotion concernée
- **Sécurité** : AuthGuard, ProfileValidatedGuard
- **Body** :

```json
{
  "isReached": true,
  "message": "Commentaire optionnel"
}
```

- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "prog_uuid_1",
    "milestoneId": "mile_uuid_1",
    "studentId": "user_uuid_123",
    "isReached": true,
    "message": "C'est fait !",
    "reachedAt": "2024-03-23T12:00:00.000Z",
    "createdAt": "2024-03-23T12:00:00.000Z",
    "updatedAt": "2024-03-23T12:00:00.000Z"
  }
}
```

### 53. Voir la progression d'un étudiant sur un palier

- **Méthode** : GET
- **URL** : /api/saes/:saeId/milestones/:milestoneId/progress/:studentId
- **Rôle** : TEACHER, ADMIN, STUDENT (propre progression uniquement)
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "id": "prog_uuid_1",
    "milestoneId": "mile_uuid_1",
    "studentId": "user_uuid_123",
    "isReached": true,
    "message": "C'est fait !",
    "reachedAt": "2024-03-23T12:00:00.000Z"
  }
}
```

### 54. Tableau de bord de progression d'une SAE (Enseignants)

- **Méthode** : GET
- **URL** : /api/saes/:saeId/milestones/progress
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Description** : Retourne tous les paliers avec la liste des progressions de tous les étudiants.
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "milestones": [
      {
        "id": "mile_uuid_1",
        "title": "Palier 1",
        "progresses": [
          {
            "id": "prog_uuid_1",
            "studentId": "user_uuid_123",
            "isReached": true,
            "reachedAt": "2024-03-23T12:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

### 55. Ma progression sur les paliers d'une SAE

- **Méthode** : GET
- **URL** : /api/saes/:saeId/milestones/progress/me
- **Rôle** : STUDENT concerné
- **Sécurité** : AuthGuard, ProfileValidatedGuard
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "milestones": [
      {
        "milestone": { "id": "mile_uuid_1", "title": "Palier 1" },
        "progress": {
          "id": "prog_uuid_1",
          "isReached": true,
          "reachedAt": "2024-03-23T12:00:00.000Z"
        }
      }
    ]
  }
}
```

### 56. Statistiques de progression des Paliers

- **Méthode** : GET
- **URL** : /api/saes/:saeId/milestones/stats
- **Rôle** : TEACHER (Propriétaire/Invité), ADMIN
- **Description** : Retourne des statistiques agrégées sur la validation des paliers (nombre total d'étudiants, nombre de paliers par étudiant, moyenne globale, taux de complétion).
- **Réponse** (200 OK) :

```json
{
  "success": true,
  "data": {
    "totalStudents": 120,
    "milestonesCount": 5,
    "studentsStats": [
      {
        "studentId": "user_uuid_123",
        "firstname": "Jean",
        "lastname": "Dupont",
        "validatedCount": 3
      }
    ],
    "milestonesStats": [
      {
        "milestoneId": "mile_uuid_1",
        "title": "Palier 1",
        "validatedCount": 80,
        "percentage": 66.67
      }
    ],
    "globalProgress": {
      "averageValidated": 2.5,
      "completionRate": 50.0
    }
  }
}
```
