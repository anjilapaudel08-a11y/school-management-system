import { NextResponse } from "next/server";
import {
  getConfiguredSchool,
  SchoolConfigurationError,
} from "@/lib/school";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { validateTeacherAssignmentRelationships } from "@/lib/teacher-assignment-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const school = await getConfiguredSchool();

    if (!school) {
      return NextResponse.json(
        { error: "School setup is required before loading teacher assignments." },
        { status: 404 },
      );
    }

    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacher: { is: { schoolId: school.id } },
        class: { is: { schoolId: school.id } },
        academicYear: { is: { schoolId: school.id } },
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
    if (error instanceof SchoolConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("Failed to fetch teacher assignments:", error);

    return NextResponse.json(
      { error: "Failed to fetch teacher assignments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const school = await getConfiguredSchool();

    if (!school) {
      return NextResponse.json(
        { error: "School setup is required before creating teacher assignments." },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Teacher assignment information must be an object." },
        { status: 400 },
      );
    }

    const {
      teacherId: rawTeacherId,
      classId: rawClassId,
      subjectId: rawSubjectId,
      academicYearId: rawAcademicYearId,
    } = body as Record<string, unknown>;

    if (
      typeof rawTeacherId !== "string" ||
      typeof rawClassId !== "string" ||
      typeof rawSubjectId !== "string" ||
      typeof rawAcademicYearId !== "string" ||
      !rawTeacherId.trim() ||
      !rawClassId.trim() ||
      !rawSubjectId.trim() ||
      !rawAcademicYearId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Teacher, class, subject and academic year are required.",
        },
        { status: 400 }
      );
    }

    const teacherId = rawTeacherId.trim();
    const classId = rawClassId.trim();
    const subjectId = rawSubjectId.trim();
    const academicYearId = rawAcademicYearId.trim();

    const [teacher, schoolClass, subject, academicYear, classSubject] =
      await Promise.all([
        prisma.teacher.findFirst({
          where: {
            id: teacherId,
            schoolId: school.id,
          },
        }),

        prisma.class.findFirst({
          where: {
            id: classId,
            schoolId: school.id,
          },
        }),

        prisma.subject.findUnique({
          where: {
            id: subjectId,
          },
        }),

        prisma.academicYear.findFirst({
          where: {
            id: academicYearId,
            schoolId: school.id,
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

    const relationshipError = validateTeacherAssignmentRelationships({
      configuredSchoolId: school.id,
      teacherSchoolId: teacher.schoolId,
      classSchoolId: schoolClass.schoolId,
      academicYearSchoolId: academicYear.schoolId,
      hasClassSubject: Boolean(classSubject),
    });

    if (relationshipError) {
      return NextResponse.json(
        { error: relationshipError },
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
    if (error instanceof SchoolConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "This teacher is already assigned to this subject and class." },
        { status: 409 },
      );
    }

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