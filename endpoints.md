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
  "name": "Jean Dupont",
  "role": "STUDENT"
}
```
- **Note** : Le rôle est obligatoire (STUDENT ou TEACHER).

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
  "groupId": "UUID_DU_GROUPE"
}
```

---

## Ressources Pédagogiques

### 6. Liste des Promotions
- **Méthode** : GET
- **URL** : /api/promotions
- **Rôle** : PUBLIC
- **Description** : Liste toutes les promotions (MMI1, MMI2, etc.) ainsi que les archives historiques.

### 7. Liste des Groupes
- **Méthode** : GET
- **URL** : /api/groups
- **Rôle** : PUBLIC
- **Description** : Liste tous les groupes de TD/TP (GROUPEA1, etc.).

### 8. Liste des Semestres
- **Méthode** : GET
- **URL** : /api/semesters
- **Rôle** : PUBLIC
- **Description** : Liste les semestres avec leur promotion associée.

### 9. Liste des Thématiques
- **Méthode** : GET
- **URL** : /api/saes/thematics
- **Rôle** : PUBLIC
- **Description** : Liste les thématiques disponibles (Développement Web, UX/UI, etc.).

### 10. Liste des Bannières
- **Méthode** : GET
- **URL** : /api/saes/banners
- **Rôle** : PUBLIC
- **Description** : Récupère la liste des URLs de bannières prédéfinies pour les SAE.

### 11. Upload de Fichier
- **Méthode** : POST
- **URL** : /api/resources/upload
- **Rôle** : STUDENT (Rendu), TEACHER (Consignes/Ressources), ADMIN
- **Sécurité** : AuthGuard, RolesGuard, OnboardingGuard
- **Body (formData)** :
  - file : Le fichier binaire.
  - saeId : UUID de la SAE concernée.
  - type : (Profs uniquement) SUJET, RESOURCE ou AUTRE.
  - description : (Étudiants uniquement) Description du travail rendu.
- **Description** : Gère l'upload vers le stockage distant et l'enregistrement en base de données.

---

## Module SAE (Situations d'Apprentissage et d'Évaluation)

### 12. Liste des SAE Actuelles
- **Méthode** : GET
- **URL** : /api/saes
- **Rôle** : PUBLIC (Promotions actuelles)
- **Filtres (Query)** : 
  - semesterId : Filtrer par semestre.
  - promotionId : Filtrer par année/promotion.
  - groupId : (Enseignants) Filtrer les statistiques par groupe.
  - status : draft, upcoming, ongoing, finished.
  - isUrgent : true pour voir les échéances proches (< 3 jours).
- **Note** : Les indicateurs isSubmitted et isUrgent sont personnalisés si l'utilisateur est connecté.

### 13. Galerie des Archives (Hall of Fame)
- **Méthode** : GET
- **URL** : /api/saes/archives
- **Rôle** : PUBLIC
- **Description** : Accès direct aux travaux passés avec images pour affichage graphique.
- **Filtres (Query)** : year (ex: 2023).
- **Réponse** : Liste d'objets incluant title, year, thematic, imageUrl (image), url (fichier rendu) et studentName.

### 14. Détail d'une SAE
- **Méthode** : GET
- **URL** : /api/saes/:id
- **Rôle** : PUBLIC (Si publiée), TEACHER/ADMIN (Toujours)
- **Note** : Retourne les indicateurs isSubmitted, isUrgent et les statistiques d'avancement pour les profs.

### 15. Créer une SAE
- **Méthode** : POST
- **URL** : /api/saes
- **Rôle** : TEACHER, ADMIN
- **Body** :
```json
{
  "title": "Titre",
  "description": "Description",
  "instructions": "Optionnel",
  "semesterId": "UUID",
  "thematicId": "UUID",
  "bannerId": "UUID",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z"
}
```

### 16. Modifier une SAE
- **Méthode** : PATCH
- **URL** : /api/saes/:id
- **Rôle** : TEACHER (Propriétaire), ADMIN

### 17. Publier une SAE
- **Méthode** : POST
- **URL** : /api/saes/:id/publish
- **Rôle** : TEACHER (Propriétaire), ADMIN

### 18. Supprimer une SAE
- **Méthode** : DELETE
- **URL** : /api/saes/:id
- **Rôle** : TEACHER (Propriétaire), ADMIN

### 19. Gestion des Invitations
- POST /api/saes/:id/invitations : Inviter un collègue (Rôle: TEACHER Propriétaire).
- GET /api/saes/:id/invitations : Liste des invités (Rôle: TEACHER Propriétaire).
- DELETE /api/saes/:id/invitations/:invitationId : Supprimer un invité (Rôle: TEACHER Propriétaire).

---

## Module Annonces

### 20. Liste des Annonces
- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements
- **Rôle** : PUBLIC (Si SAE publiée)

### 21. Détail d'une Annonce
- **Méthode** : GET
- **URL** : /api/saes/:saeId/announcements/:id
- **Rôle** : PUBLIC (Si SAE publiée)

### 22. Gérer les Annonces
- POST /api/saes/:saeId/announcements : Créer (Rôle: TEACHER Propriétaire/Invité).
- PATCH /api/saes/:saeId/announcements/:id : Modifier (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/announcements/:id : Supprimer (Rôle: TEACHER Propriétaire/Invité).

---

## Module Documents et Rendus

### 23. Documents SAE (Enseignants)
- GET /api/saes/:saeId/documents : Consulter (Rôle: PUBLIC si SAE publiée).
- POST /api/saes/:saeId/documents : Ajouter (Rôle: TEACHER Propriétaire/Invité).
- DELETE /api/saes/:saeId/documents/:documentId : Supprimer (Rôle: TEACHER Propriétaire/Invité).

### 24. Rendus (Étudiants)
- POST /api/saes/:saeId/submission : Déposer/Mettre à jour son travail (Rôle: STUDENT de la promotion concernée).
- GET /api/saes/:saeId/submission/me : Consulter son propre rendu (Rôle: STUDENT concerné).

### 25. Liste des Rendus
- **Méthode** : GET
- **URL** : /api/saes/:saeId/submissions
- **Rôle** : PUBLIC (Si SAE publiée)
- **Description** : Liste des travaux avec studentName, imageUrl et description pour la galerie.
