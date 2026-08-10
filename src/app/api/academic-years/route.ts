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

    const academicYears = await prisma.academicYear.findMany({
      where: {
        schoolId: school.id,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error("Failed to fetch academic years:", error);

    return NextResponse.json(
      { error: "Failed to fetch academic years." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date and end date are required." },
        { status: 400 }
      );
    }

    const school = await prisma.school.findFirst();

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 404 }
      );
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schoolId: school.id,
      },
    });

    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    console.error("Failed to create academic year:", error);

    return NextResponse.json(
      { error: "Failed to create academic year." },
      { status: 500 }
    );
  }
}