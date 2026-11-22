import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateGradeScaleEntries } from "@/lib/grade-scale-validation";

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

    const validationError = validateGradeScaleEntries(
      entries,
      existingScale.usesExclusiveUpperBounds,
    );
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    if (existingScale.isDefault) {
      return NextResponse.json(
        { error: "The approved default grade scale cannot be edited." },
        { status: 409 }
      );
    }

    const examCount = await prisma.exam.count({
      where: { gradeScaleId: id },
    });

    if (examCount > 0) {
      return NextResponse.json(
        { error: "This grade scale is saved on published exams and cannot be changed." },
        { status: 409 }
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

    if (existingScale.isDefault) {
      return NextResponse.json(
        { error: "The approved default grade scale cannot be deleted." },
        { status: 409 }
      );
    }

    const examCount = await prisma.exam.count({
      where: { gradeScaleId: id },
    });

    if (examCount > 0) {
      return NextResponse.json(
        { error: "This grade scale is saved on published exams and cannot be deleted." },
        { status: 409 }
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