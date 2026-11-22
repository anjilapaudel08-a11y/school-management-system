type GradeScaleEntry = {
  minPercentage: number | string | { toNumber(): number };
  maxPercentage: number | string | { toNumber(): number };
  grade: string;
  gradePoint: number | string | { toNumber(): number };
};

function asNumber(value: number | string | { toNumber(): number }): number {
  return typeof value === "object" ? value.toNumber() : Number(value);
}

export function getGradeForPercentage(
  percentage: number,
  entries: readonly GradeScaleEntry[],
  usesExclusiveUpperBounds = false,
) {
  const entry = entries.find((item) => {
    const min = asNumber(item.minPercentage);
    const max = asNumber(item.maxPercentage);

    const withinRange = usesExclusiveUpperBounds
      ? percentage < max || (max === 100 && percentage <= 100)
      : percentage <= max;

    return percentage >= min && withinRange;
  });

  if (!entry) {
    return { grade: "N/A", gradePoint: 0 };
  }

  return {
    grade: entry.grade,
    gradePoint: asNumber(entry.gradePoint),
  };
}

const PERFORMANCE_LEVELS: Record<string, string> = {
  "A+": "Outstanding",
  A: "Excellent",
  "B+": "Very Good",
  B: "Good",
  "C+": "Satisfactory",
  C: "Acceptable",
  D: "Basic",
  NG: "Not Graded",
};

export function getPerformanceLevel(grade: string): string {
  return PERFORMANCE_LEVELS[grade] ?? "Not Graded";
}
