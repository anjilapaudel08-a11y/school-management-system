import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

    const updatedExam = await prisma.exam.update({
      where: {
        id,
      },
      data: {
        name,
        startDate,
        endDate,
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
        },
      },
    });

    return NextResponse.json(updatedExam);
  } catch (error) {
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

    const exam = await prisma.exam.findUnique({
      where: {
        id,
      },
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found." },
        { status: 404 }
      );
    }

    await prisma.exam.delete({
      where: {
        id,
      },
    });

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