import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    for (const entry of entries) {
      const minPercentage = Number(entry.minPercentage);
      const maxPercentage = Number(entry.maxPercentage);
      const grade = String(entry.grade ?? "").trim();
      const gradePoint = Number(entry.gradePoint);

      if (
        !Number.isFinite(minPercentage) ||
        !Number.isFinite(maxPercentage) ||
        !Number.isFinite(gradePoint) ||
        !grade
      ) {
        return NextResponse.json(
          { error: "Invalid grade scale entry." },
          { status: 400 }
        );
      }

      if (
        minPercentage < 0 ||
        minPercentage > 100 ||
        maxPercentage < 0 ||
        maxPercentage > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Percentage values must be between 0 and 100.",
          },
          { status: 400 }
        );
      }

      if (minPercentage > maxPercentage) {
        return NextResponse.json(
          {
            error:
              "Minimum percentage cannot exceed maximum percentage.",
          },
          { status: 400 }
        );
      }

      if (gradePoint < 0) {
        return NextResponse.json(
          {
            error: "Grade point cannot be negative.",
          },
          { status: 400 }
        );
      }
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