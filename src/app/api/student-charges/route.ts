import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  FeeFrequency,
  FeeType,
} from "@/generated/prisma/client";

const allowedStudentChargeTypes: FeeType[] = [
  FeeType.BUS,
  FeeType.MISCELLANEOUS,
];

function isAllowedStudentChargeType(
  value: string
): value is FeeType {
  return allowedStudentChargeTypes.includes(value as FeeType);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const academicYearId =
      searchParams.get("academicYearId");

    const studentId =
      searchParams.get("studentId");

    const charges = await prisma.studentCharge.findMany({
      where: {
        ...(academicYearId && { academicYearId }),
        ...(studentId && { studentId }),
      },

      include: {
        student: true,
        academicYear: true,
      },

      orderBy: [
        {
          startDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(charges);
  } catch (error) {
    console.error("GET student charges error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch student charges.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      studentId,
      academicYearId,
      feeType,
      description,
      quantity,
      rate,
      frequency,
      startDate,
      endDate,
      notes,
    } = body;

    if (
      !studentId ||
      !academicYearId ||
      !feeType ||
      !description ||
      rate === undefined ||
      !frequency ||
      !startDate
    ) {
      return NextResponse.json(
        {
          error:
            "Student, academic year, charge type, description, rate, frequency and start date are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Student Charges are only for student-specific charges.
     *
     * Class-based fees such as:
     * - Tuition
     * - Admission
     * - Exam
     * - Computer Lab
     *
     * must be configured through Fee Structure.
     */

    if (!isAllowedStudentChargeType(feeType)) {
      return NextResponse.json(
        {
          error:
            "Only Bus and Miscellaneous charges can be assigned directly to students.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(FeeFrequency).includes(
        frequency
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid fee frequency.",
        },
        {
          status: 400,
        }
      );
    }

    const numericQuantity =
      quantity === undefined
        ? 1
        : Number(quantity);

    const numericRate = Number(rate);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return NextResponse.json(
        {
          error: "Quantity must be greater than 0.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(numericRate) ||
      numericRate < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Rate must be a valid non-negative number.",
        },
        {
          status: 400,
        }
      );
    }

    const parsedStartDate = new Date(startDate);

    if (
      Number.isNaN(
        parsedStartDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid start date.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedEndDate: Date | undefined;

    if (endDate) {
      parsedEndDate = new Date(endDate);

      if (
        Number.isNaN(
          parsedEndDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error: "Invalid end date.",
          },
          {
            status: 400,
          }
        );
      }

      if (parsedEndDate < parsedStartDate) {
        return NextResponse.json(
          {
            error:
              "End date cannot be before start date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const amount =
      numericQuantity * numericRate;

    /*
     * Make sure the student actually belongs to
     * the selected academic year.
     */
    const enrollment =
      await prisma.enrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId,
            academicYearId,
          },
        },

        select: {
          id: true,
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "This student is not enrolled in the selected academic year.",
        },
        {
          status: 400,
        }
      );
    }

    const charge =
      await prisma.studentCharge.create({
        data: {
          studentId,
          academicYearId,
          feeType,
          description: description.trim(),
          quantity: numericQuantity,
          rate: numericRate,
          amount,
          frequency,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          notes:
            typeof notes === "string"
              ? notes.trim() || null
              : null,
        },

        include: {
          student: true,
          academicYear: true,
        },
      });

    return NextResponse.json(
      charge,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST student charge error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create student charge.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      feeType,
      description,
      quantity,
      rate,
      frequency,
      startDate,
      endDate,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Student charge ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get the existing charge once.
     * This lets us correctly validate dates and
     * calculate the new amount.
     */
    const existingCharge =
      await prisma.studentCharge.findUnique({
        where: {
          id,
        },

        select: {
          quantity: true,
          rate: true,
          startDate: true,
          endDate: true,
        },
      });

    if (!existingCharge) {
      return NextResponse.json(
        {
          error: "Student charge not found.",
        },
        {
          status: 404,
        }
      );
    }

    const data: {
      feeType?: FeeType;
      description?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
      frequency?: FeeFrequency;
      startDate?: Date;
      endDate?: Date | null;
      notes?: string | null;
    } = {};

    let quantityValue:
      | number
      | undefined;

    let rateValue:
      | number
      | undefined;

    /*
     * Fee Type
     */
    if (feeType !== undefined) {
      if (
        typeof feeType !== "string" ||
        !isAllowedStudentChargeType(
          feeType
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only Bus and Miscellaneous charges can be assigned directly to students.",
          },
          {
            status: 400,
          }
        );
      }

      data.feeType = feeType;
    }

    /*
     * Description
     */
    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Description cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      data.description =
        description.trim();
    }

    /*
     * Quantity
     */
    if (quantity !== undefined) {
      quantityValue = Number(quantity);

      if (
        !Number.isFinite(quantityValue) ||
        quantityValue <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Quantity must be greater than 0.",
          },
          {
            status: 400,
          }
        );
      }

      data.quantity = quantityValue;
    }

    /*
     * Rate
     */
    if (rate !== undefined) {
      rateValue = Number(rate);

      if (
        !Number.isFinite(rateValue) ||
        rateValue < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Rate must be a valid non-negative number.",
          },
          {
            status: 400,
          }
        );
      }

      data.rate = rateValue;
    }

    /*
     * Recalculate amount if quantity or rate changes.
     */
    if (
      quantityValue !== undefined ||
      rateValue !== undefined
    ) {
      const finalQuantity =
        quantityValue ??
        Number(existingCharge.quantity);

      const finalRate =
        rateValue ??
        Number(existingCharge.rate);

      data.amount =
        finalQuantity * finalRate;
    }

    /*
     * Frequency
     */
    if (frequency !== undefined) {
      if (
        typeof frequency !== "string" ||
        !Object.values(
          FeeFrequency
        ).includes(frequency as FeeFrequency)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid fee frequency.",
          },
          {
            status: 400,
          }
        );
      }

      data.frequency =
        frequency as FeeFrequency;
    }

    /*
     * Start Date
     */
    if (startDate !== undefined) {
      const parsedStartDate =
        new Date(startDate);

      if (
        Number.isNaN(
          parsedStartDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid start date.",
          },
          {
            status: 400,
          }
        );
      }

      data.startDate =
        parsedStartDate;
    }

    /*
     * End Date
     */
    if (endDate !== undefined) {
      if (!endDate) {
        data.endDate = null;
      } else {
        const parsedEndDate =
          new Date(endDate);

        if (
          Number.isNaN(
            parsedEndDate.getTime()
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid end date.",
            },
            {
              status: 400,
            }
          );
        }

        const comparisonStartDate =
          data.startDate ??
          existingCharge.startDate;

        if (
          parsedEndDate <
          comparisonStartDate
        ) {
          return NextResponse.json(
            {
              error:
                "End date cannot be before start date.",
            },
            {
              status: 400,
            }
          );
        }

        data.endDate =
          parsedEndDate;
      }
    }

    /*
     * If start date changes but end date is not
     * explicitly changed, make sure the existing
     * end date is still valid.
     */
    if (
      data.startDate &&
      endDate === undefined &&
      existingCharge.endDate &&
      existingCharge.endDate <
        data.startDate
    ) {
      return NextResponse.json(
        {
          error:
            "Start date cannot be after the existing end date. Update or remove the end date first.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Notes
     */
    if (notes !== undefined) {
      data.notes =
        typeof notes === "string"
          ? notes.trim() || null
          : null;
    }

    const charge =
      await prisma.studentCharge.update({
        where: {
          id,
        },

        data,

        include: {
          student: true,
          academicYear: true,
        },
      });

    return NextResponse.json(
      charge
    );
  } catch (error: any) {
    console.error(
      "PUT student charge error:",
      error
    );

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Student charge not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to update student charge.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Student charge ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.studentCharge.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message:
        "Student charge deleted successfully.",
    });
  } catch (error: any) {
    console.error(
      "DELETE student charge error:",
      error
    );

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Student charge not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to delete student charge.",
      },
      {
        status: 500,
      }
    );
  }
}