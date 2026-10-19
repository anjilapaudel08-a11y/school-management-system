/*
  Warnings:

  - You are about to drop the column `percentage` on the `StudentWaiver` table. All the data in the column will be lost.
  - Added the required column `amount` to the `StudentWaiver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentWaiver" DROP COLUMN "percentage",
ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL;
