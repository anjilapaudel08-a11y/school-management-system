import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const requestStart = Date.now();

  try {
    console.log("[academic-years] GET started");

    const schoolStart = Date.now();

    const school = await prisma.school.findFirst();

    console.log(
      `[academic-years] school.findFirst(): ${
        Date.now() - schoolStart
      }ms`
    );

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 404 }
      );
    }

    const yearsStart = Date.now();

    const academicYears = await prisma.academicYear.findMany({
      where: {
        schoolId: school.id,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    console.log(
      `[academic-years] academicYear.findMany(): ${
        Date.now() - yearsStart
      }ms`
    );

    console.log(
      `[academic-years] TOTAL: ${
        Date.now() - requestStart
      }ms`
    );

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error(
      "Failed to fetch academic years:",
      error
    );

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