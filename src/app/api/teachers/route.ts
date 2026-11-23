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

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId: school.id,
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

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Failed to fetch teachers:", error);

    return NextResponse.json(
      { error: "Failed to fetch teachers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const school = await prisma.school.findFirst();

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 400 }
      );
    }

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
    const position = body.position?.trim() || null;
    const joiningDate = body.joiningDate
      ? new Date(body.joiningDate)
      : null;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        gender,
        address,
        phone,
        email,
        position,
        joiningDate,
        basicSalary:
          body.basicSalary !== undefined &&
          body.basicSalary !== ""
            ? Number(body.basicSalary)
            : null,
      },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    console.error("Failed to create teacher:", error);

    return NextResponse.json(
      { error: "Failed to create teacher." },
      { status: 500 }
    );
  }
}