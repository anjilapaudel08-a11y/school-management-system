/*
  Warnings:

  - You are about to drop the column `chargeDate` on the `StudentCharge` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `StudentCharge` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `StudentCharge` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BillItem_studentChargeId_key";

-- DropIndex
DROP INDEX "StudentCharge_chargeDate_idx";

-- DropIndex
DROP INDEX "StudentCharge_status_idx";

-- AlterTable
ALTER TABLE "StudentCharge" DROP COLUMN "chargeDate",
DROP COLUMN "status",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "feeType" "FeeType" NOT NULL DEFAULT 'MISCELLANEOUS',
ADD COLUMN     "frequency" "FeeFrequency" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "StudentChargeStatus";

-- CreateIndex
CREATE INDEX "BillItem_studentChargeId_idx" ON "BillItem"("studentChargeId");

-- CreateIndex
CREATE INDEX "StudentCharge_feeType_idx" ON "StudentCharge"("feeType");

-- CreateIndex
CREATE INDEX "StudentCharge_frequency_idx" ON "StudentCharge"("frequency");

-- CreateIndex
CREATE INDEX "StudentCharge_startDate_idx" ON "StudentCharge"("startDate");

-- CreateIndex
CREATE INDEX "StudentCharge_endDate_idx" ON "StudentCharge"("endDate");

-- CreateIndex
CREATE INDEX "StudentCharge_isActive_idx" ON "StudentCharge"("isActive");
