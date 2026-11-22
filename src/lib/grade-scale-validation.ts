function exceedsTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) > 1e-8;
}

export function validateGradeScaleEntries(
  entries: readonly unknown[],
): string | null {
  if (entries.length === 0) {
    return "At least one grade range is required.";
  }

  const ranges: { min: number; max: number }[] = [];

  for (const rawEntry of entries) {
    if (typeof rawEntry !== "object" || rawEntry === null) {
      return "Invalid grade scale entry.";
    }

    const entry = rawEntry as Record<string, unknown>;
    const minPercentage = Number(entry.minPercentage);
    const maxPercentage = Number(entry.maxPercentage);
    const gradePoint = Number(entry.gradePoint);

    if (
      !Number.isFinite(minPercentage) ||
      !Number.isFinite(maxPercentage) ||
      !Number.isFinite(gradePoint) ||
      typeof entry.grade !== "string" ||
      !entry.grade.trim()
    ) {
      return "Invalid grade scale entry.";
    }

    if (
      minPercentage < 0 ||
      minPercentage > 100 ||
      maxPercentage < 0 ||
      maxPercentage > 100
    ) {
      return "Percentage values must be between 0 and 100.";
    }

    if (minPercentage > maxPercentage) {
      return "Minimum percentage cannot exceed maximum percentage.";
    }

    if (
      gradePoint < 0 ||
      exceedsTwoDecimalPlaces(gradePoint)
    ) {
      return "Grade point must be non-negative with at most two decimals.";
    }

    if (
      exceedsTwoDecimalPlaces(minPercentage) ||
      exceedsTwoDecimalPlaces(maxPercentage)
    ) {
      return "Percentage ranges must use at most two decimal places.";
    }

    ranges.push({
      min: Math.round(minPercentage * 100),
      max: Math.round(maxPercentage * 100),
    });
  }

  const orderedRanges = ranges.sort((a, b) => a.min - b.min);

  if (orderedRanges[0]?.min !== 0) {
    return "Grade ranges must start at 0%.";
  }

  if (orderedRanges[orderedRanges.length - 1]?.max !== 10000) {
    return "Grade ranges must cover through 100%.";
  }

  for (let index = 1; index < orderedRanges.length; index += 1) {
    const previous = orderedRanges[index - 1];
    const current = orderedRanges[index];

    if (current.min <= previous.max) {
      return "Grade ranges cannot overlap.";
    }

    if (current.min !== previous.max + 1) {
      return "Grade ranges cannot have gaps.";
    }
  }

  return null;
}
