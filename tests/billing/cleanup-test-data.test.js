import assert from "node:assert/strict";
import test from "node:test";
import { cleanupTestBills } from "./helpers/cleanup-test-data.js";
import { MARKER } from "./fixtures/billing-test-data.js";

test("billing cleanup preserves bills from earlier QA runs", async () => {
  const bills = [
    { id: "earlier-run", notes: `${MARKER} earlier-run A01` },
    { id: "current-run", notes: `${MARKER} current-run A01` },
  ];
  const deletedIds = [];
  const prisma = {
    bill: {
      async findMany({ where }) {
        return bills
          .filter(
            (bill) =>
              bill.notes.startsWith(where.notes.startsWith) &&
              where.studentId.in.includes("student-1") &&
              where.academicYearId.in.includes("year-1"),
          )
          .map(({ id }) => ({ id }));
      },
      async deleteMany({ where }) {
        deletedIds.push(...where.id.in);
      },
    },
  };

  await cleanupTestBills(
    prisma,
    {
      studentIds: { S001: "student-1" },
      academicYearId: "year-1",
    },
    "current-run",
  );

  assert.deepEqual(deletedIds, ["current-run"]);
});
