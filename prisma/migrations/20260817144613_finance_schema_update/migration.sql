/*
  Warnings:

  - You are about to drop the column `isMonthly` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `StudentDiscount` table. All the data in the column will be lost.
  - You are about to drop the column `isPercentage` on the `StudentDiscount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentChargeId]` on the table `BillItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `periodEnd` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `netAmount` to the `BillItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequency` to the `FeeStructure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percentage` to the `StudentDiscount` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'TERM', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "StudentChargeStatus" AS ENUM ('PENDING', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('OFFICE_SUPPLIES', 'ELECTRICITY', 'WATER', 'INTERNET', 'MAINTENANCE', 'TRANSPORT', 'MEDICAL', 'SALARY', 'FOOD', 'RENT', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "SalaryPaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL');

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "BillItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "studentChargeId" TEXT;

-- AlterTable
ALTER TABLE "FeeStructure" DROP COLUMN "isMonthly",
ADD COLUMN     "frequency" "FeeFrequency" NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "method" SET DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "StudentDiscount" DROP COLUMN "amount",
DROP COLUMN "isPercentage",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "percentage" DECIMAL(65,30) NOT NULL;

-- CreateTable
CREATE TABLE "StudentDiscountFee" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,

    CONSTRAINT "StudentDiscountFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCharge" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "rate" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StudentChargeStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCredit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "appliedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "sourcePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillCreditApplication" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillCreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidTo" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSalary" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "salaryAmount" DECIMAL(65,30) NOT NULL,
    "deduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "status" "SalaryPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentDiscountFee_discountId_idx" ON "StudentDiscountFee"("discountId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDiscountFee_discountId_feeType_key" ON "StudentDiscountFee"("discountId", "feeType");

-- CreateIndex
CREATE INDEX "StudentCharge_studentId_idx" ON "StudentCharge"("studentId");

-- CreateIndex
CREATE INDEX "StudentCharge_academicYearId_idx" ON "StudentCharge"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentCharge_status_idx" ON "StudentCharge"("status");

-- CreateIndex
CREATE INDEX "StudentCharge_chargeDate_idx" ON "StudentCharge"("chargeDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCredit_sourcePaymentId_key" ON "StudentCredit"("sourcePaymentId");

-- CreateIndex
CREATE INDEX "StudentCredit_studentId_idx" ON "StudentCredit"("studentId");

-- CreateIndex
CREATE INDEX "StudentCredit_academicYearId_idx" ON "StudentCredit"("academicYearId");

-- CreateIndex
CREATE INDEX "BillCreditApplication_billId_idx" ON "BillCreditApplication"("billId");

-- CreateIndex
CREATE INDEX "BillCreditApplication_creditId_idx" ON "BillCreditApplication"("creditId");

-- CreateIndex
CREATE INDEX "Expense_academicYearId_idx" ON "Expense"("academicYearId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_paymentMethod_idx" ON "Expense"("paymentMethod");

-- CreateIndex
CREATE INDEX "TeacherSalary_teacherId_idx" ON "TeacherSalary"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSalary_academicYearId_idx" ON "TeacherSalary"("academicYearId");

-- CreateIndex
CREATE INDEX "TeacherSalary_status_idx" ON "TeacherSalary"("status");

-- CreateIndex
CREATE INDEX "TeacherSalary_paymentDate_idx" ON "TeacherSalary"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalary_teacherId_academicYearId_month_year_key" ON "TeacherSalary"("teacherId", "academicYearId", "month", "year");

-- CreateIndex
CREATE INDEX "Bill_periodStart_idx" ON "Bill"("periodStart");

-- CreateIndex
CREATE INDEX "Bill_periodEnd_idx" ON "Bill"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "BillItem_studentChargeId_key" ON "BillItem"("studentChargeId");

-- AddForeignKey
ALTER TABLE "StudentDiscountFee" ADD CONSTRAINT "StudentDiscountFee_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "StudentDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCharge" ADD CONSTRAINT "StudentCharge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCharge" ADD CONSTRAINT "StudentCharge_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_studentChargeId_fkey" FOREIGN KEY ("studentChargeId") REFERENCES "StudentCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillCreditApplication" ADD CONSTRAINT "BillCreditApplication_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillCreditApplication" ADD CONSTRAINT "BillCreditApplication_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "StudentCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalary" ADD CONSTRAINT "TeacherSalary_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalary" ADD CONSTRAINT "TeacherSalary_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
