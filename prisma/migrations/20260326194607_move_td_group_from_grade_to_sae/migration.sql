/*
  Warnings:

  - You are about to drop the column `tdGroup` on the `Grade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "tdGroup";

-- AlterTable
ALTER TABLE "Sae" ADD COLUMN     "tdGroup" "TdGroup";
