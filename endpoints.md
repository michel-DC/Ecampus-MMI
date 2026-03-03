# Documentation des Endpoints API — Ecampus

Ce document réunit l'ensemble des points d'entrée de l'API.

---

## 🔐 Authentification & Onboarding
Les routes d'authentification de base sont gérées par **Better Auth**.

### 1. Inscription (Sign Up)
- **Méthode** : `POST`
- **URL** : `/api/auth/sign-up`
- **Body** :
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Jean Dupont",
  "role": "STUDENT" // Ou "TEACHER"
}
```
- **Note** : Le rôle est obligatoire. Pour les enseignants, un profil est créé automatiquement.

### 2. Connexion (Sign In)
- **Méthode** : `POST`
- **URL** : `/api/auth/sign-in/email`
- **Body** :
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Utilisateur Actuel (Me)
- **Méthode** : `GET`
- **URL** : `/api/auth/me`
- **Sécurité** : `AuthGuard`
- **Description** : Retourne les informations de l'utilisateur connecté.

### 4. Onboarding Étudiant
- **Méthode** : `POST`
- **URL** : `/api/auth/onboarding`
- **Rôle** : `STUDENT` uniquement
- **Sécurité** : `AuthGuard`, `RolesGuard`
- **Body** :
```json
{
  "promotionId": "ID_DE_LA_PROMOTION",
  "groupId": "ID_DU_GROUPE"
}
```

---

## 📁 Ressources Pédagogiques (Publiques)

### 5. Liste des Promotions
- **Méthode** : `GET`
- **URL** : `/api/promotions`
- **Description** : Liste toutes les promotions actives (MMI1, MMI2, etc.).

### 6. Liste des Groupes
- **Méthode** : `GET`
- **URL** : `/api/groups`
- **Description** : Liste tous les groupes de TD/TP (GROUPEA1, etc.).

### 7. Liste des Semestres
- **Méthode** : `GET`
- **URL** : `/api/semesters` (ou `/api/semester`)
- **Description** : Liste les semestres avec leur promotion associée.

### 7.5 Upload de Fichier (Direct)
- **Méthode** : `POST`
- **URL** : `/api/resources/upload`
- **Sécurité** : `AuthGuard`, `RolesGuard`, `OnboardingGuard`
- **Body (formData)** :
  - `file` : Le fichier binaire.
  - `saeId` : UUID de la SAE concernée (obligatoire).
  - `type` : (Enseignants uniquement) `SUJET`, `RESOURCE` ou `AUTRE`.
- **Description** : Upload le fichier vers UploadThing et crée/met à jour l'enregistrement correspondant en base de données selon le rôle (Document SAE pour les profs, Rendu pour les étudiants).
- **Note** : En cas d'échec de l'enregistrement en base de données, le fichier est automatiquement supprimé d'UploadThing pour éviter les fichiers orphelins.

---

## 🚀 Module SAE (Situations d'Apprentissage et d'Évaluation)

### 8. Liste des Bannières (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/banners`
- **Description** : Récupère la liste des URLs de bannières prédéfinies.

### 9. Liste des SAE (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes`
- **Filtres (Query)** : `semesterId`, `status`, `isPublished` (enseignant uniquement).

### 10. Détail d'une SAE (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:id`

### 11. Créer une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes`
- **Rôle** : `TEACHER`, `ADMIN`
- **Body** :
```json
{
  "title": "Titre de la SAE",
  "description": "Description détaillée",
  "semesterId": "UUID",
  "thematicId": "UUID",
  "bannerId": "UUID",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z"
}
```

### 12. Modifier une SAE
- **Méthode** : `PATCH`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire), `ADMIN`

### 13. Publier une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes/:id/publish`
- **Rôle** : `TEACHER` (Propriétaire), `ADMIN`

### 14. Supprimer une SAE
- **Méthode** : `DELETE`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire), `ADMIN`

### 15. Gestion des Invitations (Enseignants)
- **POST** `/api/saes/:id/invitations` : Inviter un collègue.
- **GET** `/api/saes/:id/invitations` : Voir les invités.

---

## 📢 Module Annonces (Announcements)
*Note : Toutes les routes sont relatives à une SAE spécifique.*

### 16. Liste des Annonces (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:saeId/announcements`
- **Description** : Liste toutes les annonces d'une SAE.
- **Note** : Public pour les SAE publiées.

### 17. Détail d'une Annonce (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:saeId/announcements/:id`

### 18. Créer une Annonce
- **Méthode** : `POST`
- **URL** : `/api/saes/:saeId/announcements`
- **Rôle** : `TEACHER` (Propriétaire ou invité sur la SAE), `ADMIN`
- **Body** :
```json
{
  "title": "Titre de l'annonce",
  "content": "Contenu détaillé de l'annonce"
}
```

### 19. Modifier une Annonce
- **Méthode** : `PATCH`
- **URL** : `/api/saes/:saeId/announcements/:id`
- **Rôle** : `TEACHER` (Propriétaire ou invité sur la SAE), `ADMIN`

### 20. Supprimer une Annonce
- **Méthode** : `DELETE`
- **URL** : `/api/saes/:saeId/announcements/:id`
- **Rôle** : `TEACHER` (Propriétaire ou invité sur la SAE), `ADMIN`

---

## 📁 Module Documents (Ressources + Rendus)
*Note : Toutes les routes sont relatives à une SAE spécifique.*

### 21. Liste des Documents SAE (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:saeId/documents`
- **Description** : Liste les ressources ajoutées par les enseignants (consignes, exemples).
- **Note** : Public pour les SAE publiées.

### 22. Ajouter un Document SAE
- **Méthode** : `POST`
- **URL** : `/api/saes/:saeId/documents`
- **Rôle** : `TEACHER` (Propriétaire ou invité), `ADMIN`
- **Body** :
```json
{
  "url": "https://...",
  "name": "Sujet_SAE.pdf",
  "mimeType": "application/pdf",
  "type": "INSTRUCTION" // Ou "RESOURCE", "EXAMPLE"
}
```
- **Note** : Limité à 3 documents par SAE.

### 23. Supprimer un Document SAE
- **Méthode** : `DELETE`
- **URL** : `/api/saes/:saeId/documents/:documentId`
- **Rôle** : `TEACHER` (Propriétaire ou invité), `ADMIN`

### 24. Soumettre un Rendu Étudiant
- **Méthode** : `POST`
- **URL** : `/api/saes/:saeId/submission`
- **Rôle** : `STUDENT` (de la promotion concernée)
- **Condition** : La SAE doit être en cours (`ongoing`).
- **Body** :
```json
{
  "url": "https://...",
  "name": "Rendu_GroupeA.zip",
  "mimeType": "application/zip"
}
```
- **Note** : Un seul rendu par étudiant, écrase le précédent si renvoyé.

### 25. Consulter son propre Rendu
- **Méthode** : `GET`
- **URL** : `/api/saes/:saeId/submission/me`
- **Rôle** : `STUDENT`

### 26. Liste de tous les Rendus (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:saeId/submissions`
- **Description** : Liste tous les rendus déposés par les étudiants pour cette SAE.
- **Note** : Public pour les SAE publiées.
