import { cleanupFixture } from "./helpers/cleanup-test-data";
import { connectToTestDatabase } from "./helpers/database";

async function main() {
  const prisma = await connectToTestDatabase();
  try {
    await cleanupFixture(prisma);
    console.log("Removed only the marked BILL_QA fixture school.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Billing fixture cleanup failed:", error);
  process.exitCode = 1;
});
