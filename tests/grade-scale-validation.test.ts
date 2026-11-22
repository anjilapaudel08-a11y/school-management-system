import assert from "node:assert/strict";
import test from "node:test";
import { validateGradeScaleEntries } from "../src/lib/grade-scale-validation";

const approvedRanges = [
  { minPercentage: 90, maxPercentage: 100, grade: "A+", gradePoint: 4 },
  { minPercentage: 80, maxPercentage: 90, grade: "A", gradePoint: 3.6 },
  { minPercentage: 70, maxPercentage: 80, grade: "B+", gradePoint: 3.2 },
  { minPercentage: 60, maxPercentage: 70, grade: "B", gradePoint: 2.8 },
  { minPercentage: 50, maxPercentage: 60, grade: "C+", gradePoint: 2.4 },
  { minPercentage: 40, maxPercentage: 50, grade: "C", gradePoint: 2 },
  { minPercentage: 35, maxPercentage: 40, grade: "D", gradePoint: 1.6 },
  { minPercentage: 0, maxPercentage: 35, grade: "NG", gradePoint: 0 },
];

const legacyRanges = [
  { minPercentage: 90, maxPercentage: 100, grade: "A+", gradePoint: 4 },
  { minPercentage: 80, maxPercentage: 89.99, grade: "A", gradePoint: 3.6 },
  { minPercentage: 70, maxPercentage: 79.99, grade: "B+", gradePoint: 3.2 },
  { minPercentage: 60, maxPercentage: 69.99, grade: "B", gradePoint: 2.8 },
  { minPercentage: 50, maxPercentage: 59.99, grade: "C+", gradePoint: 2.4 },
  { minPercentage: 40, maxPercentage: 49.99, grade: "C", gradePoint: 2 },
  { minPercentage: 35, maxPercentage: 39.99, grade: "D", gradePoint: 1.6 },
  { minPercentage: 0, maxPercentage: 34.99, grade: "NG", gradePoint: 0 },
];

test("accepts complete contiguous exclusive-upper-bound ranges in any order", () => {
  assert.equal(validateGradeScaleEntries(approvedRanges), null);
});

test("accepts legacy inclusive ranges with hundredth-step boundaries", () => {
  assert.equal(validateGradeScaleEntries(legacyRanges, false), null);
});

test("rejects an empty scale", () => {
  assert.equal(
    validateGradeScaleEntries([]),
    "At least one grade range is required.",
  );
});

test("rejects a gap in grade ranges", () => {
  const ranges = approvedRanges.map((range) => ({ ...range }));
  ranges[3].minPercentage = 60.01;

  assert.equal(
    validateGradeScaleEntries(ranges),
    "Grade ranges cannot have gaps.",
  );
});

test("rejects overlapping grade ranges", () => {
  const ranges = approvedRanges.map((range) => ({ ...range }));
  ranges[3].maxPercentage = 75;

  assert.equal(
    validateGradeScaleEntries(ranges),
    "Grade ranges cannot overlap.",
  );
});
