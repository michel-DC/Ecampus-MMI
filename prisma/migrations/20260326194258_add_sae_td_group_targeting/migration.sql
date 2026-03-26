-- CreateEnum
CREATE TYPE "TdGroup" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "tdGroup" "TdGroup";
