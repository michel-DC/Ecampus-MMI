-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SUJET', 'RESOURCE', 'AUTRE');

-- CreateTable
CREATE TABLE "SaeDocument" (
    "id" TEXT NOT NULL,
    "saeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubmission" (
    "id" TEXT NOT NULL,
    "saeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaeDocument_saeId_idx" ON "SaeDocument"("saeId");

-- CreateIndex
CREATE INDEX "StudentSubmission_saeId_idx" ON "StudentSubmission"("saeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubmission_saeId_studentId_key" ON "StudentSubmission"("saeId", "studentId");

-- AddForeignKey
ALTER TABLE "SaeDocument" ADD CONSTRAINT "SaeDocument_saeId_fkey" FOREIGN KEY ("saeId") REFERENCES "Sae"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_saeId_fkey" FOREIGN KEY ("saeId") REFERENCES "Sae"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
