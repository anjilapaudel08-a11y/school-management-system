import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const gradeScale = await prisma.gradeScale.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: {
            minPercentage: "desc",
          },
        },
      },
    });

    if (!gradeScale) {
      return NextResponse.json(
        { error: "Grade scale not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(gradeScale);
  } catch (error) {
    console.error("GET grade scale error:", error);

    return NextResponse.json(
      { error: "Failed to fetch grade scale." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
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

    if (!Array.isArray(body.entries)) {
      return NextResponse.json(
        { error: "Entries must be an array." },
        { status: 400 }
      );
    }

    const entries = body.entries;

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

    const existingScale =
      await prisma.gradeScale.findUnique({
        where: { id },
      });

    if (!existingScale) {
      return NextResponse.json(
        { error: "Grade scale not found." },
        { status: 404 }
      );
    }

    const gradeScale = await prisma.$transaction(
      async (tx) => {
        await tx.gradeScaleEntry.deleteMany({
          where: {
            gradeScaleId: id,
          },
        });

        return tx.gradeScale.update({
          where: { id },
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
      }
    );

    return NextResponse.json(gradeScale);
  } catch (error) {
    console.error("PUT grade scale error:", error);

    return NextResponse.json(
      { error: "Failed to update grade scale." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existingScale =
      await prisma.gradeScale.findUnique({
        where: { id },
      });

    if (!existingScale) {
      return NextResponse.json(
        { error: "Grade scale not found." },
        { status: 404 }
      );
    }

    await prisma.gradeScale.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Grade scale deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE grade scale error:", error);

    return NextResponse.json(
      { error: "Failed to delete grade scale." },
      { status: 500 }
    );
  }
}