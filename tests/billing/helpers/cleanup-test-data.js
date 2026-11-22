import { MARKER, SCHOOL_NAME } from "../fixtures/billing-test-data";

export async function cleanupTestBills(prisma, fixture) {
  const students = Object.values(fixture.studentIds);
  const markedBills = await prisma.bill.findMany({
    where: {
      studentId: { in: students },
      academicYearId: fixture.academicYearId,
      notes: { startsWith: MARKER },
    },
    select: { id: true },
  });
  const ids = markedBills.map((bill) => bill.id);
  if (ids.length > 0) {
    await prisma.bill.deleteMany({ where: { id: { in: ids } } });
  }
}

export async function cleanupFixture(prisma) {
  const schools = await prisma.school.findMany({
    where: { name: SCHOOL_NAME, shortName: MARKER },
    select: { id: true },
  });
  if (schools.length > 1) {
    throw new Error("Refusing to delete ambiguous billing QA schools.");
  }
  if (schools.length === 1) {
    await prisma.school.delete({ where: { id: schools[0].id } });
  }
}
