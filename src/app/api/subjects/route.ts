import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Failed to fetch subjects:", error);

    return NextResponse.json(
      { error: "Failed to fetch subjects." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const code = body.code?.trim() || null;
    const description = body.description?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required." },
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({
      where: {
        name,
      },
    });

    if (existingSubject) {
      return NextResponse.json(
        { error: "A subject with this name already exists." },
        { status: 409 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        description,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error("Failed to create subject:", error);

    return NextResponse.json(
      { error: "Failed to create subject." },
      { status: 500 }
    );
  }
}