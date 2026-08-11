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

    const student = await prisma.student.findUnique({
      where: {
        id,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    const firstName = body.firstName?.trim();

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id,
      },
      data: {
        firstName,
        middleName: body.middleName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        dateOfBirth: body.dateOfBirth
          ? new Date(body.dateOfBirth)
          : null,
        gender: body.gender?.trim() || null,
        phone: body.phone?.trim() || null,
        fatherName: body.fatherName?.trim() || null,
        motherName: body.motherName?.trim() || null,
        guardianName: body.guardianName?.trim() || null,
        guardianPhone: body.guardianPhone?.trim() || null,
      },
      include: {
        enrollments: {
          include: {
            academicYear: true,
            class: true,
          },
        },
      },
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error("Failed to update student:", error);

    return NextResponse.json(
      { error: "Failed to update student." },
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

    const student = await prisma.student.findUnique({
      where: {
        id,
      },
      include: {
        enrollments: true,
        marks: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    if (student.marks.length > 0) {
      return NextResponse.json(
        {
          error:
            "This student cannot be deleted because marks have already been recorded.",
        },
        { status: 409 }
      );
    }

    await prisma.student.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Student deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete student:", error);

    return NextResponse.json(
      { error: "Failed to delete student." },
      { status: 500 }
    );
  }
}