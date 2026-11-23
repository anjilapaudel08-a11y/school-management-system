import { NextResponse } from "next/server";
import { authorizeCreditManagement } from "@/lib/finance/credit-authorization";
import {
  availableCreditCents,
  billOutstandingCents,
  centsToMoney,
  isAuditableManualCredit,
  issueDateWithinAcademicYear,
  moneyToCents,
} from "@/lib/finance/student-credit-rules";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const authorization = await authorizeCreditManagement();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const school = await prisma.school.findFirst({
      select: { id: true },
    });
    if (!school) {
      return NextResponse.json(
        { error: "No school has been configured." },
        { status: 404 },
      );
    }

    const credit = await prisma.studentCredit.findFirst({
      where: {
        id,
        student: {
          is: { schoolId: school.id },
        },
      },
      include: {
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
            startDate: true,
            endDate: true,
          },
        },
        issuedBy: {
          select: { id: true, name: true, email: true },
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
              select: { id: true, name: true, email: true },
            },
            reversedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!credit) {
      return NextResponse.json(
        { error: "Credit not found." },
        { status: 404 },
      );
    }

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
    const eligibleBills = eligible
      ? await prisma.bill.findMany({
          where: {
            studentId: credit.studentId,
            academicYearId: credit.academicYearId,
            status: { not: "CANCELLED" },
          },
          include: {
            payments: {
              select: { amount: true, waiverAmount: true },
            },
            creditApplications: {
              where: { reversedAt: null },
              select: { amount: true, reversedAt: true },
            },
          },
          orderBy: { billingDate: "desc" },
        })
      : [];

    return NextResponse.json({
      ...credit,
      availableAmount: eligible
        ? centsToMoney(Math.max(0, availableCents))
        : 0,
      applicationEligible:
        eligible && availableCents > 0,
      eligibleBills: eligibleBills
        .map((bill) => ({
          id: bill.id,
          billNumber: bill.billNumber,
          totalAmount: bill.totalAmount,
          status: bill.status,
          outstandingAmount: centsToMoney(
            billOutstandingCents({
              totalAmount: bill.totalAmount,
              payments: bill.payments,
              applications: bill.creditApplications,
            }),
          ),
        }))
        .filter((bill) => bill.outstandingAmount > 0),
    });
  } catch (error) {
    console.error("Failed to load student credit:", error);
    return NextResponse.json(
      { error: "Failed to load student credit." },
      { status: 500 },
    );
  }
}
