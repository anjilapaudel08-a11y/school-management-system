import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        ...(classId ? { classId } : {}),
      },
      include: {
        teacher: true,
        class: true,
        subject: true,
        academicYear: true,
      },
      orderBy: [
        {
          class: {
            order: "asc",
          },
        },
        {
          subject: {
            name: "asc",
          },
        },
      ],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch teacher assignments:", error);

    return NextResponse.json(
      { error: "Failed to fetch teacher assignments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teacherId = body.teacherId;
    const classId = body.classId;
    const subjectId = body.subjectId;
    const academicYearId = body.academicYearId;

    if (
      !teacherId ||
      !classId ||
      !subjectId ||
      !academicYearId
    ) {
      return NextResponse.json(
        {
          error:
            "Teacher, class, subject and academic year are required.",
        },
        { status: 400 }
      );
    }

    const [
      teacher,
      schoolClass,
      subject,
      academicYear,
      classSubject,
    ] = await Promise.all([
      prisma.teacher.findUnique({
        where: {
          id: teacherId,
        },
      }),

      prisma.class.findUnique({
        where: {
          id: classId,
        },
      }),

      prisma.subject.findUnique({
        where: {
          id: subjectId,
        },
      }),

      prisma.academicYear.findUnique({
        where: {
          id: academicYearId,
        },
      }),

      prisma.classSubject.findUnique({
        where: {
          classId_subjectId_academicYearId: {
            classId,
            subjectId,
            academicYearId,
          },
        },
      }),
    ]);

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 }
      );
    }

    if (!schoolClass) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 }
      );
    }

    if (!classSubject) {
      return NextResponse.json(
        {
          error:
            "This subject has not been assigned to this class for the selected academic year.",
        },
        { status: 400 }
      );
    }

    const existingAssignment =
      await prisma.teacherAssignment.findUnique({
        where: {
          teacherId_classId_subjectId_academicYearId: {
            teacherId,
            classId,
            subjectId,
            academicYearId,
          },
        },
      });

    if (existingAssignment) {
      return NextResponse.json(
        {
          error:
            "This teacher is already assigned to this subject and class.",
        },
        { status: 409 }
      );
    }

    const assignment =
      await prisma.teacherAssignment.create({
        data: {
          teacherId,
          classId,
          subjectId,
          academicYearId,
        },
        include: {
          teacher: true,
          class: true,
          subject: true,
          academicYear: true,
        },
      });

    return NextResponse.json(assignment, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "Failed to create teacher assignment:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create teacher assignment." },
      { status: 500 }
    );
  }
}