import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateGradeScaleEntries } from "@/lib/grade-scale-validation";

export async function GET() {
  try {
    const gradeScales = await prisma.gradeScale.findMany({
      include: {
        entries: {
          orderBy: {
            minPercentage: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(gradeScales);
  } catch (error) {
    console.error("GET grade scales error:", error);

    return NextResponse.json(
      { error: "Failed to fetch grade scales." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Grade scale name is required." },
        { status: 400 }
      );
    }

    if (
      body.entries !== undefined &&
      !Array.isArray(body.entries)
    ) {
      return NextResponse.json(
        { error: "Entries must be an array." },
        { status: 400 }
      );
    }

    const entries = Array.isArray(body.entries)
      ? body.entries
      : [];
    const validationError = validateGradeScaleEntries(entries);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    const gradeScale = await prisma.gradeScale.create({
      data: {
        name,
        description: description || null,
        entries: {
          create: entries.map(
            (entry: {
              minPercentage: number | string;
              maxPercentage: number | string;
              grade: string;
              gradePoint: number | string;
            }) => ({
              minPercentage: Number(
                entry.minPercentage
              ),
              maxPercentage: Number(
                entry.maxPercentage
              ),
              grade: String(entry.grade).trim(),
              gradePoint: Number(entry.gradePoint),
            })
          ),
        },
      },
      include: {
        entries: {
          orderBy: {
            minPercentage: "desc",
          },
        },
      },
    });

    return NextResponse.json(gradeScale, {
      status: 201,
    });
  } catch (error) {
    console.error("POST grade scale error:", error);

    return NextResponse.json(
      { error: "Failed to create grade scale." },
      { status: 500 }
    );
  }
}