import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

class ExamStateError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: {
        id,
      },
      include: {
        term: {
          include: {
            academicYear: true,
          },
        },
        class: true,
        subjects: {
          include: {
            subject: true,
          },
          orderBy: {
            subject: {
              name: "asc",
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to fetch exam:", error);

    return NextResponse.json(
      { error: "Failed to fetch exam." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingExam = await prisma.exam.findUnique({
      where: {
        id,
      },
      include: {
        term: true,
      },
    });

    if (!existingExam) {
      return NextResponse.json(
        { error: "Exam not found." },
        { status: 404 }
      );
    }

    if (existingExam.isPublished || existingExam.isLocked) {
      return NextResponse.json(
        { error: "Published or locked exams cannot be edited." },
        { status: 409 },
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existingExam.name;

    const startDate =
      body.startDate === null ||
      body.startDate === ""
        ? null
        : body.startDate
          ? new Date(body.startDate)
          : existingExam.startDate;

    const endDate =
      body.endDate === null ||
      body.endDate === ""
        ? null
        : body.endDate
          ? new Date(body.endDate)
          : existingExam.endDate;

    if (!name) {
      return NextResponse.json(
        { error: "Exam name is required." },
        { status: 400 }
      );
    }

    if (
      startDate &&
      Number.isNaN(startDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid start date." },
        { status: 400 }
      );
    }

    if (
      endDate &&
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid end date." },
        { status: 400 }
      );
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be before start date.",
        },
        { status: 400 }
      );
    }

    const duplicate = await prisma.exam.findFirst({
      where: {
        id: {
          not: id,
        },
        termId: existingExam.termId,
        classId: existingExam.classId,
        name,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "An exam with this name already exists for this class and term.",
        },
        { status: 409 }
      );
    }

    const updatedExam = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`exam:${id}`}, 0)
        )
      `;

      const currentExam = await tx.exam.findUnique({
        where: { id },
        select: { isPublished: true, isLocked: true },
      });

      if (!currentExam) {
        throw new ExamStateError("Exam not found.", 404);
      }

      if (currentExam.isPublished || currentExam.isLocked) {
        throw new ExamStateError(
          "Published or locked exams cannot be edited.",
          409,
        );
      }

      return tx.exam.update({
        where: { id },
        data: { name, startDate, endDate },
        include: {
          term: {
            include: {
              academicYear: true,
            },
          },
          class: true,
          subjects: {
            include: {
              subject: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedExam);
  } catch (error) {
    if (error instanceof ExamStateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to update exam:", error);

    return NextResponse.json(
      { error: "Failed to update exam." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`exam:${id}`}, 0)
        )
      `;

      const exam = await tx.exam.findUnique({
        where: { id },
        select: {
          id: true,
          isPublished: true,
          isLocked: true,
        },
      });

      if (!exam) {
        return "NOT_FOUND" as const;
      }

      const markCount = await tx.mark.count({
        where: {
          examSubject: { examId: id },
        },
      });

      if (exam.isPublished || exam.isLocked || markCount > 0) {
        return "HAS_RESULTS" as const;
      }

      await tx.exam.delete({ where: { id } });
      return "DELETED" as const;
    });

    if (deleted === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Exam not found." },
        { status: 404 },
      );
    }

    if (deleted === "HAS_RESULTS") {
      return NextResponse.json(
        {
          error:
            "This exam cannot be deleted because it has published, locked, or recorded marks.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: "Exam deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete exam:", error);

    return NextResponse.json(
      { error: "Failed to delete exam." },
      { status: 500 }
    );
  }
}