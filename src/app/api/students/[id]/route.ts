import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { parseOptionalStudentDateOfBirth } from "@/lib/student-validation";
import {
  requireConfiguredSchool,
  schoolConfigurationErrorResponse,
} from "@/lib/school-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseOptionalRollNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return undefined;
  }

  return number;
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const school = await requireConfiguredSchool();
    const { id } = await context.params;
    const body = await request.json();

    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId: school.id,
      },
      include: {
        enrollments: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    if (
      body.admissionNumber !== undefined &&
      body.admissionNumber !== null &&
      typeof body.admissionNumber !== "string"
    ) {
      return NextResponse.json(
        { error: "Admission number must be text." },
        { status: 400 },
      );
    }

    const admissionNumber =
      typeof body.admissionNumber === "string" &&
      body.admissionNumber.trim()
        ? body.admissionNumber.trim()
        : student.admissionNumber;

    if (admissionNumber !== student.admissionNumber) {
      const duplicate = await prisma.student.findFirst({
        where: {
          schoolId: student.schoolId,
          admissionNumber,
          id: { not: student.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A student with this admission number already exists." },
          { status: 409 },
        );
      }
    }

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    const middleName =
      typeof body.middleName === "string"
        ? body.middleName.trim() || null
        : null;

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim() || null
        : null;

    const gender =
      typeof body.gender === "string"
        ? body.gender.trim() || null
        : null;

    const address =
      typeof body.address === "string"
        ? body.address.trim() || null
        : null;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim() || null
        : null;

    const email =
      typeof body.email === "string"
        ? body.email.trim() || null
        : null;

    const fatherName =
      typeof body.fatherName === "string"
        ? body.fatherName.trim() || null
        : null;

    const motherName =
      typeof body.motherName === "string"
        ? body.motherName.trim() || null
        : null;

    const guardianName =
      typeof body.guardianName === "string"
        ? body.guardianName.trim() || null
        : null;

    const guardianPhone =
      typeof body.guardianPhone === "string"
        ? body.guardianPhone.trim() || null
        : null;

    const dateOfBirth = parseOptionalStudentDateOfBirth(
      body.dateOfBirth,
    );

    if (
      body.dateOfBirth !== undefined &&
      body.dateOfBirth !== null &&
      body.dateOfBirth !== "" &&
      dateOfBirth === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 }
      );
    }

    const academicYearId = body.academicYearId;
    const classId = body.classId;

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year is required." },
        { status: 400 }
      );
    }

    if (!classId) {
      return NextResponse.json(
        { error: "Class is required." },
        { status: 400 }
      );
    }

    const rollNumber = parseOptionalRollNumber(body.rollNumber);

    if (rollNumber === undefined) {
      return NextResponse.json(
        {
          error:
            "Roll number must be a whole number greater than 0.",
        },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: student.schoolId,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Invalid academic year." },
        { status: 400 }
      );
    }

    const schoolClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: student.schoolId,
      },
    });

    if (!schoolClass) {
      return NextResponse.json(
        { error: "Invalid class." },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * We never change an old academic-year enrollment into a
     * different academic year.
     *
     * Instead:
     *
     * 2083 -> Class 5
     * 2084 -> Class 6
     *
     * are kept as two separate enrollment records.
     *
     * If the selected year already has an enrollment, we update
     * that year's class/roll number.
     *
     * If it doesn't exist, we create a new enrollment.
     */

    const updatedStudent = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: {
          id: student.id,
        },
        data: {
          admissionNumber,
          firstName,
          middleName,
          lastName,
          dateOfBirth: dateOfBirth ?? null,
          gender,
          address,
          phone,
          email,
          fatherName,
          motherName,
          guardianName,
          guardianPhone,
        },
      });

      const targetEnrollment =
        await tx.enrollment.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: student.id,
              academicYearId,
            },
          },
        });

      if (targetEnrollment) {
        await tx.enrollment.update({
          where: {
            id: targetEnrollment.id,
          },
          data: {
            classId,
            rollNumber,
          },
        });
      } else {
        await tx.enrollment.create({
          data: {
            studentId: student.id,
            academicYearId,
            classId,
            rollNumber,
          },
        });
      }

      return tx.student.findUnique({
        where: {
          id: student.id,
        },
        include: {
          enrollments: {
            include: {
              academicYear: true,
              class: true,
            },
            orderBy: {
              academicYear: {
                startDate: "desc",
              },
            },
          },
        },
      });
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "A student with this admission number already exists." },
        { status: 409 },
      );
    }

    console.error("Failed to update student:", error);

    return NextResponse.json(
      { error: "Failed to update student." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const school = await requireConfiguredSchool();
    const { id } = await context.params;

    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId: school.id,
      },
      include: {
        marks: true,
        bills: true,
        charges: true,
        discounts: true,
        credits: true,
        enrollments: {
          select: { id: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    if (student.marks.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because marks have already been recorded.",
        },
        { status: 409 }
      );
    }

    if (student.bills.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because billing history exists for this student.",
        },
        { status: 409 }
      );
    }

    if (student.charges.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because student charges exist.",
        },
        { status: 409 }
      );
    }

    if (student.discounts.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because student discounts exist.",
        },
        { status: 409 }
      );
    }

    if (student.credits.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because student credits exist.",
        },
        { status: 409 }
      );
    }

    if (student.enrollments.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because enrollment history exists.",
        },
        { status: 409 }
      );
    }

    await prisma.student.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Student deleted successfully.",
    });
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because related records exist.",
        },
        { status: 409 }
      );
    }

    console.error("Failed to delete student:", error);

    return NextResponse.json(
      {
        error:
          "Failed to delete student. The student may have related records.",
      },
      { status: 500 }
    );
  }
}