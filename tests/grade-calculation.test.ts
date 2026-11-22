import assert from "node:assert/strict";
import test from "node:test";
import {
  getGradeForPercentage,
  getPerformanceLevel,
} from "../src/lib/grade-calculation";

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

const boundaries = [
  [34.99, "NG", 0],
  [35, "D", 1.6],
  [39.99, "D", 1.6],
  [40, "C", 2],
  [49.99, "C", 2],
  [50, "C+", 2.4],
  [59.99, "C+", 2.4],
  [60, "B", 2.8],
  [69.99, "B", 2.8],
  [70, "B+", 3.2],
  [79.99, "B+", 3.2],
  [80, "A", 3.6],
  [89.99, "A", 3.6],
  [90, "A+", 4],
  [100, "A+", 4],
] as const;

test("uses raw percentages at all approved grading boundaries", () => {
  for (const [percentage, grade, gradePoint] of boundaries) {
    assert.deepEqual(
      getGradeForPercentage(percentage, approvedRanges, true),
      { grade, gradePoint },
      `${percentage}%`,
    );
  }
});

test("does not round before determining the grade", () => {
  const percentage = (179.99 / 200) * 100;
  assert.equal(percentage, 89.995);
  assert.equal(
    getGradeForPercentage(percentage, approvedRanges, true).grade,
    "A",
  );
});

test("preserves inclusive legacy grade-scale semantics", () => {
  const legacy = [
    { minPercentage: 90, maxPercentage: 100, grade: "A+", gradePoint: 4 },
    { minPercentage: 80, maxPercentage: 89.99, grade: "A", gradePoint: 3.6 },
  ];

  assert.equal(getGradeForPercentage(89.99, legacy).grade, "A");
  assert.equal(getGradeForPercentage(89.995, legacy).grade, "N/A");
});

test("maps grades to approved performance labels", () => {
  assert.equal(getPerformanceLevel("A+"), "Outstanding");
  assert.equal(getPerformanceLevel("A"), "Excellent");
  assert.equal(getPerformanceLevel("NG"), "Not Graded");
});
