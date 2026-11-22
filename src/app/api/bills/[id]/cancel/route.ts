import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const bill = await prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found." },
        { status: 404 },
      );
    }

    const cancelledBill = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtextextended(
              ${`${bill.studentId}:${bill.academicYearId}`},
              0
            )
          )
        `;
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`billing:bill:${id}`}, 0)
          )
        `;

        const currentBill = await tx.bill.findUnique({
          where: { id },
          include: {
            payments: { select: { id: true } },
            creditApplications: { select: { id: true } },
          },
        });

        if (!currentBill) {
          throw new Error("BILL_NOT_FOUND");
        }

        if (currentBill.status === "CANCELLED") {
          return currentBill;
        }

        if (
          currentBill.payments.length > 0 ||
          currentBill.creditApplications.length > 0
        ) {
          throw new Error("BILL_HAS_SETTLEMENTS");
        }

        const updatedBill = await tx.bill.update({
          where: { id },
          data: { status: "CANCELLED" },
        });

        await tx.studentChargeApplication.updateMany({
          where: {
            billId: id,
            isActive: true,
          },
          data: {
            isActive: false,
            releasedAt: new Date(),
            releaseReason: "CANCELLED_UNPAID",
          },
        });

        return updatedBill;
      },
      { maxWait: 10000, timeout: 20000 },
    );

    return NextResponse.json({
      message: "Bill cancelled successfully.",
      bill: cancelledBill,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BILL_NOT_FOUND") {
        return NextResponse.json(
          { error: "Bill not found." },
          { status: 404 },
        );
      }

      if (error.message === "BILL_HAS_SETTLEMENTS") {
        return NextResponse.json(
          {
            error:
              "This bill cannot be cancelled while payments or credits are applied. Reverse or refund them first.",
          },
          { status: 409 },
        );
      }
    }

    console.error("Failed to cancel bill:", error);
    return NextResponse.json(
      { error: "Failed to cancel bill." },
      { status: 500 },
    );
  }
}
