import assert from "node:assert/strict";
import test from "node:test";
import { getVerifiedTestTarget } from "./billing/helpers/database.js";

const primarySchoolId = "cmwtatkm10000row42cgw4b64";
const billingSchoolId = "cmwtawdr10000scw4moape0b6";

function request(path) {
  return new Request(`http://qa.local${path}`);
}

test("school-owned academic and finance APIs expose only the configured QA school", async () => {
  const target = getVerifiedTestTarget();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSchoolId = process.env.SCHOOL_ID;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DATABASE_URL = target.connectionString;
  process.env.SCHOOL_ID = primarySchoolId;
  process.env.NODE_ENV = "test";

  let appPrisma;

  try {
    const [
      { prisma },
      academicTermsApi,
      academicYearActivationApi,
      billsApi,
      classSubjectsApi,
      expensesApi,
      examsApi,
      feesApi,
      financeOverviewApi,
      marksApi,
      paymentsApi,
      resultsApi,
      studentChargesApi,
      studentDiscountsApi,
    ] = await Promise.all([
      import("../src/lib/prisma.ts"),
      import("../src/app/api/academic-terms/route.ts"),
      import("../src/app/api/academic-years/[id]/activate/route.ts"),
      import("../src/app/api/bills/route.ts"),
      import("../src/app/api/class-subjects/route.ts"),
      import("../src/app/api/expenses/route.ts"),
      import("../src/app/api/exams/route.ts"),
      import("../src/app/api/fees/route.ts"),
      import("../src/app/api/finance-overview/route.ts"),
      import("../src/app/api/marks/route.ts"),
      import("../src/app/api/payments/route.ts"),
      import("../src/app/api/results/route.ts"),
      import("../src/app/api/student-charges/route.ts"),
      import("../src/app/api/student-discounts/route.ts"),
    ]);
    appPrisma = prisma;

    const [databaseInfo] = await appPrisma.$queryRaw`
      SELECT current_database() AS database
    `;
    assert.equal(databaseInfo.database, target.database);

    const [
      billingYear,
      primaryYear,
      billingClass,
      billingStudent,
      billingBill,
      billingExamSubject,
    ] = await Promise.all([
        appPrisma.academicYear.findFirstOrThrow({
          where: { schoolId: billingSchoolId },
          select: { id: true },
        }),
        appPrisma.academicYear.findFirstOrThrow({
          where: { schoolId: primarySchoolId, isActive: true },
          select: { id: true, startDate: true, endDate: true },
        }),
        appPrisma.class.findFirstOrThrow({
          where: { schoolId: billingSchoolId },
          select: { id: true },
        }),
        appPrisma.student.findFirstOrThrow({
          where: { schoolId: billingSchoolId },
          select: { id: true },
        }),
        appPrisma.bill.findFirst({
          where: { student: { is: { schoolId: billingSchoolId } } },
          select: { id: true },
        }),
        appPrisma.examSubject.findFirst({
          where: {
            exam: {
              is: {
                class: { is: { schoolId: billingSchoolId } },
              },
            },
          },
          select: { id: true, examId: true },
        }),
      ]);

    const primaryYearIds = new Set(
      (
        await appPrisma.academicYear.findMany({
          where: { schoolId: primarySchoolId },
          select: { id: true },
        })
      ).map(({ id }) => id),
    );
    const primaryClassIds = new Set(
      (
        await appPrisma.class.findMany({
          where: { schoolId: primarySchoolId },
          select: { id: true },
        })
      ).map(({ id }) => id),
    );
    const primaryStudentIds = new Set(
      (
        await appPrisma.student.findMany({
          where: { schoolId: primarySchoolId },
          select: { id: true },
        })
      ).map(({ id }) => id),
    );

    const activeYearsBefore = await appPrisma.academicYear.findMany({
      where: { schoolId: { in: [primarySchoolId, billingSchoolId] } },
      orderBy: { id: "asc" },
      select: { id: true, isActive: true, updatedAt: true },
    });

    const [
      termsResponse,
      rejectedActivation,
      billsResponse,
      classesResponse,
      expensesResponse,
      examsResponse,
      feesResponse,
      financeOverviewResponse,
      paymentsResponse,
      chargesResponse,
      discountsResponse,
    ] = await Promise.all([
      academicTermsApi.GET(
        request(`/api/academic-terms?academicYearId=${billingYear.id}`),
      ),
      academicYearActivationApi.PATCH(
        request(`/api/academic-years/${billingYear.id}/activate`),
        { params: Promise.resolve({ id: billingYear.id }) },
      ),
      billsApi.GET(request("/api/bills")),
      classSubjectsApi.GET(
        request(
          `/api/class-subjects?classId=${billingClass.id}&academicYearId=${billingYear.id}`,
        ),
      ),
      expensesApi.GET(request("/api/expenses")),
      examsApi.GET(request(`/api/exams?classId=${billingClass.id}`)),
      feesApi.GET(request(`/api/fees?academicYearId=${billingYear.id}`)),
      financeOverviewApi.GET(
        request(
          `/api/finance-overview?period=yearly&academicYearId=${primaryYear.id}`,
        ),
      ),
      paymentsApi.GET(request("/api/payments")),
      studentChargesApi.GET(
        request(`/api/student-charges?studentId=${billingStudent.id}`),
      ),
      studentDiscountsApi.GET(
        request(`/api/student-discounts?studentId=${billingStudent.id}`),
      ),
    ]);

    assert.equal(termsResponse.status, 404);
    assert.equal(rejectedActivation.status, 404);
    assert.equal(classesResponse.status, 404);
    if (billingExamSubject) {
      const marksResponse = await marksApi.GET(
        request(`/api/marks?examSubjectId=${billingExamSubject.id}`),
      );
      assert.equal(marksResponse.status, 404);

      const resultsResponse = await resultsApi.GET(
        request(`/api/results?examId=${billingExamSubject.examId}`),
      );
      assert.equal(resultsResponse.status, 404);
    }
    for (const response of [
      billsResponse,
      expensesResponse,
      examsResponse,
      feesResponse,
      financeOverviewResponse,
      paymentsResponse,
      chargesResponse,
      discountsResponse,
    ]) {
      assert.equal(response.status, 200);
    }

    const [
      bills,
      expenses,
      exams,
      fees,
      payments,
      charges,
      discounts,
    ] = await Promise.all([
      billsResponse.json(),
      expensesResponse.json(),
      examsResponse.json(),
      feesResponse.json(),
      paymentsResponse.json(),
      chargesResponse.json(),
      discountsResponse.json(),
    ]);

    assert.ok(
      bills.every(
        (bill) =>
          primaryStudentIds.has(bill.student.id) &&
          primaryYearIds.has(bill.academicYear.id),
      ),
    );
    assert.ok(
      expenses.every((expense) => primaryYearIds.has(expense.academicYear.id)),
    );
    assert.ok(
      exams.every(
        (exam) =>
          primaryClassIds.has(exam.class.id) &&
          primaryYearIds.has(exam.term.academicYear.id),
      ),
    );
    assert.ok(
      fees.every(
        (fee) =>
          primaryClassIds.has(fee.class.id) &&
          primaryYearIds.has(fee.academicYear.id),
      ),
    );
    assert.ok(
      payments.payments.every(
        (payment) =>
          primaryStudentIds.has(payment.bill.student.id) &&
          primaryYearIds.has(payment.bill.academicYear.id),
      ),
    );
    assert.equal(charges.length, 0);
    assert.equal(discounts.length, 0);

    const financeOverview = await financeOverviewResponse.json();
    const from = primaryYear.startDate;
    const to = new Date(primaryYear.endDate.getTime() + 24 * 60 * 60 * 1000);
    const schoolPaymentWhere = {
      paymentDate: { gte: from, lt: to },
      bill: {
        is: {
          student: { is: { schoolId: primarySchoolId } },
          academicYear: { is: { schoolId: primarySchoolId } },
        },
      },
    };
    const schoolSalaryWhere = {
      paymentDate: { gte: from, lt: to },
      teacherSalary: {
        is: {
          teacher: { is: { schoolId: primarySchoolId } },
          academicYear: { is: { schoolId: primarySchoolId } },
        },
      },
    };
    const schoolExpenseWhere = {
      expenseDate: { gte: from, lt: to },
      academicYear: { is: { schoolId: primarySchoolId } },
    };
    const [
      feeAggregate,
      waiverAggregate,
      salaryAggregate,
      legacySalaryAggregate,
      expenseAggregate,
    ] = await Promise.all([
      appPrisma.payment.aggregate({
        where: schoolPaymentWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      appPrisma.payment.aggregate({
        where: { ...schoolPaymentWhere, waiverAmount: { gt: 0 } },
        _sum: { waiverAmount: true },
        _count: { _all: true },
      }),
      appPrisma.teacherSalaryPayment.aggregate({
        where: schoolSalaryWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      appPrisma.teacherSalary.aggregate({
        where: {
          status: "PAID",
          paymentDate: { gte: from, lt: to },
          payments: { none: {} },
          teacher: { is: { schoolId: primarySchoolId } },
          academicYear: { is: { schoolId: primarySchoolId } },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
      appPrisma.expense.aggregate({
        where: schoolExpenseWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    assert.equal(
      financeOverview.feeIncome,
      Number(feeAggregate._sum.amount ?? 0),
    );
    assert.equal(
      financeOverview.waivers,
      Number(waiverAggregate._sum.waiverAmount ?? 0),
    );
    assert.equal(
      financeOverview.salaryPaid,
      Number(salaryAggregate._sum.amount ?? 0) +
        Number(legacySalaryAggregate._sum.netAmount ?? 0),
    );
    assert.equal(
      financeOverview.otherExpenses,
      Number(expenseAggregate._sum.amount ?? 0),
    );
    assert.equal(
      financeOverview.counts.feePayments,
      feeAggregate._count._all,
    );
    assert.equal(
      financeOverview.counts.salaryPayments,
      salaryAggregate._count._all + legacySalaryAggregate._count._all,
    );
    assert.equal(
      financeOverview.counts.expenses,
      expenseAggregate._count._all,
    );

    if (billingBill) {
      const byIdResponse = await billsApi.GET(
        request(`/api/bills?id=${billingBill.id}`),
      );
      assert.equal(byIdResponse.status, 200);
      assert.deepEqual(await byIdResponse.json(), []);

      const paymentResponse = await paymentsApi.GET(
        request(`/api/payments?billId=${billingBill.id}`),
      );
      assert.equal(paymentResponse.status, 200);
      assert.equal((await paymentResponse.json()).count, 0);
    }

    const activeYearsAfter = await appPrisma.academicYear.findMany({
      where: { schoolId: { in: [primarySchoolId, billingSchoolId] } },
      orderBy: { id: "asc" },
      select: { id: true, isActive: true, updatedAt: true },
    });
    assert.deepEqual(activeYearsAfter, activeYearsBefore);

    assert.equal(
      await appPrisma.school.count(),
      2,
      "both pre-existing QA school records must remain present",
    );
  } finally {
    if (appPrisma) await appPrisma.$disconnect();
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousSchoolId === undefined) {
      delete process.env.SCHOOL_ID;
    } else {
      process.env.SCHOOL_ID = previousSchoolId;
    }
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
