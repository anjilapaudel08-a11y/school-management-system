import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required." },
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({
      where: {
        id,
      },
    });

    if (!existingSubject) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    const duplicateSubject = await prisma.subject.findFirst({
      where: {
        name,
        NOT: {
          id,
        },
      },
    });

    if (duplicateSubject) {
      return NextResponse.json(
        { error: "A subject with this name already exists." },
        { status: 409 }
      );
    }

    const subject = await prisma.subject.update({
      where: {
        id,
      },
      data: {
        name,
        code: body.code?.trim() || null,
        description: body.description?.trim() || null,
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    console.error("Failed to update subject:", error);

    return NextResponse.json(
      { error: "Failed to update subject." },
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

    const subject = await prisma.subject.findUnique({
      where: {
        id,
      },
      include: {
        classSubjects: true,
        examSubjects: true,
        teacherAssignments: true,
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    if (
      subject.classSubjects.length > 0 ||
      subject.examSubjects.length > 0 ||
      subject.teacherAssignments.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This subject cannot be deleted because it is already being used.",
        },
        { status: 409 }
      );
    }

    await prisma.subject.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete subject:", error);

    return NextResponse.json(
      { error: "Failed to delete subject." },
      { status: 500 }
    );
  }
}