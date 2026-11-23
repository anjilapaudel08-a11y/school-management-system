import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { getPrimarySchool } from "@/lib/school";

export async function GET() {
  const requestStart = Date.now();

  try {
    console.log("[academic-years] GET started");

    const schoolStart = Date.now();

    const school = await getPrimarySchool();

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Academic year information must be an object." },
        { status: 400 }
      );
    }

    const { name, startDate, endDate } = body as {
      name?: unknown;
      startDate?: unknown;
      endDate?: unknown;
    };

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, start date and end date are required." },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Start date and end date must be valid dates." },
        { status: 400 }
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        { error: "End date cannot be before the start date." },
        { status: 400 }
      );
    }

    const school = await getPrimarySchool();

    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured yet." },
        { status: 404 }
      );
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        schoolId: school.id,
      },
    });

    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "An academic year with this name already exists." },
        { status: 409 }
      );
    }

    console.error("Failed to create academic year:", error);

    return NextResponse.json(
      { error: "Failed to create academic year." },
      { status: 500 }
    );
  }
}