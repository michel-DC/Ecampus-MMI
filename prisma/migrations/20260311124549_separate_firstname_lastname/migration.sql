-- 1. Ajouter les nouvelles colonnes (nullable pour permettre la migration)
ALTER TABLE "user" ADD COLUMN "firstname" TEXT;
ALTER TABLE "user" ADD COLUMN "lastname" TEXT;

-- 2. Transférer les données existantes : name devient firstname
UPDATE "user" SET "firstname" = "name";

-- 3. Rendre firstname NOT NULL maintenant que toutes les lignes ont une valeur
ALTER TABLE "user" ALTER COLUMN "firstname" SET NOT NULL;

-- 4. Supprimer l'ancienne colonne name
ALTER TABLE "user" DROP COLUMN "name";
