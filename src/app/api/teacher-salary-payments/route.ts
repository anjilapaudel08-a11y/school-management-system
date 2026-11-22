
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const paymentMethods = [
  "CASH",
  "BANK",
  "ONLINE",
  "OTHER",
] as const;

type PaymentMethodValue =
  (typeof paymentMethods)[number];

class PaymentRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPaymentMethod(
  value: string,
): value is PaymentMethodValue {
  return paymentMethods.some((method) => method === value);
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    const body = await request.json();

    const teacherSalaryId = String(
      body.teacherSalaryId ?? "",
    ).trim();

    const amount = Number(body.amount);
    const methodValue = String(
      body.method ?? "CASH",
    );

    if (!teacherSalaryId) {
      return NextResponse.json(
        { error: "Salary record is required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero." },
        { status: 400 },
      );
    }

    const paymentAmount = roundMoney(amount);

    if (!isPaymentMethod(methodValue)) {
      return NextResponse.json(
        { error: "Select a valid payment method." },
        { status: 400 },
      );
    }

    const paymentDateText = String(
      body.paymentDate ?? "",
    ).trim();

    let paymentDate = new Date();

    if (paymentDateText) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(paymentDateText)) {
        paymentDate = new Date(
          `${paymentDateText}T12:00:00.000Z`,
        );

        if (
          paymentDate.toISOString().slice(0, 10) !==
          paymentDateText
        ) {
          return NextResponse.json(
            { error: "Enter a valid payment date." },
            { status: 400 },
          );
        }
      } else {
        paymentDate = new Date(paymentDateText);

        if (Number.isNaN(paymentDate.getTime())) {
          return NextResponse.json(
            { error: "Enter a valid payment date." },
            { status: 400 },
          );
        }
      }
    }

    const reference =
      typeof body.reference === "string"
        ? body.reference.trim() || null
        : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim() || null
        : null;

    const salary = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.teacherSalary.findUnique({
          where: { id: teacherSalaryId },
          include: {
            payments: true,
          },
           
        });

        if (!existing) {
          throw new PaymentRequestError(
            "Teacher salary record not found.",
            404,
          );
        }

        /*
         * Older salary records may have been marked paid or
         * partially paid before detailed instalments existed.
         * Avoid guessing the paid amount for such records.
         */
        if (
          existing.payments.length === 0 &&
          (
            existing.status === "PAID" ||
            existing.status === "PARTIAL"
          )
        ) {
          throw new PaymentRequestError(
            "This is a legacy salary record without payment history. Reconcile its previous payments before adding another payment.",
            409,
          );
        }

        const paidBefore = roundMoney(
          existing.payments.reduce(
            (sum, payment) =>
              sum + Number(payment.amount),
            0,
          ),
        );

        const netAmount = Number(existing.netAmount);
        const remaining = roundMoney(
          Math.max(0, netAmount - paidBefore),
        );

        if (paymentAmount > remaining + 0.009) {
          throw new PaymentRequestError(
            `Payment exceeds the remaining salary balance of Rs. ${remaining.toLocaleString("en-NP", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}.`,
            400,
          );
        }

        await tx.teacherSalaryPayment.create({
          data: {
            teacherSalaryId,
            amount: paymentAmount,
            paymentDate,
            method: methodValue,
            reference,
            notes,
          },
        });

        const totalPaid = roundMoney(
          paidBefore + paymentAmount,
        );

        const status =
          totalPaid >= netAmount - 0.009
            ? "PAID"
            : totalPaid > 0
              ? "PARTIAL"
              : "PENDING";

        await tx.teacherSalary.update({
          where: { id: teacherSalaryId },
          data: {
            status,
            // Retain the latest payment information for compatibility.
            paymentDate,
            paymentMethod: methodValue,
            reference,
          },
        });

        return tx.teacherSalary.findUnique({
          where: { id: teacherSalaryId },
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                basicSalary: true,
                position: true,
              },
            },
            academicYear: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            payments: {
              orderBy: {
                paymentDate: "desc",
              },
            },
          },
        });
      }, {
    maxWait: 15_000,
    timeout: 20_000,
  }
    );

    return NextResponse.json({
      message: "Salary payment recorded successfully.",
      salary,
    });
  } catch (error) {
    if (error instanceof PaymentRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to record salary payment:", error);

    return NextResponse.json(
      { error: "Failed to record salary payment." },
      { status: 500 },
    );
  }
}
