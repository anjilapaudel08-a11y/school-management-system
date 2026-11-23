import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setupTestData } from "./helpers/setup-test-data";
import {
  connectToTestDatabase,
  getVerifiedTestTarget,
} from "./helpers/database";

async function main() {
  const target = getVerifiedTestTarget();
  process.env.DATABASE_URL = target.connectionString;
  const prisma = await connectToTestDatabase();
  try {
    const fixture = await setupTestData(prisma);
    await writeFile(
      resolve(
        process.cwd(),
        "tests",
        "billing",
        "fixtures",
        "billing-test-ids.json",
      ),
      `${JSON.stringify(fixture, null, 2)}\n`,
      "utf8",
    );
    console.log("Prepared the separately marked billing QA fixture.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Billing fixture preparation failed:", error);
  process.exitCode = 1;
});
