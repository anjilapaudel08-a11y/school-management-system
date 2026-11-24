import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getConfiguredSchool,
  SchoolConfigurationError,
  SCHOOL_SETUP_REQUIRED_MESSAGE,
} from "@/lib/school";

export async function GET() {
  const requestStart = Date.now();

  try {
    console.log("[classes] GET started");

    const schoolStart = Date.now();

    const school = await getConfiguredSchool();

    console.log(
      `[classes] getConfiguredSchool(): ${
        Date.now() - schoolStart
      }ms`
    );

    if (!school) {
      return NextResponse.json(
        { error: SCHOOL_SETUP_REQUIRED_MESSAGE },
        { status: 404 }
      );
    }

    const classesStart = Date.now();

    const classes = await prisma.class.findMany({
      where: {
        schoolId: school.id,
      },
      orderBy: {
        order: "asc",
      },
    });

    console.log(
      `[classes] class.findMany(): ${
        Date.now() - classesStart
      }ms`
    );

    console.log(
      `[classes] TOTAL: ${
        Date.now() - requestStart
      }ms`
    );

    return NextResponse.json(classes);
  } catch (error) {
    if (error instanceof SchoolConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(
      "Failed to fetch classes:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch classes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const school = await getConfiguredSchool();

    if (!school) {
      return NextResponse.json(
        { error: SCHOOL_SETUP_REQUIRED_MESSAGE },
        { status: 404 }
      );
    }

    const body = await request.json();

    const name = body.name?.trim();
    const order = Number(body.order);

    if (!name) {
      return NextResponse.json(
        { error: "Class name is required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(order) || order < 1) {
      return NextResponse.json(
        { error: "Order must be a positive whole number." },
        { status: 400 }
      );
    }

    const existingClass = await prisma.class.findUnique({
      where: {
        schoolId_name: {
          schoolId: school.id,
          name,
        },
      },
    });

    if (existingClass) {
      return NextResponse.json(
        { error: "This class already exists." },
        { status: 409 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        schoolId: school.id,
        name,
        order,
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    if (error instanceof SchoolConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("Failed to create class:", error);

    return NextResponse.json(
      { error: "Failed to create class." },
      { status: 500 }
    );
  }
}