
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  bsToDate,
  dateToBS,
  getBSMonthsInPeriod,
  bsMonthIndex,
} from "@/lib/nepali-date";

function parseDate(value: unknown, fieldName: string) {
  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return date;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getBSPeriodDates(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
) {
  const periodStart = bsToDate(startYear, startMonth, 1);
  let nextMonthYear = endYear;
  let nextMonth = endMonth + 1;

  if (nextMonth === 13) {
    nextMonth = 1;
    nextMonthYear += 1;
  }

  const nextMonthStart = bsToDate(
    nextMonthYear,
    nextMonth,
    1
  );

  const periodEnd = new Date(nextMonthStart.getTime() - 1);

  return {
    periodStart,
    periodEnd,
  };
}

function datesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA <= endB && endA >= startB;
}

function isDateInsidePeriod(
  date: Date,
  periodStart: Date,
  periodEnd: Date
) {
  return date >= periodStart && date <= periodEnd;
}

function bsPeriodsOverlap(
  startYearA: number,
  startMonthA: number,
  endYearA: number,
  endMonthA: number,
  startYearB: number,
  startMonthB: number,
  endYearB: number,
  endMonthB: number
) {
  const startA = bsMonthIndex(startYearA, startMonthA);
  const endA = bsMonthIndex(endYearA, endMonthA);
  const startB = bsMonthIndex(startYearB, startMonthB);
  const endB = bsMonthIndex(endYearB, endMonthB);

  return startA <= endB && endA >= startB;
}

/**
 * Counts the inclusive BS months during which a charge
 * or discount is active within the billing period.
 *
 * Start and end months are inclusive.
 * A null end date means there is no fixed expiry.
 */
function getActiveBSMonthsInPeriod(
  effectiveStart: Date,
  effectiveEnd: Date | null,
  periodStartYear: number,
  periodStartMonth: number,
  periodEndYear: number,
  periodEndMonth: number
): number {
  const effectiveStartBS = dateToBS(effectiveStart);

  const effectiveEndBS = effectiveEnd
    ? dateToBS(effectiveEnd)
    : {
        year: periodEndYear,
        month: periodEndMonth,
      };

  const activeStart = Math.max(
    bsMonthIndex(
      effectiveStartBS.year,
      effectiveStartBS.month
    ),
    bsMonthIndex(periodStartYear, periodStartMonth)
  );

  const activeEnd = Math.min(
    bsMonthIndex(
      effectiveEndBS.year,
      effectiveEndBS.month
    ),
    bsMonthIndex(periodEndYear, periodEndMonth)
  );

  if (activeEnd < activeStart) {
    return 0;
  }

  return activeEnd - activeStart + 1;
}

// GET BILLS
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const academicYearId = searchParams.get("academicYearId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const id = searchParams.get("id");

    const where: {
      id?: string;
      academicYearId?: string;
      studentId?: string;
      status?: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
    } = {};

    if (id) {
      where.id = id;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (
      status === "UNPAID" ||
      status === "PARTIAL" ||
      status === "PAID" ||
      status === "CANCELLED"
    ) {
      where.status = status;
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        student: true,
        academicYear: true,
        items: true,
        payments: true,
        creditApplications: {
          include: {
            credit: true,
          },
        },
      },
      orderBy: {
        billingDate: "desc",
      },
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("Failed to load bills:", error);

    return NextResponse.json(
      {
        error: "Failed to load bills.",
      },
      { status: 500 }
    );
  }
}

