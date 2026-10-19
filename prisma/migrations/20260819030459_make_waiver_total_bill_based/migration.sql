/*
  Warnings:

  - You are about to drop the `StudentWaiverFee` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentWaiverFee" DROP CONSTRAINT "StudentWaiverFee_waiverId_fkey";

-- DropTable
DROP TABLE "StudentWaiverFee";
