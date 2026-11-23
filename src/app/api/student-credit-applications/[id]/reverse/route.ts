import { NextResponse } from "next/server";
import { authorizeCreditManagement } from "@/lib/finance/credit-authorization";
import { readCreditRequestBody } from "@/lib/finance/credit-route-helpers";
import {
  reverseStudentCreditApplication,
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

    const { id: applicationId } = await context.params;
    const body = await readCreditRequestBody(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 300) {
      return NextResponse.json(
        { error: "A reversal reason of 1 to 300 characters is required." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      (tx) =>
        reverseStudentCreditApplication(tx, {
          applicationId,
          reversedByUserId: authorization.actorId,
          reason,
        }),
      { maxWait: 10_000, timeout: 20_000 },
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudentCreditWorkflowError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to reverse student credit application:", error);
    return NextResponse.json(
      { error: "Failed to reverse student credit application." },
      { status: 500 },
    );
  }
}
