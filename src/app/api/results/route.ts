import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getGrade(
  percentage: number,
  entries: {
    minPercentage: unknown;
    maxPercentage: unknown;
    grade: string;
    gradePoint: unknown;
  }[]
) {
  percentage = Number(percentage.toFixed(2));

  const entry = entries.find((item) => {
    const min = Number(item.minPercentage);
    const max = Number(item.maxPercentage);

    return percentage >= min && percentage <= max;
  });

  if (!entry) {
    return {
      grade: "N/A",
      gradePoint: 0,
    };
  }

  return {
    grade: entry.grade,
    gradePoint: Number(entry.gradePoint),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const examId = searchParams.get("examId");
    const gradeScaleId =
      searchParams.get("gradeScaleId");

    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required." },
        { status: 400 }
      );
    }

    if (!gradeScaleId) {
      return NextResponse.json(
        { error: "Grade scale ID is required." },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        class: true,
        term: {
          include: {
            academicYear: true,
          },
        },
        subjects: {
          include: {
            subject: true,
            marks: true,
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

    if (!exam.isPublished) {
      return NextResponse.json(
        { error: "Results have not been published for this exam." },
        { status: 409 },
      );
    }

    const gradeScale =
      await prisma.gradeScale.findUnique({
        where: {
          id: gradeScaleId,
        },
        include: {
          entries: {
            orderBy: {
              minPercentage: "desc",
            },
          },
        },
      });

    if (!gradeScale) {
      return NextResponse.json(
        { error: "Grade scale not found." },
        { status: 404 }
      );
    }

   const students = await prisma.student.findMany({
  where: {
    enrollments: {
      some: {
        classId: exam.classId,
        academicYearId: exam.term.academicYearId,
      },
    },
  },
  include: {
    enrollments: {
      where: {
        classId: exam.classId,
        academicYearId: exam.term.academicYearId,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  },
  orderBy: [
    {
      firstName: "asc",
    },
    {
      lastName: "asc",
    },
  ],
});

    const enrolledStudentIds = new Set(
      students.map((student) => student.id),
    );
    const expectedMarkCount =
      students.length * exam.subjects.length;
    const recordedMarkCount = exam.subjects.reduce(
      (count, examSubject) =>
        count +
        examSubject.marks.filter((mark) =>
          enrolledStudentIds.has(mark.studentId),
        ).length,
      0,
    );

    if (
      exam.subjects.length === 0 ||
      students.length === 0 ||
      recordedMarkCount !== expectedMarkCount
    ) {
      return NextResponse.json(
        {
          error:
            "Results cannot be calculated until every enrolled student has a mark for every exam subject.",
          missingMarks: Math.max(
            0,
            expectedMarkCount - recordedMarkCount,
          ),
        },
        { status: 409 },
      );
    }

    const results = students.map((student) => {
      let totalObtained = 0;
      let totalFullMarks = 0;
      let gradePointTotal = 0;

      const subjects = exam.subjects.map(
        (examSubject) => {
          const mark = examSubject.marks.find(
            (item) =>
              item.studentId === student.id
          );

          const theoryMarks = mark
            ? Number(mark.theoryMarks)
            : 0;

          const practicalMarks = mark
            ? Number(mark.practicalMarks)
            : 0;

          const theoryFullMarks = Number(
            examSubject.theoryFullMarks
          );

          const practicalFullMarks = Number(
            examSubject.practicalFullMarks
          );

          const fullMarks =
            theoryFullMarks +
            practicalFullMarks;

          const total =
            theoryMarks +
            practicalMarks;

          const percentage =
            fullMarks > 0
              ? (total / fullMarks) * 100
              : 0;

          const gradeResult = getGrade(
            percentage,
            gradeScale.entries
          );

          totalObtained += total;
          totalFullMarks += fullMarks;
          gradePointTotal +=
            gradeResult.gradePoint;

          return {
            subjectId: examSubject.subjectId,
            subjectName:
              examSubject.subject.name,

            theoryMarks,
            practicalMarks,

            theoryFullMarks,
            practicalFullMarks,

            total,
            fullMarks,
            percentage,

            grade: gradeResult.grade,
            gradePoint:
              gradeResult.gradePoint,
          };
        }
      );

      const overallPercentage =
        totalFullMarks > 0
          ? (totalObtained / totalFullMarks) *
            100
          : 0;

      const gpa =
        subjects.length > 0
          ? gradePointTotal / subjects.length
          : 0;

      const overallGrade = getGrade(
        overallPercentage,
        gradeScale.entries
      );

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: `${student.firstName} ${student.lastName}`.trim(),

        rollNumber:
          student.enrollments[0]?.rollNumber ??
          null,

        subjects,

        totalObtained,
        totalFullMarks,

        overallPercentage,

        grade: overallGrade.grade,
        gpa,
      };
    });

    // Highest percentage gets position 1.
    // Students with the same percentage share
    // the same position.
   type Result = (typeof results)[number];

type RankedResult = Result & {
  position: number;
};

const rankedResults: RankedResult[] = [...results]
  .sort(
    (a, b) =>
      b.overallPercentage -
      a.overallPercentage
  )
  .map((result, index, array) => {
    const previous = array[index - 1] as
      | RankedResult
      | undefined;

    const position =
      previous &&
      previous.overallPercentage ===
        result.overallPercentage
        ? previous.position
        : index + 1;

    return {
      ...result,
      position,
    };
  });

    // Return students in roll-number order for
    // the UI rather than rank order.
    rankedResults.sort((a, b) => {
      if (
        a.rollNumber !== null &&
        b.rollNumber !== null
      ) {
        return a.rollNumber - b.rollNumber;
      }

      return a.studentName.localeCompare(
        b.studentName
      );
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        name: exam.name,
        className: exam.class.name,
        termName: exam.term.name,
        academicYear:
          exam.term.academicYear.name,
      },

      gradeScale: {
        id: gradeScale.id,
        name: gradeScale.name,
      },

      results: rankedResults,
    });
  } catch (error) {
    console.error("GET results error:", error);

    return NextResponse.json(
      { error: "Failed to calculate results." },
      { status: 500 }
    );
  }
}