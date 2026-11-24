import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireConfiguredSchool,
  schoolConfigurationErrorResponse,
} from "@/lib/school-api";

export async function GET(request: Request) {
  try {
    const school = await requireConfiguredSchool();
    const { searchParams } = new URL(request.url);

    const termId = searchParams.get("termId");
    const classId = searchParams.get("classId");

    const exams = await prisma.exam.findMany({
      where: {
        class: { is: { schoolId: school.id } },
        term: {
          is: {
            academicYear: { is: { schoolId: school.id } },
          },
        },
        ...(termId ? { termId } : {}),
        ...(classId ? { classId } : {}),
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
        _count: {
          select: {
            subjects: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(exams);
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    console.error("Failed to fetch exams:", error);

    return NextResponse.json(
      { error: "Failed to fetch exams." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const school = await requireConfiguredSchool();
    const body = await request.json();

    const termId = body.termId;
    const classId = body.classId;
    const name = body.name?.trim();

    const startDate = body.startDate
      ? new Date(body.startDate)
      : null;

    const endDate = body.endDate
      ? new Date(body.endDate)
      : null;

    const subjects = Array.isArray(body.subjects)
      ? body.subjects
      : [];

    if (!termId || !classId || !name) {
      return NextResponse.json(
        {
          error:
            "Term, class and exam name are required.",
        },
        { status: 400 }
      );
    }

    if (subjects.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one subject is required.",
        },
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

    const term = await prisma.academicTerm.findFirst({
      where: {
        id: termId,
        academicYear: { is: { schoolId: school.id } },
      },
    });

    if (!term) {
      return NextResponse.json(
        { error: "Academic term not found." },
        { status: 404 }
      );
    }

    const schoolClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!schoolClass) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 }
      );
    }

    const existingExam = await prisma.exam.findFirst({
      where: {
        termId,
        classId,
        name,
      },
    });

    if (existingExam) {
      return NextResponse.json(
        {
          error:
            "An exam with this name already exists for this class and term.",
        },
        { status: 409 }
      );
    }

    const subjectIds: string[] = subjects.map(
  (item: { subjectId: string }) => item.subjectId
);

const uniqueSubjectIds: string[] = [
  ...new Set<string>(subjectIds),
];

    if (
      uniqueSubjectIds.length !== subjectIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "The same subject cannot be added twice.",
        },
        { status: 400 }
      );
    }

    const classSubjects =
      await prisma.classSubject.findMany({
        where: {
          classId,
          academicYearId: term.academicYearId,
          subjectId: {
            in: uniqueSubjectIds,
          },
        },
      });

    if (
      classSubjects.length !==
      uniqueSubjectIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more selected subjects are not assigned to this class for the selected academic year.",
        },
        { status: 400 }
      );
    }

    for (const item of subjects) {
      const theoryFullMarks = Number(
        item.theoryFullMarks
      );

      const practicalFullMarks = Number(
        item.practicalFullMarks
      );

      if (
        !Number.isFinite(theoryFullMarks) ||
        !Number.isFinite(practicalFullMarks) ||
        theoryFullMarks < 0 ||
        practicalFullMarks < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Theory and practical full marks must be valid non-negative numbers.",
          },
          { status: 400 }
        );
      }

      if (
        theoryFullMarks === 0 &&
        practicalFullMarks === 0
      ) {
        return NextResponse.json(
          {
            error:
              "At least one full-mark value must be greater than zero for every subject.",
          },
          { status: 400 }
        );
      }
    }

    const exam = await prisma.exam.create({
      data: {
        termId,
        classId,
        name,
        startDate,
        endDate,
        subjects: {
          create: subjects.map(
            (item: {
              subjectId: string;
              theoryFullMarks: string | number;
              practicalFullMarks: string | number;
            }) => ({
              subjectId: item.subjectId,
              theoryFullMarks: Number(
                item.theoryFullMarks
              ),
              practicalFullMarks: Number(
                item.practicalFullMarks
              ),
            })
          ),
        },
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

    return NextResponse.json(exam, {
      status: 201,
    });
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    console.error("Failed to create exam:", error);

    return NextResponse.json(
      { error: "Failed to create exam." },
      { status: 500 }
    );
  }
}