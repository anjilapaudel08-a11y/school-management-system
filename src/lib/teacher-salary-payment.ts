import type { Prisma } from "@/generated/prisma/client";

export class SalaryPaymentRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RecordSalaryPaymentInput = {
  teacherSalaryId: string;
  amount: number;
  paymentDate: Date;
  method: "CASH" | "BANK" | "ONLINE" | "OTHER";
  reference: string | null;
  notes: string | null;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function recordTeacherSalaryPayment(
  tx: Prisma.TransactionClient,
  input: RecordSalaryPaymentInput,
) {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "TeacherSalary"
    WHERE "id" = ${input.teacherSalaryId}
    FOR UPDATE
  `;

  const existing = await tx.teacherSalary.findUnique({
    where: { id: input.teacherSalaryId },
    include: { payments: true },
  });

  if (!existing) {
    throw new SalaryPaymentRequestError(
      "Teacher salary record not found.",
      404,
    );
  }

  if (
    existing.payments.length === 0 &&
    (existing.status === "PAID" || existing.status === "PARTIAL")
  ) {
    throw new SalaryPaymentRequestError(
      "This is a legacy salary record without payment history. Reconcile its previous payments before adding another payment.",
      409,
    );
  }

  const paidBefore = roundMoney(
    existing.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    ),
  );
  const netAmount = Number(existing.netAmount);
  const remaining = roundMoney(Math.max(0, netAmount - paidBefore));

  if (input.amount > remaining + 0.009) {
    throw new SalaryPaymentRequestError(
      `Payment exceeds the remaining salary balance of Rs. ${remaining.toLocaleString("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`,
      400,
    );
  }

  await tx.teacherSalaryPayment.create({
    data: {
      teacherSalaryId: input.teacherSalaryId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
    },
  });

  const totalPaid = roundMoney(paidBefore + input.amount);
  const status =
    totalPaid >= netAmount - 0.009
      ? "PAID"
      : totalPaid > 0
        ? "PARTIAL"
        : "PENDING";

  await tx.teacherSalary.update({
    where: { id: input.teacherSalaryId },
    data: {
      status,
      paymentDate: input.paymentDate,
      paymentMethod: input.method,
      reference: input.reference,
    },
  });

  return tx.teacherSalary.findUnique({
    where: { id: input.teacherSalaryId },
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
        orderBy: { paymentDate: "desc" },
      },
    },
  });
}
