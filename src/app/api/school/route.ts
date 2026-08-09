import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        { error: "Only administrators can create the school." },
        { status: 403 }
      );
    }

    const existingSchool = await prisma.school.findFirst();

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school is already configured." },
        { status: 409 }
      );
    }

    const body = await request.json();

    const {
      name,
      shortName,
      address,
      phone,
      email,
      website,
      establishedYear,
      description,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "School name is required." },
        { status: 400 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name: name.trim(),
        shortName: shortName?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        establishedYear: establishedYear
          ? Number(establishedYear)
          : null,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        message: "School created successfully.",
        school,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("School creation error:", error);

    return NextResponse.json(
      { error: "Failed to create school." },
      { status: 500 }
    );
  }
}