// CREATE BILL
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentId,
      academicYearId,
      periodStartYear,
      periodStartMonth,
      periodEndYear,
      periodEndMonth,
      dueDate: dueDateValue,
      notes,
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required." },
        { status: 400 }
      );
    }

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required." },
        { status: 400 }
      );
    }

    const startYear = Number(periodStartYear);
    const startMonth = Number(periodStartMonth);
    const endYear = Number(periodEndYear);
    const endMonth = Number(periodEndMonth);

    // Validate BS years.
    if (!Number.isInteger(startYear) || startYear <= 0) {
      return NextResponse.json(
        { error: "Invalid billing start year." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(endYear) || endYear <= 0) {
      return NextResponse.json(
        { error: "Invalid billing end year." },
        { status: 400 }
      );
    }

    // Validate BS months.
    if (
      !Number.isInteger(startMonth) ||
      startMonth < 1 ||
      startMonth > 12
    ) {
      return NextResponse.json(
        { error: "Invalid billing start month." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(endMonth) ||
      endMonth < 1 ||
      endMonth > 12
    ) {
      return NextResponse.json(
        { error: "Invalid billing end month." },
        { status: 400 }
      );
    }

    // Validate the requested billing period.
    const requestedStartIndex = bsMonthIndex(
      startYear,
      startMonth
    );

    const requestedEndIndex = bsMonthIndex(
      endYear,
      endMonth
    );

    if (requestedStartIndex > requestedEndIndex) {
      return NextResponse.json(
        {
          error:
            "Billing end month cannot be before billing start month.",
        },
        { status: 400 }
      );
    }

    let periodStart: Date;
    let periodEnd: Date;

    try {
      const periodDates = getBSPeriodDates(
        startYear,
        startMonth,
        endYear,
        endMonth
      );

      periodStart = periodDates.periodStart;
      periodEnd = periodDates.periodEnd;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid billing period.",
        },
        { status: 400 }
      );
    }

    const monthsInPeriod = getBSMonthsInPeriod(
      startYear,
      startMonth,
      endYear,
      endMonth
    );

    // Parse the optional due date.
    let dueDate: Date | null = null;

    try {
      if (dueDateValue) {
        dueDate = parseDate(dueDateValue, "due date");
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid due date.",
        },
        { status: 400 }
      );
    }

    if (dueDate && dueDate < periodStart) {
      return NextResponse.json(
        {
          error:
            "Due date cannot be before the billing period starts.",
        },
        { status: 400 }
      );
    }

    // Find student.
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    // Find academic year.
    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found." },
        { status: 404 }
      );
    }

    // Verify enrollment.
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId,
        },
      },
      include: {
        class: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "Student is not enrolled in the selected academic year.",
        },
        { status: 400 }
      );
    }

    // Prevent overlapping billing periods for this student
    // and academic year. Cancelled bills do not block rebilling.
    const existingBills = await prisma.bill.findMany({
      where: {
        studentId,
        academicYearId,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        billNumber: true,
        periodStartYear: true,
        periodStartMonth: true,
        periodEndYear: true,
        periodEndMonth: true,
        status: true,
      },
    });

    const overlappingBill = existingBills.find((bill) =>
      bsPeriodsOverlap(
        startYear,
        startMonth,
        endYear,
        endMonth,
        bill.periodStartYear,
        bill.periodStartMonth,
        bill.periodEndYear,
        bill.periodEndMonth
      )
    );

    if (overlappingBill) {
      return NextResponse.json(
        {
          error:
            "This billing period overlaps with an existing bill for this student.",
          existingBill: overlappingBill,
        },
        { status: 409 }
      );
    }

    // Get active class fee structures.
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        academicYearId,
        classId: enrollment.classId,
        isActive: true,
      },
      orderBy: {
        feeType: "asc",
      },
    });

    // Get student-specific charges.
    const studentCharges = await prisma.studentCharge.findMany({
      where: {
        studentId,
        academicYearId,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    // Get discounts that overlap this billing period.
    const discounts = await prisma.studentDiscount.findMany({
      where: {
        studentId,
        academicYearId,
        isActive: true,
        startDate: {
          lte: periodEnd,
        },
        OR: [
          {
            endDate: null,
          },
          {
            endDate: {
              gte: periodStart,
            },
          },
        ],
      },
      include: {
        feeTypes: true,
      },
    });

    const items: {
      feeType: any;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
      discountPercent: number;
      discountAmount: number;
      netAmount: number;
      studentChargeId?: string;
    }[] = [];

    // ---------------------------------------------------------
    // CLASS FEE STRUCTURES
    // ---------------------------------------------------------
    for (const fee of feeStructures) {
      const rate = Number(fee.amount);
      let quantity = 0;

      switch (fee.frequency) {
        case "MONTHLY":
          quantity = monthsInPeriod;
          break;

        case "TERM":
          quantity = 1;
          break;

        case "ANNUAL":
          if (
            isDateInsidePeriod(
              academicYear.startDate,
              periodStart,
              periodEnd
            )
          ) {
            quantity = 1;
          }
          break;

        case "ONE_TIME":
          if (
            isDateInsidePeriod(
              academicYear.startDate,
              periodStart,
              periodEnd
            )
          ) {
            quantity = 1;
          }
          break;

        default:
          quantity = 0;
      }

      if (quantity <= 0) {
        continue;
      }

      // Full fee amount for the entire billing period.
      const amount = roundMoney(quantity * rate);

      // Find the discount configured for this fee type.
      const applicableDiscount = discounts.find((discount) =>
        discount.feeTypes.some(
          (feeType) => feeType.feeType === fee.feeType
        )
      );

      const discountPercent = applicableDiscount
        ? Number(applicableDiscount.percentage)
        : 0;

      /*
       * FIX:
       * For monthly fees, only apply the discount to months
       * where the discount overlaps the billing period.
       *
       * Example:
       * Billing period: Bhadra through Mangsir = 4 months.
       * Discount ends in Kartik.
       * Eligible months: Bhadra, Asoj, Kartik = 3 months.
       */
      let discountableAmount = amount;

      if (
        applicableDiscount &&
        fee.frequency === "MONTHLY"
      ) {
        const eligibleDiscountMonths =
          getActiveBSMonthsInPeriod(
            applicableDiscount.startDate,
            applicableDiscount.endDate,
            startYear,
            startMonth,
            endYear,
            endMonth
          );

        discountableAmount = roundMoney(
          rate * eligibleDiscountMonths
        );
      }

      const discountAmount = roundMoney(
        discountableAmount * (discountPercent / 100)
      );

      const netAmount = roundMoney(
        amount - discountAmount
      );

      items.push({
        feeType: fee.feeType,
        description: fee.name,
        quantity,
        rate,
        amount,
        discountPercent,
        discountAmount,
        netAmount,
      });
    }

    // ---------------------------------------------------------
    // STUDENT-SPECIFIC CHARGES
    // ---------------------------------------------------------
    for (const charge of studentCharges) {
      const chargeStart = charge.startDate;
      const chargeEnd = charge.endDate ?? null;
      const effectiveChargeEnd = chargeEnd ?? periodEnd;

      if (
        !datesOverlap(
          chargeStart,
          effectiveChargeEnd,
          periodStart,
          periodEnd
        )
      ) {
        continue;
      }

      const rate = Number(charge.rate);
      let quantity = 0;

      switch (charge.frequency) {
        case "MONTHLY":
          // Count only the BS months in which the charge is active.
          quantity = getActiveBSMonthsInPeriod(
            chargeStart,
            chargeEnd,
            startYear,
            startMonth,
            endYear,
            endMonth
          );
          break;

        case "TERM":
          quantity = 1;
          break;

        case "ANNUAL":
          if (
            isDateInsidePeriod(
              chargeStart,
              periodStart,
              periodEnd
            )
          ) {
            quantity = 1;
          }
          break;

        case "ONE_TIME":
          if (
            isDateInsidePeriod(
              chargeStart,
              periodStart,
              periodEnd
            )
          ) {
            quantity = Number(charge.quantity);
          }
          break;

        default:
          quantity = Number(charge.quantity);
      }

      if (quantity <= 0) {
        continue;
      }

      const amount = roundMoney(quantity * rate);
      const discountPercent = 0;
      const discountAmount = 0;
      const netAmount = amount;

      items.push({
        feeType: charge.feeType,
        description: charge.description,
        quantity,
        rate,
        amount,
        discountPercent,
        discountAmount,
        netAmount,
        studentChargeId: charge.id,
      });
    }

    // ---------------------------------------------------------
    // TOTALS
    // ---------------------------------------------------------
    const totalAmount = roundMoney(
      items.reduce((sum, item) => sum + item.netAmount, 0)
    );

    const totalDiscount = roundMoney(
      items.reduce((sum, item) => sum + item.discountAmount, 0)
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "No billable fees or charges were found for this billing period.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // BILL NUMBER
    // ---------------------------------------------------------
    const latestBill = await prisma.bill.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        billNumber: true,
      },
    });

    let nextNumber = 1;

    if (latestBill?.billNumber) {
      const match = latestBill.billNumber.match(/(\d+)$/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const billNumber = `BILL-${String(nextNumber).padStart(
      6,
      "0"
    )}`;

    // ---------------------------------------------------------
    // CREATE BILL
    // ---------------------------------------------------------
    const bill = await prisma.$transaction(async (tx) => {
      const createdBill = await tx.bill.create({
        data: {
          studentId,
          academicYearId,
          billNumber,
          billingDate: new Date(),
          periodStartYear: startYear,
          periodStartMonth: startMonth,
          periodEndYear: endYear,
          periodEndMonth: endMonth,
          dueDate,
          totalAmount,
          discountAmount: totalDiscount,
          paidAmount: 0,
          status: "UNPAID",
          notes:
            typeof notes === "string" && notes.trim()
              ? notes.trim()
              : null,
          items: {
            create: items.map((item) => ({
              feeType: item.feeType,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              netAmount: item.netAmount,
              studentChargeId: item.studentChargeId ?? null,
            })),
          },
        },
        include: {
          items: true,
          student: true,
          academicYear: true,
        },
      });

      return createdBill;
    });

    return NextResponse.json(
      {
        message: "Bill created successfully.",
        bill,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create bill:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create bill.",
      },
      { status: 500 }
    );
  }
}
