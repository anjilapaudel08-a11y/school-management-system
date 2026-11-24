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

    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: school.id,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: {
          schoolId: school.id,
        },
        data: {
          isActive: false,
        },
      }),

      prisma.academicYear.update({
        where: {
          id: academicYear.id,
        },
        data: {
          isActive: true,
        },
      }),
    ]);

    const updatedAcademicYear = await prisma.academicYear.findUnique({
      where: {
        id: academicYear.id,
      },
    });

    return NextResponse.json(updatedAcademicYear);
  } catch (error) {
    const configurationResponse =
      schoolConfigurationErrorResponse(error);
    if (configurationResponse) return configurationResponse;

    console.error("Failed to activate academic year:", error);

    return NextResponse.json(
      { error: "Failed to activate academic year." },
      { status: 500 }
    );
  }
}