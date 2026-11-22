import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connectToTestDatabase } from "../tests/billing/helpers/database";
import { setupTestData } from "../tests/billing/helpers/setup-test-data";

async function main() {
  const prisma = await connectToTestDatabase();
  try {
    const fixture = await setupTestData(prisma);
    const mappingPath = resolve(
      process.cwd(),
      "tests",
      "billing",
      "fixtures",
      "billing-test-ids.json",
    );
    await writeFile(mappingPath, `${JSON.stringify(fixture, null, 2)}\n`, {
      encoding: "utf8",
    });
    console.log(
      JSON.stringify(
        {
          school: fixture.marker,
          academicYear: fixture.academicYearName,
          classes: Object.keys(fixture.classIds).length,
          students: Object.keys(fixture.studentIds).length,
          fees: Object.keys(fixture.feeIds).length,
          charges: Object.keys(fixture.chargeIds).length,
          discounts: Object.keys(fixture.discountIds).length,
          mappingPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Billing QA seed failed:", error);
  process.exitCode = 1;
});
