import { NextResponse } from "next/server";
import { bsToDate, dateToBS } from "@/lib/nepali-date";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { authorizeCreditManagement } from "@/lib/finance/credit-authorization";
import { readCreditRequestBody } from "@/lib/finance/credit-route-helpers";
import {
  availableCreditCents,
  centsToMoney,
  isAuditableManualCredit,
  issueDateWithinAcademicYear,
  moneyToCents,
  parsePositiveAmountToCents,
} from "@/lib/finance/student-credit-rules";
import {
  issueStudentCredit,
  StudentCreditWorkflowError,
} from "@/lib/finance/student-credit-workflow";
import { prisma } from "@/lib/prisma";

const creditInclude = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      name: true,
      isActive: true,
      startDate: true,
      endDate: true,
    },
  },
  issuedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  applications: {
    include: {
      bill: {
        select: {
          id: true,
          billNumber: true,
          totalAmount: true,
          status: true,
        },
      },
      appliedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reversedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

function isValidBSDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  try {
    const date = bsToDate(year, month, day);
    const roundTrip = dateToBS(date);
    if (
      roundTrip.year !== year ||
      roundTrip.month !== month ||
      roundTrip.day !== day
    ) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const authorization = await authorizeCreditManagement();
    if (!authorization.ok) {
      return authorization.response;
    }

    const school = await prisma.school.findFirst({
      select: { id: true },
    });
    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured." },
        { status: 404 },
      );
    }

    const credits = await prisma.studentCredit.findMany({
      where: {
        student: {
          is: { schoolId: school.id },
        },
      },
      include: creditInclude,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      credits.map((credit) => {
        const applicationEligible =
          isAuditableManualCredit(credit) &&
          issueDateWithinAcademicYear(
            credit.issueDate,
            credit.academicYear.startDate,
            credit.academicYear.endDate,
          );
        const availableCents = availableCreditCents(
          credit.amount,
          credit.applications,
        );
        const balanceConsistent =
          moneyToCents(credit.appliedAmount) ===
          moneyToCents(credit.amount) - availableCents;
        const eligible =
          applicationEligible && balanceConsistent;

        return {
          ...credit,
          availableAmount: eligible
            ? centsToMoney(Math.max(0, availableCents))
            : 0,
          applicationEligible:
            eligible && availableCents > 0,
        };
      }),
    );
  } catch (error) {
    console.error("Failed to load student credits:", error);
    return NextResponse.json(
      { error: "Failed to load student credits." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeCreditManagement();
    if (!authorization.ok) {
      return authorization.response;
    }

    const idempotencyKey =
      request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json(
        { error: "A valid Idempotency-Key header is required." },
        { status: 400 },
      );
    }

    const body = await readCreditRequestBody(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const studentId =
      typeof body.studentId === "string" ? body.studentId.trim() : "";
    const academicYearId =
      typeof body.academicYearId === "string"
        ? body.academicYearId.trim()
        : "";
    const amountCents = parsePositiveAmountToCents(body.amount);
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : "";
    const issueDateText =
      typeof body.issueDate === "string" ? body.issueDate.trim() : "";
    const issueDate = isValidBSDate(issueDateText);

    if (!studentId || !academicYearId) {
      return NextResponse.json(
        { error: "Student and academic year are required." },
        { status: 400 },
      );
    }
    if (amountCents === null) {
      return NextResponse.json(
        { error: "Credit amount must be positive and have at most two decimal places." },
        { status: 400 },
      );
    }
    if (!reason || reason.length > 300) {
      return NextResponse.json(
        { error: "A reason of 1 to 300 characters is required." },
        { status: 400 },
      );
    }
    if (!notes || notes.length > 500) {
      return NextResponse.json(
        { error: "An approval reference or note of 1 to 500 characters is required." },
        { status: 400 },
      );
    }
    if (!issueDate) {
      return NextResponse.json(
        { error: "Enter a valid credit issue date in the BS calendar." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      (tx) =>
        issueStudentCredit(tx, {
          studentId,
          academicYearId,
          amountCents,
          issueDate,
          reason,
          notes,
          issuedByUserId: authorization.actorId,
          idempotencyKey,
        }),
      { maxWait: 10_000, timeout: 20_000 },
    );

    return NextResponse.json(
      result,
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof StudentCreditWorkflowError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "This credit request has already been recorded." },
        { status: 409 },
      );
    }

    console.error("Failed to issue student credit:", error);
    return NextResponse.json(
      { error: "Failed to issue student credit." },
      { status: 500 },
    );
  }
}
