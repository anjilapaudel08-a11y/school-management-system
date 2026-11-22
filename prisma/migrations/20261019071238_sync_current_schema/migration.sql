/*
  Warnings:

  - You are about to drop the column `periodEnd` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `Bill` table. All the data in the column will be lost.
  - Added the required column `periodEndMonth` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodEndYear` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStartMonth` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStartYear` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Bill_periodEnd_idx";

-- DropIndex
DROP INDEX "Bill_periodStart_idx";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
ADD COLUMN     "periodEndMonth" INTEGER NOT NULL,
ADD COLUMN     "periodEndYear" INTEGER NOT NULL,
ADD COLUMN     "periodStartMonth" INTEGER NOT NULL,
ADD COLUMN     "periodStartYear" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TeacherSalaryPayment" (
    "id" TEXT NOT NULL,
    "teacherSalaryId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_teacherSalaryId_idx" ON "TeacherSalaryPayment"("teacherSalaryId");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_paymentDate_idx" ON "TeacherSalaryPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_method_idx" ON "TeacherSalaryPayment"("method");

-- CreateIndex
CREATE INDEX "Bill_periodStartYear_periodStartMonth_idx" ON "Bill"("periodStartYear", "periodStartMonth");

-- CreateIndex
CREATE INDEX "Bill_periodEndYear_periodEndMonth_idx" ON "Bill"("periodEndYear", "periodEndMonth");

-- AddForeignKey
ALTER TABLE "TeacherSalaryPayment" ADD CONSTRAINT "TeacherSalaryPayment_teacherSalaryId_fkey" FOREIGN KEY ("teacherSalaryId") REFERENCES "TeacherSalary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
