/*
  Warnings:

  - You are about to drop the column `imageBanner` on the `Sae` table. All the data in the column will be lost.
  - Added the required column `bannerId` to the `Sae` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sae" DROP COLUMN "imageBanner",
ADD COLUMN     "bannerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banner_url_key" ON "Banner"("url");

-- CreateIndex
CREATE INDEX "Sae_bannerId_idx" ON "Sae"("bannerId");

-- AddForeignKey
ALTER TABLE "Sae" ADD CONSTRAINT "Sae_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
