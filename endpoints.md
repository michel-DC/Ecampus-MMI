# Liste des Endpoints — Module SAE

Ce document liste les nouveaux points d'entrée (endpoints) de l'API pour la gestion des SAE.

---

## 🔐 Configuration Globale
- **Base URL** : `/api/saes`
- **Sécurité** : 
    - Routes `GET /api/saes`, `GET /api/saes/:id` et `GET /api/saes/banners` : **Publiques** (accès sans connexion).
    - Autres routes : `AuthGuard`, `RolesGuard`, `OnboardingGuard` (nécessitent d'être connecté et d'avoir complété son onboarding pour les étudiants).

---

## 1. Liste des Bannières (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/banners`
- **Description** : Récupère la liste des URLs de bannières prédéfinies pour les SAE.
- **Exemple de réponse** :
```json
{
  "success": true,
  "data": [
    { "id": "...", "url": "https://..." },
    { "id": "...", "url": "https://..." }
  ]
}
```

---

## 2. Liste des SAE (Public)
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
      "thematic": {
        "id": "...",
        "code": "DEVELOPPEMENT_WEB",
        "label": "Développement Web"
      },
      "banner": {
        "id": "...",
        "url": "https://..."
      },
      "createdBy": { "name": "Prof Martin", ... }
    }
  ],
  "total": 1
}
```

---

## 3. Détail d'une SAE (Public)
- **Méthode** : `GET`
- **URL** : `/api/saes/:id`
- **Rôle** : Tous (les utilisateurs non connectés ne voient que si `isPublished: true`)

---

## 4. Créer une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes`
- **Rôle** : `TEACHER`, `ADMIN`
- **Body** :
```json
{
  "title": "Développement Web Moderne",
  "description": "Création d'une application complète avec NestJS et Prisma.",
  "semesterId": "ID_DU_SEMESTRE",
  "thematicId": "ID_DE_LA_THEMATIQUE",
  "bannerId": "ID_DE_LA_BANNIERE",
  "startDate": "2026-03-01T08:00:00Z",
  "dueDate": "2026-06-30T23:59:59Z",
  "isPublished": false
}
```

---

## 5. Modifier une SAE
- **Méthode** : `PATCH`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Body** : (Tous les champs sont optionnels)
```json
{
  "title": "Nouveau titre de la SAE",
  "bannerId": "NOUVEL_ID_BANNIERE",
  "thematicId": "NOUVEL_ID_THEMATIQUE",
  "isPublished": true
}
```

---

## 6. Publier une SAE
- **Méthode** : `POST`
- **URL** : `/api/saes/:id/publish`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Description** : Rend la SAE visible pour tous les étudiants.

---

## 7. Supprimer une SAE
- **Méthode** : `DELETE`
- **URL** : `/api/saes/:id`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
- **Description** : Suppression logique (le champ `deletedAt` est renseigné).

---

## 8. Inviter un Enseignant
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

## 9. Liste des Invitations
- **Méthode** : `GET`
- **URL** : `/api/saes/:id/invitations`
- **Rôle** : `TEACHER` (Propriétaire uniquement), `ADMIN`
