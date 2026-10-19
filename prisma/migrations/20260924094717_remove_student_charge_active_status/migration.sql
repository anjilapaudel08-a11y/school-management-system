/*
  Warnings:

  - You are about to drop the column `isActive` on the `StudentCharge` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "StudentCharge_isActive_idx";

-- AlterTable
ALTER TABLE "StudentCharge" DROP COLUMN "isActive";
