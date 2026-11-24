import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireConfiguredSchool,
  schoolConfigurationErrorResponse,
} from "@/lib/school-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const school = await requireConfiguredSchool();
    const { id } = await params;
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
      where: { id, schoolId: school.id },
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 }
      );
    }

    const duplicate = await prisma.class.findUnique({
      where: {
        schoolId_name: {
          schoolId: existingClass.schoolId,
          name,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json(
        { error: "This class already exists." },
        { status: 409 }
      );
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        order,
      },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    console.error("Failed to update class:", error);

    return NextResponse.json(
      { error: "Failed to update class." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const school = await requireConfiguredSchool();
    const { id } = await params;

    const existingClass = await prisma.class.findUnique({
      where: { id, schoolId: school.id },
      include: {
        enrollments: {
          select: { id: true },
          take: 1,
        },
        teacherAssignments: {
          select: { id: true },
          take: 1,
        },
        subjects: {
          select: { id: true },
          take: 1,
        },
        exams: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 }
      );
    }

    const hasRelatedData =
      existingClass.enrollments.length > 0 ||
      existingClass.teacherAssignments.length > 0 ||
      existingClass.subjects.length > 0 ||
      existingClass.exams.length > 0;

    if (hasRelatedData) {
      return NextResponse.json(
        {
          error:
            "This class cannot be deleted because it already has related records.",
        },
        { status: 409 }
      );
    }

    await prisma.class.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Class deleted successfully." });
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    console.error("Failed to delete class:", error);

    return NextResponse.json(
      { error: "Failed to delete class." },
      { status: 500 }
    );
  }
}