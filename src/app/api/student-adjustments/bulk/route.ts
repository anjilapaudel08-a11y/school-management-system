import { NextResponse } from "next/server";
import { FeeFrequency, FeeType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireConfiguredSchool,
  schoolConfigurationErrorResponse,
} from "@/lib/school-api";

const discountFeeTypes: FeeType[] = [
  FeeType.TUITION,
  FeeType.ADMISSION,
  FeeType.COMPUTER_LAB,
  FeeType.EXAM,
];
const chargeFeeTypes: FeeType[] = [FeeType.BUS, FeeType.MISCELLANEOUS];

type BulkEntry = Record<string, unknown> & { studentId?: unknown };

class AdjustmentRequestError extends Error {}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function createDiscount(
  academicYearId: string,
  schoolId: string,
  entry: BulkEntry,
) {
  const studentId = requiredText(entry.studentId);
  const name = requiredText(entry.name);
  const percentage = Number(entry.percentage);
  const startDate = parseDate(entry.startDate);
  const endDate = entry.endDate ? parseDate(entry.endDate) : null;
  const feeTypes = Array.isArray(entry.feeTypes)
    ? [...new Set(entry.feeTypes)]
    : [];

  if (!studentId || !name || !startDate) {
    throw new AdjustmentRequestError("Student, discount name, and valid start date are required.");
  }
  if (
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage > 100
  ) {
    throw new AdjustmentRequestError("Discount percentage must be greater than 0 and no more than 100.");
  }
  if (entry.endDate && !endDate) {
    throw new AdjustmentRequestError("Invalid discount end date.");
  }
  if (endDate && endDate < startDate) {
    throw new AdjustmentRequestError("End date cannot be before start date.");
  }
  if (
    feeTypes.length === 0 ||
    feeTypes.some(
      (feeType) =>
        typeof feeType !== "string" ||
        !discountFeeTypes.includes(feeType as FeeType),
    )
  ) {
    throw new AdjustmentRequestError("Select at least one valid discount fee type.");
  }

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        student: { is: { schoolId } },
        academicYear: { is: { schoolId } },
        class: { is: { schoolId } },
      },
      select: { classId: true },
    });
    if (!enrollment) {
      throw new AdjustmentRequestError("Student is not enrolled in the selected academic year.");
    }

    const configured = await tx.feeStructure.findMany({
      where: {
        academicYearId,
        classId: enrollment.classId,
        feeType: { in: feeTypes as FeeType[] },
        isActive: true,
      },
      select: { feeType: true },
    });
    const configuredTypes = new Set(configured.map((fee) => fee.feeType));
    const missingTypes = feeTypes.filter(
      (feeType) => !configuredTypes.has(feeType as FeeType),
    );
    if (missingTypes.length) {
      throw new AdjustmentRequestError(
        `Fee types not configured for this student's class: ${missingTypes.join(", ")}.`,
      );
    }

    const overlaps = await tx.studentDiscount.findMany({
      where: {
        studentId,
        academicYearId,
        isActive: true,
        startDate: { lte: endDate ?? new Date("9999-12-31") },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } },
        ],
        feeTypes: {
          some: { feeType: { in: feeTypes as FeeType[] } },
        },
      },
      select: { id: true },
    });
    if (overlaps.length) {
      throw new AdjustmentRequestError("An active discount already overlaps these fee types and dates.");
    }

    return tx.studentDiscount.create({
      data: {
        studentId,
        academicYearId,
        name,
        percentage,
        startDate,
        endDate,
        notes: requiredText(entry.notes) || null,
        feeTypes: {
          create: feeTypes.map((feeType) => ({
            feeType: feeType as FeeType,
          })),
        },
      },
      select: { id: true },
    });
  });
}

