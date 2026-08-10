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

    const classes = await prisma.class.findMany({
      where: {
        schoolId: school.id,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Failed to fetch classes:", error);

    return NextResponse.json(
      { error: "Failed to fetch classes." },
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
    console.error("Failed to create class:", error);

    return NextResponse.json(
      { error: "Failed to create class." },
      { status: 500 }
    );
  }
}