import { NextResponse } from "next/server";
import { isPrismaErrorCode } from "@/lib/prisma-error";
import { authorizeCreditManagement } from "@/lib/finance/credit-authorization";
import { readCreditRequestBody } from "@/lib/finance/credit-route-helpers";
import { parsePositiveAmountToCents } from "@/lib/finance/student-credit-rules";
import {
  applyStudentCredit,
  StudentCreditWorkflowError,
} from "@/lib/finance/student-credit-workflow";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const authorization = await authorizeCreditManagement();
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id: creditId } = await context.params;
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

    const billId =
      typeof body.billId === "string" ? body.billId.trim() : "";
    const amountCents = parsePositiveAmountToCents(body.amount);
    if (!billId) {
      return NextResponse.json(
        { error: "Bill is required." },
        { status: 400 },
      );
    }
    if (amountCents === null) {
      return NextResponse.json(
        { error: "Application amount must be positive and have at most two decimal places." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      (tx) =>
        applyStudentCredit(tx, {
          creditId,
          billId,
          amountCents,
          appliedByUserId: authorization.actorId,
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
        { error: "This credit application has already been recorded." },
        { status: 409 },
      );
    }

    console.error("Failed to apply student credit:", error);
    return NextResponse.json(
      { error: "Failed to apply student credit." },
      { status: 500 },
    );
  }
}
