import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");

    if (!classId || !academicYearId) {
      return NextResponse.json(
        {
          error: "classId and academicYearId are required.",
        },
        { status: 400 }
      );
    }

    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        academicYearId,
      },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });

    return NextResponse.json(classSubjects);
  } catch (error) {
    console.error("Failed to fetch class subjects:", error);

    return NextResponse.json(
      { error: "Failed to fetch class subjects." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const classId = body.classId;
    const academicYearId = body.academicYearId;
    const subjectIds = body.subjectIds;

    if (!classId || !academicYearId) {
      return NextResponse.json(
        {
          error: "Class and academic year are required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(subjectIds)) {
      return NextResponse.json(
        {
          error: "subjectIds must be an array.",
        },
        { status: 400 }
      );
    }

    const schoolClass = await prisma.class.findUnique({
      where: {
        id: classId,
      },
    });

    if (!schoolClass) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 }
      );
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 }
      );
    }

    const subjects = await prisma.subject.findMany({
      where: {
        id: {
          in: subjectIds,
        },
      },
    });

    if (subjects.length !== subjectIds.length) {
      return NextResponse.json(
        {
          error: "One or more subjects were not found.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.classSubject.deleteMany({
        where: {
          classId,
          academicYearId,
        },
      });

      if (subjectIds.length > 0) {
        await tx.classSubject.createMany({
          data: subjectIds.map((subjectId: string) => ({
            classId,
            subjectId,
            academicYearId,
          })),
        });
      }
    });

    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        academicYearId,
      },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });

    return NextResponse.json(classSubjects);
  } catch (error) {
    console.error("Failed to save class subjects:", error);

    return NextResponse.json(
      { error: "Failed to save class subjects." },
      { status: 500 }
    );
  }
}