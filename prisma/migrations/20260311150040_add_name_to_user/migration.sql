/*
  Warnings:

  - Made the column `lastname` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "lastname" SET NOT NULL;
