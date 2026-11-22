import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

class MarkRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const examSubjectId = searchParams.get(
      "examSubjectId"
    );

    if (!examSubjectId) {
      return NextResponse.json(
        {
          error: "examSubjectId is required.",
        },
        { status: 400 }
      );
    }

    const examSubject =
      await prisma.examSubject.findUnique({
        where: {
          id: examSubjectId,
        },
        include: {
          exam: {
            include: {
              class: true,
              term: {
                include: {
                  academicYear: true,
                },
              },
            },
          },
          subject: true,
        },
      });

    if (!examSubject) {
      return NextResponse.json(
        {
          error: "Exam subject not found.",
        },
        { status: 404 }
      );
    }

    const enrollments =
      await prisma.enrollment.findMany({
        where: {
          academicYearId:
            examSubject.exam.term.academicYearId,
          classId: examSubject.exam.classId,
        },
        include: {
          student: true,
        },
        orderBy: {
          student: {
            firstName: "asc",
          },
        },
      });

    const marks = await prisma.mark.findMany({
      where: {
        examSubjectId,
      },
      include: {
        student: true,
      },
    });

    const marksMap = new Map(
      marks.map((mark) => [
        mark.studentId,
        mark,
      ])
    );

    const students = enrollments.map(
      (enrollment) => {
        const mark = marksMap.get(
          enrollment.studentId
        );

        return {
          studentId: enrollment.studentId,
          admissionNumber:
            enrollment.student.admissionNumber,
          firstName: enrollment.student.firstName,
          middleName:
            enrollment.student.middleName,
          lastName:
            enrollment.student.lastName,
          rollNumber:
            enrollment.rollNumber,
          theoryMarks:
            mark?.theoryMarks?.toString() ?? "",
          practicalMarks:
            mark?.practicalMarks?.toString() ?? "",
          markId: mark?.id ?? null,
        };
      }
    );

    return NextResponse.json({
      examSubject: {
        id: examSubject.id,
        subject: examSubject.subject,
        theoryFullMarks:
          examSubject.theoryFullMarks.toString(),
        practicalFullMarks:
          examSubject.practicalFullMarks.toString(),
        exam: examSubject.exam,
      },
      students,
    });
  } catch (error) {
    console.error(
      "Failed to fetch marks:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch marks.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const examSubjectId =
      typeof body.examSubjectId === "string"
        ? body.examSubjectId
        : "";

    const studentId =
      typeof body.studentId === "string"
        ? body.studentId
        : "";

    const theoryMarks = Number(
      body.theoryMarks ?? 0
    );

    const practicalMarks = Number(
      body.practicalMarks ?? 0
    );

    if (!examSubjectId || !studentId) {
      return NextResponse.json(
        {
          error:
            "examSubjectId and studentId are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(theoryMarks) ||
      !Number.isFinite(practicalMarks)
    ) {
      return NextResponse.json(
        {
          error: "Marks must be valid numbers.",
        },
        { status: 400 }
      );
    }

    if (
      theoryMarks < 0 ||
      practicalMarks < 0
    ) {
      return NextResponse.json(
        {
          error: "Marks cannot be negative.",
        },
        { status: 400 }
      );
    }

    const examSubjectPreview = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      select: { examId: true },
    });

    if (!examSubjectPreview) {
      return NextResponse.json(
        {
          error: "Exam subject not found.",
        },
        { status: 404 }
      );
    }

    const mark = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`exam:${examSubjectPreview.examId}`}, 0)
        )
      `;

      const examSubject = await tx.examSubject.findUnique({
        where: { id: examSubjectId },
        include: {
          exam: {
            include: {
              term: true,
            },
          },
        },
      });

      if (!examSubject) {
        throw new MarkRequestError("Exam subject not found.", 404);
      }

      if (examSubject.exam.isLocked) {
        throw new MarkRequestError(
          "This exam is locked and its marks cannot be changed.",
          409,
        );
      }

      if (theoryMarks > Number(examSubject.theoryFullMarks)) {
        throw new MarkRequestError(
          `Theory marks cannot exceed ${examSubject.theoryFullMarks}.`,
          400,
        );
      }

      if (practicalMarks > Number(examSubject.practicalFullMarks)) {
        throw new MarkRequestError(
          `Practical marks cannot exceed ${examSubject.practicalFullMarks}.`,
          400,
        );
      }

      const enrollment = await tx.enrollment.findFirst({
        where: {
          studentId,
          academicYearId: examSubject.exam.term.academicYearId,
          classId: examSubject.exam.classId,
        },
      });

      if (!enrollment) {
        throw new MarkRequestError(
          "Student is not enrolled in this class and academic year.",
          400,
        );
      }

      return tx.mark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId,
            studentId,
          },
        },
        update: {
          theoryMarks,
          practicalMarks,
        },
        create: {
          examSubjectId,
          studentId,
          theoryMarks,
          practicalMarks,
        },
      });
    });

    return NextResponse.json({
      id: mark.id,
      examSubjectId: mark.examSubjectId,
      studentId: mark.studentId,
      theoryMarks:
        mark.theoryMarks.toString(),
      practicalMarks:
        mark.practicalMarks.toString(),
    });
  } catch (error) {
    if (error instanceof MarkRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Failed to save marks:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to save marks.",
      },
      { status: 500 }
    );
  }
}