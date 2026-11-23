import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPrimarySchool } from "@/lib/school";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().nullable().optional(),
);

const schoolInputSchema = z.object({
  name: z.string().trim().min(1, "School name is required."),
  shortName: optionalText,
  address: optionalText,
  phone: optionalText,
  email: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.email("Please provide a valid email address.").nullable().optional(),
  ),
  website: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.url("Please provide a valid website URL.").nullable().optional(),
  ),
  establishedYear: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    z
      .number({ error: "Established year must be a positive whole number." })
      .int({ error: "Established year must be a positive whole number." })
      .positive({ error: "Established year must be a positive whole number." })
      .nullable()
      .optional(),
  ),
  description: optionalText,
});

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const school = await getPrimarySchool();

    if (!school) {
      return NextResponse.json(
        { error: "School information not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("School fetch error:", error);

    return NextResponse.json(
      { error: "Failed to load school information." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update school information." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsedBody = schoolInputSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid school information." },
        { status: 400 }
      );
    }

    const existingSchool = await getPrimarySchool();
    const school = existingSchool
      ? await prisma.school.update({
          where: { id: existingSchool.id },
          data: parsedBody.data,
        })
      : await prisma.school.create({ data: parsedBody.data });

    return NextResponse.json(
      {
        message: existingSchool
          ? "School information updated successfully."
          : "School information created successfully.",
        school,
      },
      { status: existingSchool ? 200 : 201 }
    );
  } catch (error) {
    console.error("School save error:", error);

    return NextResponse.json(
      { error: "Failed to save school information." },
      { status: 500 }
    );
  }
}