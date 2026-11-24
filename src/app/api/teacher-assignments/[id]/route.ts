import { NextResponse } from "next/server";
import {
  getConfiguredSchool,
  SchoolConfigurationError,
} from "@/lib/school";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const school = await getConfiguredSchool();

    if (!school) {
      return NextResponse.json(
        { error: "School setup is required before managing teacher assignments." },
        { status: 404 },
      );
    }

    const assignment =
      await prisma.teacherAssignment.findFirst({
        where: {
          id,
          teacher: { is: { schoolId: school.id } },
          class: { is: { schoolId: school.id } },
          academicYear: { is: { schoolId: school.id } },
        },
      });

    if (!assignment) {
      return NextResponse.json(
        { error: "Teacher assignment not found." },
        { status: 404 }
      );
    }

    await prisma.teacherAssignment.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Teacher assignment removed successfully.",
    });
  } catch (error) {
    if (error instanceof SchoolConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error(
      "Failed to delete teacher assignment:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to delete teacher assignment.",
      },
      { status: 500 }
    );
  }
}