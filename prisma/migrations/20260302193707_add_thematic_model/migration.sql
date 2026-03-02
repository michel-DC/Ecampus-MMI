/*
  Warnings:

  - Added the required column `thematicId` to the `Sae` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sae" ADD COLUMN     "thematicId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Thematic" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Thematic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Thematic_code_key" ON "Thematic"("code");

-- CreateIndex
CREATE INDEX "Sae_thematicId_idx" ON "Sae"("thematicId");

-- AddForeignKey
ALTER TABLE "Sae" ADD CONSTRAINT "Sae_thematicId_fkey" FOREIGN KEY ("thematicId") REFERENCES "Thematic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
