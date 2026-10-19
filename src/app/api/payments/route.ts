import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const validPaymentMethods = [
  "CASH",
  "BANK",
  "ONLINE",
  "OTHER",
] as const;

// ==================================================
// GET /api/payments
// Get payment history
// ==================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const billId = searchParams.get("billId");
    const method = searchParams.get("method");

    const payments = await prisma.payment.findMany({
      where: {
        ...(billId ? { billId } : {}),
        ...(method
          ? {
              method: method as (typeof validPaymentMethods)[number],
            }
          : {}),
      },

      include: {
        bill: {
          include: {
            student: true,
            academicYear: true,
          },
        },
      },

      orderBy: {
        paymentDate: "desc",
      },
    });

    return NextResponse.json({
      payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Failed to fetch payments:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch payments.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// POST /api/payments
// Record a payment
// ==================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      billId,
      amount,
      method = "CASH",
      reference,
      notes,
      waiverAmount = 0,
      waiverReason,
      paymentDate,
    } = body;

    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------

    if (!billId) {
      return NextResponse.json(
        {
          error: "Bill ID is required.",
        },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);
    const paymentWaiver = Number(waiverAmount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Payment amount must be greater than 0.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(paymentWaiver) ||
      paymentWaiver < 0
    ) {
      return NextResponse.json(
        {
          error: "Waiver amount cannot be negative.",
        },
        { status: 400 }
      );
    }

    if (!validPaymentMethods.includes(method)) {
      return NextResponse.json(
        {
          error: "Invalid payment method.",
        },
        { status: 400 }
      );
    }

    if (
      paymentWaiver > 0 &&
      !waiverReason?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Waiver reason is required when a waiver is given.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Payment date
    // --------------------------------------------------

    let parsedPaymentDate: Date | undefined;

    if (paymentDate) {
      parsedPaymentDate = new Date(paymentDate);

      if (Number.isNaN(parsedPaymentDate.getTime())) {
        return NextResponse.json(
          {
            error: "Invalid payment date.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Transaction
    // --------------------------------------------------

    const result = await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------------
        // Find bill
        // ----------------------------------------------

        const bill = await tx.bill.findUnique({
          where: {
            id: billId,
          },
        });

        if (!bill) {
          throw new Error("BILL_NOT_FOUND");
        }

        if (bill.status === "CANCELLED") {
          throw new Error("BILL_CANCELLED");
        }

        // ----------------------------------------------
        // Get all previous payments
        // ----------------------------------------------

        const previousPayments =
          await tx.payment.findMany({
            where: {
              billId,
            },
            select: {
              amount: true,
              waiverAmount: true,
            },
          });

        // ----------------------------------------------
        // Get credit applications
        // ----------------------------------------------

        const creditApplications =
          await tx.billCreditApplication.findMany({
            where: {
              billId,
            },
            select: {
              amount: true,
            },
          });

        // ----------------------------------------------
        // Calculate previous settlement
        //
        // Actual money:
        //   sum(Payment.amount)
        //
        // Waivers:
        //   sum(Payment.waiverAmount)
        //
        // Credits:
        //   sum(BillCreditApplication.amount)
        // ----------------------------------------------

        const previousPaidAmount =
          previousPayments.reduce(
            (sum, payment) =>
              sum + Number(payment.amount),
            0
          );

        const previousWaiverAmount =
          previousPayments.reduce(
            (sum, payment) =>
              sum + Number(payment.waiverAmount),
            0
          );

        const previousCreditAmount =
          creditApplications.reduce(
            (sum, application) =>
              sum + Number(application.amount),
            0
          );

        const totalAmount = Number(
          bill.totalAmount
        );

        const previouslySettled =
          previousPaidAmount +
          previousWaiverAmount +
          previousCreditAmount;

        const currentOutstanding =
          totalAmount - previouslySettled;

        // ----------------------------------------------
        // Already fully settled
        // ----------------------------------------------

        if (currentOutstanding <= 0) {
          throw new Error(
            "BILL_NO_OUTSTANDING_BALANCE"
          );
        }

        // ----------------------------------------------
        // Payment + waiver cannot exceed outstanding
        // ----------------------------------------------

        const settlementAmount =
          paymentAmount + paymentWaiver;

        if (
          settlementAmount >
          currentOutstanding
        ) {
          throw new Error(
            `PAYMENT_EXCEEDS_BALANCE:${currentOutstanding}`
          );
        }

        // ----------------------------------------------
        // Create payment
        // ----------------------------------------------

        const payment =
          await tx.payment.create({
            data: {
              billId,
              amount: paymentAmount,
              method,
              reference:
                reference?.trim() || null,
              notes:
                notes?.trim() || null,
              waiverAmount: paymentWaiver,
              waiverReason:
                paymentWaiver > 0
                  ? waiverReason.trim()
                  : null,

              ...(parsedPaymentDate
                ? {
                    paymentDate:
                      parsedPaymentDate,
                  }
                : {}),
            },
          });

        // ----------------------------------------------
        // Calculate new totals
        // ----------------------------------------------

        const newPaidAmount =
          previousPaidAmount +
          paymentAmount;

        const newWaiverAmount =
          previousWaiverAmount +
          paymentWaiver;

        const newSettledAmount =
          newPaidAmount +
          newWaiverAmount +
          previousCreditAmount;

        const newOutstanding =
          totalAmount -
          newSettledAmount;

        // ----------------------------------------------
        // Determine bill status
        // ----------------------------------------------

        let status:
          | "UNPAID"
          | "PARTIAL"
          | "PAID";

        if (newOutstanding <= 0) {
          status = "PAID";
        } else if (
          newPaidAmount > 0 ||
          newWaiverAmount > 0 ||
          previousCreditAmount > 0
        ) {
          status = "PARTIAL";
        } else {
          status = "UNPAID";
        }

        // ----------------------------------------------
        // Update bill
        //
        // paidAmount = actual money received ONLY
        // ----------------------------------------------

        const updatedBill =
          await tx.bill.update({
            where: {
              id: billId,
            },
            data: {
              paidAmount: newPaidAmount,
              status,
            },
          });

        return {
          payment,
          bill: updatedBill,
          previousPaidAmount,
          previousWaiverAmount,
          previousCreditAmount,
          totalSettled: newSettledAmount,
          remainingDue: Math.max(
            0,
            newOutstanding
          ),
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    return NextResponse.json(
      {
        message:
          "Payment recorded successfully.",
        payment: result.payment,
        bill: result.bill,
        settlement: {
          previousPaidAmount:
            result.previousPaidAmount,
          previousWaiverAmount:
            result.previousWaiverAmount,
          previousCreditAmount:
            result.previousCreditAmount,
          totalSettled:
            result.totalSettled,
          remainingDue:
            result.remainingDue,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Failed to record payment:",
      error
    );

    if (error instanceof Error) {
      if (
        error.message ===
        "BILL_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error: "Bill not found.",
          },
          { status: 404 }
        );
      }

      if (
        error.message ===
        "BILL_CANCELLED"
      ) {
        return NextResponse.json(
          {
            error:
              "Payment cannot be recorded against a cancelled bill.",
          },
          { status: 400 }
        );
      }

      if (
        error.message ===
        "BILL_NO_OUTSTANDING_BALANCE"
      ) {
        return NextResponse.json(
          {
            error:
              "This bill has no outstanding balance.",
          },
          { status: 400 }
        );
      }

      if (
        error.message.startsWith(
          "PAYMENT_EXCEEDS_BALANCE:"
        )
      ) {
        const outstanding =
          error.message.split(":")[1];

        return NextResponse.json(
          {
            error: `Payment plus waiver cannot exceed the outstanding balance of Rs. ${Number(
              outstanding
            ).toFixed(2)}.`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Failed to record payment.",
      },
      { status: 500 }
    );
  }
}