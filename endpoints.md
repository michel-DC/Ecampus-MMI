# Liste des Endpoints — Module SAE

Ce document liste les nouveaux points d'entrée (endpoints) de l'API pour la gestion des SAE.

---

## 🔐 Configuration Globale
- **Base URL** : `/api/saes`
- **Sécurité** : `AuthGuard`, `RolesGuard`, `OnboardingGuard` (toutes les routes nécessitent d'être connecté et d'avoir complété son onboarding pour les étudiants).

---

## 1. Liste des SAE
- **Méthode** : `GET`
- **URL** : `/api/saes`
- **Rôle** : Tous
- **Filtres (Query Params)** : `semesterId`, `isPublished` (enseignant uniquement), `status` (`draft`, `upcoming`, `ongoing`, `finished`).
- **Exemple de réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "SAE 2.01",
      "status": "ongoing",
      "isPublished": true,
      "createdBy": { "name": "Prof Martin", ... }
    }
  ],
  "total": 1
}
```

---

## 2. Détail d'une SAE
- **Méthode** : `GET`
- **URL** : `/api/saes/:id`
- **Rôle** : Tous (les étudiants ne voient que si `isPublished: true`)

---

## 3. Créer une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes`
- **Rôle** : `TEACHER`, `ADMIN`
- **Body** :
```json
{
  "title": "Développement Web Moderne",
  "description": "Création d'une application complète avec NestJS et Prisma.",
  "semesterId": "ID_DU_SEMESTRE",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z",
  "imageBanner": "https://exemple.com/image.jpg"
}
```

---

## 4. Modifier une SAE
- **Méthode** : `PATCH`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Body** : (Tous les champs sont optionnels)
```json
{
  "title": "Nouveau titre de la SAE",
  "isPublished": true
}
```

---

## 5. Publier une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes/:id/publish`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Description** : Rend la SAE visible pour tous les étudiants.

---

## 6. Supprimer une SAE
- **Méthode** : `DELETE`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Description** : Suppression logique (le champ `deletedAt` est renseigné).

---

## 7. Inviter un Enseignant
- **Méthode** : `POST`
- **URL** : `/api/saes/:id/invitations`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Body** :
```json
{
  "userId": "ID_DE_L_ENSEIGNANT_A_INVITER"
}
```

---

## 8. Liste des Invitations
- **Méthode** : `GET`
- **URL** : `/api/saes/:id/invitations`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
