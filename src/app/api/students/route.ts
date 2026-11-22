import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";

class DuplicateAdmissionNumberError extends Error {}

function parseOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

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

export async function GET() {
  try {
    const school = await prisma.school.findFirst();

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 404 }
      );
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
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
      orderBy: {
        admissionNumber: "asc",
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Failed to fetch students:", error);

    return NextResponse.json(
      { error: "Failed to fetch students." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const school = await prisma.school.findFirst();

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 404 }
      );
    }

    const body = await request.json();

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

    const requestedAdmissionNumber =
      typeof body.admissionNumber === "string"
        ? body.admissionNumber.trim()
        : "";

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

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

    const academicYearId = body.academicYearId;
    const classId = body.classId;

    const dateOfBirth = parseOptionalDate(body.dateOfBirth);

    const rollNumber = parseOptionalRollNumber(
      body.rollNumber
    );

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

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

    if (rollNumber === undefined) {
      return NextResponse.json(
        {
          error:
            "Roll number must be a whole number greater than 0.",
        },
        { status: 400 }
      );
    }

    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          schoolId: school.id,
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
        schoolId: school.id,
      },
    });

    if (!schoolClass) {
      return NextResponse.json(
        { error: "Invalid class." },
        { status: 400 }
      );
    }

    const student = await prisma.$transaction(async (tx) => {
      let admissionNumber = requestedAdmissionNumber;

      if (admissionNumber) {
        const duplicate = await tx.student.findFirst({
          where: {
            schoolId: school.id,
            admissionNumber,
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new DuplicateAdmissionNumberError();
        }
      } else {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`student-admission-number:${school.id}`}, 0)
          )
        `;
        const [latestStudent] = await tx.$queryRaw<
          { maxNumber: bigint | null }[]
        >`
          SELECT MAX(
            SUBSTRING("admissionNumber" FROM '^ADM-([0-9]+)$')::BIGINT
          ) AS "maxNumber"
          FROM "Student"
          WHERE "schoolId" = ${school.id}
        `;
        const nextNumber = Number(latestStudent?.maxNumber ?? 0) + 1;
        admissionNumber = `ADM-${String(nextNumber).padStart(4, "0")}`;
      }

      return tx.student.create({
        data: {
          schoolId: school.id,
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
          enrollments: {
            create: {
              academicYearId,
              classId,
              rollNumber,
            },
          },
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

    return NextResponse.json(student, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof DuplicateAdmissionNumberError) {
      return NextResponse.json(
        { error: "A student with this admission number already exists." },
        { status: 409 },
      );
    }

    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "A student with this admission number already exists." },
        { status: 409 },
      );
    }

    console.error("Failed to create student:", error);

    return NextResponse.json(
      { error: "Failed to create student." },
      { status: 500 }
    );
  }
}