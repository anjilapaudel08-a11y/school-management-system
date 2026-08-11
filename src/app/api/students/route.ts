import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const firstName = body.firstName?.trim();
    const middleName = body.middleName?.trim() || null;
    const lastName = body.lastName?.trim() || null;
    const dateOfBirth = body.dateOfBirth
      ? new Date(body.dateOfBirth)
      : null;
    const gender = body.gender?.trim() || null;
    const address = body.address?.trim() || null;
    const phone = body.phone?.trim() || null;
    const email = body.email?.trim() || null;

    const fatherName = body.fatherName?.trim() || null;
    const motherName = body.motherName?.trim() || null;
    const guardianName = body.guardianName?.trim() || null;
    const guardianPhone = body.guardianPhone?.trim() || null;

    const academicYearId = body.academicYearId;
    const classId = body.classId;
    const rollNumber =
      body.rollNumber !== undefined &&
      body.rollNumber !== null &&
      body.rollNumber !== ""
        ? Number(body.rollNumber)
        : null;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
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

    if (rollNumber !== null && !Number.isInteger(rollNumber)) {
      return NextResponse.json(
        { error: "Roll number must be a whole number." },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.findFirst({
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

    // Generate the next admission number.
    const latestStudent = await prisma.student.findFirst({
      where: {
        schoolId: school.id,
      },
      orderBy: {
        admissionNumber: "desc",
      },
      select: {
        admissionNumber: true,
      },
    });

    let nextNumber = 1;

    if (latestStudent) {
      const match = latestStudent.admissionNumber.match(/(\d+)$/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const admissionNumber = `ADM-${String(nextNumber).padStart(4, "0")}`;

    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        admissionNumber,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
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
        },
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("Failed to create student:", error);

    return NextResponse.json(
      { error: "Failed to create student." },
      { status: 500 }
    );
  }
}