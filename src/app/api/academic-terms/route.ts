import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year is required." },
        { status: 400 }
      );
    }

    const terms = await prisma.academicTerm.findMany({
      where: {
        academicYearId,
      },
      include: {
        academicYear: true,
        _count: {
          select: {
            exams: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error("Failed to fetch academic terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch academic terms." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const academicYearId = body.academicYearId;
    const name = body.name?.trim();
    const order = Number(body.order);

    if (!academicYearId || !name || !Number.isInteger(order)) {
      return NextResponse.json(
        {
          error:
            "Academic year, term name and order are required.",
        },
        { status: 400 }
      );
    }

    if (order < 1) {
      return NextResponse.json(
        { error: "Term order must be at least 1." },
        { status: 400 }
      );
    }

    const academicYear =
      await prisma.academicYear.findUnique({
        where: {
          id: academicYearId,
        },
      });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 }
      );
    }

    const existingTerm =
      await prisma.academicTerm.findFirst({
        where: {
          academicYearId,
          OR: [
            {
              name,
            },
            {
              order,
            },
          ],
        },
      });

    if (existingTerm) {
      return NextResponse.json(
        {
          error:
            "A term with this name or order already exists for this academic year.",
        },
        { status: 409 }
      );
    }

    const term = await prisma.academicTerm.create({
      data: {
        academicYearId,
        name,
        order,
      },
      include: {
        academicYear: true,
        _count: {
          select: {
            exams: true,
          },
        },
      },
    });

    return NextResponse.json(term, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create academic term:", error);

    return NextResponse.json(
      { error: "Failed to create academic term." },
      { status: 500 }
    );
  }
}