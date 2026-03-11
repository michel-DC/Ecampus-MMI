# Analyse Détaillée : Erreur "Invalid password hash" lors de la connexion du professeur

## Contexte du Problème

Suite à la mise en place de la création d'un compte professeur via la route `POST /api/auth/sign-up/teacher`, une tentative de connexion avec le mot de passe temporaire généré entraîne une erreur HTTP 500 (`Invalid password hash`). Cette erreur survient lors du processus de connexion géré par `better-auth`.

## Diagnostic et Tentatives de Résolution

Plusieurs pistes ont été explorées pour résoudre ce problème :

### 1. Problème Initial : Format du Hash Incompatible ?

- **Hypothèse :** Une incompatibilité entre la librairie `bcryptjs` utilisée manuellement pour hasher le mot de passe et celle potentiellement utilisée en interne par `better-auth` pour la vérification.
- **Action :** Nous avons désinstallé `bcryptjs`, installé la librairie native `bcrypt`, et mis à jour l'import dans `users.service.ts`.
- **Résultat :** L'erreur `Invalid password hash` a persisté. Les logs de débogage ont confirmé que le hash généré avec `bcrypt` était valide et correctement formaté (`$2b$12$...`).

### 2. Deuxième Hypothèse : Identification du Compte

- **Hypothèse :** `better-auth` pourrait avoir du mal à retrouver le compte associé à l'utilisateur si l'`accountId` dans la table `account` n'est pas correctement défini.
- **Action :** La création du compte dans `users.service.ts` a été modifiée pour définir l'`accountId` sur l'email de l'utilisateur (`dto.email`) plutôt que sur l'ID utilisateur (`newUser.id`), considérant que l'email est souvent l'identifiant principal pour les providers de type 'credential'.
- **Résultat :** L'erreur `Invalid password hash` a persisté, indiquant que le problème ne venait pas de la manière dont le compte était lié, mais plutôt de la façon dont `better-auth` interagissait avec les données.

### 3. Erreur TypeScript Résolue : Référence à `bcryptjs`

- **Problème :** Une erreur de compilation TypeScript (`TS2688: Cannot find type definition file for 'bcryptjs'`) est apparue après le retrait de la librairie.
- **Cause :** Une référence résiduelle à `@types/bcryptjs` était encore présente dans `package.json` (`devDependencies`).
- **Action :** Le paquet `@types/bcryptjs` a été désinstallé.
- **Résultat :** L'erreur TypeScript est corrigée.

## Analyse Actuelle et Conclusion

Malgré les diagnostics et les correctifs appliqués, l'erreur `Invalid password hash` demeure. Les logs de débogage ont confirmé que :

- Le hash généré (maintenant avec `bcrypt`) est valide et correctement formaté.
- Les données préparées pour la création du compte dans la base de données (`userId`, `accountId` comme email, `providerId`, et le hash dans `password`) sont correctes.

Cela nous amène à la conclusion la plus probable : **le problème ne vient pas de la manière dont nous générons ou stockons les données, mais de la manière dont `better-auth` s'attend à ce que ces données soient créées ou liées.**

Notre approche actuelle, consistant à créer manuellement l'utilisateur et le compte via `prisma.user.create` et `prisma.account.create` dans `users.service.ts`, **contourne très probablement une logique interne essentielle de `better-auth`**. Même si nous fournissons les bons champs et un hash valide, `better-auth`, lors de la connexion, n'arrive pas à retrouver ou interpréter correctement ces informations. Les causes possibles incluent :

- `better-auth` attend que la création soit effectuée via ses propres fonctions internes (par exemple, une méthode `auth.createUser` s'il en existe une) pour pouvoir lier correctement les modèles `user` et `account` selon ses propres conventions.
- Il pourrait y avoir une configuration très spécifique à respecter lors de la création d'un compte `credential` qui nous échappe.

Tenter de deviner cette logique interne est devenu inefficace et risqué.

## Prochaines Étapes Recommandées

Pour résoudre définitivement cette erreur persistante, nous devons passer à une approche plus fiable et probablement plus conforme à la librairie `better-auth`.

Pour cela, j'aurais besoin de votre aide :

1.  **Documentation `better-auth` :** Avez-vous accès à la documentation officielle de `better-auth` ?
2.  **Exemples de création programmatique :** La documentation contient-elle des exemples montrant comment créer un utilisateur de manière programmatique depuis le code serveur (par exemple, une fonction que l'on pourrait appeler depuis `users.service.ts` ou `auth.service.ts` pour créer un utilisateur avec un rôle spécifique, comme `TEACHER`) ?

Sans connaître l'API interne prévue par `better-auth` pour ce type de scénario (création par un administrateur, distincte du flux `sign-up` public), toute modification directe du code risque d'être une tentative aveugle. Utiliser leur propre mécanisme de création, s'il est documenté, serait la voie la plus sûre et la plus conforme pour garantir que la connexion fonctionne correctement.

---

## Solution finalisée

Après recherche dans la documentation et tests, il se révèle que **better‑auth fournit un plugin `admin` et une API interne `auth.api.createUser`** destinée notamment à la création d'utilisateurs par un serveur (sans session active). Ce mécanisme se charge du `hash` du mot de passe et de la liaison `user` / `account` selon les conventions internes. En remplaçant les appels manuels à Prisma par cet endpoint, l'erreur disparait complètement.

### Étapes appliquées

1. Activation du plugin Admin dans la configuration (`src/lib/auth.ts`).
2. Remplacement de la logique `createTeacher` dans `src/users/users.service.ts` :
   - suppression de `bcrypt` et des transactions Prisma manuelles
   - appel de `await auth.api.createUser({ body: { email, firstname, lastname, password, role: 'TEACHER' } })`
   - utilisation de la réponse pour composer `CreatedTeacherResponse`
3. Nettoyage des dépendances (`bcrypt` + `@types/bcrypt` supprimés).
4. Vérification des imports et suppression du code obsolète.

### Nettoyage recommandé

- [x] Supprimer `bcrypt` et `@types/bcrypt` des dépendances (fait).
- [x] Supprimer tout import de `bcrypt` dans le projet (fait).
- [x] Vérifier que le plugin `admin` est activé (déjà en place).
- [x] Tester la route `POST /api/auth/sign-up/teacher` et ensuite se connecter avec le mot de passe temporaire : l'erreur ne se produit plus.

> ⚠️ Ne pas recréer manuellement les enregistrements `user`/`account` via Prisma : le seul chemin sûr est `auth.api.createUser`.

Cette approche s'aligne avec les bonnes pratiques de la librairie et assure une compatibilité longue durée avec les futures versions de `better-auth`.
