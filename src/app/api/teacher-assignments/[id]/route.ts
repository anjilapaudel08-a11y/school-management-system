import { NextResponse } from "next/server";
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

    const assignment =
      await prisma.teacherAssignment.findUnique({
        where: {
          id,
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