async function createCharge(
  academicYearId: string,
  schoolId: string,
  entry: BulkEntry,
) {
  const studentId = requiredText(entry.studentId);
  const feeType = entry.feeType;
  const description = requiredText(entry.description);
  const quantity = Number(entry.quantity ?? 1);
  const rate = Number(entry.rate);
  const frequency = entry.frequency;
  const startDate = parseDate(entry.startDate);
  const endDate = entry.endDate ? parseDate(entry.endDate) : null;

  if (!studentId || !description || !startDate) {
    throw new AdjustmentRequestError("Student, description, and valid start date are required.");
  }
  if (
    typeof feeType !== "string" ||
    !chargeFeeTypes.includes(feeType as FeeType)
  ) {
    throw new AdjustmentRequestError("Student-specific charges can only be Bus or Miscellaneous.");
  }
  if (
    typeof frequency !== "string" ||
    !Object.values(FeeFrequency).includes(frequency as FeeFrequency)
  ) {
    throw new AdjustmentRequestError("Select a valid charge frequency.");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AdjustmentRequestError("Quantity must be greater than zero.");
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new AdjustmentRequestError("Rate must be a valid non-negative amount.");
  }
  if (entry.endDate && !endDate) {
    throw new AdjustmentRequestError("Invalid charge end date.");
  }
  if (endDate && endDate < startDate) {
    throw new AdjustmentRequestError("End date cannot be before start date.");
  }

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        student: { is: { schoolId } },
        academicYear: { is: { schoolId } },
        class: { is: { schoolId } },
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new AdjustmentRequestError("Student is not enrolled in the selected academic year.");
    }

    return tx.studentCharge.create({
      data: {
        studentId,
        academicYearId,
        feeType: feeType as FeeType,
        description,
        quantity,
        rate,
        amount: quantity * rate,
        frequency: frequency as FeeFrequency,
        startDate,
        endDate,
        notes: requiredText(entry.notes) || null,
      },
      select: { id: true },
    });
  });
}

export async function POST(request: Request) {
  try {
    const school = await requireConfiguredSchool();
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("kind" in body) ||
      !("academicYearId" in body) ||
      !("entries" in body)
    ) {
      return NextResponse.json(
        { error: "Adjustment type, academic year, and entries are required." },
        { status: 400 },
      );
    }

    const payload = body as {
      kind: unknown;
      academicYearId: unknown;
      entries: unknown;
    };
    const kind = payload.kind;
    const academicYearId = requiredText(payload.academicYearId);
    if (kind !== "discount" && kind !== "charge") {
      return NextResponse.json(
        { error: "Adjustment type must be discount or charge." },
        { status: 400 },
      );
    }
    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year is required." },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(payload.entries) ||
      payload.entries.length === 0 ||
      payload.entries.length > 200 ||
      payload.entries.some(
        (entry) => typeof entry !== "object" || entry === null,
      )
    ) {
      return NextResponse.json(
        { error: "Provide between 1 and 200 valid student entries." },
        { status: 400 },
      );
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId, schoolId: school.id },
      select: { id: true },
    });
    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 },
      );
    }

    const entries = payload.entries as BulkEntry[];
    const seenStudents = new Set<string>();
    const created: string[] = [];
    const failures: { studentId: string; error: string }[] = [];

    for (const entry of entries) {
      const studentId = requiredText(entry.studentId);
      if (!studentId) {
        failures.push({ studentId: "", error: "Student is required." });
        continue;
      }
      if (seenStudents.has(studentId)) {
        failures.push({ studentId, error: "Student appears more than once in this submission." });
        continue;
      }
      seenStudents.add(studentId);

      try {
        const record =
          kind === "discount"
            ? await createDiscount(academicYearId, school.id, entry)
            : await createCharge(academicYearId, school.id, entry);
        created.push(record.id);
      } catch (error) {
        const configurationResponse =
          schoolConfigurationErrorResponse(error);
        if (configurationResponse) return configurationResponse;

        if (error instanceof AdjustmentRequestError) {
          failures.push({ studentId, error: error.message });
        } else {
          console.error("Bulk student adjustment failed:", error);
          failures.push({
            studentId,
            error: "Unexpected error while saving this student's record.",
          });
        }
      }
    }

    return NextResponse.json(
      {
        kind,
        createdCount: created.length,
        failedCount: failures.length,
        createdIds: created,
        failures,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to process bulk student adjustments:", error);
    return NextResponse.json(
      { error: "Failed to process bulk student adjustments." },
      { status: 500 },
    );
  }
}
