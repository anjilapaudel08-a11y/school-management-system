import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireConfiguredSchool,
  schoolConfigurationErrorResponse,
} from "@/lib/school-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

class PublicationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const school = await requireConfiguredSchool();
    const { id } = await context.params;
    const exam = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`exam:${id}`}, 0)
        )
      `;

      const currentExam = await tx.exam.findFirst({
        where: {
          id,
          class: { is: { schoolId: school.id } },
          term: {
            is: {
              academicYear: { is: { schoolId: school.id } },
            },
          },
        },
        include: {
          term: { select: { academicYearId: true } },
          subjects: { select: { id: true } },
        },
      });

      if (!currentExam) {
        throw new PublicationError("Exam not found.", 404);
      }

      if (currentExam.isPublished) {
        return tx.exam.findUniqueOrThrow({
          where: { id },
          include: {
            term: { include: { academicYear: true } },
            class: true,
            subjects: { include: { subject: true } },
          },
        });
      }

      if (currentExam.subjects.length === 0) {
        throw new PublicationError(
          "Add at least one subject before publishing results.",
          409,
        );
      }

      const defaultGradeScale = await tx.gradeScale.findFirst({
        where: { isDefault: true },
        select: { id: true },
      });

      if (!defaultGradeScale) {
        throw new PublicationError(
          "A default grade scale must be configured before publishing results.",
          409,
        );
      }

      const enrollments = await tx.enrollment.findMany({
        where: {
          classId: currentExam.classId,
          academicYearId: currentExam.term.academicYearId,
        },
        select: { studentId: true },
      });

      if (enrollments.length === 0) {
        throw new PublicationError(
          "There are no enrolled students for this exam.",
          409,
        );
      }

      const recordedMarks = await tx.mark.count({
        where: {
          examSubjectId: {
            in: currentExam.subjects.map((subject) => subject.id),
          },
          studentId: {
            in: enrollments.map((enrollment) => enrollment.studentId),
          },
        },
      });
      const expectedMarks =
        currentExam.subjects.length * enrollments.length;
      const missingMarks = expectedMarks - recordedMarks;

      if (missingMarks > 0) {
        throw new PublicationError(
          `Cannot publish results: ${missingMarks} student-subject mark entries are missing.`,
          409,
        );
      }

      return tx.exam.update({
        where: { id },
        data: {
          isPublished: true,
          isLocked: true,
          gradeScaleId: defaultGradeScale.id,
        },
        include: {
          term: { include: { academicYear: true } },
          class: true,
          subjects: { include: { subject: true } },
        },
      });
    }, {
      maxWait: 15_000,
      timeout: 20_000,
    });

    return NextResponse.json({
      message: "Exam results published and marks locked.",
      exam,
    });
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    if (error instanceof PublicationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to publish exam results:", error);
    return NextResponse.json(
      { error: "Failed to publish exam results." },
      { status: 500 },
    );
  }
}
