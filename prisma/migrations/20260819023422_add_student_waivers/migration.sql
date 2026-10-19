/*
  Warnings:

  - Added the required column `startDate` to the `StudentDiscount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentDiscount" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "StudentWaiver" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWaiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWaiverFee" (
    "id" TEXT NOT NULL,
    "waiverId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,

    CONSTRAINT "StudentWaiverFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentWaiver_studentId_idx" ON "StudentWaiver"("studentId");

-- CreateIndex
CREATE INDEX "StudentWaiver_academicYearId_idx" ON "StudentWaiver"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentWaiver_startDate_idx" ON "StudentWaiver"("startDate");

-- CreateIndex
CREATE INDEX "StudentWaiver_endDate_idx" ON "StudentWaiver"("endDate");

-- CreateIndex
CREATE INDEX "StudentWaiver_isActive_idx" ON "StudentWaiver"("isActive");

-- CreateIndex
CREATE INDEX "StudentWaiverFee_waiverId_idx" ON "StudentWaiverFee"("waiverId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWaiverFee_waiverId_feeType_key" ON "StudentWaiverFee"("waiverId", "feeType");

-- CreateIndex
CREATE INDEX "StudentDiscount_startDate_idx" ON "StudentDiscount"("startDate");

-- CreateIndex
CREATE INDEX "StudentDiscount_endDate_idx" ON "StudentDiscount"("endDate");

-- CreateIndex
CREATE INDEX "StudentDiscount_isActive_idx" ON "StudentDiscount"("isActive");

-- AddForeignKey
ALTER TABLE "StudentWaiver" ADD CONSTRAINT "StudentWaiver_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWaiver" ADD CONSTRAINT "StudentWaiver_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWaiverFee" ADD CONSTRAINT "StudentWaiverFee_waiverId_fkey" FOREIGN KEY ("waiverId") REFERENCES "StudentWaiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
