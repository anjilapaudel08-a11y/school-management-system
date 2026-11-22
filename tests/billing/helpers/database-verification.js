import assert from "node:assert/strict";
import { calculateOutstanding, statusForOutstanding } from "./expected-calculations";

export async function loadBill(prisma, billId) {
  return prisma.bill.findUnique({
    where: { id: billId },
    include: {
      student: true,
      academicYear: true,
      items: true,
      payments: true,
      creditApplications: { include: { credit: true } },
    },
  });
}

export function verifyBillSnapshot(bill, expected) {
  assert.ok(bill, "Expected bill to exist in the database.");
  assert.equal(bill.studentId, expected.studentId);
  assert.equal(bill.academicYearId, expected.academicYearId);
  assert.equal(bill.periodStartYear, expected.periodStartYear);
  assert.equal(bill.periodStartMonth, expected.periodStartMonth);
  assert.equal(bill.periodEndYear, expected.periodEndYear);
  assert.equal(bill.periodEndMonth, expected.periodEndMonth);
  assert.equal(Number(bill.totalAmount), expected.totalAmount);
  assert.equal(Number(bill.discountAmount), expected.discountAmount ?? 0);

  for (const item of bill.items) {
    assert.ok(item.billId === bill.id, "Bill item has a mismatched parent.");
    assert.equal(
      Number(item.netAmount),
      Number(item.amount) - Number(item.discountAmount),
    );
  }

  return bill;
}

export function verifySettlement(bill, expected) {
  const payments = bill.payments.map((payment) => ({
    amount: payment.amount,
  }));
  const waivers = bill.payments.map((payment) => ({
    amount: payment.waiverAmount,
  }));
  const credits = bill.creditApplications.map((application) => ({
    amount: application.amount,
  }));
  const outstanding = calculateOutstanding({
    totalAmount: bill.totalAmount,
    payments,
    waivers,
    credits,
  });
  const status = bill.status === "CANCELLED"
    ? "CANCELLED"
    : statusForOutstanding(Number(bill.totalAmount), outstanding);

  assert.equal(outstanding, expected.outstanding);
  assert.equal(status, expected.status);
  assert.equal(Number(bill.paidAmount), expected.paidAmount);
  return { outstanding, status };
}
