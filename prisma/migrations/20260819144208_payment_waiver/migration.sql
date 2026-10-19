/*
  Warnings:

  - You are about to drop the `StudentWaiver` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentWaiver" DROP CONSTRAINT "StudentWaiver_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "StudentWaiver" DROP CONSTRAINT "StudentWaiver_studentId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "waiverAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "waiverReason" TEXT;

-- DropTable
DROP TABLE "StudentWaiver";
