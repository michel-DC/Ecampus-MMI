-- AlterTable
ALTER TABLE "MilestoneProgress" ALTER COLUMN "reachedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudentSubmission" ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateTime" INTEGER;
