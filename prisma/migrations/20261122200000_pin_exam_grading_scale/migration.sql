ALTER TABLE "GradeScale"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "GradeScale"
ADD COLUMN "usesExclusiveUpperBounds" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Exam"
ADD COLUMN "gradeScaleId" TEXT;

CREATE INDEX "Exam_gradeScaleId_idx" ON "Exam"("gradeScaleId");

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_gradeScaleId_fkey"
FOREIGN KEY ("gradeScaleId") REFERENCES "GradeScale"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "Exam"
SET "gradeScaleId" = (
  SELECT "id" FROM "GradeScale" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1
)
WHERE "isPublished" = true
  AND (SELECT COUNT(*) FROM "GradeScale") = 1;

INSERT INTO "GradeScale" ("id", "name", "description", "isDefault", "usesExclusiveUpperBounds", "createdAt", "updatedAt")
VALUES (
  'approved-school-grading-scale',
  'Approved School Grading Scale',
  'Default grading scale for newly published exams.',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "GradeScaleEntry" ("id", "gradeScaleId", "minPercentage", "maxPercentage", "grade", "gradePoint")
VALUES
  ('approved-grade-a-plus', 'approved-school-grading-scale', 90, 100, 'A+', 4.00),
  ('approved-grade-a', 'approved-school-grading-scale', 80, 90, 'A', 3.60),
  ('approved-grade-b-plus', 'approved-school-grading-scale', 70, 80, 'B+', 3.20),
  ('approved-grade-b', 'approved-school-grading-scale', 60, 70, 'B', 2.80),
  ('approved-grade-c-plus', 'approved-school-grading-scale', 50, 60, 'C+', 2.40),
  ('approved-grade-c', 'approved-school-grading-scale', 40, 50, 'C', 2.00),
  ('approved-grade-d', 'approved-school-grading-scale', 35, 40, 'D', 1.60),
  ('approved-grade-ng', 'approved-school-grading-scale', 0, 35, 'NG', 0.00);
