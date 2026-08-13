import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const examSubject =
      await prisma.examSubject.findUnique({
        where: {
          id: examSubjectId,
        },
        include: {
          exam: true,
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

    if (
      theoryMarks >
      Number(examSubject.theoryFullMarks)
    ) {
      return NextResponse.json(
        {
          error: `Theory marks cannot exceed ${examSubject.theoryFullMarks}.`,
        },
        { status: 400 }
      );
    }

    if (
      practicalMarks >
      Number(examSubject.practicalFullMarks)
    ) {
      return NextResponse.json(
        {
          error: `Practical marks cannot exceed ${examSubject.practicalFullMarks}.`,
        },
        { status: 400 }
      );
    }

    const enrollment =
      await prisma.enrollment.findFirst({
        where: {
          studentId,
          academicYearId:
            (
              await prisma.exam.findUnique({
                where: {
                  id: examSubject.examId,
                },
                include: {
                  term: true,
                },
              })
            )?.term.academicYearId,
          classId:
            examSubject.exam.classId,
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "Student is not enrolled in this class and academic year.",
        },
        { status: 400 }
      );
    }

    const mark = await prisma.mark.upsert({
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